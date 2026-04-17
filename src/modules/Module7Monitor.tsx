import { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useSessionStore } from '../store/session';
import { useSettingsStore } from '../store/settings';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { assessBraking } from '../lib/calculations';
import { audit } from '../db/dexie';
import type { MonitoringEntry, BrakingAssessment } from '../types';

function parseNum(v: string): number | undefined {
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Module7Monitor() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);
  const interval = useSettingsStore((s) => s.settings.defaultMonitoringIntervalH);

  const [naStr, setNaStr] = useState('');
  const [urineOsm, setUrineOsm] = useState('');
  const [urineNa, setUrineNa] = useState('');
  const [urineK, setUrineK] = useState('');
  const [urineVol, setUrineVol] = useState('');
  const [bw, setBw] = useState('');
  const [note, setNote] = useState('');
  const [showBraking, setShowBraking] = useState(false);
  const [lastAssessment, setLastAssessment] = useState<BrakingAssessment | null>(null);

  if (
    !session ||
    session.correctionLimit === undefined ||
    !session.demographics ||
    session.correctedNa === undefined
  ) {
    return <Navigate to="/limits" replace />;
  }

  const entries = session.monitoring ?? [];
  const lastEntry = entries.at(-1);
  const sessionStart = new Date(session.createdAt).getTime();
  const hoursSinceStart = (Date.now() - sessionStart) / 3600000;
  const absLimit = session.correctedNa + session.correctionLimit;

  const sortedEntries = useMemo(
    () => [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    ),
    [entries],
  );

  const nextDue = lastEntry
    ? new Date(new Date(lastEntry.timestamp).getTime() + interval * 3600000)
    : null;
  const nextDueOverdue = nextDue ? nextDue.getTime() < Date.now() : false;

  const canAdd = Number.isFinite(parseNum(naStr) ?? NaN);

  const addEntry = () => {
    if (!canAdd) return;
    const na = parseNum(naStr)!;
    const entry: MonitoringEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      serumNa: na,
      urineOsm: parseNum(urineOsm),
      urineNa: parseNum(urineNa),
      urineK: parseNum(urineK),
      urineVolumeMlPerH: parseNum(urineVol),
      bodyWeight: parseNum(bw),
      note: note || undefined,
    };
    const nextEntries = [...entries, entry];

    const assessment = assessBraking({
      weight: session.demographics!.weight,
      baselineNa: session.correctedNa!,
      correctionLimit: session.correctionLimit!,
      entries: nextEntries,
      hoursSinceStart,
    });

    update({
      monitoring: nextEntries,
      lastBraking: assessment.triggered
        ? { at: new Date().toISOString(), assessment, acknowledged: false }
        : session.lastBraking,
    });
    void audit(
      'module7.addEntry',
      session.sessionId,
      `Na=${na} triggers=${assessment.triggers.join(',')}`,
    );

    setLastAssessment(assessment);
    if (assessment.triggered) setShowBraking(true);

    // 入力フォームクリア
    setNaStr('');
    setUrineOsm('');
    setUrineNa('');
    setUrineK('');
    setUrineVol('');
    setBw('');
    setNote('');
  };

  const acknowledge = () => {
    setShowBraking(false);
    if (session.lastBraking) {
      update({
        lastBraking: { ...session.lastBraking, acknowledged: true },
      });
      void audit('module7.brakingAck', session.sessionId);
    }
  };

  const proactive = session.strategy === 'proactive';

  return (
    <Layout title="モジュール 7 · モニタリング / Braking Protocol">
      <div className="space-y-5">
        <Alert level="caution" title="本画面の位置づけ">
          モジュール 6 の予測が走った後、実測値で軌道を確認する画面です。
          水利尿が検知された場合は Braking Protocol を表示します。
          臨床行為の最終判断は必ず主治医が行ってください。
        </Alert>

        {proactive && (
          <Alert level="info" title="Proactive（DDAVP Clamp）戦略">
            尿濃縮を固定している前提のため、Braking のトリガーは
            「計画速度を超えた Na 上昇」が主です。水利尿そのものは発生しにくくなります。
          </Alert>
        )}

        {/* 目標域と現在状態 */}
        <section className="card">
          <h2 className="text-lg font-bold mb-3">現在の安全域</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-100 rounded-lg p-3">
              <div className="text-xs text-gray-600">開始時 Na</div>
              <div className="text-2xl font-bold">{session.correctedNa.toFixed(1)}</div>
              <div className="text-xs text-gray-500">mEq/L</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-800">24h 上限 (絶対値)</div>
              <div className="text-2xl font-bold text-red-700">{absLimit.toFixed(1)}</div>
              <div className="text-xs text-red-600">これを超えないこと</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-800">目標上昇幅 / 24h</div>
              <div className="text-2xl font-bold text-green-700">
                {session.correctionTargetMin}–{session.correctionTargetMax}
              </div>
              <div className="text-xs text-green-600">mEq/L</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-800">経過</div>
              <div className="text-2xl font-bold text-blue-700">
                {hoursSinceStart.toFixed(1)}
              </div>
              <div className="text-xs text-blue-600">時間</div>
            </div>
          </div>
        </section>

        {/* 次回測定案内 */}
        {lastEntry ? (
          <section className={`card ${nextDueOverdue ? 'bg-yellow-50 border-yellow-400' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-700">直近測定: {fmtTime(lastEntry.timestamp)}</div>
                <div className="text-sm text-gray-700">
                  次回測定予定: {nextDue ? fmtTime(nextDue.toISOString()) : '—'}（{interval} 時間間隔）
                </div>
              </div>
              {nextDueOverdue && <span className="badge-caution">測定時刻 超過</span>}
            </div>
          </section>
        ) : (
          <Alert level="info" title="最初の測定を登録してください">
            モニタリング開始時点の値を登録すると、以降の測定ごとに水利尿検知ロジックが走ります。
          </Alert>
        )}

        {/* 測定値入力 */}
        <section className="card">
          <h2 className="text-lg font-bold mb-3">新しい測定値</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">血清Na (mEq/L) <span className="text-red-600">*</span></label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={naStr}
                onChange={(e) => setNaStr(e.target.value)}
                placeholder="例: 124.0"
              />
            </div>
            <div>
              <label className="label">尿浸透圧 (mOsm/kg)</label>
              <input
                className="input"
                type="number"
                value={urineOsm}
                onChange={(e) => setUrineOsm(e.target.value)}
                placeholder="< 100 で水利尿"
              />
            </div>
            <div>
              <label className="label">尿量 (mL/h)</label>
              <input
                className="input"
                type="number"
                value={urineVol}
                onChange={(e) => setUrineVol(e.target.value)}
                placeholder="> 250 で警戒"
              />
            </div>
            <div>
              <label className="label">尿Na (mEq/L)</label>
              <input
                className="input"
                type="number"
                value={urineNa}
                onChange={(e) => setUrineNa(e.target.value)}
              />
            </div>
            <div>
              <label className="label">尿K (mEq/L)</label>
              <input
                className="input"
                type="number"
                value={urineK}
                onChange={(e) => setUrineK(e.target.value)}
              />
            </div>
            <div>
              <label className="label">体重 (kg)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={bw}
                onChange={(e) => setBw(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">メモ（任意）</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: DDAVP 2μg 皮下注 後"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              className="btn-primary flex-1 text-lg"
              disabled={!canAdd}
              onClick={addEntry}
            >
              測定値を登録して検知を走らせる
            </button>
          </div>
        </section>

        {/* 直前の検知結果サマリ */}
        {lastAssessment && !showBraking && (
          <Alert
            level={lastAssessment.triggered ? 'danger' : 'info'}
            title={lastAssessment.triggered ? 'Braking 発動（確認済み）' : '検知されませんでした'}
          >
            {lastAssessment.triggered ? (
              <ul className="list-disc list-inside">
                {lastAssessment.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            ) : (
              '各トリガ（水利尿所見、Na 上昇速度、24h上限超過）に該当なし。'
            )}
          </Alert>
        )}

        {/* モニタリング履歴 */}
        {sortedEntries.length > 0 && (
          <section className="card">
            <h2 className="text-lg font-bold mb-3">モニタリング履歴</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 border border-slate-300">時刻</th>
                    <th className="text-right p-2 border border-slate-300">Na</th>
                    <th className="text-right p-2 border border-slate-300">尿量</th>
                    <th className="text-right p-2 border border-slate-300">尿Osm</th>
                    <th className="text-right p-2 border border-slate-300">尿Na+K</th>
                    <th className="text-left p-2 border border-slate-300">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((e) => {
                    const uNaK =
                      e.urineNa !== undefined && e.urineK !== undefined
                        ? e.urineNa + e.urineK
                        : undefined;
                    const over = e.serumNa > absLimit;
                    return (
                      <tr key={e.id} className={over ? 'bg-red-50' : ''}>
                        <td className="p-2 border border-slate-300">{fmtTime(e.timestamp)}</td>
                        <td className="p-2 border border-slate-300 text-right tabular-nums font-semibold">
                          {e.serumNa.toFixed(1)}
                          {over && <span className="badge-danger ml-1">超過</span>}
                        </td>
                        <td className="p-2 border border-slate-300 text-right tabular-nums">
                          {e.urineVolumeMlPerH ?? '—'}
                        </td>
                        <td className="p-2 border border-slate-300 text-right tabular-nums">
                          {e.urineOsm ?? '—'}
                        </td>
                        <td className="p-2 border border-slate-300 text-right tabular-nums">
                          {uNaK ?? '—'}
                        </td>
                        <td className="p-2 border border-slate-300 text-xs text-gray-600">
                          {e.note ?? ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1" onClick={() => navigate('/summary')}>
            サマリーに戻る
          </button>
          <button className="btn-secondary sm:w-56" onClick={() => navigate('/prediction')}>
            予測シミュレーションへ
          </button>
        </div>
      </div>

      {/* Braking Protocol モーダル */}
      {showBraking && lastAssessment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-flash">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-2xl">
              <div className="badge-danger bg-white text-red-700 mb-2">
                Level 3 · BRAKING PROTOCOL
              </div>
              <h2 className="text-2xl font-bold">水利尿 / 過補正を検知</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-semibold text-red-900 mb-1">検知された所見</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {lastAssessment.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-3">
                  <div className="font-bold text-lg text-red-700">① HALT</div>
                  <div className="text-sm">
                    3% 食塩水・生食などNaを上げる治療を<strong>直ちに中止</strong>
                  </div>
                </div>
                <div className="border-l-4 border-orange-500 pl-3">
                  <div className="font-bold text-lg text-orange-700">② CLAMP (DDAVP)</div>
                  <div className="text-sm">
                    デスモプレシン <strong>1〜2 μg</strong> を静注 or 皮下注。
                    <strong>6〜8時間ごとに反復</strong>。尿の濃縮を固定する。
                  </div>
                </div>
                <div className="border-l-4 border-blue-500 pl-3">
                  <div className="font-bold text-lg text-blue-700">③ RE-LOWERING (D5W)</div>
                  <div className="text-sm">
                    5% ブドウ糖液を <strong>2〜3 mL/kg/h</strong> で持続静注し、
                    Na値を安全域まで<strong>意図的に引き下げる</strong>
                    （{session.demographics.weight} kg の場合 約{' '}
                    {(session.demographics.weight * 2).toFixed(0)}〜
                    {(session.demographics.weight * 3).toFixed(0)} mL/h）
                  </div>
                </div>
                <div className="border-l-4 border-green-500 pl-3">
                  <div className="font-bold text-lg text-green-700">④ MONITOR</div>
                  <div className="text-sm">
                    目標安全域に達するまで <strong>1時間ごとに Na 実測</strong>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-700">
                本プロトコルは推奨表示のみです。
                薬剤投与・輸液変更は必ず主治医判断のうえで実施してください。
                実施内容はモニタリング欄のメモに記録することを推奨します。
              </div>

              <button className="btn-danger w-full text-lg" onClick={acknowledge}>
                プロトコルを確認した（閉じる）
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
