import { type ReactNode } from 'react';

type AlertLevel = 'info' | 'caution' | 'danger';

interface AlertProps {
  level: AlertLevel;
  title?: string;
  children: ReactNode;
}

const styles: Record<AlertLevel, string> = {
  info: 'bg-blue-50 border-blue-400 text-blue-900',
  caution: 'bg-yellow-50 border-yellow-400 text-yellow-900',
  danger: 'bg-red-50 border-red-500 text-red-900',
};

export default function Alert({ level, title, children }: AlertProps) {
  return (
    <div className={`border-l-4 rounded-r-lg px-4 py-3 ${styles[level]}`} role="alert">
      {title && <p className="font-bold mb-1">{title}</p>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
