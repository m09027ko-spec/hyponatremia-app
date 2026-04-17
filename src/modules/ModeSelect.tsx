import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import { useSettingsStore } from '../store/settings';
import Layout from '../components/Layout';
import type { Strategy, AgeMode } from '../types';

export default function ModeSelect() {
  const navigate = useNavigate();
  const consented = useSessionStore((s) => s.consented);
  const startNewSession = useSessionStore((s) => s.startNewSession);
  const defaultStrategy = useSettingsStore((s) => s.settings.defaultStrategy);

  const [strategy, setStrategy] = useState<Strategy>(defaultStrategy);
  const [ageMode, setAgeMode] = useState<AgeMode>('standard');

  if (!consented) return <Navigate to="/" replace />;

  const startClinical = () => {
    startNewSession({ mode: 'clinical', strategy, ageMode });
    navigate('/input');
  };

  return (
    <Layout title="モード選択">
      <div className="space-y-5">
        <section className="card">
          <h2 className="text-lg font-bold mb-3">治療戦略</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`checkbox-row ${strategy === 'reactive' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <input
                type="radio"
                name="strategy"
                className="mt-1"
                checked={strategy === 'reactive'}
                onChange={() => setStrategy('reactive')}
              />
              <div>
                <div className="font-semibold">Reactive（既定）</div>
                <div className="text-xs text-gray-600 mt-1">
                  過補正を検知したらDDAVPで制御する従来型。
                </div>
              </div>
            </label>
            <label className={`checkbox-row ${strategy === 'proactive' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <input
                type="radio"
                name="strategy"
                className="mt-1"
                checked={strategy === 'proactive'}
                onChange={() => setStrategy('proactive')}
              />
              <div>
                <div className="font-semibold">Proactive（DDAVP Clamp）</div>
                <div className="text-xs text-gray-600 mt-1">
                  最初からDDAVPで尿濃縮を固定し、3%NaClを計画投与。
                </div>
              </div>
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">年齢モード</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`checkbox-row ${ageMode === 'standard' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <input
                type="radio"
                name="ageMode"
                className="mt-1"
                checked={ageMode === 'standard'}
                onChange={() => setAgeMode('standard')}
              />
              <div>
                <div className="font-semibold">通常</div>
                <div className="text-xs text-gray-600 mt-1">
                  TBW係数 男0.6 / 女0.5。
                </div>
              </div>
            </label>
            <label className={`checkbox-row ${ageMode === 'elderly' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <input
                type="radio"
                name="ageMode"
                className="mt-1"
                checked={ageMode === 'elderly'}
                onChange={() => setAgeMode('elderly')}
              />
              <div>
                <div className="font-semibold">高齢者モード（≥75歳）</div>
                <div className="text-xs text-gray-600 mt-1">
                  TBW係数 男0.5 / 女0.45。MRHE鑑別を強制。
                </div>
              </div>
            </label>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-primary flex-1 text-lg" onClick={startClinical}>
            臨床モードで開始
          </button>
          <button
            className="btn-secondary sm:w-48"
            onClick={() => navigate('/learning')}
          >
            学習モード
          </button>
        </div>
        <div className="text-center">
          <button
            className="text-sm text-blue-700 underline hover:text-blue-900"
            onClick={() => navigate('/settings')}
          >
            施設ローカルルール（設定）を開く
          </button>
        </div>
      </div>
    </Layout>
  );
}
