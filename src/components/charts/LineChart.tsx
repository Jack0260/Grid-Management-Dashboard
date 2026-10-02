import { useMemo } from 'react';

interface DataPoint {
  timestamp: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fillOpacity?: number;
  unit?: string;
  showAxis?: boolean;
  thresholdHigh?: number;
  thresholdLow?: number;
  normalBandHigh?: number;
  normalBandLow?: number;
  animated?: boolean;
}

export function LineChart({
  data,
  height = 200,
  color = '#3a72e0',
  fillOpacity = 0.15,
  unit = '',
  showAxis = true,
  thresholdHigh,
  thresholdLow,
  normalBandHigh,
  normalBandLow,
  animated = true,
}: LineChartProps) {
  const width = 800;
  const padX = showAxis ? 50 : 8;
  const padY = showAxis ? 24 : 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const { points, areaPath, linePath, minVal, maxVal, timeLabels, valLabels } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], areaPath: '', linePath: '', minVal: 0, maxVal: 0, timeLabels: [], valLabels: [] };
    }

    const values = data.map((d) => d.value);
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    const range = maxV - minV || 1;
    minV = minV - range * 0.1;
    maxV = maxV + range * 0.1;

    if (thresholdHigh !== undefined) maxV = Math.max(maxV, thresholdHigh);
    if (thresholdLow !== undefined) minV = Math.min(minV, thresholdLow);
    if (normalBandHigh !== undefined) maxV = Math.max(maxV, normalBandHigh);
    if (normalBandLow !== undefined) minV = Math.min(minV, normalBandLow);

    const valRange = maxV - minV || 1;

    const pts = data.map((d, i) => {
      const x = padX + (i / Math.max(1, data.length - 1)) * chartW;
      const y = padY + chartH - ((d.value - minV) / valRange) * chartH;
      return { x, y, ...d };
    });

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${padY + chartH} L${pts[0].x.toFixed(1)},${padY + chartH} Z`;

    const tLabels: { x: number; label: string }[] = [];
    const labelCount = Math.min(6, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (data.length - 1));
      const d = new Date(data[idx].timestamp);
      tLabels.push({
        x: padX + (idx / Math.max(1, data.length - 1)) * chartW,
        label: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
    }

    const vLabels: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const val = minV + (valRange * i) / 4;
      vLabels.push({
        y: padY + chartH - (i / 4) * chartH,
        label: val.toFixed(1) + unit,
      });
    }

    return { points: pts, areaPath: area, linePath: line, minVal: minV, maxVal: maxV, timeLabels: tLabels, valLabels: vLabels };
  }, [data, padX, padY, chartW, chartH, unit, thresholdHigh, thresholdLow, normalBandHigh, normalBandLow]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-ink-300 text-sm" style={{ height }}>
        No data available
      </div>
    );
  }

  const valRange = maxVal - minVal || 1;
  const bandHighY = normalBandHigh !== undefined ? padY + chartH - ((normalBandHigh - minVal) / valRange) * chartH : null;
  const bandLowY = normalBandLow !== undefined ? padY + chartH - ((normalBandLow - minVal) / valRange) * chartH : null;
  const threshHighY = thresholdHigh !== undefined ? padY + chartH - ((thresholdHigh - minVal) / valRange) * chartH : null;
  const threshLowY = thresholdLow !== undefined ? padY + chartH - ((thresholdLow - minVal) / valRange) * chartH : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Normal operating band */}
      {bandHighY !== null && bandLowY !== null && (
        <rect
          x={padX}
          y={bandHighY}
          width={chartW}
          height={Math.abs(bandLowY - bandHighY)}
          fill="#1aa844"
          fillOpacity={0.06}
        />
      )}

      {/* Grid lines */}
      {showAxis &&
        valLabels.map((v, i) => (
          <g key={`grid-${i}`}>
            <line x1={padX} y1={v.y} x2={width - padX} y2={v.y} stroke="#222a3a" strokeWidth="1" strokeDasharray="2,4" />
            <text x={padX - 6} y={v.y + 3} fill="#6b7589" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono, monospace">
              {v.label}
            </text>
          </g>
        ))}

      {/* Threshold lines */}
      {threshHighY !== null && (
        <g>
          <line x1={padX} y1={threshHighY} x2={width - padX} y2={threshHighY} stroke="#ef5542" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x={width - padX} y={threshHighY - 4} fill="#f47d6f" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">
            HIGH
          </text>
        </g>
      )}
      {threshLowY !== null && (
        <g>
          <line x1={padX} y1={threshLowY} x2={width - padX} y2={threshLowY} stroke="#ef5542" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x={width - padX} y={threshLowY + 12} fill="#f47d6f" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">
            LOW
          </text>
        </g>
      )}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={animated ? 'animate-fade-in' : ''}
      />

      {/* Last point indicator */}
      {points.length > 0 && (
        <g>
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="8" fill={color} fillOpacity="0.2">
            <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* X-axis labels */}
      {showAxis &&
        timeLabels.map((t, i) => (
          <text key={`tlabel-${i}`} x={t.x} y={height - 4} fill="#6b7589" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {t.label}
          </text>
        ))}
    </svg>
  );
}
