import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import { useGameStore } from "../stores/useGameStore";
import { ALL_MACHINES } from "../data/machines";
import {
  formatSupply,
  getCurrentSupply,
  getInitialSupply,
  machineMarketRarity,
  supplyRatio,
} from "../lib/marketSupply";
import type { Rarity } from "../lib/types";
import { getMakerGroup } from "../data/makerGroups";

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};
const RARITY_BG: Record<Rarity, string> = {
  N: "bg-bg-card",
  R: "bg-rarity-r/30",
  SR: "bg-rarity-sr/30",
  SSR: "bg-rarity-ssr/30",
};

type SortKey = "supplyAsc" | "supplyDesc" | "yearDesc" | "rarity";

export function Market() {
  const withdrawn = useGameStore((s) => s.marketWithdrawn);
  const [sort, setSort] = useState<SortKey>("supplyAsc");
  const [keyword, setKeyword] = useState("");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");

  const rows = useMemo(() => {
    const list = ALL_MACHINES.map((m) => {
      const w = withdrawn[m.id] ?? 0;
      const cur = getCurrentSupply(m, w);
      const init = getInitialSupply(m);
      const ratio = supplyRatio(m, w);
      const mRarity = machineMarketRarity(m, w);
      return { m, withdrawn: w, cur, init, ratio, mRarity };
    });

    let filtered = list;
    if (rarityFilter !== "all") {
      filtered = filtered.filter((r) => r.mRarity === rarityFilter);
    }
    const k = keyword.trim().toLowerCase();
    if (k) {
      filtered = filtered.filter(
        (r) =>
          r.m.name.toLowerCase().includes(k) ||
          r.m.maker.toLowerCase().includes(k) ||
          getMakerGroup(r.m.maker).toLowerCase().includes(k)
      );
    }
    filtered.sort((a, b) => {
      if (sort === "supplyAsc") return a.cur - b.cur;
      if (sort === "supplyDesc") return b.cur - a.cur;
      if (sort === "yearDesc") return b.m.releaseYear - a.m.releaseYear;
      const order: Rarity[] = ["SSR", "SR", "R", "N"];
      return order.indexOf(a.mRarity) - order.indexOf(b.mRarity);
    });
    return filtered;
  }, [withdrawn, sort, keyword, rarityFilter]);

  const totalCurrent = rows.reduce((s, r) => s + r.cur, 0);
  const totalInit = rows.reduce((s, r) => s + r.init, 0);

  return (
    <div>
      <PageHeader
        title="市場流通量"
        subtitle={`市場 ${formatSupply(totalCurrent)} 台 / 元 ${formatSupply(totalInit)} 台 (年 20% 減・引いた分は減少)`}
      />

      {/* sticky フィルタ */}
      <div className="sticky top-[84px] z-10 bg-bg-base pb-2 border-b-2 border-bg-card">
        <div className="px-4 pt-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="機種名・メーカー・系列で検索"
            className="block w-full px-3 py-2 bg-bg-base border-2 border-bg-card text-white font-dot text-xs focus:border-pachi-pink outline-none"
          />
        </div>
        <div className="px-4 pt-2 flex items-center gap-2 text-[11px] flex-wrap">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-2 py-1.5 font-dot bg-bg-panel border-2 border-bg-card text-white"
          >
            <option value="supplyAsc">流通量 少→多</option>
            <option value="supplyDesc">流通量 多→少</option>
            <option value="yearDesc">新しい順</option>
            <option value="rarity">市場レア度順</option>
          </select>
          {(["all", "SSR", "SR", "R", "N"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-2 py-1 font-dot border whitespace-nowrap ${
                rarityFilter === r
                  ? "bg-pachi-pink border-pachi-pink"
                  : "bg-bg-panel border-bg-card text-white/60"
              }`}
            >
              {r === "all" ? "全レア" : r}
            </button>
          ))}
        </div>
      </div>

      <ul className="px-4 py-3 space-y-2">
        {rows.map((r) => (
          <li
            key={r.m.id}
            className={`pixel-panel p-3 flex items-center gap-3 ${RARITY_BG[r.mRarity]}`}
          >
            <div className="w-12 h-16 shrink-0 border border-bg-card">
              <MachineThumb
                machineId={r.m.id}
                name={r.m.name}
                rarity={r.m.rarity}
                size={48}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{r.m.name}</p>
              <p className="text-[10px] text-white/50 mt-0.5 truncate">
                {r.m.maker} · {r.m.releaseYear}
              </p>
              {/* 流通量バー */}
              <div className="mt-1 h-1.5 bg-bg-base border border-bg-card overflow-hidden">
                <div
                  className={`h-full ${
                    r.mRarity === "SSR"
                      ? "bg-rarity-ssr"
                      : r.mRarity === "SR"
                        ? "bg-rarity-sr"
                        : r.mRarity === "R"
                          ? "bg-rarity-r"
                          : "bg-white/40"
                  }`}
                  style={{ width: `${r.ratio * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-white/60 mt-1">
                市場 {formatSupply(r.cur)} / 元 {formatSupply(r.init)}
                {r.withdrawn > 0 && (
                  <span className="text-pachi-yellow ml-1">
                    (引: {r.withdrawn})
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className={`font-pixel text-[10px] ${RARITY_COLOR[r.mRarity]}`}>
                市場 {r.mRarity}
              </span>
              <p className="text-[9px] text-white/40 mt-0.5">
                元: {r.m.rarity}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
