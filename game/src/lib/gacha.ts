import type { Machine, Rarity } from "./types";
import { machinesByRarity } from "../data/machines";
import type { ShopSeries } from "./shopSeries";

const RATES: Record<Rarity, number> = {
  SSR: 0.01,
  SR: 0.06,
  R: 0.23,
  N: 0.7,
};

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];

export const GACHA_COST_SINGLE = 100_000;
export const GACHA_COST_TEN = 1_000_000;

/** シリーズマッチ機種の出現重み倍率 */
const SERIES_BOOST = 4;

function pickRarity(rand: () => number): Rarity {
  const r = rand();
  let acc = 0;
  for (const rar of RARITY_ORDER) {
    acc += RATES[rar];
    if (r < acc) return rar;
  }
  return "N";
}

function pickMachine(
  rarity: Rarity,
  rand: () => number,
  series: ShopSeries | null = null
): Machine | null {
  let pool = machinesByRarity(rarity);
  if (pool.length === 0) {
    const idx = RARITY_ORDER.indexOf(rarity);
    for (let i = idx + 1; i < RARITY_ORDER.length; i++) {
      pool = machinesByRarity(RARITY_ORDER[i]);
      if (pool.length > 0) break;
    }
  }
  if (pool.length === 0) return null;

  // シリーズバイアス: マッチ機種を SERIES_BOOST 倍の重みで選ぶ
  if (series) {
    const weights = pool.map((m) => (series.isMatch(m) ? SERIES_BOOST : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let target = rand() * total;
    for (let i = 0; i < pool.length; i++) {
      target -= weights[i];
      if (target <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  return pool[Math.floor(rand() * pool.length)];
}

export interface PullResult {
  machine: Machine;
  rarity: Rarity;
}

export function pullSingle(
  rand: () => number = Math.random,
  series: ShopSeries | null = null
): PullResult | null {
  const rarity = pickRarity(rand);
  const machine = pickMachine(rarity, rand, series);
  if (!machine) return null;
  return { machine, rarity };
}

export function pullTen(
  rand: () => number = Math.random,
  series: ShopSeries | null = null
): PullResult[] {
  const results: PullResult[] = [];
  let hasSrOrHigher = false;
  for (let i = 0; i < 10; i++) {
    const r = pullSingle(rand, series);
    if (!r) continue;
    if (r.rarity === "SR" || r.rarity === "SSR") hasSrOrHigher = true;
    results.push(r);
  }
  // 救済: 10 連に SR 以上が無ければ最後を SR 以上に差し替え
  if (!hasSrOrHigher && results.length > 0) {
    const srPool = [
      ...machinesByRarity("SR"),
      ...machinesByRarity("SSR"),
    ];
    if (srPool.length > 0) {
      let pickFrom = srPool;
      if (series) {
        const matched = srPool.filter((m) => series.isMatch(m));
        if (matched.length > 0) pickFrom = matched;
      }
      const pick = pickFrom[Math.floor(rand() * pickFrom.length)];
      results[results.length - 1] = { machine: pick, rarity: pick.rarity };
    }
  }
  return results;
}
