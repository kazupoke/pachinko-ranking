import type { Machine, Rarity, Generation } from "../lib/types";
import raw from "./machines.json";
import legacy from "./legacy_machines.json";

interface RawMachine {
  id: string;
  name: string;
  maker: string;
  generation: number;
  gouki_label: string;
  type: string;
  release_date: string;
  release_year: number;
}

/** 名前に含まれると SSR 扱いのシリーズキーワード */
const LEGEND_KEYWORDS = ["北斗の拳", "吉宗", "ミリオンゴッド", "エヴァンゲリオン", "ゴッドイーター"];
/** SR シリーズ */
const SR_KEYWORDS = [
  "番長",
  "まどマギ",
  "まどか☆マギカ",
  "カバネリ",
  "モンキーターン",
  "戦国乙女",
  "バイオハザード",
  "ルパン三世",
  "アクエリオン",
  "ハナビ",
  "ジャグラー",
  "ハナハナ",
  "パチスロ鬼武者",
  "ガンダム",
  "リゼロ",
  "Re:ゼロ",
  "コードギアス",
  "麻雀物語",
  "ガメラ",
  "沖ドキ",
];

function assignRarity(m: RawMachine): Rarity {
  const name = m.name;
  if (LEGEND_KEYWORDS.some((k) => name.includes(k))) return "SSR";
  if (SR_KEYWORDS.some((k) => name.includes(k))) return "SR";

  const isSumasuro = m.gouki_label.includes("スマスロ") || name.includes("スマスロ") || name.includes("スマート");
  const isOldSix = m.gouki_label.includes("6.0号機") || m.gouki_label.includes("6.1号機");
  if (isSumasuro) return "R";
  if (isOldSix) return "R";
  return "N";
}

function normalizeType(t: string): Machine["type"] {
  if (t === "AT") return "AT";
  if (t === "ART" || t === "A+ART" || t === "A+RT" || t === "ノーマル+RT") return "ART";
  if (t === "A+AT" || t.includes("AT")) return "AT";
  if (t === "ノーマル" || t === "A") return "A";
  if (t === "BT" || t === "スマスロ") return "スマスロ";
  return "其他";
}

function normalizeGeneration(m: RawMachine): Generation {
  // サミット site は 6号機+スマスロしか載ってないので全部6扱いで良い
  const g = m.generation;
  if (g === 4) return 4;
  if (g === 5) return 5;
  return 6;
}

function toMachine(m: RawMachine): Machine {
  // 4号機は全部SSR扱い、5号機はSR扱いで上書き
  let rarity = assignRarity(m);
  if (m.generation === 4) rarity = "SSR";
  else if (m.generation === 5 && rarity === "N") rarity = "SR";
  return {
    id: m.id,
    name: m.name,
    maker: m.maker,
    generation: normalizeGeneration(m),
    type: normalizeType(m.type),
    releaseYear: m.release_year,
    rarity,
  };
}

export const ALL_MACHINES: Machine[] = [
  ...(raw as RawMachine[]).map(toMachine),
  ...(legacy as RawMachine[]).map(toMachine),
];

export const MACHINES_BY_ID: Record<string, Machine> = Object.fromEntries(
  ALL_MACHINES.map((m) => [m.id, m])
);

export function machinesByRarity(rarity: Rarity, generation?: Generation): Machine[] {
  return ALL_MACHINES.filter(
    (m) =>
      m.rarity === rarity &&
      (generation === undefined || m.generation === generation)
  );
}
