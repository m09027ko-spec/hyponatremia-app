import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { assessRiskLevel, correctionParameters } from '../lib/calculations';
import { audit } from '../db/dexie';
import type { OdsRiskFactors } from '../types';

const FACTORS: { key: keyof OdsRiskFactors; label: string; hint?: string }[] = [
  {
    key: 'initialNaBelow105',
    label: '初回血清Na < 105 mEq/L',
    hint: '極度の慢性低Na血症ほどODSリスクが上がる',
  },
  { key: 'alcoholism', label: 'アルコール多飲', hint: 'チアミン欠乏・低栄養を合併しやすい' },
  { key: 'malnutrition', label: '低栄養', hint: '体重減少、るい痩、食思不振持続' },
  { key: 'hypokalemia', label: '低K血症（K < 3.0 mEq/L 目安）' },
  { key: 'advancedLiverDisease', label: '進行した肝疾患', hint: '肝硬変・肝不全' },
];

export default function Module4Limits() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);

  const [factors, setFactors] = useState<OdsRiskFactors>(
    session?.odsRiskFactors ?? {
      initialNaBelow105: (session?.initialLabs?.serumNa ?? 999) < 105,
      alcoholism: false,
      malnutrition: false,
      hypokalemia: (session?.initialLabs?.serumK ?? 999) < 3.0,
      advancedLiverDisease: false,
    },
  );

  if (!session || !session.acuity) {
    return <Navigate to="/acuity" replace />;
  }

  const risk = assessRiskLevel(factors);
  const { limit, target } = correctionParameters(risk);

  const toggle = (key: keyof OdsRiskFactors) =>
    setFactors((prev) => ({ ...prev, [key]: !prev[key] }));

  const confirm = () => {
    update({
      odsRiskFactors: factors,
      riskLevel: risk,
      correctionLimit: limit,
      correctionTargetMin: target.min,
      correctionTargetMax: target.max,
    });
    void audit(
      'module4.confirm',
      session.sessionId,
      `risk=${risk} limit=${limit} target=${target.min}-${target.max}`,
    );
    navigate('/differential');
  };

  return (
    <Layout title="モジュール 4 · 治療目標と安全限界" step={{ current: 4, total: 6 }}>
      <div className="space-y-5">
        <section className="card">
          <h2 className="text-lg font-bold mb-2">ODS 高リスク因子</h2>
          <p className="text-sm text-gray-600 mb-4">
            1つでも該当すると高リスク扱い（24h上限 8 / 目標 4〜6 mEq/L）。
            該当なしで標準リスク扱い（24h上限 10 / 目標 4〜8 mEq/L）。
          </p>
          <div className="space-y-2">
            {FACTORS.map((f) => (
              <label
                key={f.key}
                className={`checkbox-row ${factors[f.key] ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5"
                  checked={factors[f.key]}
                  onChange={() => toggle(f.key)}
                />
                <div>
                  <div className="font-semibold">{f.label}</div>
                  {f.hint && <div className="text-xs text-gray-600">{f.hint}</div>}
                </div>
              </label>
            ))}
          </div>
        </section>

        <section
          className={`card ${risk === 'highRisk' ? 'bg-red-50 border-red-400' : 'bg-green-50 border-green-400'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">
              判定: {risk === 'highRisk' ? '高リスク' : '標準リスク'}
            </h3>
            <span className={risk === 'highRisk' ? 'badge-danger' : 'badge-safe'}>
              {risk === 'highRisk' ? 'HIGH RISK' : 'STANDARD'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-gray-600">24時間補正上限</div>
              <div className="text-4xl font-bold text-red-600 tabular-nums">
                {limit}
              </div>
              <div className="text-xs text-gray-500">mEq/L / 24h</div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-gray-600">目標補正幅</div>
              <div className="text-4xl font-bold text-green-700 tabular-nums">
                {target.min}–{target.max}
              </div>
              <div className="text-xs text-gray-500">mEq/L / 24h</div>
            </div>
          </div>
        </section>

        <Alert level="info" title="以降の画面で常時表示されます">
          ここで確定した上限・目標域は、以降のモジュール（予測シミュレーション等）の安全限界として全画面で参照されます。
          臨床経過中にリスク因子が変化した場合は本画面に戻り再評価してください。
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-primary flex-1 text-lg" onClick={confirm}>
            確定して次へ
          </button>
          <button className="btn-secondary sm:w-48" onClick={() => navigate('/emergency')}>
            戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
