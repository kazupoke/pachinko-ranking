/** ドット絵風SVGアイコン集（16×16グリッドベース） */

type Props = { size?: number; className?: string };

export function IconHome({ size = 20, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: "pixelated" }}>
      {/* 屋根 */}
      <rect x="7" y="1" width="2" height="2" fill="currentColor" />
      <rect x="5" y="3" width="6" height="2" fill="currentColor" />
      <rect x="3" y="5" width="10" height="2" fill="currentColor" />
      {/* 壁 */}
      <rect x="2" y="7" width="12" height="8" fill="currentColor" />
      {/* ドア */}
      <rect x="6" y="11" width="4" height="4" fill="var(--bg-base, #0a0a14)" />
      {/* 窓 */}
      <rect x="3" y="9" width="3" height="3" fill="var(--bg-base, #0a0a14)" />
      <rect x="10" y="9" width="3" height="3" fill="var(--bg-base, #0a0a14)" />
    </svg>
  );
}

export function IconShop({ size = 20, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: "pixelated" }}>
      {/* 看板 */}
      <rect x="1" y="1" width="14" height="4" fill="currentColor" />
      <rect x="2" y="2" width="12" height="2" fill="var(--bg-base, #0a0a14)" />
      {/* 外壁 */}
      <rect x="1" y="5" width="14" height="10" fill="currentColor" />
      {/* ショーウィンドウ */}
      <rect x="2" y="6" width="5" height="5" fill="var(--bg-base, #0a0a14)" />
      <rect x="9" y="6" width="5" height="5" fill="var(--bg-base, #0a0a14)" />
      {/* ドア */}
      <rect x="6" y="9" width="4" height="6" fill="var(--bg-base, #0a0a14)" />
    </svg>
  );
}

export function IconSlot({ size = 20, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: "pixelated" }}>
      {/* 筐体外枠 */}
      <rect x="2" y="1" width="12" height="14" fill="currentColor" />
      {/* 画面 */}
      <rect x="3" y="2" width="10" height="8" fill="var(--bg-base, #0a0a14)" />
      {/* リール×3 */}
      <rect x="4" y="3" width="2" height="6" fill="#ffcc00" opacity="0.8" />
      <rect x="7" y="3" width="2" height="6" fill="#ff4d94" opacity="0.8" />
      <rect x="10" y="3" width="2" height="6" fill="#00e5ff" opacity="0.8" />
      {/* ラインライト */}
      <rect x="3" y="6" width="10" height="1" fill="#ff0066" opacity="0.5" />
      {/* ボタン */}
      <rect x="3" y="11" width="3" height="2" fill="#ff0066" />
      <rect x="7" y="11" width="2" height="2" fill="#ffcc00" />
      <rect x="11" y="11" width="2" height="2" fill="#00ff88" />
      {/* 台脚 */}
      <rect x="4" y="13" width="3" height="2" fill="currentColor" />
      <rect x="9" y="13" width="3" height="2" fill="currentColor" />
    </svg>
  );
}

export function IconGacha({ size = 20, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: "pixelated" }}>
      {/* カプセル上半分 */}
      <rect x="4" y="1" width="8" height="1" fill="currentColor" />
      <rect x="3" y="2" width="10" height="1" fill="currentColor" />
      <rect x="2" y="3" width="12" height="4" fill="currentColor" />
      {/* 中央ライン */}
      <rect x="2" y="7" width="12" height="2" fill="currentColor" />
      {/* カプセル下半分 */}
      <rect x="2" y="9" width="12" height="4" fill="currentColor" />
      <rect x="3" y="13" width="10" height="1" fill="currentColor" />
      <rect x="4" y="14" width="8" height="1" fill="currentColor" />
      {/* 光沢 */}
      <rect x="4" y="3" width="3" height="3" fill="var(--bg-base, #0a0a14)" opacity="0.4" />
      {/* 星 */}
      <rect x="7" y="10" width="2" height="2" fill="#ffcc00" />
      <rect x="6" y="11" width="4" height="1" fill="#ffcc00" />
    </svg>
  );
}

export function IconMystery({ size = 20, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: "pixelated" }}>
      {/* 帽子 */}
      <rect x="3" y="1" width="10" height="2" fill="currentColor" />
      <rect x="4" y="3" width="8" height="2" fill="currentColor" />
      {/* 顔輪郭 */}
      <rect x="4" y="5" width="8" height="6" fill="currentColor" />
      {/* サングラス */}
      <rect x="5" y="7" width="2" height="2" fill="var(--bg-base, #0a0a14)" />
      <rect x="9" y="7" width="2" height="2" fill="var(--bg-base, #0a0a14)" />
      <rect x="7" y="7" width="2" height="1" fill="var(--bg-base, #0a0a14)" opacity="0.6" />
      {/* 口 */}
      <rect x="6" y="10" width="4" height="1" fill="var(--bg-base, #0a0a14)" />
      {/* 胴体 */}
      <rect x="5" y="11" width="6" height="4" fill="currentColor" />
    </svg>
  );
}
