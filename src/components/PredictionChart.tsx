import type { SeriesPoint } from '../lib/calculations';

interface Props {
  currentNa: number;
  limit: number;        // 24h 上限（mEq/L）
  targetMin: number;
  targetMax: number;
  predictH: number;
  integrated: SeriesPoint[];
  adrogue: SeriesPoint[];
  actual?: SeriesPoint[];
}

export default function PredictionChart({
  currentNa,
  limit,
  targetMin,
  targetMax,
  predictH,
  integrated,
  adrogue,
  actual,
}: Props) {
  // Chart dims
  const W = 640;
  const H = 340;
  const pad = { l: 48, r: 16, t: 16, b: 40 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  // 時間比率で y 軸の目標域・上限を評価
  const limitAt = (t: number) => currentNa + (limit * t) / 24;
  const targetMaxAt = (t: number) => currentNa + (targetMax * t) / 24;
  const targetMinAt = (t: number) => currentNa + (targetMin * t) / 24;

  // Y軸範囲（データ + 上限を含めて自動）
  const allNa = [
    ...integrated.map((p) => p.na),
    ...adrogue.map((p) => p.na),
    ...(actual?.map((p) => p.na) ?? []),
    currentNa - 2,
    currentNa + limit + 4,
  ].filter((n) => Number.isFinite(n));
  const yMin = Math.floor(Math.min(...allNa));
  const yMax = Math.ceil(Math.max(...allNa));
  const yRange = Math.max(1, yMax - yMin);

  const xScale = (t: number) => pad.l + (t / predictH) * iw;
  const yScale = (na: number) => pad.t + ih - ((na - yMin) / yRange) * ih;

  const toPath = (pts: SeriesPoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.t).toFixed(1)},${yScale(p.na).toFixed(1)}`)
      .join(' ');

  // 目標域帯: targetMin(t) 〜 targetMax(t) をポリゴン化
  const bandSteps = 20;
  const topPts: string[] = [];
  const bottomPts: string[] = [];
  for (let i = 0; i <= bandSteps; i++) {
    const t = (predictH * i) / bandSteps;
    topPts.push(`${xScale(t).toFixed(1)},${yScale(targetMaxAt(t)).toFixed(1)}`);
    bottomPts.unshift(`${xScale(t).toFixed(1)},${yScale(targetMinAt(t)).toFixed(1)}`);
  }
  const bandPath = `M${topPts.join(' L')} L${bottomPts.join(' L')} Z`;

  // 上限ライン
  const limitTop = `M${xScale(0)},${yScale(currentNa).toFixed(1)} L${xScale(predictH)},${yScale(limitAt(predictH)).toFixed(1)}`;

  // Y軸目盛（整数ごと）
  const yTicks: number[] = [];
  for (let n = yMin; n <= yMax; n++) yTicks.push(n);

  // X軸目盛（6時間ごと）
  const xTicks: number[] = [];
  for (let t = 0; t <= predictH; t += Math.max(1, Math.floor(predictH / 4))) xTicks.push(t);
  if (xTicks[xTicks.length - 1] !== predictH) xTicks.push(predictH);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-lg border border-gray-200">
        {/* 目標域バンド */}
        <path d={bandPath} fill="#bbf7d0" opacity="0.5" />

        {/* Limit (危険) ライン */}
        <path d={limitTop} stroke="#dc2626" strokeWidth="2" fill="none" strokeDasharray="6 4" />
        <text x={xScale(predictH) - 30} y={yScale(limitAt(predictH)) - 4} fill="#dc2626" fontSize="11">
          24h上限
        </text>

        {/* Y軸 */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + ih} stroke="#9ca3af" />
        {yTicks.map((n) => (
          <g key={n}>
            <line x1={pad.l - 4} y1={yScale(n)} x2={pad.l} y2={yScale(n)} stroke="#9ca3af" />
            <text x={pad.l - 6} y={yScale(n) + 4} fontSize="10" textAnchor="end" fill="#4b5563">
              {n}
            </text>
          </g>
        ))}

        {/* X軸 */}
        <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih} stroke="#9ca3af" />
        {xTicks.map((t) => (
          <g key={t}>
            <line x1={xScale(t)} y1={pad.t + ih} x2={xScale(t)} y2={pad.t + ih + 4} stroke="#9ca3af" />
            <text x={xScale(t)} y={pad.t + ih + 16} fontSize="10" textAnchor="middle" fill="#4b5563">
              {t}h
            </text>
          </g>
        ))}

        {/* Adrogué-Madias */}
        {adrogue.length > 1 && (
          <path d={toPath(adrogue)} stroke="#f97316" strokeWidth="2" fill="none" strokeDasharray="3 3" />
        )}

        {/* 統合予測 */}
        {integrated.length > 1 && (
          <path d={toPath(integrated)} stroke="#16a34a" strokeWidth="2.5" fill="none" />
        )}

        {/* 実測点 */}
        {(actual ?? []).map((p, i) => (
          <circle key={i} cx={xScale(p.t)} cy={yScale(p.na)} r="4" fill="#1d4ed8" stroke="white" strokeWidth="2" />
        ))}

        {/* 現在Naの開始点 */}
        <circle cx={xScale(0)} cy={yScale(currentNa)} r="4" fill="#1d4ed8" stroke="white" strokeWidth="2" />

        {/* ラベル（軸） */}
        <text x={pad.l + iw / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="#374151">
          経過時間 (h)
        </text>
        <text
          x={12}
          y={pad.t + ih / 2}
          fontSize="11"
          textAnchor="middle"
          fill="#374151"
          transform={`rotate(-90, 12, ${pad.t + ih / 2})`}
        >
          血清Na (mEq/L)
        </text>
      </svg>

      {/* 凡例 */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-700">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-green-600 inline-block" />
          統合予測式
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-orange-500 inline-block" style={{ borderTop: '2px dashed #f97316' }} />
          Adrogué-Madias
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-200 inline-block" />
          目標域
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-red-600 inline-block" />
          24h 上限
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-700 inline-block" />
          実測値
        </span>
      </div>
    </div>
  );
}
