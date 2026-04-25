/**
 * 客カテゴリ + 常連システム
 *
 * カテゴリ別に好む機種が違い、満足度が上がると常連化する。
 * 常連は低設定でも打ってくれる。
 */
import type { Machine, Rarity } from "./types";
import { getMakerGroup } from "../data/makerGroups";

export type CustomerCategory =
  | "moe" // 萌えスロ好き
  | "high_volatility" // 高射幸性好き
  | "a_type" // A タイプ (ノーマル) 好き
  | "anime" // 版権アニメ好き
  | "veteran" // ベテラン (4/5 号機の硬派)
  | "newbie" // ライト層 (なんでも良い)
  | "maniac"; // 特定メーカー固定

export const CATEGORY_LABELS: Record<CustomerCategory, string> = {
  moe: "萌えスロ好き",
  high_volatility: "高射幸性",
  a_type: "Aタイプ派",
  anime: "アニメ好き",
  veteran: "硬派ベテラン",
  newbie: "ライト層",
  maniac: "メーカー固定",
};

const MOE_KEYWORDS = [
  "まどマギ",
  "まどか",
  "リゼロ",
  "Re:ゼロ",
  "戦国乙女",
  "ガールズ",
  "アイドル",
  "ラブライブ",
];
const ANIME_KEYWORDS = [
  "北斗",
  "エヴァ",
  "ガンダム",
  "コードギアス",
  "ゴッドイーター",
  "鬼武者",
  "バイオハザード",
  "モンキーターン",
];
const HIGH_VOLATILITY_KEYWORDS = [
  "ミリオン",
  "ゴッド",
  "GOD",
  "凱旋",
  "番長",
  "麻雀物語",
  "万枚",
];
const A_TYPE_KEYWORDS = ["ジャグラー", "ハナハナ", "ハナビ", "クランキー"];

/** 機種に対する category の親和度 (0-1.5) */
export function categoryAffinity(
  cat: CustomerCategory,
  m: Machine
): number {
  const matches = (kws: string[]) => kws.some((k) => m.name.includes(k));
  switch (cat) {
    case "moe":
      return matches(MOE_KEYWORDS) ? 1.5 : 0.5;
    case "anime":
      return matches(ANIME_KEYWORDS) ? 1.5 : 0.6;
    case "high_volatility":
      if (matches(HIGH_VOLATILITY_KEYWORDS)) return 1.5;
      if (m.rarity === "SSR") return 1.2;
      return 0.5;
    case "a_type":
      if (matches(A_TYPE_KEYWORDS)) return 1.5;
      if (m.type === "A" || m.type === "ART") return 1.1;
      return 0.4;
    case "veteran":
      if (m.generation === 4) return 1.5;
      if (m.generation === 5) return 1.2;
      return 0.6;
    case "newbie":
      return 1.0; // 何でも均等
    case "maniac":
      // 特定メーカーは store 側で個別設定する想定。今は中立
      return 1.0;
  }
}

/** カテゴリに合った機種のうちトップ N を例示用に返す */
export function topMatchesForCategory(
  cat: CustomerCategory,
  machines: Machine[],
  n = 3
): Machine[] {
  const scored = machines
    .map((m) => ({ m, s: categoryAffinity(cat, m) }))
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, n).map((x) => x.m);
}

/** 客カテゴリの色 */
export function categoryColor(cat: CustomerCategory): string {
  const map: Record<CustomerCategory, string> = {
    moe: "text-pachi-pink",
    high_volatility: "text-pachi-red",
    a_type: "text-pachi-yellow",
    anime: "text-pachi-cyan",
    veteran: "text-white",
    newbie: "text-pachi-green",
    maniac: "text-pachi-purple",
  };
  return map[cat];
}

// ============================================================
// 常連システム
// ============================================================

export interface Regular {
  id: string;
  category: CustomerCategory;
  /** 好きな機種 ID (カテゴリの代表機種から選ばれる) */
  favoriteMachineId: string;
  /** 好きなメーカー (maniac だけ意味がある) */
  favoriteMaker?: string;
  /** 1-100 の常連レベル (高いほど低設定でも来てくれる) */
  level: number;
  visits: number;
  lastVisitAt: string;
}

/** 常連レベル → 表示ランク (D/C/B/A/S/SS) */
export function regularRank(level: number): string {
  if (level >= 90) return "SS";
  if (level >= 75) return "S";
  if (level >= 60) return "A";
  if (level >= 45) return "B";
  if (level >= 30) return "C";
  if (level >= 15) return "D";
  return "新規";
}

/** カテゴリ + 機種 + 設定 から客付きスコアを計算 */
export function customerScore(
  cat: CustomerCategory,
  machine: Machine,
  setting: 1 | 2 | 3 | 4 | 5 | 6,
  regularLevel = 0,
  makerGroupBoost = false
): number {
  const aff = categoryAffinity(cat, machine);
  const settingFactor =
    [0.55, 0.7, 0.95, 1.15, 1.35, 1.6][setting - 1] ?? 1.0;
  // 常連はマイナス設定でも来てくれる (補正)
  const regularBonus = regularLevel >= 30 ? regularLevel / 200 : 0;
  // メーカー系列ボーナス
  const groupBoost = makerGroupBoost ? 1.15 : 1.0;
  return aff * (settingFactor + regularBonus) * groupBoost;
}

/** maker → group string (helper) */
export function _ensureGroup(maker: string): string {
  return getMakerGroup(maker);
}

/** 全カテゴリ */
export const ALL_CATEGORIES: CustomerCategory[] = [
  "newbie",
  "a_type",
  "anime",
  "moe",
  "high_volatility",
  "veteran",
  "maniac",
];

/** 機種にもっとも親和度の高いカテゴリを返す */
export function dominantCategory(m: Machine): CustomerCategory {
  let best: CustomerCategory = "newbie";
  let bestScore = -Infinity;
  for (const cat of ALL_CATEGORIES) {
    const s = categoryAffinity(cat, m);
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  return best;
}

/** rarity ベースの軽量タイトル付け (rarity が定数 import で必要なら) */
export const _rarityLabel: Record<Rarity, string> = {
  N: "ノーマル",
  R: "レア",
  SR: "Sレア",
  SSR: "看板",
};
