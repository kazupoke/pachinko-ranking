interface Props {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="px-4 pt-5 pb-3 border-b-2 border-bg-card">
      <h1 className="font-pixel text-sm text-pachi-pink leading-snug">{title}</h1>
      {subtitle && <p className="mt-2 text-xs text-white/60">{subtitle}</p>}
    </div>
  );
}
