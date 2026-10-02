interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export function Gauge({
  value,
  min = 0,
  max = 100,
  label,
  unit = '%',
  color = '#3a72e0',
  size = 140,
  warningThreshold = 80,
  criticalThreshold = 95,
}: GaugeProps) {
  const range = max - min;
  const pct = Math.min(1, Math.max(0, (value - min) / range));
  const angle = -120 + pct * 240;
  const startAngle = -120;
  const endAngle = 120;

  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;

  const polarToCartesian = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (r: number, startDeg: number, endDeg: number) => {
    const start = polarToCartesian(r, endDeg);
    const end = polarToCartesian(r, startDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const trackPath = describeArc(radius, startAngle, endAngle);
  const valueEnd = polarToCartesian(radius, angle);
  const valueStart = polarToCartesian(radius, startAngle);
  const largeArc = angle - startAngle > 180 ? 1 : 0;
  const valuePath = `M ${valueStart.x} ${valueStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${valueEnd.x} ${valueEnd.y}`;

  const warnAngle = -120 + ((warningThreshold - min) / range) * 240;
  const critAngle = -120 + ((criticalThreshold - min) / range) * 240;

  const activeColor = pct >= criticalThreshold / 100 ? '#ef5542' : pct >= warningThreshold / 100 ? '#f9ab30' : color;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path d={trackPath} fill="none" stroke="#222a3a" strokeWidth="8" strokeLinecap="round" />

        {/* Warning zone */}
        {warningThreshold < max && (
          <path
            d={describeArc(radius, warnAngle, Math.min(critAngle, endAngle))}
            fill="none"
            stroke="#f9ab30"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
        )}
        {criticalThreshold < max && (
          <path
            d={describeArc(radius, critAngle, endAngle)}
            fill="none"
            stroke="#ef5542"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
        )}

        {/* Value arc */}
        <path
          d={valuePath}
          fill="none"
          stroke={activeColor}
          strokeWidth="8"
          strokeLinecap="round"
          style={{ transition: 'all 0.5s ease' }}
        />

        {/* Center text */}
        <text x={cx} y={cy - 2} fill="#e9ecf1" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          {value.toFixed(1)}
        </text>
        <text x={cx} y={cy + 16} fill="#6b7589" fontSize="11" textAnchor="middle">
          {unit}
        </text>
      </svg>
      <span className="text-xs text-ink-200 mt-1 font-medium">{label}</span>
    </div>
  );
}
