/**
 * 覆面調査用のシード店（ローカルダミー）。
 * サーバー連携前の遊びとして、他プレイヤーの店を模擬。
 */
import { ALL_MACHINES } from "./machines";
import type { Machine } from "../lib/types";

export interface SeedShop {
  id: string;
  name: string;
  ownerName: string;
  tier: 1 | 2 | 3 | 4 | 5;
  lineup: Array<{ machineId: string; count: number }>;
}

function pickByIds(ids: string[]): Array<{ machineId: string; count: number }> {
  const map = new Map(ALL_MACHINES.map((m) => [m.id, m]));
  return ids
    .filter((id) => map.has(id))
    .map((id) => ({ machineId: id, count: 4 + Math.floor(Math.random() * 16) }));
}

function machineIdsByFilter(pred: (m: Machine) => boolean, limit: number): string[] {
  return ALL_MACHINES.filter(pred)
    .slice(0, limit)
    .map((m) => m.id);
}

// 毎回ランダムだとセッション間で変わってしまうので、シード選定ロジックを固定化
export const SEED_SHOPS: SeedShop[] = [
  {
    id: "seed_legend_hall",
    name: "レジェンドホール",
    ownerName: "伝説の店長",
    tier: 3,
    lineup: pickByIds([
      "legacy_h4",
      "legacy_yoshimune",
      "legacy_god4",
      "legacy_eva_first",
      "legacy_banchou3",
      "legacy_basilisk_kizuna",
      "legacy_god5_gaiten",
    ]),
  },
  {
    id: "seed_smart_palace",
    name: "スマートパレス",
    ownerName: "若き店長",
    tier: 2,
    lineup: pickByIds(machineIdsByFilter((m) => m.generation === 6, 12)),
  },
  {
    id: "seed_jag_tengoku",
    name: "ジャグラー天国",
    ownerName: "ジャグおじさん",
    tier: 2,
    lineup: pickByIds(
      machineIdsByFilter((m) => m.name.includes("ジャグラー") || m.name.includes("ハナハナ"), 10)
    ),
  },
  {
    id: "seed_maniac",
    name: "マニアの隠れ家",
    ownerName: "通の店長",
    tier: 2,
    lineup: pickByIds(machineIdsByFilter((m) => m.generation === 5, 15)),
  },
  {
    id: "seed_massive",
    name: "大型ホール PACHI-KING",
    ownerName: "上場企業",
    tier: 4,
    lineup: pickByIds(machineIdsByFilter((m) => m.rarity === "R" || m.rarity === "SR", 25)),
  },
  {
    id: "seed_budget",
    name: "格安スロ屋",
    ownerName: "庶民派",
    tier: 1,
    lineup: pickByIds(machineIdsByFilter((m) => m.rarity === "N", 20)),
  },
];
