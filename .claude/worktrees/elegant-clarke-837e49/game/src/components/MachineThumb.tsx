import { useState, useEffect } from "react";
import type { Rarity } from "../lib/types";

let thumbMap: Record<string, number> | null = null;
let thumbMapPromise: Promise<Record<string, number>> | null = null;

async function getThumbMap(): Promise<Record<string, number>> {
  if (thumbMap) return thumbMap;
  if (!thumbMapPromise) {
    thumbMapPromise = fetch("/machines_thumb.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        thumbMap = data;
        return data;
      });
  }
  return thumbMapPromise;
}

const RARITY_COLORS: Record<Rarity, { bg: string; accent: string; text: string }> = {
  N:   { bg: "#1a1a2e", accent: "#b8b8c8", text: "#b8b8c8" },
  R:   { bg: "#0a2a18", accent: "#4ade80", text: "#4ade80" },
  SR:  { bg: "#1a0a3a", accent: "#a78bfa", text: "#a78bfa" },
  SSR: { bg: "#2a1800", accent: "#fbbf24", text: "#fbbf24" },
};

function PixelSlotFallback({ rarity, name }: { rarity: Rarity; name: string }) {
  const { bg, accent } = RARITY_COLORS[rarity];
  const initial = name.replace(/^(スマスロ|パチスロ|Ｌ|L)\s*/u, "").charAt(0) || "?";

  return (
    <svg
      viewBox="0 0 32 48"
      width="100%"
      height="100%"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {/* 筐体背景 */}
      <rect width="32" height="48" fill={bg} />
      {/* 筐体外枠 */}
      <rect x="0" y="0" width="32" height="2" fill={accent} />
      <rect x="0" y="46" width="32" height="2" fill={accent} />
      <rect x="0" y="0" width="2" height="48" fill={accent} />
      <rect x="30" y="0" width="2" height="48" fill={accent} />
      {/* 画面枠 */}
      <rect x="3" y="4" width="26" height="26" fill="#000" />
      <rect x="4" y="5" width="24" height="24" fill="#111" />
      {/* 頭文字 */}
      <text
        x="16" y="21"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
        fill={accent}
        fontFamily="monospace"
        style={{ fontWeight: "bold" }}
      >
        {initial}
      </text>
      {/* ライン */}
      <rect x="4" y="17" width="24" height="1" fill={accent} opacity="0.3" />
      {/* レアリティ表示 */}
      <rect x="3" y="31" width="26" height="6" fill={accent} opacity="0.2" />
      <text x="16" y="35" textAnchor="middle" dominantBaseline="middle"
        fontSize="5" fill={accent} fontFamily="monospace">
        {rarity}
      </text>
      {/* ボタン列 */}
      <rect x="4" y="39" width="7" height="4" fill="#ff0066" />
      <rect x="13" y="39" width="6" height="4" fill="#ffcc00" />
      <rect x="21" y="39" width="7" height="4" fill="#00ff88" />
      {/* 台脚 */}
      <rect x="5" y="43" width="5" height="4" fill={accent} opacity="0.6" />
      <rect x="22" y="43" width="5" height="4" fill={accent} opacity="0.6" />
    </svg>
  );
}

interface Props {
  machineId: string;
  name: string;
  rarity: Rarity;
  className?: string;
}

export function MachineThumb({ machineId, name, rarity, className = "" }: Props) {
  const [pworldId, setPworldId] = useState<number | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getThumbMap().then((map) => {
      if (!cancelled) setPworldId(map[machineId] ?? null);
    });
    return () => { cancelled = true; };
  }, [machineId]);

  const imgUrl = pworldId
    ? `https://idn.p-world.co.jp/machines/${pworldId}/image/thumb_1.jpg`
    : null;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ imageRendering: "pixelated" }}>
      {imgUrl && !imgFailed ? (
        <img
          src={imgUrl}
          alt={name}
          className="w-full h-full object-cover"
          style={{ imageRendering: "auto" }}
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <PixelSlotFallback rarity={rarity} name={name} />
      )}
    </div>
  );
}
