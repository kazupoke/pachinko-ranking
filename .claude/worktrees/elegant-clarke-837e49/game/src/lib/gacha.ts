import type { Machine, Rarity } from "./types";
import { machinesByRarity } from "../data/machines";

const RATES: Record<Rarity, number> = {
  SSR: 0.01,
  SR: 0.06,
  R: 0.23,
  N: 0.7,
};

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];

export const GACHA_COST_SINGLE = 100_000;
export const GACHA_COST_TEN = 1_000_000;

function pickRarity(rand: () => number): Rarity {
  const r = rand();
  let acc = 0;
  for (const rar of RARITY_ORDER) {
    acc += RATES[rar];
    if (r < acc) return rar;
  }
  return "N";
}

function pickMachine(rarity: Rarity, rand: () => number): Machine | null {
  let pool = machinesByRarity(rarity);
  // もし該当レアリティ機種が0件ならワンランク下にフォールバック
  if (pool.length === 0) {
    const idx = RARITY_ORDER.indexOf(rarity);
    for (let i = idx + 1; i < RARITY_ORDER.length; i++) {
      pool = machinesByRarity(RARITY_ORDER[i]);
      if (pool.length > 0) break;
    }
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(rand() * pool.length)];
}

export interface PullResult {
  machine: Machine;
  rarity: Rarity;
}

export function pullSingle(rand: () => number = Math.random): PullResult | null {
  const rarity = pickRarity(rand);
  const machine = pickMachine(rarity, rand);
  if (!machine) return null;
  return { machine, rarity };
}

export function pullTen(rand: () => number = Math.random): PullResult[] {
  const results: PullResult[] = [];
  // 10連は1回SR以上確定
  let hasSrOrHigher = false;
  for (let i = 0; i < 10; i++) {
    const r = pullSingle(rand);
    if (!r) continue;
    if (r.rarity === "SR" || r.rarity === "SSR") hasSrOrHigher = true;
    results.push(r);
  }
  // 最後の1枠をSR以上に入れ替える救済
  if (!hasSrOrHigher && results.length > 0) {
    const srPool = [...machinesByRarity("SR"), ...machinesByRarity("SSR")];
    if (srPool.length > 0) {
      const pick = srPool[Math.floor(rand() * srPool.length)];
      results[results.length - 1] = { machine: pick, rarity: pick.rarity };
    }
  }
  return results;
}
