/**
 * 故障 / 修理システム
 *
 * - 設置中の台は 1 リアル時間 ≒ 数 HP 消費
 * - HP 0 → 故障 (5 種類のうち 1 つランダム)
 * - 故障部品を買って使えば修理 (2,000 — 50,000 G)
 * - 放置 (broken since が長い) → 部品では治らず、店長レベルで強制修復
 */
import type { Machine } from "./types";

export type BrokenPart =
  | "液晶"
  | "レバー"
  | "基盤"
  | "ボタン"
  | "メダル詰まり";

export const BROKEN_PARTS: BrokenPart[] = [
  "液晶",
  "レバー",
  "基盤",
  "ボタン",
  "メダル詰まり",
];

/** 部品の購入価格 (G) */
export const PART_PRICE: Record<BrokenPart, number> = {
  メダル詰まり: 2_000,
  ボタン: 8_000,
  レバー: 15_000,
  液晶: 35_000,
  基盤: 50_000,
};

/** 放置で部品では治らなくなる閾値 (tick 数) */
export const ABANDON_THRESHOLD = 30; // ~30 tick = 15 分放置で部品修理不可

/** 部品で修理できるかどうか */
export function canRepairWithParts(brokenSince: number): boolean {
  return brokenSince < ABANDON_THRESHOLD;
}

/** 店長レベル修理に必要な店長レベル */
export const MANAGER_LEVEL_REPAIR_COST = 1;

/** ランダムな故障部品を生成 */
export function randomBrokenPart(rng: () => number = Math.random): BrokenPart {
  return BROKEN_PARTS[Math.floor(rng() * BROKEN_PARTS.length)];
}

/** 機種のレア度ボーナス (高レア度ほど HP 減りが速い = 客が多くつく分の負荷) */
export function hpDecayMultiplier(m: Machine): number {
  const map = { N: 1.0, R: 1.1, SR: 1.3, SSR: 1.5 } as const;
  return map[m.rarity];
}

/** 1 ティックの基本 HP 減 (per machine) */
export const HP_DECAY_PER_TICK_BASE = 0.4;

/** 閉店作業中の HP 回復量 / tick (per installed machine) */
export const CLOSING_HP_RECOVER_PER_TICK = 1.5;

/** 部品在庫 (店長が買って持っている) */
export interface PartInventory {
  メダル詰まり: number;
  ボタン: number;
  レバー: number;
  液晶: number;
  基盤: number;
}

export function emptyPartInventory(): PartInventory {
  return {
    メダル詰まり: 0,
    ボタン: 0,
    レバー: 0,
    液晶: 0,
    基盤: 0,
  };
}
