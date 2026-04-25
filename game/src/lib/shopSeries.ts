/**
 * 開店候補の店舗 (オンボーディング入口で 3 軒からスワイプで選ぶ)
 *
 * 各店舗には以下のフレーバーがある:
 * - 店舗名・キャッチコピー・代表色
 * - 特日 (毎月何日が特日か)
 * - イベント名
 * - 来店演者 (マスコット)
 * - 系列バイアス: 100 連で該当機種の出現率がブースト
 */
import type { Machine } from "./types";
import { getMakerGroup, type MakerGroup } from "../data/makerGroups";

export interface ShopSeries {
  id: string;
  name: string;
  /** 看板コピー */
  tagline: string;
  /** 特日 (例: "4のつく日") */
  specialDay: string;
  /** 月例イベント */
  event: string;
  /** 来店演者 / マスコット */
  mascot: string;
  /** 代表機種 / シリーズの説明 */
  examples: string[];
  /** バイアス対象の判定 */
  isMatch: (m: Machine) => boolean;
  /** 看板の主色 (Tailwind class) */
  bannerBg: string;
  /** アクセント線 */
  accent: string;
  /** ピクセル絵文字 (代用 / SVG が無い場合のフォールバック) */
  emoji: string;
  /** 看板用 SVG (game/public/images/* 配下を相対パスで指定) */
  bannerImage?: string;
}

const inGroup = (m: Machine, groups: MakerGroup[]) =>
  groups.includes(getMakerGroup(m.maker));
const nameIncludes = (m: Machine, kws: string[]) =>
  kws.some((k) => m.name.includes(k));

export const SHOP_SERIES: ShopSeries[] = [
  {
    id: "juggler",
    name: "ドリームパーク",
    tagline: "ジャグラー専門店",
    specialDay: "6 のつく日",
    event: "白いペカフェス",
    mascot: "GOGO チャン",
    examples: ["アイムジャグラー", "マイジャグラー", "ハナハナ"],
    isMatch: (m) =>
      inGroup(m, ["北電子系"]) ||
      nameIncludes(m, ["ジャグラー", "ハナハナ", "ハナビ"]),
    bannerBg: "bg-pachi-yellow text-bg-base",
    accent: "border-pachi-yellow",
    emoji: "🎰",
    bannerImage: "images/dreampark_banner.svg",
  },
  {
    id: "anime",
    name: "アニマスホール",
    tagline: "アニメ系特化店",
    specialDay: "9 のつく日",
    event: "魔法少女ナイト",
    mascot: "ほむほむ店長",
    examples: ["まどか☆マギカ", "北斗の拳", "リゼロ"],
    isMatch: (m) =>
      nameIncludes(m, [
        "まどマギ",
        "まどか",
        "北斗",
        "エヴァ",
        "ガンダム",
        "コードギアス",
        "リゼロ",
        "Re:ゼロ",
        "ゴッドイーター",
        "アクエリオン",
        "戦国乙女",
        "アイドルマスター",
        "ラブライブ",
        "ハイスクール",
        "鬼武者",
      ]),
    bannerBg: "bg-pachi-pink text-bg-base",
    accent: "border-pachi-pink",
    emoji: "✨",
  },
  {
    id: "at",
    name: "キングダム本店",
    tagline: "AT 機の聖地",
    specialDay: "7 のつく日",
    event: "番長デイ",
    mascot: "番長ボーイ",
    examples: ["押忍！番長", "モンキーターン", "吉宗"],
    isMatch: (m) =>
      inGroup(m, ["大都技研系", "山佐系"]) ||
      nameIncludes(m, ["番長", "モンキーターン", "吉宗", "麻雀物語", "サラリーマン"]),
    bannerBg: "bg-pachi-cyan text-bg-base",
    accent: "border-pachi-cyan",
    emoji: "👑",
  },
];

export function getSeriesById(id: string | null | undefined): ShopSeries | null {
  if (!id) return null;
  return SHOP_SERIES.find((s) => s.id === id) ?? null;
}
