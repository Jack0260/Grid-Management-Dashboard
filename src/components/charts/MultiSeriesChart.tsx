interface MultiSeriesProps {
  series: { label: string; data: number[]; color: string }[];
  labels: string[];
  height?: number;
  unit?: string;
}

export function MultiSeriesChart({ series, labels, height = 220, unit = '' }: MultiSeriesProps) {
  const width = 800;
  const padX = 50;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const allValues = series.flatMap((s) => s.data);
  if (allValues.length === 0) {
    return <div className="flex items-center justify-center text-ink-300 text-sm" style={{ height }}>No data</div>;
  }

  let minV = Math.min(...allValues);
  let maxV = Math.max(...allValues);
  const range = maxV - minV || 1;
  minV = minV - range * 0.1;
  maxV = maxV + range * 0.1;
  const valRange = maxV - minV || 1;

  const vLabels: { y: number; label: string }[] = [];
  for (let i = 0; i <= 4; i++) {
    const val = minV + (valRange * i) / 4;
    vLabels.push({ y: padY + chartH - (i / 4) * chartH, label: val.toFixed(1) + unit });
  }

  const tLabels: { x: number; label: string }[] = [];
  const labelCount = Math.min(8, labels.length);
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.floor((i / (labelCount - 1)) * (labels.length - 1));
    tLabels.push({
      x: padX + (idx / Math.max(1, labels.length - 1)) * chartW,
      label: labels[idx],
    });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {vLabels.map((v, i) => (
          <g key={`g-${i}`}>
            <line x1={padX} y1={v.y} x2={width - padX} y2={v.y} stroke="#222a3a" strokeWidth="1" strokeDasharray="2,4" />
            <text x={padX - 6} y={v.y + 3} fill="#6b7589" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono, monospace">
              {v.label}
            </text>
          </g>
        ))}

        {series.map((s, si) => {
          const pts = s.data.map((v, i) => {
            const x = padX + (i / Math.max(1, s.data.length - 1)) * chartW;
            const y = padY + chartH - ((v - minV) / valRange) * chartH;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          });
          const path = `M${pts.join(' L')}`;
          const areaPath = `${path} L${padX + chartW},${padY + chartH} L${padX},${padY + chartH} Z`;
          return (
            <g key={`series-${si}`}>
              <defs>
                <linearGradient id={`ms-grad-${si}-${s.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#ms-grad-${si}-${s.color.replace('#', '')})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {tLabels.map((t, i) => (
          <text key={`tl-${i}`} x={t.x} y={height - 4} fill="#6b7589" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {t.label}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
        {series.map((s, i) => (
          <div key={`leg-${i}`} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-ink-200">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
