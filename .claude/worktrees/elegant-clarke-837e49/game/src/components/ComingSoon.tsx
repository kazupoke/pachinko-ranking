interface Props {
  feature: string;
  note?: string;
}

export function ComingSoon({ feature, note }: Props) {
  return (
    <div className="mx-4 my-6 p-5 pixel-panel text-center">
      <p className="font-pixel text-xs text-pachi-yellow animate-blink">
        COMING SOON
      </p>
      <p className="mt-3 text-sm text-white/80">{feature}</p>
      {note && <p className="mt-3 text-xs text-white/50 leading-relaxed">{note}</p>}
    </div>
  );
}
