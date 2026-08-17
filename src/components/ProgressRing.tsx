interface ProgressRingProps {
  value: number;
  size?: number;
  label?: string;
}

export function ProgressRing({ value, size = 116, label = 'إنجاز اليوم' }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle className="progress-ring-track" cx="55" cy="55" r={radius} />
        <circle
          className="progress-ring-value"
          cx="55"
          cy="55"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-copy">
        <strong>{Math.round(clamped)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
