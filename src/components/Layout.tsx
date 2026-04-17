import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../store/session';

interface LayoutProps {
  title: string;
  step?: { current: number; total: number };
  children: ReactNode;
}

export default function Layout({ title, step, children }: LayoutProps) {
  const session = useSessionStore((s) => s.session);
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === '/settings';

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{title}</h1>
          <p className="text-xs text-slate-300">低Na血症マネジメント支援 · 成人対象</p>
        </div>
        <div className="flex items-center gap-3">
          {session?.correctionLimit !== undefined && (
            <div className="text-right text-xs">
              <div className="text-slate-300">24h補正上限</div>
              <div className="text-xl font-bold text-yellow-300">
                {session.correctionLimit} mEq/L
              </div>
            </div>
          )}
          {!isSettings && (
            <button
              className="text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg p-2 min-h-tap min-w-tap"
              onClick={() => navigate('/settings')}
              title="設定"
              aria-label="設定"
            >
              ⚙
            </button>
          )}
        </div>
      </header>

      {step && (
        <div className="bg-slate-100 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
            <span>Step {step.current} / {step.total}</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(step.current / step.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-5 max-w-3xl w-full mx-auto">{children}</main>

      <footer className="px-4 py-3 text-center text-[11px] text-slate-500 border-t border-slate-200">
        予測値は必ず実測と乖離します。頻回な実測と臨床判断を優先してください。
      </footer>
    </div>
  );
}
