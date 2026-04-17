import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import PredictionChart from '../components/PredictionChart';
import {
  totalBodyWater,
  buildIntegratedSeries,
  buildAdrogueSeries,
  insensibleLoss,
} from '../lib/calculations';
import { FLUID_PRESETS, DEFAULT_PREDICT_HOURS } from '../lib/constants';
import { audit } from '../db/dexie';

function parseNum(v: string): number | undefined {
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function Module6Prediction() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);

  const defaultNa =
    session?.measurements.at(-1)?.serumNa ??
    session?.correctedNa ??
    session?.initialLabs?.serumNa ??
    null;

  const [currentNaStr, setCurrentNaStr] = useState(
    defaultNa !== null ? String(defaultNa.toFixed(1)) : '',
  );
  const [fluidId, setFluidId] = useState<string>('saline');
  const [customNa, setCustomNa] = useState('');
  const [customK, setCustomK] = useState('');
  const [infVolumeMl, setInfVolumeMl] = useState('500');
  const [infDurationH, setInfDurationH] = useState('24');
  const [urineRate, setUrineRate] = useState('60');
  const [urineNa, setUrineNa] = useState('40');
  const [urineK, setUrineK] = useState('30');
  const [predictH, setPredictH] = useState(String(DEFAULT_PREDICT_HOURS));

  if (!session || !session.demographics || session.correctionLimit === undefined) {
    return <Navigate to="/limits" replace />;
  }

  const { weight, sex } = session.demographics;
  const tbw = totalBodyWater(weight, sex, session.ageMode);
  const currentNa = parseNum(currentNaStr) ?? NaN;

  const preset = FLUID_PRESETS.find((f) => f.id === fluidId) ?? FLUID_PRESETS[0];
  const isCustom = fluidId === 'custom';
  const infNa = isCustom ? parseNum(customNa) ?? 0 : preset.na;
  const infK = isCustom ? parseNum(customK) ?? 0 : preset.k;
  const infNaK = infNa + infK;

  const infVol = parseNum(infVolumeMl) ?? 0;
  const infDur = Math.max(0.1, parseNum(infDurationH) ?? 0.1);
  const uRate = parseNum(urineRate) ?? 0;
  const uNaK = (parseNum(urineNa) ?? 0) + (parseNum(urineK) ?? 0);
  const tPredict = Math.max(1, parseNum(predictH) ?? DEFAULT_PREDICT_HOURS);

  const canSim = Number.isFinite(currentNa) && currentNa > 0;

  const seriesParams = {
    currentNa,
    tbw,
    weight,
    infTotalMl: infVol,
    infDurationH: infDur,
    infNaK,
    urineRateMlPerH: uRate,
    urineNaK: uNaK,
    predictH: tPredict,
  };

  const integrated = canSim ? buildIntegratedSeries(seriesParams) : [];
  const adrogue = canSim ? buildAdrogueSeries(seriesParams) : [];
  const integratedFinal = integrated.at(-1)?.na ?? NaN;
  const adrogueFinal = adrogue.at(-1)?.na ?? NaN;
  const deltaFinal = Number.isFinite(integratedFinal) ? integratedFinal - currentNa : NaN;

  const limit = session.correctionLimit;
  const limitAbs = currentNa + limit; // 24h 上限 (絶対値)
  const exceedsLimit =
    Number.isFinite(integratedFinal) && tPredict >= 24
      ? integratedFinal > limitAbs
      : Number.isFinite(integratedFinal) &&
        integratedFinal > currentNa + (limit * tPredict) / 24;

  const iwl = insensibleLoss(weight, tPredict);

  const savePrediction = () => {
    if (!canSim) return;
    update({
      lastPrediction: {
        runAt: new Date().toISOString(),
        params: {
          currentNa,
          weight,
          tbw,
          fluidLabel: preset.label + (isCustom ? `（Na ${infNa}, K ${infK}）` : ''),
          fluidNaK: infNaK,
          infTotalMl: infVol,
          infDurationH: infDur,
          urineRateMlPerH: uRate,
          urineNaK: uNaK,
          predictH: tPredict,
        },
        integratedFinal,
        adrogueFinal,
        exceedsLimit,
      },
    });
    void audit('module6.save', session.sessionId, `final=${integratedFinal.toFixed(1)} excess=${exceedsLimit}`);
  };

  return (
    <Layout title="モジュール 6 · 統合予測シミュレーション" step={{ current: 6, total: 6 }}>
      <div className="space-y-5">
        <Alert level="caution" title="予測は必ず実測と乖離します">
          細胞内外のNaストア移動・尿流出量変化等により予測は外れます。
          必ず頻回な実測値で軌道修正してください。
        </Alert>

        <section className="card">
          <h2 className="text-lg font-bold mb-4">現在の状態</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">現在の血清Na</label>
              <input className="input" type="number" step="0.1" inputMode="decimal"
                value={currentNaStr} onChange={(e) => setCurrentNaStr(e.target.value)} />
              <div className="text-xs text-gray-500 mt-1">mEq/L</div>
            </div>
            <div>
              <label className="label">体重</label>
              <div className="text-xl font-semibold">{weight} kg</div>
              <div className="text-xs text-gray-500">入力済み</div>
            </div>
            <div>
              <label className="label">TBW</label>
              <div className="text-xl font-semibold">{tbw.toFixed(1)} L</div>
              <div className="text-xs text-gray-500">
                {sex === 'M' ? '男' : '女'} / {session.ageMode === 'elderly' ? '高齢者係数' : '通常係数'}
              </div>
            </div>
            <div>
              <label className="label">不感蒸泄（{tPredict}h）</label>
              <div className="text-xl font-semibold">{iwl.toFixed(2)} L</div>
              <div className="text-xs text-gray-500">15 mL/kg/日</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-4">輸液</h2>
          <label className="label">製剤プリセット</label>
          <select
            className="input mb-3"
            value={fluidId}
            onChange={(e) => setFluidId(e.target.value)}
          >
            {FLUID_PRESETS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} {f.note ? `(${f.note})` : ''}
              </option>
            ))}
          </select>

          {isCustom ? (
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="label">Na (mEq/L)</label>
                <input className="input" type="number" value={customNa}
                  onChange={(e) => setCustomNa(e.target.value)} />
              </div>
              <div>
                <label className="label">K (mEq/L)</label>
                <input className="input" type="number" value={customK}
                  onChange={(e) => setCustomK(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded mb-3 text-sm">
              Na <strong>{preset.na}</strong> mEq/L · K <strong>{preset.k}</strong> mEq/L ·
              [Na+K] <strong className="text-blue-700">{preset.na + preset.k}</strong> mEq/L
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">投与量 (mL)</label>
              <input className="input" type="number" value={infVolumeMl}
                onChange={(e) => setInfVolumeMl(e.target.value)} />
            </div>
            <div>
              <label className="label">投与時間 (h)</label>
              <input className="input" type="number" step="0.5" value={infDurationH}
                onChange={(e) => setInfDurationH(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-4">尿（予測値）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">尿量 (mL/h)</label>
              <input className="input" type="number" value={urineRate}
                onChange={(e) => setUrineRate(e.target.value)} />
            </div>
            <div>
              <label className="label">尿Na (mEq/L)</label>
              <input className="input" type="number" value={urineNa}
                onChange={(e) => setUrineNa(e.target.value)} />
            </div>
            <div>
              <label className="label">尿K (mEq/L)</label>
              <input className="input" type="number" value={urineK}
                onChange={(e) => setUrineK(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-4">予測期間</h2>
          <div className="flex gap-2 flex-wrap">
            {[6, 12, 24, 48].map((h) => (
              <button key={h} type="button"
                className={String(h) === predictH ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setPredictH(String(h))}>
                {h} h
              </button>
            ))}
            <input className="input w-28" type="number" step="1" value={predictH}
              onChange={(e) => setPredictH(e.target.value)} />
          </div>
        </section>

        {canSim && (
          <>
            <section className={`card ${exceedsLimit ? 'bg-red-50 border-red-400' : 'bg-white'}`}>
              <h2 className="text-lg font-bold mb-3">予測結果</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 text-white rounded-lg p-4">
                  <div className="text-xs text-slate-300">統合予測式 / {tPredict}h 後</div>
                  <div className={`text-4xl font-bold tabular-nums ${exceedsLimit ? 'text-red-400' : 'text-green-300'}`}>
                    {integratedFinal.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-300">mEq/L</div>
                  <div className="text-sm mt-2">
                    Δ = {deltaFinal > 0 ? '+' : ''}{deltaFinal.toFixed(1)} mEq/L
                  </div>
                </div>
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="text-xs text-gray-600">Adrogué-Madias（簡易）</div>
                  <div className="text-3xl font-bold tabular-nums text-orange-700">
                    {adrogueFinal.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">mEq/L</div>
                  <div className="text-xs text-gray-600 mt-2">
                    差: {(adrogueFinal - integratedFinal).toFixed(1)} mEq/L
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-xs text-red-800">24h 上限（絶対値）</div>
                  <div className="text-3xl font-bold tabular-nums text-red-700">
                    {limitAbs.toFixed(1)}
                  </div>
                  <div className="text-xs text-red-600">mEq/L を超えないこと</div>
                  {exceedsLimit && (
                    <div className="badge-danger mt-2">超過リスクあり</div>
                  )}
                </div>
              </div>

              {exceedsLimit && (
                <Alert level="danger" title="過補正リスクあり">
                  予測値が {tPredict}h の安全限界を超えています。
                  水利尿の発生（自由水排泄亢進）を疑い、直ちに 5% ブドウ糖液等への変更や
                  DDAVP の早期投与（Braking Protocol）を検討してください。
                </Alert>
              )}
            </section>

            <section className="card">
              <h2 className="text-lg font-bold mb-2">トラジェクトリ</h2>
              <PredictionChart
                currentNa={currentNa}
                limit={limit}
                targetMin={session.correctionTargetMin ?? 4}
                targetMax={session.correctionTargetMax ?? 8}
                predictH={tPredict}
                integrated={integrated}
                adrogue={adrogue}
              />
              <details className="mt-3 text-sm text-gray-700">
                <summary className="cursor-pointer font-semibold">
                  なぜ？ 2式の差異について
                </summary>
                <p className="mt-2 leading-relaxed">
                  Adrogué-Madias式は輸液を加えた効果のみを評価し、<strong>尿からのNa/自由水喪失や不感蒸泄を考慮しません</strong>。
                  このため、尿希釈が改善するSIADH治療中などでは<strong>過小評価</strong>になる傾向があります。
                  統合予測式は尿・不感蒸泄も差し引いて計算しており、より実測に近い挙動をします。
                  ただし、両式とも細胞内外のNaストア移動（solute shift）や患者個体差は考慮しないため、
                  <strong>必ず頻回な実測で補正</strong>してください。
                </p>
              </details>
            </section>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-primary flex-1 text-lg" disabled={!canSim}
            onClick={() => { savePrediction(); navigate('/summary'); }}>
            この予測を保存してサマリーへ
          </button>
          <button className="btn-secondary sm:w-48" onClick={() => navigate('/differential')}>
            戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
