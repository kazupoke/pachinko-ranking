/**
 * 市場流通量 (販売台数) システム
 *
 * - 各機種に「販売台数」初期値 (発売時点の市場流通)
 * - 1 年経過ごとに 市場流通量が 20% 減少 (撤去/廃棄)
 * - ガチャ獲得すると market から差し引かれる (ただし下限あり)
 * - 流通量が少ない機種ほどレア度 UP
 */
import type { Machine, Rarity } from "./types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARLY_DECAY = 0.8; // 1 年で 20% 減
const MIN_SUPPLY = 100; // 下限 (これ以下にはならない)

/**
 * 初期販売台数 (推定値)
 * 機種特性 (レア度・人気シリーズ・世代) からヒューリスティックで算出
 */
export function getInitialSupply(m: Machine): number {
  // ベース値 (発売時点の市場規模, 万台単位)
  let base = 30000;

  // 世代による補正
  if (m.generation === 4) base = 80000; // 4号機は大量販売の時代
  else if (m.generation === 5) base = 60000;
  else if (m.generation === 6) base = 30000;

  // 人気シリーズはさらに上乗せ
  const megaPopular = [
    "北斗の拳",
    "ジャグラー",
    "ハナビ",
    "番長",
    "まどマギ",
    "まどか",
    "リゼロ",
    "Re:ゼロ",
    "エヴァ",
    "ゴッド",
    "吉宗",
    "モンキーターン",
  ];
  const popular = [
    "ガンダム",
    "コードギアス",
    "戦国乙女",
    "アクエリオン",
    "ハナハナ",
    "麻雀物語",
    "鬼武者",
    "バイオハザード",
    "沖ドキ",
  ];

  if (megaPopular.some((k) => m.name.includes(k))) base *= 1.5;
  else if (popular.some((k) => m.name.includes(k))) base *= 1.2;

  // レア度による補正 (元データの rarity が高いものは生産台数が少ない傾向)
  const rarityMult: Record<Rarity, number> = {
    SSR: 0.6,
    SR: 0.85,
    R: 1.0,
    N: 1.1,
  };
  base *= rarityMult[m.rarity];

  return Math.round(base);
}

/**
 * 現在の市場流通量
 * = 初期 × decay^elapsedYears − 個人の引いた数 (下限 MIN_SUPPLY)
 */
export function getCurrentSupply(m: Machine, withdrawn: number = 0): number {
  const elapsed = Math.max(0, CURRENT_YEAR - m.releaseYear);
  const decayed = getInitialSupply(m) * Math.pow(YEARLY_DECAY, elapsed);
  return Math.max(MIN_SUPPLY, Math.round(decayed - withdrawn));
}

/**
 * 現在の市場流通量からレア度を算出 (動的レアリティ)
 *
 * 流通量が少ない = 入手困難 = 高レア度
 */
export function marketRarity(currentSupply: number): Rarity {
  if (currentSupply < 1500) return "SSR";
  if (currentSupply < 6000) return "SR";
  if (currentSupply < 15000) return "R";
  return "N";
}

/** 機種の現在のマーケットレア度 */
export function machineMarketRarity(
  m: Machine,
  withdrawn: number = 0
): Rarity {
  return marketRarity(getCurrentSupply(m, withdrawn));
}

/** 市場流通量を そのまま 整数表記 (3 桁区切り) で返す。略さない。 */
export function formatSupply(supply: number): string {
  return Math.round(supply).toLocaleString();
}

/** 流通量の経過率 (0-1, 0=ほぼ廃棄, 1=新台時) */
export function supplyRatio(m: Machine, withdrawn: number = 0): number {
  const init = getInitialSupply(m);
  const cur = getCurrentSupply(m, withdrawn);
  return Math.max(0, Math.min(1, cur / init));
}
