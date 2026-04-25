import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_MACHINES } from "../../data/machines";
import { PageHeader } from "../../components/PageHeader";
import { MachineThumb } from "../../components/MachineThumb";
import { useLiteStore, totalMachines, totalKinds } from "../../stores/useLiteStore";
import type { Machine, Rarity } from "../../lib/types";
import { MAKER_GROUPS, getMakerGroup, type MakerGroup } from "../../data/makerGroups";
import { KANA_FILTERS, YEAR_BUCKETS, getKanaKey } from "../../lib/machineSort";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];
const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

type ViewFilter = "all" | "selected";
type SortKey = "rarityYear" | "yearDesc" | "yearAsc" | "name" | "makerGroup";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rarityYear", label: "レア順" },
  { key: "yearDesc", label: "新しい順" },
  { key: "yearAsc", label: "古い順" },
  { key: "name", label: "名前順" },
  { key: "makerGroup", label: "系列順" },
];

export function LitePicker() {
  const navigate = useNavigate();
  const shop = useLiteStore((s) => s.shop);
  const incrementMachine = useLiteStore((s) => s.incrementMachine);

  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [groupFilter, setGroupFilter] = useState<MakerGroup | "all">("all");
  const [kanaFilter, setKanaFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("rarityYear");
  const [groupOpen, setGroupOpen] = useState(false);

  const entries = shop?.entries;
  const machines = useMemo(() => {
    let list: Machine[] = ALL_MACHINES;
    if (rarityFilter !== "all") {
      list = list.filter((m) => m.rarity === rarityFilter);
    }
    if (groupFilter !== "all") {
      list = list.filter((m) => getMakerGroup(m.maker) === groupFilter);
    }
    if (kanaFilter !== "all") {
      list = list.filter((m) => getKanaKey(m.name) === kanaFilter);
    }
    if (yearFilter !== "all") {
      const bucket = YEAR_BUCKETS.find((b) => b.key === yearFilter);
      if (bucket) list = list.filter((m) => bucket.test(m.releaseYear));
    }
    if (viewFilter === "selected") {
      list = list.filter((m) => (entries?.[m.id] ?? 0) > 0);
    }
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case "yearDesc":
          return b.releaseYear - a.releaseYear || a.name.localeCompare(b.name, "ja");
        case "yearAsc":
          return a.releaseYear - b.releaseYear || a.name.localeCompare(b.name, "ja");
        case "name":
          return a.name.localeCompare(b.name, "ja");
        case "makerGroup": {
          const ga = getMakerGroup(a.maker);
          const gb = getMakerGroup(b.maker);
          const r = MAKER_GROUPS.indexOf(ga) - MAKER_GROUPS.indexOf(gb);
          if (r !== 0) return r;
          if (a.maker !== b.maker) return a.maker.localeCompare(b.maker, "ja");
          return b.releaseYear - a.releaseYear;
        }
        case "rarityYear":
        default: {
          const r = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
          if (r !== 0) return r;
          return b.releaseYear - a.releaseYear;
        }
      }
    });
    return sorted;
  }, [rarityFilter, groupFilter, kanaFilter, yearFilter, viewFilter, sortKey, entries]);

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

  const clearFilters = () => {
    setRarityFilter("all");
    setGroupFilter("all");
    setKanaFilter("all");
    setYearFilter("all");
    setViewFilter("all");
  };

  return (
    <div>
      <PageHeader
        title="機種を選ぶ"
        subtitle={`${shop.name} · 設置 ${totalMachines(shop)} 台 / ${totalKinds(shop)} 機種`}
      />

      <div className="px-4 pt-3 flex gap-2 text-xs items-center">
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
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="ml-auto px-2 py-2 font-dot text-[11px] bg-bg-panel border-2 border-bg-card text-white"
          aria-label="並び替え"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* レアリティ */}
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

      {/* 50 音 */}
      <div className="px-4 pt-2">
        <p className="font-pixel text-[9px] text-pachi-cyan mb-1">50 音</p>
        <div className="flex gap-1 text-[11px] flex-wrap">
          <ChipBtn
            label="全て"
            active={kanaFilter === "all"}
            onClick={() => setKanaFilter("all")}
          />
          {KANA_FILTERS.map((k) => (
            <ChipBtn
              key={k.key}
              label={k.label}
              active={kanaFilter === k.key}
              onClick={() => setKanaFilter(k.key)}
            />
          ))}
        </div>
      </div>

      {/* 年代 */}
      <div className="px-4 pt-2">
        <p className="font-pixel text-[9px] text-pachi-cyan mb-1">年代</p>
        <div className="flex gap-1 text-[11px] flex-wrap">
          <ChipBtn
            label="全年代"
            active={yearFilter === "all"}
            onClick={() => setYearFilter("all")}
          />
          {YEAR_BUCKETS.map((b) => (
            <ChipBtn
              key={b.key}
              label={b.label}
              active={yearFilter === b.key}
              onClick={() => setYearFilter(b.key)}
            />
          ))}
        </div>
      </div>

      {/* メーカー系列 (折りたたみ) */}
      <div className="px-4 pt-2">
        <button
          onClick={() => setGroupOpen((v) => !v)}
          className="w-full px-3 py-2 font-dot text-[11px] bg-bg-panel border-2 border-bg-card text-white/80 flex justify-between items-center"
        >
          <span>
            メーカー系列:{" "}
            <span className="text-pachi-cyan">
              {groupFilter === "all" ? "全系列" : groupFilter}
            </span>
          </span>
          <span className="text-white/50">{groupOpen ? "▲" : "▼"}</span>
        </button>
        {groupOpen && (
          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
            <ChipBtn
              label="全系列"
              active={groupFilter === "all"}
              onClick={() => {
                setGroupFilter("all");
                setGroupOpen(false);
              }}
            />
            {MAKER_GROUPS.map((g) => (
              <ChipBtn
                key={g}
                label={g}
                active={groupFilter === g}
                onClick={() => {
                  setGroupFilter(g);
                  setGroupOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 一括クリア */}
      <div className="px-4 pt-2">
        <button
          onClick={clearFilters}
          className="text-[10px] text-white/50 underline"
        >
          フィルタをクリア
        </button>
      </div>

      <ul className="px-4 py-3 space-y-2">
        {machines.length === 0 ? (
          <li className="text-center text-xs text-white/50 py-8">該当なし</li>
        ) : (
          machines.map((m) => {
            const count = shop.entries[m.id] ?? 0;
            const group = getMakerGroup(m.maker);
            const isSelected = count > 0;
            return (
              <li
                key={m.id}
                className={`pixel-panel p-3 flex items-center gap-3 transition-colors ${
                  isSelected
                    ? "bg-pachi-green/10 border-pachi-green border-2"
                    : ""
                }`}
              >
                <div className="w-12 h-16 shrink-0 border border-bg-card relative">
                  <MachineThumb
                    machineId={m.id}
                    name={m.name}
                    rarity={m.rarity}
                    size={48}
                  />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 bg-pachi-green text-bg-base font-pixel text-[8px] px-1 leading-none py-0.5">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{m.name}</p>
                  <p className="text-[10px] text-white/50 mt-0.5 truncate">
                    {m.maker}{" "}
                    <span className="text-pachi-cyan">[{group}]</span> ·{" "}
                    {m.releaseYear}
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
                  <span
                    className={`font-pixel text-xs w-8 text-center ${
                      isSelected ? "text-pachi-green" : "text-pachi-yellow"
                    }`}
                  >
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

function ChipBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 font-dot whitespace-nowrap border ${
        active
          ? "bg-pachi-pink border-pachi-pink text-white"
          : "bg-bg-panel border-bg-card text-white/60"
      }`}
    >
      {label}
    </button>
  );
}
