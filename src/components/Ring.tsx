interface RingProps {
  size?: number;
  stroke?: number;
  /** 0 → 1 */
  progress: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

export default function Ring({
  size = 72,
  stroke = 5,
  progress,
  color = "#e8b94a",
  track = "rgba(255,255,255,0.08)",
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
