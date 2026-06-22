type SparklineProps = {
  values: number[];
  color?: string;
};

function Sparkline({ values, color = "currentColor" }: SparklineProps) {
  const w = 80;
  const h = 32;
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1 || 1);
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const d = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`,
    )
    .join(" ");
  const fill = `${d} L${w} ${h} L0 ${h} Z`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sp)" stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

type Props = {
  label: string;
  value: string;
  unit: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
};

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaDir,
  spark,
}: Props) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        <span className="unit">{unit}</span>
      </div>
      {delta && <div className={`delta ${deltaDir ?? ""}`}>{delta}</div>}
      {spark && <Sparkline values={spark} color="var(--fl-brand)" />}
    </div>
  );
}
