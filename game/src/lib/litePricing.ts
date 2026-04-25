/**
 * ライトモード: 機種価格と店舗評価のロジック
 */
import type { Machine, Rarity } from "./types";
import { getMakerGroup } from "../data/makerGroups";

/** レアリティ別の 1 台あたり購入価格 (G) */
export const PRICE_BY_RARITY: Record<Rarity, number> = {
  N: 20_000, // 2万
  R: 50_000, // 5万
  SR: 100_000, // 10万
  SSR: 200_000, // 20万
};

/** 初期予算 */
export const INITIAL_BUDGET = 1_000_000; // 100万

/** 機種 + 台数 → 購入金額 */
export function entryCost(rarity: Rarity, count: number): number {
  return PRICE_BY_RARITY[rarity] * count;
}

/** 全エントリの合計コスト */
export function totalCost(
  entries: Record<string, number>,
  machineById: Record<string, Machine>
): number {
  let cost = 0;
  for (const [mid, count] of Object.entries(entries)) {
    const m = machineById[mid];
    if (m) cost += entryCost(m.rarity, count);
  }
  return cost;
}

// ============================================================
// 客満足度スコア (5 点満点)
// ============================================================

export interface ScoreBreakdown {
  /** 0.0 〜 5.0 */
  total: number;
  /** 内訳 (デバッグ用) */
  parts: {
    /** 多様性: 機種数 (0 〜 1.5) */
    variety: number;
    /** レア度分布の良さ (0 〜 1.5) */
    rarityMix: number;
    /** 系列の多様性 (0 〜 1.0) */
    groupMix: number;
    /** 設置規模 (0 〜 1.0) */
    scale: number;
  };
  /** 評価コメント (3 つ) */
  comments: string[];
}

const POPULAR_KEYWORDS = [
  "北斗",
  "ジャグラー",
  "ハナビ",
  "番長",
  "まどマギ",
  "まどか",
  "リゼロ",
  "Re:ゼロ",
  "モンキーターン",
  "戦国乙女",
  "コードギアス",
  "エヴァ",
  "ゴッド",
  "バイオハザード",
  "沖ドキ",
  "アイムジャグラー",
];

export function calcScore(
  entries: Record<string, number>,
  machineById: Record<string, Machine>
): ScoreBreakdown {
  const machines: { m: Machine; count: number }[] = [];
  for (const [mid, count] of Object.entries(entries)) {
    const m = machineById[mid];
    if (m && count > 0) machines.push({ m, count });
  }

  const totalCount = machines.reduce((s, e) => s + e.count, 0);
  const kindCount = machines.length;

  if (kindCount === 0) {
    return {
      total: 0,
      parts: { variety: 0, rarityMix: 0, groupMix: 0, scale: 0 },
      comments: ["まだ機種が選ばれていません"],
    };
  }

  // ① 多様性 (機種数): 8 機種で満点
  const variety = Math.min(kindCount / 8, 1) * 1.5;

  // ② レア度分布: SR/SSR 含有比率 + 全部 N に偏ると減点
  const rarityCount: Record<Rarity, number> = { N: 0, R: 0, SR: 0, SSR: 0 };
  for (const { m, count } of machines) {
    rarityCount[m.rarity] += count;
  }
  const highRarePct = (rarityCount.SR + rarityCount.SSR) / totalCount;
  const nPct = rarityCount.N / totalCount;
  // SR+SSR が 30% 程度で満点。N 偏重 (>80%) で減点
  let rarityMix = Math.min(highRarePct / 0.3, 1) * 1.2;
  if (nPct > 0.8) rarityMix *= 0.5;
  // 人気シリーズボーナス (最大 +0.3)
  const hasPopular = machines.some((e) =>
    POPULAR_KEYWORDS.some((k) => e.m.name.includes(k))
  );
  if (hasPopular) rarityMix += 0.3;
  rarityMix = Math.min(rarityMix, 1.5);

  // ③ 系列の多様性: 4 系列以上で満点
  const groups = new Set(machines.map((e) => getMakerGroup(e.m.maker)));
  const groupMix = Math.min(groups.size / 4, 1) * 1.0;

  // ④ 設置規模: 50 台で満点 / 200 台で満点維持
  const scale = Math.min(totalCount / 50, 1) * 1.0;

  const total = Math.round((variety + rarityMix + groupMix + scale) * 10) / 10;

  // コメント
  const comments: string[] = [];
  if (kindCount < 5) comments.push("機種数が少なめ。あと数機種ほしい。");
  else if (kindCount >= 10) comments.push("機種ラインナップが充実！");

  if (highRarePct < 0.1) comments.push("看板機種 (SR/SSR) が薄い。");
  else if (highRarePct > 0.5) comments.push("看板機種が多くて華やか！");

  if (groups.size <= 1) comments.push("系列が偏っている。違う系列も混ぜると客層が広がる。");
  else if (groups.size >= 5) comments.push("系列バランスが良い。");

  if (totalCount < 20) comments.push("規模がまだ小さい。");
  else if (totalCount >= 100) comments.push("大箱店の風格！");

  if (hasPopular) comments.push("人気シリーズ入り、集客力◎");

  // 上位 3 件まで
  const top = comments.slice(0, 3);
  if (top.length === 0) top.push("バランス良好");

  return {
    total,
    parts: { variety, rarityMix, groupMix, scale },
    comments: top,
  };
}

/** 5 点満点 → ★アイコン文字列 (例: ★★★★☆) */
export function starRating(score: number): string {
  const filled = Math.round(score);
  return "★".repeat(filled) + "☆".repeat(Math.max(0, 5 - filled));
}
