export type Rarity = "N" | "R" | "SR" | "SSR";
export type Generation = 4 | 5 | 6;
export type MachineType = "A" | "AT" | "ART" | "スマスロ" | "其他";

export interface Machine {
  id: string;
  name: string;
  maker: string;
  generation: Generation;
  type: MachineType;
  releaseYear: number;
  rarity: Rarity;
}

export interface ShopLayoutEntry {
  machineId: string;
  count: number;
  islandX: number;
  islandY: number;
}

export interface ShopInterior {
  floor: number;
  wall: number;
  ceiling: number;
  entrance: number;
  counter: number;
  lounge: number;
  decor: number;
  signboard: number;
  restroom: number;
  parking: number;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  capacity: { machines: number; types: number };
  layout: ShopLayoutEntry[];
  interior: ShopInterior;
  totalCustomers: number;
  dailyCustomers: number;
  lastShareAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FMLEntry {
  machineId: string;
  rank: number; // 1..10
}

export interface User {
  id: string;
  handoverCode: string;
  createdAt: string;
  ownedMachines: Record<string, number>;
  cash: number;
  freeGachaLastDate: string | null;
  fml: FMLEntry[];
  fmlLastChangedAt: string | null;
}

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  N: 1.0,
  R: 1.5,
  SR: 2.0,
  SSR: 3.0,
};

export const FML_WEIGHTS: Record<number, number> = {
  1: 5.0,
  2: 4.0,
  3: 3.0,
  4: 2.5,
  5: 2.0,
  6: 1.5,
  7: 1.25,
  8: 1.0,
  9: 0.75,
  10: 0.5,
};
