import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_MACHINES } from "../../data/machines";
import { PageHeader } from "../../components/PageHeader";
import { MachineThumb } from "../../components/MachineThumb";
import { useLiteStore, totalMachines, totalKinds } from "../../stores/useLiteStore";
import type { Machine, Rarity } from "../../lib/types";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];
const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

type ViewFilter = "all" | "selected";

export function LitePicker() {
  const navigate = useNavigate();
  const shop = useLiteStore((s) => s.shop);
  const incrementMachine = useLiteStore((s) => s.incrementMachine);

  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [keyword, setKeyword] = useState("");

  const entries = shop?.entries;
  const machines = useMemo(() => {
    let list: Machine[] = ALL_MACHINES;
    if (rarityFilter !== "all") {
      list = list.filter((m) => m.rarity === rarityFilter);
    }
    if (viewFilter === "selected") {
      list = list.filter((m) => (entries?.[m.id] ?? 0) > 0);
    }
    const k = keyword.trim().toLowerCase();
    if (k) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(k) ||
          m.maker.toLowerCase().includes(k)
      );
    }
    return [...list].sort((a, b) => {
      const r = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      if (r !== 0) return r;
      return b.releaseYear - a.releaseYear;
    });
  }, [rarityFilter, viewFilter, keyword, entries]);

  if (!shop) {
    return (
      <div className="p-6 text-center text-sm text-white/70">
        <p>ライトモードのお店がありません。</p>
        <button
          onClick={() => navigate("/lite")}
          className="pixel-btn mt-6 text-xs"
        >
          お店を作る
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="機種を選ぶ"
        subtitle={`${shop.name} · 設置 ${totalMachines(shop)} 台 / ${totalKinds(shop)} 機種`}
      />

      <div className="px-4 pt-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="機種名・メーカーで検索"
          className="block w-full px-3 py-2 bg-bg-base border-2 border-bg-card text-white font-dot text-xs focus:border-pachi-pink outline-none"
        />
      </div>

      <div className="px-4 pt-2 flex gap-2 text-xs">
        <button
          onClick={() => setViewFilter("all")}
          className={`px-3 py-2 font-dot border-2 ${
            viewFilter === "all"
              ? "bg-pachi-red text-white border-pachi-red"
              : "bg-bg-panel text-white/60 border-bg-card"
          }`}
        >
          全機種
        </button>
        <button
          onClick={() => setViewFilter("selected")}
          className={`px-3 py-2 font-dot border-2 ${
            viewFilter === "selected"
              ? "bg-pachi-red text-white border-pachi-red"
              : "bg-bg-panel text-white/60 border-bg-card"
          }`}
        >
          設置中
        </button>
      </div>

      <div className="px-4 pt-2 flex gap-1 text-[11px] overflow-x-auto">
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

      <ul className="px-4 py-3 space-y-2">
        {machines.length === 0 ? (
          <li className="text-center text-xs text-white/50 py-8">
            該当なし
          </li>
        ) : (
          machines.map((m) => {
            const count = shop.entries[m.id] ?? 0;
            return (
              <li
                key={m.id}
                className="pixel-panel p-3 flex items-center gap-3"
              >
                <div className="w-12 h-16 shrink-0 border border-bg-card">
                  <MachineThumb
                    machineId={m.id}
                    name={m.name}
                    rarity={m.rarity}
                    size={48}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{m.name}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    {m.maker} · {m.releaseYear}
                  </p>
                  <p
                    className={`text-[10px] font-pixel mt-0.5 ${RARITY_COLOR[m.rarity]}`}
                  >
                    {m.rarity} · {m.type}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => incrementMachine(m.id, -1)}
                    disabled={count === 0}
                    className="w-8 h-8 font-pixel text-sm bg-bg-base border-2 border-bg-card text-white disabled:opacity-30"
                    aria-label="台数を減らす"
                  >
                    −
                  </button>
                  <span className="font-pixel text-xs text-pachi-yellow w-8 text-center">
                    {count}
                  </span>
                  <button
                    onClick={() => incrementMachine(m.id, 1)}
                    className="w-8 h-8 font-pixel text-sm bg-pachi-red border-2 border-pachi-red text-white"
                    aria-label="台数を増やす"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="sticky bottom-0 bg-bg-panel border-t-2 border-bg-card px-4 py-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate("/lite")}
          className="pixel-btn-secondary text-xs"
        >
          戻る
        </button>
        <button
          onClick={() => navigate("/lite/view")}
          className="pixel-btn text-xs"
        >
          ページを見る
        </button>
      </div>
    </div>
  );
}
