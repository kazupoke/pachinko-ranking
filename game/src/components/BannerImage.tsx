import type { Banner } from "../data/banners";

const BASE = import.meta.env.BASE_URL;

interface Props {
  banner: Banner;
  shopName?: string;
  className?: string;
  /** プレビュー用 (小サイズ) */
  small?: boolean;
}

/**
 * 店舗バナー画像 (外部 SVG があればそれ、なければ手描きインライン SVG)
 */
export function BannerImage({ banner, shopName, className = "", small }: Props) {
  if (banner.image) {
    return (
      <img
        src={`${BASE}${banner.image}`}
        alt={`${banner.name} ${shopName ?? ""}`}
        className={`block w-full h-auto ${className}`}
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

  // インライン SVG (汎用 ピクセル看板)
  return (
    <svg
      viewBox="0 0 320 100"
      className={`block w-full h-auto ${className}`}
      style={{ imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${banner.name} ${shopName ?? ""}`}
    >
      {/* 背景 */}
      <rect width="320" height="100" fill="#0a0a14" />
      {/* 上下のフレーム */}
      <rect x="0" y="0" width="320" height="6" fill={banner.primary} />
      <rect x="0" y="94" width="320" height="6" fill={banner.primary} />
      {/* 左右の柱 */}
      <rect x="0" y="0" width="6" height="100" fill={banner.primary} />
      <rect x="314" y="0" width="6" height="100" fill={banner.primary} />
      {/* 内側の二重ライン */}
      <rect x="10" y="10" width="300" height="2" fill={banner.secondary} />
      <rect x="10" y="88" width="300" height="2" fill={banner.secondary} />
      {/* 中央のラベル背景 */}
      <rect x="20" y="22" width="280" height="56" fill={banner.primary} opacity="0.15" />
      {/* prefix (P-WORLD ぽい英字) */}
      {banner.prefix && (
        <text
          x="160"
          y="38"
          fill={banner.secondary}
          fontFamily='"Press Start 2P", monospace'
          fontSize="10"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {banner.prefix}
        </text>
      )}
      {/* 店名 (中央メイン) */}
      {shopName && (
        <text
          x="160"
          y="58"
          fill={banner.accent}
          fontFamily='"DotGothic16", monospace'
          fontSize={small ? 14 : 18}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {shopName}
        </text>
      )}
      {/* 下部のドット飾り (ランプ風) */}
      <g>
        {[40, 80, 120, 160, 200, 240, 280].map((x, i) => (
          <rect
            key={i}
            x={x - 4}
            y="74"
            width="8"
            height="8"
            fill={[banner.primary, banner.secondary, banner.accent][i % 3]}
          />
        ))}
      </g>
    </svg>
  );
}
