interface Props {
  label: string;
  current: number;
  max: number;
  color: string;
}

export function CapacityBar({ label, current, max, color }: Props) {
  const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100));
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between items-baseline text-[10px]">
        <span className="text-white/70 font-dot">{label}</span>
        <span className="font-pixel text-pachi-yellow">
          {current} / {max} <span className="text-white/40">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-2 bg-bg-base border border-bg-card overflow-hidden">
        <div
          className={`${color} h-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
