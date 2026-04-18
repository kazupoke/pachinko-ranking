import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useGameStore } from "../stores/useGameStore";
import { SEED_SHOPS, type SeedShop } from "../data/seed_shops";
import { MACHINES_BY_ID } from "../data/machines";
import { FML_WEIGHTS } from "../lib/types";

const BASE_REWARD = 50_000;

interface VisitableShop {
  shop: SeedShop;
  matchedFmlWeight: number;
  matchedMachines: Array<{ name: string; rank: number; weight: number }>;
}

export function MysteryShopper() {
  const user = useGameStore((s) => s.user);
  const submit = useGameStore((s) => s.submitMysteryReport);
  const visitsToday = useGameStore((s) => s.mysteryVisitsToday)();
  const records = useGameStore((s) => s.mysteryRecords);

  const [msg, setMsg] = useState<string | null>(null);

  const fml = user?.fml ?? [];
  const fmlMap = new Map<string, number>(fml.map((e) => [e.machineId, e.rank]));

  const visitable = useMemo<VisitableShop[]>(() => {
    if (fml.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    const visitedIds = new Set(
      records.filter((r) => r.visitedAt.startsWith(today)).map((r) => r.shopId)
    );
    const result: VisitableShop[] = [];
    for (const s of SEED_SHOPS) {
      if (visitedIds.has(s.id)) continue;
      const matched: VisitableShop["matchedMachines"] = [];
      let weight = 0;
      for (const entry of s.lineup) {
        const rank = fmlMap.get(entry.machineId);
        if (rank == null) continue;
        const w = FML_WEIGHTS[rank] ?? 0;
        weight += w;
        const m = MACHINES_BY_ID[entry.machineId];
        if (m) matched.push({ name: m.name, rank, weight: w });
      }
      if (matched.length > 0) {
        result.push({ shop: s, matchedFmlWeight: weight, matchedMachines: matched });
      }
    }
    return result.sort((a, b) => b.matchedFmlWeight - a.matchedFmlWeight);
  }, [fml, records, fmlMap]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  };

  const handleVisit = (v: VisitableShop) => {
    const reward = Math.round(BASE_REWARD * v.shop.tier * v.matchedFmlWeight);
    const res = submit(v.shop.id, reward);
    if (!res.ok) {
      if (res.reason === "daily-limit") flash("1日の受注上限(3件)に達しました");
      else if (res.reason === "already-visited-today") flash("本日は既に訪問済みです");
      else flash("受注に失敗しました");
      return;
    }
    flash(`報酬 ¥${reward.toLocaleString()} を受け取りました`);
  };

  return (
    <div>
      <PageHeader
        title="覆面調査員"
        subtitle={`本日の受注 ${visitsToday}/3 · FML登録 ${fml.length}/10`}
      />

      {fml.length === 0 && (
        <div className="mx-4 mt-4 pixel-panel p-4 text-[11px] text-white/70">
          <p className="text-pachi-yellow font-dot text-sm mb-2">
            好きな台ランキングを先に登録してね
          </p>
          <p>覆面調査は、自分のFMLに入っている機種が置いてある店にしか行けません。</p>
          <NavLink
            to="/favorites"
            className="block mt-3 pixel-btn text-xs text-center"
          >
            好きな台ランキングを登録
          </NavLink>
        </div>
      )}

      {fml.length > 0 && visitable.length === 0 && (
        <div className="mx-4 mt-4 pixel-panel p-4 text-[11px] text-white/70">
          <p>本日は受注可能な店がありません。</p>
          <p className="mt-2 text-white/50">
            （FMLの機種が置いてある店が見つからない、または全て訪問済み）
          </p>
        </div>
      )}

      {msg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-pachi-yellow text-bg-base font-dot text-xs shadow-pixel">
          {msg}
        </div>
      )}

      <ul className="px-4 py-3 space-y-3">
        {visitable.map((v) => {
          const reward = Math.round(BASE_REWARD * v.shop.tier * v.matchedFmlWeight);
          return (
            <li key={v.shop.id} className="pixel-panel p-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-pixel text-xs text-pachi-cyan">{v.shop.name}</p>
                  <p className="text-[10px] text-white/50 mt-1">
                    店長: {v.shop.ownerName} · Tier {v.shop.tier}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-pixel text-[10px] text-pachi-yellow">
                    重み ×{v.matchedFmlWeight.toFixed(1)}
                  </p>
                  <p className="font-pixel text-[11px] text-pachi-green mt-1">
                    ¥{reward.toLocaleString()}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1">
                {v.matchedMachines.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="truncate max-w-[60%]">{m.name}</span>
                    <span className="text-pachi-yellow font-pixel text-[10px]">
                      #{m.rank} · ×{m.weight}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleVisit(v)}
                disabled={visitsToday >= 3}
                className="pixel-btn w-full mt-3 text-xs disabled:opacity-40"
              >
                訪問して評価する
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
