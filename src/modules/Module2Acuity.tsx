import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { audit } from '../db/dexie';

type OnsetKnown = 'yes' | 'no' | null;

export default function Module2Acuity() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);

  const [onsetKnown, setOnsetKnown] = useState<OnsetKnown>(null);
  const [hours, setHours] = useState<string>('');

  if (!session || session.correctedNa === undefined) {
    return <Navigate to="/input" replace />;
  }

  const hoursNum = Number(hours);
  const hoursValid = onsetKnown === 'yes' && Number.isFinite(hoursNum) && hoursNum > 0;

  let verdict: 'acute' | 'chronic' | null = null;
  if (onsetKnown === 'no') {
    verdict = 'chronic';
  } else if (onsetKnown === 'yes' && hoursValid) {
    verdict = hoursNum < 48 ? 'acute' : 'chronic';
  }

  const canProceed = verdict !== null;

  const onProceed = () => {
    if (!verdict) return;
    update({
      acuity: verdict,
      acuityHours: onsetKnown === 'yes' && hoursValid ? hoursNum : undefined,
    });
    void audit('module2.confirm', session.sessionId, `acuity=${verdict}`);
    navigate('/emergency');
  };

  return (
    <Layout title="モジュール 2 · 急性 / 慢性の鑑別" step={{ current: 2, total: 6 }}>
      <div className="space-y-5">
        <section className="card">
          <h2 className="text-lg font-bold mb-2">発症時期は特定できますか？</h2>
          <p className="text-sm text-gray-600 mb-4">
            確実に特定できる場合のみ「特定できる」を選択してください。不明な場合は安全側として慢性扱いとします。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`checkbox-row ${onsetKnown === 'yes' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <input
                type="radio"
                name="onset"
                checked={onsetKnown === 'yes'}
                onChange={() => setOnsetKnown('yes')}
              />
              <div className="font-semibold">特定できる</div>
            </label>
            <label className={`checkbox-row ${onsetKnown === 'no' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
              <input
                type="radio"
                name="onset"
                checked={onsetKnown === 'no'}
                onChange={() => setOnsetKnown('no')}
              />
              <div className="font-semibold">特定できない / 不明</div>
            </label>
          </div>

          {onsetKnown === 'yes' && (
            <div className="mt-4">
              <label className="label">発症からの経過時間（時間）</label>
              <input
                type="number"
                className="input"
                inputMode="numeric"
                step="1"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="例: 24"
              />
            </div>
          )}
        </section>

        {verdict === 'acute' && (
          <Alert level="info" title="急性低Na血症">
            発症 &lt; 48 時間。
            <strong>脳浮腫リスクが優位で、ODSリスクは相対的に低い病態</strong>
            です。症状があれば積極的補正が選択肢になります。
          </Alert>
        )}
        {verdict === 'chronic' && (
          <Alert level="caution" title="慢性 / 不明として扱います">
            慢性または発症時期不明のため、慢性として扱い
            <strong>ODS（浸透圧性脱髄症候群）リスクを優先</strong>します。
            発症時期不明の Na &lt; 120 mEq/L は原則として慢性扱いが安全です。
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="btn-primary flex-1 text-lg"
            disabled={!canProceed}
            onClick={onProceed}
          >
            次へ（緊急トリアージ）
          </button>
          <button className="btn-secondary sm:w-48" onClick={() => navigate('/input')}>
            戻る
          </button>
        </div>
      </div>
    </Layout>
  );
}
