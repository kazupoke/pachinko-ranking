/**
 * 市場流通量 (販売台数) システム
 *
 * - 各機種に「販売台数」初期値 (発売時点の市場流通)
 * - 1 年経過ごとに 市場流通量が 20% 減少 (撤去/廃棄)
 * - ガチャ獲得すると market から差し引かれる (ただし下限あり)
 * - 流通量が少ない機種ほどレア度 UP
 */
import type { Machine, Rarity } from "./types";
import POPULARITY_RAW from "../data/pworld_popularity.json";

interface PopEntry {
  bbs?: number;
  pv?: number;
  err?: number | string;
}
const POPULARITY: Record<string, PopEntry> = POPULARITY_RAW as Record<string, PopEntry>;

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

// ============================================================
// 人気指標 + 市場価格
// ============================================================

const MEGA_POP = [
  "北斗の拳",
  "ジャグラー",
  "ハナビ",
  "番長",
  "まどマギ",
  "まどか",
  "リゼロ",
  "Re:ゼロ",
  "ゴッド",
  "凱旋",
];
const POP = [
  "エヴァ",
  "吉宗",
  "モンキーターン",
  "ガンダム",
  "コードギアス",
  "戦国乙女",
  "アクエリオン",
  "ハナハナ",
  "麻雀物語",
  "鬼武者",
  "バイオハザード",
  "沖ドキ",
  "アイドル",
  "ラブライブ",
];

/**
 * 人気指標 (1-100)
 *
 * 実装: P-World のコメント数 (掲示板書き込み数) を流通台数で割って密度を算出。
 *       密度の対数で 1-100 に正規化。
 *       データは scripts/fetch_pworld_popularity.py で claude-in-chrome 経由スクレイプ。
 *       コメント未取得 (旧データなし) はキーワードヒューリスティックでフォールバック。
 */

/** ヒューリスティックフォールバック (コメントデータがない場合) */
function heuristicPopularity(m: Machine): number {
  let p = 30;
  if (MEGA_POP.some((k) => m.name.includes(k))) p += 30;
  else if (POP.some((k) => m.name.includes(k))) p += 18;
  if (m.rarity === "SSR") p += 18;
  else if (m.rarity === "SR") p += 10;
  else if (m.rarity === "R") p += 4;
  if (m.releaseYear >= 2024) p += 10;
  else if (m.releaseYear >= 2022) p += 5;
  return Math.max(1, Math.min(100, p));
}

/** 全機種のコメント密度の 95 パーセンタイル (正規化用、初回計算で memo)
 *  外れ値 1-2 機種に引っ張られないよう p95 を分母に使う。 */
let _p95Density: number | null = null;
function getMaxDensity(allMachines: Iterable<Machine>): number {
  if (_p95Density != null) return _p95Density;
  const arr: number[] = [];
  for (const m of allMachines) {
    const e = POPULARITY[m.id];
    if (!e || e.err) continue;
    const bbs = e.bbs ?? 0;
    const supply = getInitialSupply(m);
    arr.push(bbs / Math.max(supply, 1));
  }
  arr.sort((a, b) => a - b);
  if (arr.length === 0) {
    _p95Density = 1;
    return _p95Density;
  }
  const p95 = arr[Math.floor(arr.length * 0.95)];
  _p95Density = p95 > 0 ? p95 : 1;
  return _p95Density;
}

export function getPopularity(m: Machine, allMachines?: Iterable<Machine>): number {
  const e = POPULARITY[m.id];
  if (!e || e.err || e.bbs === undefined) {
    return heuristicPopularity(m);
  }
  const supply = getInitialSupply(m);
  const density = (e.bbs ?? 0) / Math.max(supply, 1);
  // 対数正規化 (外れ値を抑える)
  // density 0 → 1, 中央 → 50, 最大 → 100
  if (allMachines) {
    const maxD = getMaxDensity(allMachines);
    const ratio = Math.log1p(density * 100) / Math.log1p(maxD * 100);
    return Math.max(1, Math.min(100, Math.round(ratio * 100)));
  }
  // allMachines 未指定の場合: bbs 数で簡易スケール
  const bbs = e.bbs ?? 0;
  if (bbs <= 0) return 5;
  const score = Math.log1p(bbs) / Math.log1p(1000); // 1000 件で 100% の目安
  return Math.max(1, Math.min(100, Math.round(score * 100)));
}

const RARITY_BASE_PRICE: Record<string, number> = {
  N: 20_000,
  R: 50_000,
  SR: 100_000,
  SSR: 200_000,
};

/**
 * 現在の市場価格 (G)
 *
 * 公式: basePrice × popularityMult × (initial / current)^1.2
 *  - パチスロ以外の遊戯がない世界 → 価格は青天井
 *  - 流通が枯渇するほど指数関数的に高騰 (上限なし)
 *  - 人気台 = 価格倍率 高
 */
export function getMarketPrice(
  m: Machine,
  withdrawn: number = 0,
  allMachines?: Iterable<Machine>
): number {
  const init = getInitialSupply(m);
  const cur = getCurrentSupply(m, withdrawn);
  const ratio = init / Math.max(cur, 1); // 1 = 新台時 / 大きいほど枯渇
  const scarcityMult = Math.pow(ratio, 1.2);
  const pop = getPopularity(m, allMachines);
  const popMult = 0.5 + pop / 50;
  const base = RARITY_BASE_PRICE[m.rarity] ?? 20_000;
  return Math.round(base * popMult * scarcityMult);
}

/** 価格を 3 桁区切りで「¥」付きフォーマット */
export function formatPrice(price: number): string {
  return "¥" + Math.round(price).toLocaleString();
}
