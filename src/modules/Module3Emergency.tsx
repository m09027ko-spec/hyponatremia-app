import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { emergencyBolusVolume } from '../lib/calculations';
import { EMERGENCY_BOLUS } from '../lib/constants';
import { audit } from '../db/dexie';
import type { EmergencySymptoms } from '../types';

const SYMPTOMS: { key: keyof EmergencySymptoms; label: string; description?: string }[] = [
  { key: 'vomiting', label: '嘔吐', description: '反復性・持続性' },
  { key: 'seizure', label: '痙攣' },
  { key: 'deepDrowsiness', label: '深い傾眠' },
  { key: 'coma', label: '昏睡' },
  { key: 'gcsDrop', label: 'GCS 低下', description: '急性の意識レベル低下' },
  { key: 'other', label: 'その他の重篤神経症状' },
];

export default function Module3Emergency() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);

  const [symptoms, setSymptoms] = useState<EmergencySymptoms>({
    vomiting: false,
    seizure: false,
    deepDrowsiness: false,
    coma: false,
    gcsDrop: false,
    other: false,
  });
  const [confirmedBolus, setConfirmedBolus] = useState(false);
  const [bolusStartedAt, setBolusStartedAt] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  useEffect(() => {
    if (!bolusStartedAt) return;
    const t = setInterval(() => {
      const elapsed = (Date.now() - bolusStartedAt.getTime()) / 1000;
      const remaining = EMERGENCY_BOLUS.bolusMinutes * 60 - elapsed;
      setRemainingSec(Math.max(0, Math.round(remaining)));
    }, 250);
    return () => clearInterval(t);
  }, [bolusStartedAt]);

  if (!session || !session.acuity) {
    return <Navigate to="/acuity" replace />;
  }

  const hasSevere = Object.values(symptoms).some(Boolean);
  const weight = session.demographics?.weight ?? 0;
  const bolusMl = emergencyBolusVolume(weight);

  const toggle = (key: keyof EmergencySymptoms) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startBolus = () => {
    if (!confirmedBolus) return;
    const now = new Date();
    setBolusStartedAt(now);
    update({
      emergencySymptoms: symptoms,
      emergencyBolusStartedAt: now.toISOString(),
    });
    void audit('module3.bolusStart', session.sessionId, `${bolusMl}mL`);
  };

  const proceed = () => {
    update({ emergencySymptoms: symptoms });
    void audit('module3.proceed', session.sessionId, hasSevere ? 'severe' : 'none');
    navigate('/limits');
  };

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  return (
    <Layout title="モジュール 3 · 緊急トリアージ" step={{ current: 3, total: 6 }}>
      <div className="space-y-5">
        <section className="card">
          <h2 className="text-lg font-bold mb-2">重篤な神経症状の有無</h2>
          <p className="text-sm text-gray-600 mb-4">
            該当するものを選択。1つでも該当で緊急プロトコル対象。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SYMPTOMS.map((s) => (
              <label key={s.key} className={`checkbox-row ${symptoms[s.key] ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5"
                  checked={symptoms[s.key]}
                  onChange={() => toggle(s.key)}
                />
                <div>
                  <div className="font-semibold">{s.label}</div>
                  {s.description && (
                    <div className="text-xs text-gray-600">{s.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </section>

        {hasSevere && (
          <section className="bg-red-50 border-2 border-red-500 rounded-xl p-5 animate-flash">
            <div className="badge-danger mb-2">Level 3 · 緊急プロトコル</div>
            <h3 className="text-xl font-bold text-red-900 mb-3">
              重症低Na血症 — 高張食塩水ボーラス
            </h3>
            <div className="bg-white rounded-lg p-4 border border-red-300 space-y-2">
              <p className="text-sm">指示内容:</p>
              <p className="text-base">
                <strong>3% 高張食塩水 </strong>
                <span className="text-3xl font-bold text-danger tabular-nums">
                  {bolusMl}
                </span>{' '}
                <span className="text-lg">mL</span>
                <span className="text-sm text-gray-600">
                  {' '}（2 mL/kg × {weight} kg、最大 {EMERGENCY_BOLUS.maxVolumeMl} mL）
                </span>
              </p>
              <p className="text-base">
                投与時間: <strong>{EMERGENCY_BOLUS.bolusMinutes} 分</strong>でボーラス静注
              </p>
              <p className="text-sm text-gray-700">
                目標: 最初の数時間でNaを <strong>4〜6 mEq/L 上昇</strong>。
                20分後に再測定し、上昇 &lt; 5 mEq/L かつ症状改善なしなら最大2回までボーラス反復可。
              </p>
            </div>

            <label className="checkbox-row mt-3 bg-white">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5"
                checked={confirmedBolus}
                onChange={(e) => setConfirmedBolus(e.target.checked)}
              />
              <div>
                <div className="font-semibold">
                  主治医判断として上記ボーラスを施行することを確認しました
                </div>
                <div className="text-xs text-gray-600">
                  本アプリは推奨表示のみです。自動処方は行いません。
                </div>
              </div>
            </label>

            {!bolusStartedAt ? (
              <button
                className="btn-danger w-full text-lg mt-3"
                disabled={!confirmedBolus}
                onClick={startBolus}
              >
                ボーラス投与開始 · タイマー起動
              </button>
            ) : (
              <div className="mt-4 bg-slate-900 text-white rounded-lg p-4 text-center">
                <p className="text-xs text-slate-300 mb-1">20分タイマー</p>
                <p className="text-6xl font-mono font-bold tabular-nums">
                  {mm}:{ss}
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  完了時に血清Naを再測定し、上昇幅を確認してください。
                </p>
              </div>
            )}
          </section>
        )}

        {!hasSevere && (
          <Alert level="info" title="緊急プロトコルの適応なし">
            重篤な神経症状は選択されていません。通常プロトコル（モジュール4以降）に進みます。
            症状が出現した場合は速やかに本画面に戻り再評価してください。
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-primary flex-1 text-lg" onClick={proceed}>
            次へ（治療目標設定）
          </button>
          <button className="btn-secondary sm:w-48" onClick={() => navigate('/acuity')}>
            戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
