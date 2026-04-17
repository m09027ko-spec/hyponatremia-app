import { useEffect, useState } from 'react';
import { db, type AuditLog } from '../db/dexie';
import { download } from '../lib/export';

export default function AuditTrailViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    void db.audits
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray()
      .then(setLogs);
  }, [limit]);

  const filtered = filter
    ? logs.filter(
        (l) =>
          l.action.includes(filter) ||
          (l.detail?.includes(filter) ?? false) ||
          (l.sessionId?.includes(filter) ?? false),
      )
    : logs;

  const onClear = async () => {
    if (!confirm('監査ログを全削除します（取り消せません）。続行しますか？')) return;
    await db.audits.clear();
    setLogs([]);
  };

  const onCsv = () => {
    const headers = ['timestamp', 'sessionId', 'action', 'detail'];
    const rows = [headers.join(',')].concat(
      filtered.map((l) =>
        [
          l.timestamp,
          l.sessionId ?? '',
          l.action,
          `"${(l.detail ?? '').replace(/"/g, '""')}"`,
        ].join(','),
      ),
    );
    download(
      `hyponatremia_audit_${new Date().toISOString().slice(0, 10)}.csv`,
      rows.join('\n'),
      'text/csv',
    );
  };

  return (
    <section className="card">
      <h2 className="text-lg font-bold mb-3">監査証跡（監査ログ）</h2>
      <p className="text-sm text-gray-600 mb-3">
        端末内に保存された操作履歴です。インシデント解析や振り返りに使います。
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          className="input flex-1"
          placeholder="action / sessionId / detail で絞り込み"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="input sm:w-36"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          <option value={50}>直近 50 件</option>
          <option value={100}>直近 100 件</option>
          <option value={500}>直近 500 件</option>
          <option value={5000}>すべて（〜5000）</option>
        </select>
      </div>

      <div className="overflow-auto max-h-96 border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="text-left p-2 border-b">時刻</th>
              <th className="text-left p-2 border-b">action</th>
              <th className="text-left p-2 border-b">sessionId</th>
              <th className="text-left p-2 border-b">detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  該当ログはありません
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 whitespace-nowrap text-gray-700">
                    {new Date(l.timestamp).toLocaleString('ja-JP')}
                  </td>
                  <td className="p-2 font-mono">{l.action}</td>
                  <td className="p-2 font-mono text-gray-500">
                    {l.sessionId?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="p-2 break-all text-gray-700">{l.detail ?? ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 mt-3">
        <button className="btn-secondary flex-1" onClick={onCsv} disabled={filtered.length === 0}>
          CSV でダウンロード
        </button>
        <button className="btn-danger sm:w-40" onClick={onClear}>
          すべて削除
        </button>
      </div>
    </section>
  );
}
