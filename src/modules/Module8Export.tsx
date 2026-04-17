import { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionStore } from '../store/session';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import {
  sessionToMarkdown,
  monitoringToCsv,
  scanForPii,
  download,
  type PiiWarning,
} from '../lib/export';
import { audit } from '../db/dexie';

export default function Module8Export() {
  const navigate = useNavigate();
  const session = useSessionStore((s) => s.session);
  const update = useSessionStore((s) => s.update);

  const [notes, setNotes] = useState(session?.notes ?? '');
  const [confirmed, setConfirmed] = useState(false);

  const markdown = useMemo(() => {
    if (!session) return '';
    return sessionToMarkdown({ ...session, notes });
  }, [session, notes]);

  const csv = useMemo(() => (session ? monitoringToCsv(session) : ''), [session]);

  const piiWarnings: PiiWarning[] = useMemo(() => scanForPii(markdown), [markdown]);

  if (!session) {
    return <Navigate to="/limits" replace />;
  }

  const baseName = `hyponatremia_${session.sessionId.slice(0, 8)}_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[^\d]/g, '')}`;

  const onDownloadMd = () => {
    update({ notes });
    download(`${baseName}.md`, markdown, 'text/markdown');
    void audit('module8.export.md', session.sessionId);
  };
  const onCopyMd = async () => {
    update({ notes });
    await navigator.clipboard.writeText(markdown);
    void audit('module8.export.copy_md', session.sessionId);
  };
  const onDownloadCsv = () => {
    if (!session.monitoring || session.monitoring.length === 0) return;
    download(`${baseName}_monitoring.csv`, csv, 'text/csv');
    void audit('module8.export.csv', session.sessionId);
  };
  const onPrint = () => {
    update({ notes });
    void audit('module8.export.print', session.sessionId);
    window.print();
  };

  const proceedBlocked = piiWarnings.length > 0 && !confirmed;
  const hasMonitoring = (session.monitoring?.length ?? 0) > 0;

  return (
    <Layout title="モジュール 8 · エクスポート">
      <div className="space-y-5">
        <Alert level="caution" title="プライバシーを最優先">
          本アプリは意図的に患者氏名・IDの入力欄を持ちません。
          エクスポート前に必ずメモ欄等に患者識別情報が含まれていないことを確認してください。
        </Alert>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">メモ（エクスポート前の追記）</h2>
          <textarea
            className="input min-h-32 font-mono text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="症例検討会で共有したい考察、経過、後学のための反省点など（個人情報は含めないこと）"
          />
          <p className="text-xs text-gray-500 mt-1">
            メモは「Markdown でダウンロード」「クリップボードコピー」「印刷」いずれを押した時点で保存されます。
          </p>
        </section>

        {piiWarnings.length > 0 && (
          <section className="card bg-red-50 border-red-400">
            <h2 className="text-lg font-bold text-red-900 mb-2">
              個人情報の可能性がある文字列を検知
            </h2>
            <ul className="text-sm space-y-2">
              {piiWarnings.map((w) => (
                <li key={w.label}>
                  <strong>{w.label}</strong>:{' '}
                  <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border">
                    {w.samples.join(' / ')}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-700 mt-3">
              上記は機械的な推定です。実際には誤検知の可能性もあります。
              患者氏名・ID・電話番号・住所等が含まれていないか目視で確認してください。
            </p>
            <label className="checkbox-row mt-3 bg-white">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <div>
                <div className="font-semibold">
                  識別情報は含まれていない（または誤検知）と確認しました
                </div>
                <div className="text-xs text-gray-600">
                  確認にチェックしないとエクスポートできません。
                </div>
              </div>
            </label>
          </section>
        )}

        <section className="card">
          <h2 className="text-lg font-bold mb-3">プレビュー（Markdown）</h2>
          <pre className="bg-slate-900 text-green-200 text-xs p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
            {markdown}
          </pre>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold mb-3">エクスポート操作</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              className="btn-primary min-h-tap"
              disabled={proceedBlocked}
              onClick={onDownloadMd}
            >
              📄 Markdown ファイルをダウンロード
            </button>
            <button
              className="btn-secondary min-h-tap"
              disabled={proceedBlocked}
              onClick={onCopyMd}
            >
              📋 クリップボードにコピー
            </button>
            <button
              className="btn-secondary min-h-tap"
              disabled={!hasMonitoring}
              onClick={onDownloadCsv}
              title={hasMonitoring ? '' : 'モニタリング履歴がありません'}
            >
              📊 モニタリング CSV をダウンロード
            </button>
            <button
              className="btn-secondary min-h-tap"
              disabled={proceedBlocked}
              onClick={onPrint}
            >
              🖨 印刷 / PDF 保存（ブラウザ印刷）
            </button>
          </div>
          {!hasMonitoring && (
            <p className="text-xs text-gray-500 mt-2">
              モニタリング履歴が未記録のため、CSV エクスポートは無効です。
            </p>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary flex-1" onClick={() => navigate('/summary')}>
            サマリーに戻る
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          header, footer, nav, button, .no-print { display: none !important; }
          pre { max-height: none !important; }
        }
      `}</style>
    </Layout>
  );
}
