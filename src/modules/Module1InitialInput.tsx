import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import {
  correctedSodiumByGlucose,
  pseudoHyponatremiaWarning,
  inRange,
} from '../lib/calculations';
import { NA_RANGE, WEIGHT_RANGE, AGE_ELDERLY_THRESHOLD } from '../lib/constants';
import { audit } from '../db/dexie';
import type { Sex } from '../types';

type NumStr = string; // フォーム入力は文字列で扱う

function parseNum(v: NumStr): number | undefined {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function Module1InitialInput() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);

  const [age, setAge] = useState<NumStr>('');
  const [sex, setSex] = useState<Sex>('M');
  const [weight, setWeight] = useState<NumStr>('');
  const [serumNa, setSerumNa] = useState<NumStr>('');
  const [serumK, setSerumK] = useState<NumStr>('');
  const [glucose, setGlucose] = useState<NumStr>('');
  const [bun, setBun] = useState<NumStr>('');
  const [cr, setCr] = useState<NumStr>('');
  const [uricAcid, setUricAcid] = useState<NumStr>('');
  const [albumin, setAlbumin] = useState<NumStr>('');
  const [totalProtein, setTotalProtein] = useState<NumStr>('');
  const [triglyceride, setTriglyceride] = useState<NumStr>('');

  if (!session) return <Navigate to="/mode" replace />;

  const naNum = parseNum(serumNa);
  const glucoseNum = parseNum(glucose);
  const weightNum = parseNum(weight);
  const ageNum = parseNum(age);
  const tgNum = parseNum(triglyceride);
  const tpNum = parseNum(totalProtein);

  const corrected =
    naNum !== undefined && glucoseNum !== undefined
      ? correctedSodiumByGlucose(naNum, glucoseNum)
      : undefined;

  const pseudoMsg = pseudoHyponatremiaWarning({
    triglyceride: tgNum,
    totalProtein: tpNum,
  });

  const naOutOfRange =
    naNum !== undefined && !inRange(naNum, NA_RANGE.min, NA_RANGE.max);
  const weightOutOfRange =
    weightNum !== undefined && !inRange(weightNum, WEIGHT_RANGE.min, WEIGHT_RANGE.max);

  const canProceed =
    ageNum !== undefined &&
    weightNum !== undefined &&
    !weightOutOfRange &&
    naNum !== undefined &&
    !naOutOfRange &&
    glucoseNum !== undefined &&
    corrected !== undefined;

  const onConfirm = () => {
    if (!canProceed) return;
    const isElderly = (ageNum ?? 0) >= AGE_ELDERLY_THRESHOLD;
    update({
      demographics: { age: ageNum!, sex, weight: weightNum! },
      initialLabs: {
        serumNa: naNum!,
        serumK: parseNum(serumK),
        glucose: glucoseNum!,
        bun: parseNum(bun),
        cr: parseNum(cr),
        uricAcid: parseNum(uricAcid),
        albumin: parseNum(albumin),
        totalProtein: tpNum,
        triglyceride: tgNum,
      },
      correctedNa: Math.round(corrected! * 10) / 10,
      pseudoWarning: pseudoMsg ?? undefined,
      isTrueHypotonic: true,
      ageMode: isElderly ? 'elderly' : session.ageMode,
    });
    void audit('module1.confirm', session.sessionId);
    navigate('/acuity');
  };

  return (
    <Layout title="モジュール 1 · 初期入力" step={{ current: 1, total: 6 }}>
      <div className="space-y-5">
        <section className="card">
          <h2 className="text-lg font-bold mb-4">患者基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">年齢（歳）</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="例: 72"
              />
              {ageNum !== undefined && ageNum >= AGE_ELDERLY_THRESHOLD && (
                <p className="text-xs text-yellow-700 mt-1">
                  ≥ {AGE_ELDERLY_THRESHOLD}歳 → 高齢者モードに切替、MRHE鑑別を強制します
                </p>
              )}
            </div>
            <div>
              <label className="label">性別</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 ${sex === 'M' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSex('M')}
                  type="button"
                >
                  男性
                </button>
                <button
                  className={`flex-1 ${sex === 'F' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSex('F')}
                  type="button"
                >
                  女性
                </button>
              </div>
            </div>
            <div>
              <label className="label">体重（kg）</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="例: 52.0"
              />
              {weightOutOfRange && (
                <p className="text-xs text-red-600 mt-1">
                  範囲外（{WEIGHT_RANGE.min}〜{WEIGHT_RANGE.max} kg）。入力値を確認してください。
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-4">必須検査値</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">血清Na（mEq/L）</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={serumNa}
                onChange={(e) => setSerumNa(e.target.value)}
                placeholder="例: 118"
              />
              {naOutOfRange && (
                <p className="text-xs text-red-600 mt-1">
                  範囲外（{NA_RANGE.min}〜{NA_RANGE.max}）。単位・入力を確認。
                </p>
              )}
            </div>
            <div>
              <label className="label">血清K（mEq/L）</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={serumK}
                onChange={(e) => setSerumK(e.target.value)}
                placeholder="例: 3.6"
              />
            </div>
            <div>
              <label className="label">血糖値（mg/dL）</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                placeholder="例: 110"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-4">補助検査値（任意）</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">BUN (mg/dL)</label>
              <input className="input" type="number" step="0.1" value={bun} onChange={(e) => setBun(e.target.value)} />
            </div>
            <div>
              <label className="label">Cr (mg/dL)</label>
              <input className="input" type="number" step="0.01" value={cr} onChange={(e) => setCr(e.target.value)} />
            </div>
            <div>
              <label className="label">尿酸 (mg/dL)</label>
              <input className="input" type="number" step="0.1" value={uricAcid} onChange={(e) => setUricAcid(e.target.value)} />
            </div>
            <div>
              <label className="label">Alb (g/dL)</label>
              <input className="input" type="number" step="0.1" value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
            </div>
            <div>
              <label className="label">総蛋白 (g/dL)</label>
              <input className="input" type="number" step="0.1" value={totalProtein} onChange={(e) => setTotalProtein(e.target.value)} />
            </div>
            <div>
              <label className="label">TG (mg/dL)</label>
              <input className="input" type="number" step="1" value={triglyceride} onChange={(e) => setTriglyceride(e.target.value)} />
            </div>
          </div>
        </section>

        {pseudoMsg && (
          <Alert level="caution" title="偽性低Na血症の可能性">
            {pseudoMsg}
          </Alert>
        )}

        {corrected !== undefined && naNum !== undefined && glucoseNum !== undefined && (
          <section className="card bg-slate-900 text-white border-slate-800">
            <h2 className="text-sm text-slate-300 mb-1">Hillier式による血糖補正Na</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-yellow-300 tabular-nums">
                {corrected.toFixed(1)}
              </span>
              <span className="text-lg">mEq/L</span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              補正式: {naNum.toFixed(1)} + 2.4 × ({glucoseNum} − 100) / 100
              {glucoseNum <= 100 && ' （血糖 ≤ 100 mg/dL のため補正なし）'}
            </p>
          </section>
        )}

        <Alert level="info" title="真の低張性低Na血症の確認">
          偽性低Na（高TG・異常蛋白）・高血糖性低Na（補正後で正常化）を除外したうえで、
          真の低張性低Na血症として扱ってよいかを確認してください。
          血清浸透圧（直接測定 &lt; 275 mOsm/kg）があれば確実です。
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="btn-primary flex-1 text-lg"
            disabled={!canProceed}
            onClick={onConfirm}
          >
            真の低張性として次へ進む
          </button>
          <button
            className="btn-secondary sm:w-48"
            onClick={() => navigate('/mode')}
            type="button"
          >
            戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
