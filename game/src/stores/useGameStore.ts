import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Shop, User, FMLEntry, Machine } from "../lib/types";
import { uuid, shortId, handoverCode } from "../lib/id";

const INITIAL_INTERIOR = {
  floor: 1,
  wall: 1,
  ceiling: 1,
  entrance: 1,
  counter: 1,
  lounge: 1,
  decor: 1,
  signboard: 1,
  restroom: 1,
  parking: 1,
};

const STARTING_CASH = 5_000_000;
const LOGIN_BONUS_BASE = 500_000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createUser(): User {
  return {
    id: uuid(),
    handoverCode: handoverCode(),
    createdAt: new Date().toISOString(),
    ownedMachines: {},
    cash: STARTING_CASH,
    freeGachaLastDate: null,
    fml: [],
    fmlLastChangedAt: null,
  };
}

function createShop(ownerId: string, name: string): Shop {
  const now = new Date().toISOString();
  return {
    id: shortId(),
    ownerId,
    name,
    tier: 1,
    capacity: { machines: 200, types: 40 },
    layout: [],
    interior: { ...INITIAL_INTERIOR },
    totalCustomers: 0,
    dailyCustomers: 0,
    lastShareAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

interface LoginBonusState {
  lastClaimDate: string | null;
  streak: number;
}

interface TickResult {
  elapsedSec: number;
  newCustomers: number;
  revenue: number;
}

export const RARITY_WEIGHT_MAP = { SSR: 3.0, SR: 2.0, R: 1.5, N: 1.0 } as const;

interface MysteryRecord {
  shopId: string;
  reward: number;
  visitedAt: string;
}

interface GameState {
  user: User | null;
  shop: Shop | null;
  loginBonus: LoginBonusState;
  gachaPity: number;
  lastTickAt: string | null;
  mysteryRecords: MysteryRecord[];
  /** ライトモードで設定された理想ラインナップ (machine id → 目標台数) */
  dreamMachines: Record<string, number>;
  initUser: () => void;
  tickSimulation: (machineRarityMap: Record<string, keyof typeof RARITY_WEIGHT_MAP>) => TickResult;
  createShop: (name: string) => void;
  setShopName: (name: string) => void;
  setFML: (entries: FMLEntry[]) => void;
  addCash: (amount: number) => boolean; // false if would go negative
  addMachines: (machines: Array<{ machine: Machine }>) => void;
  installMachine: (machineId: string, count: number) => { ok: boolean; reason?: string };
  uninstallMachine: (machineId: string, count: number) => void;
  claimLoginBonus: () => { claimed: boolean; amount: number; streak: number };
  bumpPity: (inc: number) => void;
  resetPity: () => void;
  expandMachineSlot: () => { ok: boolean; reason?: string; cost: number };
  expandTypeSlot: () => { ok: boolean; reason?: string; cost: number };
  submitMysteryReport: (shopId: string, reward: number) => { ok: boolean; reason?: string };
  mysteryVisitsToday: () => number;
  setDreamMachines: (entries: Record<string, number>) => void;
  clearDreamMachines: () => void;
  resetAll: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      user: null,
      shop: null,
      loginBonus: { lastClaimDate: null, streak: 0 },
      gachaPity: 0,
      lastTickAt: null,
      mysteryRecords: [],
      dreamMachines: {},

      initUser: () => {
        if (!get().user) set({ user: createUser() });
      },

      tickSimulation: (rarityMap) => {
        const user = get().user;
        const shop = get().shop;
        const last = get().lastTickAt;
        const now = new Date();
        if (!user || !shop || shop.layout.length === 0) {
          set({ lastTickAt: now.toISOString() });
          return { elapsedSec: 0, newCustomers: 0, revenue: 0 };
        }
        const lastDate = last ? new Date(last) : now;
        const elapsedSecRaw = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / 1000));
        // オフライン進行は最大12時間
        const elapsedSec = Math.min(elapsedSecRaw, 12 * 3600);
        if (elapsedSec < 5) {
          return { elapsedSec: 0, newCustomers: 0, revenue: 0 };
        }

        let attract = 0;
        let totalMachines = 0;
        for (const entry of shop.layout) {
          const r = rarityMap[entry.machineId] ?? "N";
          attract += RARITY_WEIGHT_MAP[r] * entry.count;
          totalMachines += entry.count;
        }
        const cap = Math.round(attract * 5);
        // 1秒あたりの新規来店
        const perSec = attract / 300; // 60秒で attract/5 人
        const grow = Math.floor(perSec * elapsedSec);
        const newDaily = Math.min(shop.dailyCustomers + grow, cap);
        const newCustomers = Math.max(0, newDaily - shop.dailyCustomers);
        // 収益: 新規客 × 平均単価 × 粗利率
        const revenue = newCustomers * 5000 * 0.2;

        set({
          shop: {
            ...shop,
            dailyCustomers: newDaily,
            totalCustomers: shop.totalCustomers + newCustomers,
            updatedAt: now.toISOString(),
          },
          user: { ...user, cash: user.cash + Math.round(revenue) },
          lastTickAt: now.toISOString(),
        });

        // totalMachines 参照は lint 対策
        void totalMachines;

        return { elapsedSec, newCustomers, revenue: Math.round(revenue) };
      },

      createShop: (name) => {
        const user = get().user ?? createUser();
        set({ user, shop: createShop(user.id, name) });
      },

      setShopName: (name) => {
        const shop = get().shop;
        if (!shop) return;
        set({ shop: { ...shop, name, updatedAt: new Date().toISOString() } });
      },

      setFML: (entries) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            fml: entries,
            fmlLastChangedAt: new Date().toISOString(),
          },
        });
      },

      addCash: (amount) => {
        const user = get().user;
        if (!user) return false;
        const next = user.cash + amount;
        if (next < 0) return false;
        set({ user: { ...user, cash: next } });
        return true;
      },

      addMachines: (pulls) => {
        const user = get().user;
        if (!user) return;
        const owned = { ...user.ownedMachines };
        for (const { machine } of pulls) {
          owned[machine.id] = (owned[machine.id] ?? 0) + 1;
        }
        set({ user: { ...user, ownedMachines: owned } });
      },

      installMachine: (machineId, count) => {
        const user = get().user;
        const shop = get().shop;
        if (!user || !shop) return { ok: false, reason: "no-shop" };
        const ownedCount = user.ownedMachines[machineId] ?? 0;
        if (ownedCount < count) return { ok: false, reason: "not-enough-owned" };

        const currentTotal = shop.layout.reduce((s, e) => s + e.count, 0);
        if (currentTotal + count > shop.capacity.machines) {
          return { ok: false, reason: "capacity-machines" };
        }

        const existing = shop.layout.find((e) => e.machineId === machineId);
        if (!existing && shop.layout.length >= shop.capacity.types) {
          return { ok: false, reason: "capacity-types" };
        }

        let layout;
        if (existing) {
          layout = shop.layout.map((e) =>
            e.machineId === machineId ? { ...e, count: e.count + count } : e
          );
        } else {
          const idx = shop.layout.length;
          layout = [
            ...shop.layout,
            {
              machineId,
              count,
              islandX: idx % 5,
              islandY: Math.floor(idx / 5),
            },
          ];
        }

        // 所持数を引く（複製元）
        const owned = { ...user.ownedMachines };
        owned[machineId] = ownedCount - count;
        if (owned[machineId] === 0) delete owned[machineId];

        set({
          user: { ...user, ownedMachines: owned },
          shop: { ...shop, layout, updatedAt: new Date().toISOString() },
        });
        return { ok: true };
      },

      uninstallMachine: (machineId, count) => {
        const user = get().user;
        const shop = get().shop;
        if (!user || !shop) return;
        const entry = shop.layout.find((e) => e.machineId === machineId);
        if (!entry) return;
        const removed = Math.min(entry.count, count);
        const layout = shop.layout
          .map((e) =>
            e.machineId === machineId ? { ...e, count: e.count - removed } : e
          )
          .filter((e) => e.count > 0);
        const owned = { ...user.ownedMachines };
        owned[machineId] = (owned[machineId] ?? 0) + removed;
        set({
          user: { ...user, ownedMachines: owned },
          shop: { ...shop, layout, updatedAt: new Date().toISOString() },
        });
      },

      claimLoginBonus: () => {
        const today = todayKey();
        const lb = get().loginBonus;
        if (lb.lastClaimDate === today) {
          return { claimed: false, amount: 0, streak: lb.streak };
        }
        const yday = new Date();
        yday.setDate(yday.getDate() - 1);
        const yKey = yday.toISOString().slice(0, 10);
        const streak = lb.lastClaimDate === yKey ? lb.streak + 1 : 1;
        // 連続出勤で報酬アップ (最大7倍)
        const multiplier = Math.min(streak, 7);
        const amount = LOGIN_BONUS_BASE * multiplier;
        const user = get().user;
        if (user) {
          set({ user: { ...user, cash: user.cash + amount } });
        }
        set({ loginBonus: { lastClaimDate: today, streak } });
        return { claimed: true, amount, streak };
      },

      bumpPity: (inc) => set({ gachaPity: get().gachaPity + inc }),
      resetPity: () => set({ gachaPity: 0 }),

      expandMachineSlot: () => {
        const user = get().user;
        const shop = get().shop;
        if (!user || !shop) return { ok: false, reason: "no-shop", cost: 0 };
        if (shop.capacity.machines >= 400) return { ok: false, reason: "max", cost: 0 };
        const cost = Math.round(1_000_000 * Math.pow(1.02, shop.capacity.machines - 200));
        if (user.cash < cost) return { ok: false, reason: "no-cash", cost };
        set({
          user: { ...user, cash: user.cash - cost },
          shop: {
            ...shop,
            capacity: { ...shop.capacity, machines: shop.capacity.machines + 1 },
            updatedAt: new Date().toISOString(),
          },
        });
        return { ok: true, cost };
      },

      submitMysteryReport: (shopId, reward) => {
        const todayCount = get().mysteryRecords.filter((r) =>
          r.visitedAt.startsWith(todayKey())
        ).length;
        if (todayCount >= 3) return { ok: false, reason: "daily-limit" };
        if (get().mysteryRecords.some((r) => r.shopId === shopId && r.visitedAt.startsWith(todayKey()))) {
          return { ok: false, reason: "already-visited-today" };
        }
        const user = get().user;
        if (!user) return { ok: false, reason: "no-user" };
        set({
          user: { ...user, cash: user.cash + reward },
          mysteryRecords: [
            ...get().mysteryRecords,
            { shopId, reward, visitedAt: new Date().toISOString() },
          ].slice(-200),
        });
        return { ok: true };
      },

      mysteryVisitsToday: () => {
        return get().mysteryRecords.filter((r) =>
          r.visitedAt.startsWith(todayKey())
        ).length;
      },

      expandTypeSlot: () => {
        const user = get().user;
        const shop = get().shop;
        if (!user || !shop) return { ok: false, reason: "no-shop", cost: 0 };
        if (shop.capacity.types >= 60) return { ok: false, reason: "max", cost: 0 };
        const cost = Math.round(10_000_000 * Math.pow(1.15, shop.capacity.types - 40));
        if (user.cash < cost) return { ok: false, reason: "no-cash", cost };
        set({
          user: { ...user, cash: user.cash - cost },
          shop: {
            ...shop,
            capacity: { ...shop.capacity, types: shop.capacity.types + 1 },
            updatedAt: new Date().toISOString(),
          },
        });
        return { ok: true, cost };
      },

      setDreamMachines: (entries) =>
        set({ dreamMachines: { ...entries } }),

      clearDreamMachines: () => set({ dreamMachines: {} }),

      resetAll: () =>
        set({
          user: null,
          shop: null,
          loginBonus: { lastClaimDate: null, streak: 0 },
          gachaPity: 0,
          lastTickAt: null,
          mysteryRecords: [],
          dreamMachines: {},
        }),
    }),
    {
      name: "pachishop:game",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);
