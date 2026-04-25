/**
 * 設定システム (機械割 / 客付き影響)
 *
 * 設定値 1-6 (一部機種は 1/2/4/6 のみなど機種固有)
 * 機械割 (PAYOUT_RATE) は設定が高いほど客に有利 = 店の取り分が減る
 * 客付き (ATTRACT) は高設定ほど多く付く
 */
import type { Rarity } from "./types";

export type SettingValue = 1 | 2 | 3 | 4 | 5 | 6;

/** レア度別の機械割テーブル (推定値, % で表現) */
const PAYOUT_BY_RARITY: Record<Rarity, Record<SettingValue, number>> = {
  N:   { 1: 96.5, 2: 97.5, 3: 99.0, 4: 101.0, 5: 104.0, 6: 109.0 },
  R:   { 1: 97.0, 2: 98.0, 3: 99.5, 4: 101.5, 5: 105.0, 6: 110.0 },
  SR:  { 1: 97.0, 2: 98.5, 3: 100.0, 4: 102.5, 5: 106.0, 6: 111.0 },
  SSR: { 1: 97.5, 2: 99.0, 3: 100.5, 4: 103.0, 5: 107.0, 6: 112.0 },
};

/** 設定値 → 機械割 (%) */
export function payoutRate(rarity: Rarity, setting: SettingValue): number {
  return PAYOUT_BY_RARITY[rarity][setting];
}

/** 設定値 → 客付き倍率 (1.0 が中央, 6 で 1.6, 1 で 0.5 ぐらい) */
export function attractFactor(setting: SettingValue): number {
  const table: Record<SettingValue, number> = {
    1: 0.55,
    2: 0.7,
    3: 0.95,
    4: 1.15,
    5: 1.35,
    6: 1.6,
  };
  return table[setting];
}

/** 設定値 → 1 台あたりの店の粗利率 (粗利係数) */
export function shopMarginFactor(setting: SettingValue, rarity: Rarity): number {
  const payout = payoutRate(rarity, setting);
  // 機械割 100% でブレークイーブン、それ以下なら店プラス、超えたら店マイナス
  // 100 - payout が 1 円あたりの店取り分 (%)
  return (100 - payout) / 100;
}

/** 設定の表示色 (高設定ほど派手) */
export function settingColor(setting: SettingValue): string {
  const colors: Record<SettingValue, string> = {
    1: "text-white/60",
    2: "text-white",
    3: "text-pachi-cyan",
    4: "text-pachi-green",
    5: "text-pachi-yellow",
    6: "text-pachi-red",
  };
  return colors[setting];
}

/** 設定の bg 色 */
export function settingBg(setting: SettingValue): string {
  const colors: Record<SettingValue, string> = {
    1: "bg-bg-card",
    2: "bg-bg-card",
    3: "bg-pachi-cyan/30",
    4: "bg-pachi-green/30",
    5: "bg-pachi-yellow/30",
    6: "bg-pachi-red/40",
  };
  return colors[setting];
}

export const ALL_SETTINGS: SettingValue[] = [1, 2, 3, 4, 5, 6];
