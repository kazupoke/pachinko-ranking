/**
 * 店舗バナー (お仕事 / 買い物 で購入できるアイテム)
 *
 * 画像はインライン SVG で軽く描画 (将来的に Claude Design 経由で
 * 個別 SVG に差し替え予定)。
 * dreampark のみ既に外部 SVG を持っているので画像参照。
 */

export interface Banner {
  id: string;
  name: string;
  /** キャッチコピー */
  tagline: string;
  /** 価格 (G) — 0 は最初から所持 */
  price: number;
  /** 外部画像 URL (game/public/images/* 配下) — 任意 */
  image?: string;
  /** インライン SVG 描画用の主色 */
  primary: string;
  secondary: string;
  accent: string;
  /** バナー上部に表示する装飾文字 (P-World ぽい) */
  prefix?: string;
}

export const BANNERS: Banner[] = [
  {
    id: "default",
    name: "シンプル看板",
    tagline: "標準仕様の看板",
    price: 0,
    primary: "#ff0066",
    secondary: "#ffcc00",
    accent: "#ffffff",
    prefix: "PACHI SHOP",
  },
  {
    id: "neon",
    name: "ネオン看板",
    tagline: "ピンクとシアンのネオンが派手に光る",
    price: 200_000,
    primary: "#ff4d94",
    secondary: "#00e5ff",
    accent: "#ffcc00",
    prefix: "NEON CITY",
  },
  {
    id: "gold",
    name: "黄金看板",
    tagline: "金箔貼りの高級店仕様",
    price: 800_000,
    primary: "#ffcc00",
    secondary: "#ff0066",
    accent: "#000000",
    prefix: "GOLD HALL",
  },
  {
    id: "retro",
    name: "昭和レトロ看板",
    tagline: "渋い茶色基調の懐かしい雰囲気",
    price: 400_000,
    primary: "#dc6428",
    secondary: "#ffb450",
    accent: "#ffffff",
    prefix: "SHOWA",
  },
  {
    id: "cyber",
    name: "サイバー看板",
    tagline: "緑と紫のサイバーパンク",
    price: 1_500_000,
    primary: "#00ff88",
    secondary: "#b066ff",
    accent: "#00e5ff",
    prefix: "CYBER",
  },
  {
    id: "dreampark",
    name: "ドリームパーク看板",
    tagline: "ジャグラー専門店仕様 (ピクセルアート)",
    price: 1_000_000,
    image: "images/dreampark_banner.svg",
    primary: "#ffcc00",
    secondary: "#ff0066",
    accent: "#00ff88",
    prefix: "JUGGLER",
  },
];

export function getBannerById(id: string | null | undefined): Banner | null {
  if (!id) return null;
  return BANNERS.find((b) => b.id === id) ?? null;
}
