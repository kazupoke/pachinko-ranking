/**
 * 訪問ガチャ: 3 店舗から好きな店舗を選んで台を遊ぶ
 *
 * 流れ:
 *  1. 訪問先 3 店舗を表示 (各店舗にラインナップ + 設定傾向)
 *  2. 台をタップ → スロット演出 → 出玉判定
 *  3. 出玉に応じて新機種をドロップ (出玉量で レア度確定)
 */
import type { Machine, Rarity } from "./types";
import { ALL_MACHINES, machinesByRarity } from "./../data/machines";
import type { ShopSeries } from "./shopSeries";

export type SettingValue = 1 | 2 | 3 | 4 | 5 | 6;

/** 訪問可能な店舗 */
export interface VisitableShop {
  id: string;
  name: string;
  tagline: string;
  /** 店舗が抱える機種 (ID + 設定傾向) */
  lineup: Array<{ machine: Machine; setting: SettingValue }>;
  /** 店舗のテーマ色 */
  themeColor: string;
  /** 店舗の絵文字 */
  emoji: string;
  /** ベース出玉倍率 (店舗特性) */
  payoutMult: number;
}

/** 1 プレイの結果 */
export interface PlayResult {
  /** 出玉枚数 */
  coins: number;
  /** 大当たり / 中当たり / 小当たり / ハズレ */
  outcome: "big" | "medium" | "small" | "miss";
  /** ドロップ機種 (なければ null) */
  drop: { machine: Machine; rarity: Rarity } | null;
}

/** 1 プレイあたりのコスト (G) */
export const PLAY_COST = 5_000;

/** 出玉量からドロップレア度を判定 */
function dropFromCoins(coins: number, rand: () => number): Rarity | null {
  if (coins >= 1500) return "SSR";
  if (coins >= 700) return rand() < 0.3 ? "SSR" : "SR";
  if (coins >= 300) return rand() < 0.4 ? "SR" : "R";
  if (coins >= 100) return rand() < 0.5 ? "R" : "N";
  if (coins > 0) return "N";
  return null;
}

/** 設定 → 出玉ベース倍率 */
function settingMult(setting: SettingValue): number {
  return [0.7, 0.85, 1.0, 1.15, 1.35, 1.6][setting - 1];
}

/** 1 プレイ実行 */
export function playMachine(
  machine: Machine,
  setting: SettingValue,
  shopMult: number,
  rand: () => number = Math.random
): PlayResult {
  const r = rand();
  let coins: number;
  let outcome: PlayResult["outcome"];

  if (r < 0.55) {
    // ハズレ
    coins = 0;
    outcome = "miss";
  } else if (r < 0.85) {
    // 小当たり
    coins = Math.floor((50 + rand() * 200) * settingMult(setting) * shopMult);
    outcome = "small";
  } else if (r < 0.97) {
    // 中当たり
    coins = Math.floor(
      (300 + rand() * 600) * settingMult(setting) * shopMult
    );
    outcome = "medium";
  } else {
    // 大当たり
    coins = Math.floor(
      (1000 + rand() * 1500) * settingMult(setting) * shopMult
    );
    outcome = "big";
  }

  // レア度ボーナス: SSR/SR の機種は出玉が出やすい
  const rarityBoost: Record<Rarity, number> = {
    N: 1.0,
    R: 1.05,
    SR: 1.15,
    SSR: 1.3,
  };
  coins = Math.floor(coins * rarityBoost[machine.rarity]);

  // ドロップ
  let drop: PlayResult["drop"] = null;
  const dropRarity = dropFromCoins(coins, rand);
  if (dropRarity) {
    const pool = machinesByRarity(dropRarity);
    if (pool.length > 0) {
      const m = pool[Math.floor(rand() * pool.length)];
      drop = { machine: m, rarity: dropRarity };
    }
  }

  return { coins, outcome, drop };
}

// ============================================================
// 3 店舗の生成 (シード固定で毎回同じ 3 店舗にする / 日替わりは別途)
// ============================================================

/** 機種の中からランダムに count 機種を選ぶ */
function pickRandomMachines(
  count: number,
  predicate?: (m: Machine) => boolean,
  rand: () => number = Math.random
): Machine[] {
  let pool = ALL_MACHINES.filter((m) => m.generation === 6);
  if (predicate) pool = pool.filter(predicate);
  const picked: Machine[] = [];
  const used = new Set<string>();
  while (picked.length < count && pool.length > used.size) {
    const m = pool[Math.floor(rand() * pool.length)];
    if (used.has(m.id)) continue;
    used.add(m.id);
    picked.push(m);
  }
  return picked;
}

/** シード rand (LCG) */
function seedRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 今日の日付からシードを作って 3 店舗を生成 */
export function todaysVisitableShops(seriesList: ShopSeries[]): VisitableShop[] {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const r = seedRand(seed);

  return seriesList.slice(0, 3).map((series, i) => {
    const r2 = seedRand(seed + i * 1000);
    const lineupSize = 6 + Math.floor(r2() * 5); // 6-10 機種
    const machines = pickRandomMachines(
      lineupSize,
      (m) => series.isMatch(m) || r2() > 0.7,
      r2
    );
    const lineup = machines.map((m) => {
      // 店舗ごとに設定傾向: 高設定店 / 普通 / 低設定店
      const settingsRoll = r2();
      let setting: SettingValue;
      if (i === 0) {
        // ハイ設定店: 4-6 中心
        setting = (3 + Math.floor(settingsRoll * 4)) as SettingValue;
      } else if (i === 1) {
        // バランス店: 2-5
        setting = (2 + Math.floor(settingsRoll * 4)) as SettingValue;
      } else {
        // シブ店: 1-3
        setting = (1 + Math.floor(settingsRoll * 3)) as SettingValue;
      }
      if (setting < 1) setting = 1;
      if (setting > 6) setting = 6;
      return { machine: m, setting };
    });
    // 店舗 payout mult
    const payoutMult = i === 0 ? 1.15 : i === 1 ? 1.0 : 0.85;
    const tag =
      i === 0
        ? "ハイ設定狙い目"
        : i === 1
          ? "バランス店"
          : "シブ店 (運試し)";
    void r;
    return {
      id: `shop_${i}`,
      name: series.name,
      tagline: tag,
      lineup,
      themeColor: series.bannerBg,
      emoji: series.emoji,
      payoutMult,
    };
  });
}
