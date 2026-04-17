import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import { useSettingsStore } from '../store/settings';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import ThreeWayTable from '../components/ThreeWayTable';
import {
  assessDifferential,
  furstAssessment,
  scoreMrhe,
  scoreCsw,
  type DifferentialInput,
  type VolumeStatusInput,
} from '../lib/calculations';
import { audit } from '../db/dexie';
import type {
  SiadhExclusion,
  MrheInput,
  CswInput,
  Stage2Snapshot,
} from '../types';

const VOLUME_KEYS: { key: keyof VolumeStatusInput; label: string; group: 'low' | 'high' }[] = [
  { key: 'turgor', label: 'ツルゴール低下', group: 'low' },
  { key: 'orthostatic', label: '起立性低血圧', group: 'low' },
  { key: 'weightLoss', label: '体重減少', group: 'low' },
  { key: 'edema', label: '浮腫', group: 'high' },
  { key: 'ascites', label: '腹水', group: 'high' },
  { key: 'jvd', label: '頸静脈怒張', group: 'high' },
];

function parseNum(v: string): number | undefined {
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const DRUG_TRIGGERS = [
  'SSRI / SNRI',
  'カルバマゼピン / オクスカルバゼピン',
  'シクロホスファミド',
  '抗精神病薬（ハロペリドール等）',
  'MDMA / 合成麻薬',
  'オピオイド',
  'NSAIDs',
  'バソプレシン製剤',
];

export default function Module5Differential() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);
  const drugs = useSettingsStore((s) => s.settings.drugAvailability);

  // ----- Stage 1 入力 -----
  const [urineOsm, setUrineOsm] = useState('');
  const [urineNa, setUrineNa] = useState('');
  const [urineK, setUrineK] = useState('');
  const [diuretic, setDiuretic] = useState<DifferentialInput['diuretic']>('none');
  const [volume, setVolume] = useState<VolumeStatusInput>({
    turgor: false,
    orthostatic: false,
    weightLoss: false,
    edema: false,
    ascites: false,
    jvd: false,
  });
  const [bunCrRatio, setBunCrRatio] = useState('');
  const [uricAcid, setUricAcid] = useState('');

  // ----- Stage 2 入力 -----
  const [exclusion, setExclusion] = useState<SiadhExclusion>({
    adrenalExcluded: false,
    thyroidExcluded: false,
    renalAssessed: false,
    drugReviewed: false,
  });
  const [cnsDisease, setCnsDisease] = useState(false);
  const [urineVolumeHigh, setUrineVolumeHigh] = useState(false);
  const [lowRenin, setLowRenin] = useState(false);
  const [lowAldosterone, setLowAldosterone] = useState(false);

  if (!session || session.correctionLimit === undefined || !session.demographics) {
    return <Navigate to="/limits" replace />;
  }

  const input: DifferentialInput = {
    urineOsm: parseNum(urineOsm),
    urineNa: parseNum(urineNa),
    urineK: parseNum(urineK),
    diuretic,
    volume,
    bunCrRatio: parseNum(bunCrRatio),
    uricAcid: parseNum(uricAcid),
  };

  const result = assessDifferential(input);
  const canAssess = input.urineOsm !== undefined && input.urineNa !== undefined;
  const isSiadhCandidate = result.category === 'siadh_candidate';

  // ----- Stage 2 計算 -----
  const mrheInput: MrheInput = {
    age: session.demographics.age,
    weightLoss: volume.weightLoss,
    orthostatic: volume.orthostatic,
    turgor: volume.turgor,
    bunCrRatio: input.bunCrRatio,
    uricAcid: input.uricAcid,
    lowRenin,
    lowAldosterone,
  };
  const cswInput: CswInput = {
    hasCnsDisease: cnsDisease,
    weightLoss: volume.weightLoss,
    orthostatic: volume.orthostatic,
    turgor: volume.turgor,
    bunCrRatio: input.bunCrRatio,
    uricAcid: input.uricAcid,
    urineVolumeHigh,
  };
  const mrhe = scoreMrhe(mrheInput);
  const csw = scoreCsw(cswInput);
  const furst = furstAssessment({
    urineNa: input.urineNa,
    urineK: input.urineK,
    serumNa: session.correctedNa ?? session.initialLabs?.serumNa ?? 0,
    urineOsm: input.urineOsm,
  });

  const allExcluded =
    exclusion.adrenalExcluded &&
    exclusion.thyroidExcluded &&
    exclusion.renalAssessed &&
    exclusion.drugReviewed;

  const forceMrheScreening = session.ageMode === 'elderly';

  // 最終カテゴリの判定
  let finalCategory: Stage2Snapshot['finalCategory'] = 'undetermined';
  if (mrhe.positive && !csw.positive) finalCategory = 'MRHE_suspected';
  else if (csw.positive && !mrhe.positive) finalCategory = 'CSW_suspected';
  else if (isSiadhCandidate && allExcluded && !mrhe.positive && !csw.positive)
    finalCategory = 'SIADH';

  const highlightCol: 'SIADH' | 'CSW' | 'MRHE' | undefined =
    finalCategory === 'SIADH'
      ? 'SIADH'
      : finalCategory === 'CSW_suspected'
        ? 'CSW'
        : finalCategory === 'MRHE_suspected'
          ? 'MRHE'
          : undefined;

  const toggle = (k: keyof VolumeStatusInput) =>
    setVolume((v) => ({ ...v, [k]: !v[k] }));

  const onProceed = () => {
    const stage2: Stage2Snapshot = {
      siadhExclusion: isSiadhCandidate ? exclusion : undefined,
      siadhConfirmed: finalCategory === 'SIADH',
      mrhe: isSiadhCandidate || forceMrheScreening ? { input: mrheInput, score: mrhe } : undefined,
      csw: cnsDisease ? { input: cswInput, score: csw } : undefined,
      furst: furst ?? undefined,
      finalCategory,
    };

    update({
      differentialInput: {
        urineOsm: input.urineOsm,
        urineNa: input.urineNa,
        urineK: input.urineK,
        diuretic,
        volume,
        bunCrRatio: input.bunCrRatio,
        uricAcid: input.uricAcid,
      },
      differentialResult: {
        category: result.category,
        label: result.label,
        recommendation: result.recommendation,
        stage2Required: result.stage2Required,
      },
      stage2,
    });
    void audit(
      'module5.confirm',
      session.sessionId,
      `stage1=${result.category} final=${finalCategory}`,
    );
    navigate('/prediction');
  };

  const additionalDrugs: string[] = [];
  if (drugs.tolvaptan) additionalDrugs.push('低用量トルバプタン 7.5 mg/日（SIADHに保険適用）');
  if (drugs.urea) additionalDrugs.push('尿素 15〜60 g/日（浸透圧利尿）');
  if (drugs.sglt2) additionalDrugs.push('SGLT2阻害薬（適応外、浸透圧利尿）');

  return (
    <Layout title="モジュール 5 · 鑑別（第一段階＋第二段階）" step={{ current: 5, total: 6 }}>
      <div className="space-y-5">
        {/* ====== Stage 1 ====== */}
        <section className="card">
          <h2 className="text-lg font-bold mb-4">① 尿検査</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">尿浸透圧 (mOsm/kg)</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={urineOsm}
                onChange={(e) => setUrineOsm(e.target.value)}
                placeholder="例: 450"
              />
            </div>
            <div>
              <label className="label">尿Na (mEq/L)</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={urineNa}
                onChange={(e) => setUrineNa(e.target.value)}
                placeholder="例: 55"
              />
            </div>
            <div>
              <label className="label">尿K (mEq/L)</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={urineK}
                onChange={(e) => setUrineK(e.target.value)}
                placeholder="例: 25"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">② 利尿薬の使用</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['none', 'thiazide', 'loop'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={diuretic === v ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setDiuretic(v)}
              >
                {v === 'none' ? 'なし' : v === 'thiazide' ? 'サイアザイド系' : 'ループ系'}
              </button>
            ))}
          </div>
          {diuretic === 'thiazide' && (
            <p className="text-xs text-yellow-700 mt-2">
              サイアザイドは薬剤性として最優先の鑑別となります
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">③ 体液量評価</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">減少を示唆</h3>
              <div className="space-y-2">
                {VOLUME_KEYS.filter((v) => v.group === 'low').map((v) => (
                  <label
                    key={v.key}
                    className={`checkbox-row ${volume[v.key] ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5"
                      checked={volume[v.key]}
                      onChange={() => toggle(v.key)}
                    />
                    <div className="font-medium">{v.label}</div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">過剰を示唆</h3>
              <div className="space-y-2">
                {VOLUME_KEYS.filter((v) => v.group === 'high').map((v) => (
                  <label
                    key={v.key}
                    className={`checkbox-row ${volume[v.key] ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5"
                      checked={volume[v.key]}
                      onChange={() => toggle(v.key)}
                    />
                    <div className="font-medium">{v.label}</div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">④ 補助参考値（任意）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">BUN / Cr 比</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={bunCrRatio}
                onChange={(e) => setBunCrRatio(e.target.value)}
                placeholder="> 20 で脱水傾向"
              />
            </div>
            <div>
              <label className="label">尿酸 (mg/dL)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={uricAcid}
                onChange={(e) => setUricAcid(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Stage 1 判定 */}
        {canAssess ? (
          <section className="card bg-slate-900 text-white border-slate-800">
            <p className="text-xs text-slate-300 mb-1">第一段階ツリー判定</p>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-2xl font-bold text-yellow-300">{result.label}</h3>
            </div>
            <ul className="space-y-1 text-sm list-disc list-inside mb-3">
              {result.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <div className="bg-white/10 border border-white/20 rounded-lg p-3 text-sm">
              <div className="font-semibold text-green-300 mb-1">推奨方針</div>
              <div>{result.recommendation}</div>
            </div>
            {result.contraindicated && (
              <div className="bg-red-500/20 border border-red-400 rounded-lg p-3 text-sm mt-3">
                <div className="font-semibold text-red-200 mb-1">禁忌 / 注意</div>
                <ul className="list-disc list-inside">
                  {result.contraindicated.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <Alert level="info" title="尿浸透圧と尿Naを入力してください">
            両方が入力されると鑑別ツリー判定と第二段階評価が自動的に走ります。
          </Alert>
        )}

        {/* ====== Stage 2 ====== */}
        {(isSiadhCandidate || forceMrheScreening) && (
          <div className="space-y-5">
            <div className="relative">
              <div className="absolute inset-x-0 -top-2 flex justify-center">
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  第二段階（SIADH除外 & MRHE/CSW 鑑別）
                </span>
              </div>
            </div>

            {/* SIADH 除外診断ゲート */}
            {isSiadhCandidate && (
              <section className={`card ${allExcluded ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}`}>
                <h2 className="text-lg font-bold mb-2">⑤ SIADH 除外診断</h2>
                <p className="text-sm text-gray-700 mb-3">
                  SIADH を確定する前に以下を完了してください（未完了は「暫定」扱い）。
                </p>
                <div className="space-y-2">
                  <label className={`checkbox-row ${exclusion.adrenalExcluded ? 'bg-white' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5"
                      checked={exclusion.adrenalExcluded}
                      onChange={(e) =>
                        setExclusion((x) => ({ ...x, adrenalExcluded: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">副腎不全の除外</div>
                      <div className="text-xs text-gray-600">
                        コルチゾール / ACTH（必要なら迅速ACTH試験）
                      </div>
                    </div>
                  </label>
                  <label className={`checkbox-row ${exclusion.thyroidExcluded ? 'bg-white' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5"
                      checked={exclusion.thyroidExcluded}
                      onChange={(e) =>
                        setExclusion((x) => ({ ...x, thyroidExcluded: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">甲状腺機能低下の除外</div>
                      <div className="text-xs text-gray-600">TSH / FT4</div>
                    </div>
                  </label>
                  <label className={`checkbox-row ${exclusion.renalAssessed ? 'bg-white' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5"
                      checked={exclusion.renalAssessed}
                      onChange={(e) =>
                        setExclusion((x) => ({ ...x, renalAssessed: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">腎機能評価</div>
                      <div className="text-xs text-gray-600">eGFR / 尿検査</div>
                    </div>
                  </label>
                  <label className={`checkbox-row ${exclusion.drugReviewed ? 'bg-white' : ''}`}>
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5"
                      checked={exclusion.drugReviewed}
                      onChange={(e) =>
                        setExclusion((x) => ({ ...x, drugReviewed: e.target.checked }))
                      }
                    />
                    <div>
                      <div className="font-semibold">薬剤性の評価</div>
                      <details className="text-xs text-gray-600 mt-1">
                        <summary className="cursor-pointer">確認すべき薬剤一覧</summary>
                        <ul className="list-disc list-inside mt-1">
                          {DRUG_TRIGGERS.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </label>
                </div>
                {!allExcluded && (
                  <p className="text-xs text-yellow-800 mt-3">
                    ⚠ 未チェック項目があります。この状態では「暫定SIADH疑い」のみで進行できます。
                  </p>
                )}
              </section>
            )}

            {/* MRHE スクリーニング */}
            <section
              className={`card ${mrhe.positive ? 'bg-red-50 border-red-400' : 'bg-white'}`}
            >
              <h2 className="text-lg font-bold mb-2">
                ⑥ MRHE スクリーニング
                {forceMrheScreening && (
                  <span className="badge-danger ml-2">高齢者モード · 必須</span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                高齢者で体液減少所見 + BUN/Cr高 + 尿酸低下なしのパターン。水制限は禁忌。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`checkbox-row ${lowRenin ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5"
                    checked={lowRenin}
                    onChange={(e) => setLowRenin(e.target.checked)}
                  />
                  <div className="font-medium">血漿レニン活性 低値</div>
                </label>
                <label className={`checkbox-row ${lowAldosterone ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5"
                    checked={lowAldosterone}
                    onChange={(e) => setLowAldosterone(e.target.checked)}
                  />
                  <div className="font-medium">アルドステロン 低値</div>
                </label>
              </div>

              <div className="mt-3 bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">スコア</span>
                  <span className={`text-2xl font-bold ${mrhe.positive ? 'text-red-600' : 'text-gray-700'}`}>
                    {mrhe.score}
                  </span>
                </div>
                <ul className="mt-2 text-xs text-gray-700 list-disc list-inside space-y-0.5">
                  {mrhe.reasons.length > 0
                    ? mrhe.reasons.map((r, i) => <li key={i}>{r}</li>)
                    : <li>該当所見なし</li>}
                </ul>
              </div>

              {mrhe.positive && (
                <Alert level="danger" title="MRHE 疑い">
                  血漿レニン活性・アルドステロン測定を推奨。
                  <strong>水制限は禁忌。</strong>
                  治療: 食塩摂取 + フルドロコルチゾン
                  {drugs.fludrocortisone ? '（本院で使用可）' : '（本院設定では使用不可）'}。
                </Alert>
              )}
            </section>

            {/* CSW スクリーニング */}
            <section
              className={`card ${csw.positive ? 'bg-red-50 border-red-400' : 'bg-white'}`}
            >
              <h2 className="text-lg font-bold mb-2">⑦ CSW スクリーニング</h2>
              <p className="text-sm text-gray-600 mb-3">
                急性脳神経疾患 + 体液減少 + 尿酸排泄亢進パターン。水制限は禁忌。
              </p>
              <div className="space-y-2">
                <label className={`checkbox-row ${cnsDisease ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5"
                    checked={cnsDisease}
                    onChange={(e) => setCnsDisease(e.target.checked)}
                  />
                  <div>
                    <div className="font-medium">急性脳神経疾患の既往 / 合併</div>
                    <div className="text-xs text-gray-600">
                      くも膜下出血 / 頭部外傷 / 脳腫瘍 / 術後 等
                    </div>
                  </div>
                </label>
                <label className={`checkbox-row ${urineVolumeHigh ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5"
                    checked={urineVolumeHigh}
                    onChange={(e) => setUrineVolumeHigh(e.target.checked)}
                  />
                  <div className="font-medium">尿量増加（多尿傾向）</div>
                </label>
              </div>

              <div className="mt-3 bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">スコア</span>
                  <span className={`text-2xl font-bold ${csw.positive ? 'text-red-600' : 'text-gray-700'}`}>
                    {csw.score}
                  </span>
                </div>
                <ul className="mt-2 text-xs text-gray-700 list-disc list-inside space-y-0.5">
                  {csw.reasons.length > 0
                    ? csw.reasons.map((r, i) => <li key={i}>{r}</li>)
                    : <li>該当所見なし</li>}
                </ul>
              </div>

              {csw.positive && (
                <Alert level="danger" title="CSW 疑い">
                  急性脳神経疾患の合併下。生理食塩水による補充が適応。
                  <strong>水制限は禁忌。</strong>
                </Alert>
              )}
            </section>

            {/* Furst 比 */}
            {furst && (
              <section className={`card ${furst.refractory ? 'bg-yellow-50 border-yellow-400' : ''}`}>
                <h2 className="text-lg font-bold mb-2">⑧ Furst 比（水制限不応予測）</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900 text-white rounded-lg p-4">
                    <div className="text-xs text-slate-300">
                      (尿Na + 尿K) / 血清Na
                    </div>
                    <div
                      className={`text-4xl font-bold tabular-nums ${furst.refractory ? 'text-red-300' : 'text-green-300'}`}
                    >
                      {furst.ratio.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <ul className="list-disc list-inside space-y-1">
                      {furst.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {furst.refractory && additionalDrugs.length > 0 && (
                  <div className="mt-3 bg-white border border-yellow-400 rounded-lg p-3">
                    <div className="text-sm font-semibold text-yellow-900 mb-1">
                      水制限単独では効果不十分と予測 — 追加治療候補
                    </div>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {additionalDrugs.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500 mt-2">
                      表示内容は「設定」画面の処方可否で変更できます。
                    </p>
                  </div>
                )}
                {furst.refractory && additionalDrugs.length === 0 && (
                  <p className="text-xs text-gray-500 mt-3">
                    設定で追加治療候補の表示がすべて無効になっています。
                  </p>
                )}
              </section>
            )}

            {/* 三者鑑別テーブル */}
            <section className="card">
              <h2 className="text-lg font-bold mb-3">⑨ 三者鑑別比較表</h2>
              <ThreeWayTable highlight={highlightCol} />
              {highlightCol && (
                <p className="text-xs text-gray-500 mt-2">
                  現時点のハイライト: <strong>{highlightCol}</strong>
                </p>
              )}
            </section>

            {/* 最終カテゴリ表示 */}
            <section
              className={`card ${
                finalCategory === 'MRHE_suspected' || finalCategory === 'CSW_suspected'
                  ? 'bg-red-50 border-red-400'
                  : finalCategory === 'SIADH'
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-slate-50'
              }`}
            >
              <h2 className="text-lg font-bold mb-2">⑩ 第二段階 最終判定</h2>
              <p className="text-2xl font-bold">
                {finalCategory === 'SIADH' && 'SIADH（除外診断完了）'}
                {finalCategory === 'MRHE_suspected' && 'MRHE 疑い'}
                {finalCategory === 'CSW_suspected' && 'CSW 疑い'}
                {finalCategory === 'undetermined' &&
                  (isSiadhCandidate
                    ? allExcluded
                      ? 'SIADH（スコアで他の可能性も拾えず確定）'
                      : '暫定 SIADH 疑い（除外診断未完了）'
                    : '第二段階 評価中')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                この判定はあくまで参考です。実際の診断は臨床経過と追加検査を総合してください。
              </p>
            </section>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-primary flex-1 text-lg" onClick={onProceed}>
            次へ（統合予測シミュレーション）
          </button>
          <button className="btn-secondary sm:w-48" onClick={() => navigate('/limits')}>
            戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
