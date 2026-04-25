import { useMemo, useState } from "react";
import { ALL_MACHINES } from "../data/machines";
import { PageHeader } from "../components/PageHeader";
import { LineupTable } from "../components/LineupTable";
import { MachineThumb } from "../components/MachineThumb";
import { useGameStore } from "../stores/useGameStore";
import type { Machine, Rarity } from "../lib/types";
import { MAKER_GROUPS, getMakerGroup, type MakerGroup } from "../data/makerGroups";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];

type Filter = "owned" | "all";
type SortKey = "rarityYear" | "yearDesc" | "yearAsc" | "name" | "makerGroup";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rarityYear", label: "レア順" },
  { key: "yearDesc", label: "新しい順" },
  { key: "yearAsc", label: "古い順" },
  { key: "name", label: "名前順" },
  { key: "makerGroup", label: "系列順" },
];

export function Collection() {
  const user = useGameStore((s) => s.user);
  const shop = useGameStore((s) => s.shop);
  const installMachine = useGameStore((s) => s.installMachine);

  const [filter, setFilter] = useState<Filter>("owned");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [groupFilter, setGroupFilter] = useState<MakerGroup | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rarityYear");
  const [groupOpen, setGroupOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const machines = useMemo(() => {
    let list: Machine[] = ALL_MACHINES;
    if (filter === "owned") {
      list = list.filter((m) => (user?.ownedMachines[m.id] ?? 0) > 0);
    }
    if (rarityFilter !== "all") {
      list = list.filter((m) => m.rarity === rarityFilter);
    }
    if (groupFilter !== "all") {
      list = list.filter((m) => getMakerGroup(m.maker) === groupFilter);
    }
    const k = keyword.trim().toLowerCase();
    if (k) {
      list = list.filter((m) => {
        const group = getMakerGroup(m.maker);
        return (
          m.name.toLowerCase().includes(k) ||
          m.maker.toLowerCase().includes(k) ||
          group.toLowerCase().includes(k)
        );
      });
    }
    return [...list].sort((a, b) => {
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
  }, [filter, rarityFilter, groupFilter, keyword, sortKey, user]);

  const handleInstall = (machineId: string) => {
    const res = installMachine(machineId, 1);
    if (!res.ok) {
      const reason =
        res.reason === "capacity-machines"
          ? "台数上限に達しています"
          : res.reason === "capacity-types"
            ? "機種枠上限に達しています"
            : res.reason === "not-enough-owned"
              ? "所持台数が足りません"
              : "設置できませんでした";
      setMsg(reason);
    } else {
      setMsg("1台設置しました");
    }
    setTimeout(() => setMsg(null), 1800);
  };

  return (
    <div>
      <PageHeader
        title="パチスロ"
        subtitle={`収録 ${ALL_MACHINES.length} 機種 · 所持 ${Object.values(user?.ownedMachines ?? {}).reduce((a, b) => a + b, 0)} 台`}
      />

      {/* 設置中ラインナップ (P-World 風) */}
      <div className="px-3 pt-3">
        <p className="font-pixel text-[10px] text-pachi-cyan mb-2">
          現在のラインナップ
        </p>
        <LineupTable />
      </div>

      <p className="px-4 pt-3 pb-1 font-pixel text-[10px] text-pachi-pink">
        全機種から探す
      </p>

      {/* 検索・フィルタ群 (上部固定) */}
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

      <div className="px-4 pt-2 flex gap-2 text-xs">
        <button
          onClick={() => setFilter("owned")}
          className={`px-3 py-2 font-dot border-2 ${
            filter === "owned"
              ? "bg-pachi-red text-white border-pachi-red"
              : "bg-bg-panel text-white/60 border-bg-card"
          }`}
        >
          所持
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-2 font-dot border-2 ${
            filter === "all"
              ? "bg-pachi-red text-white border-pachi-red"
              : "bg-bg-panel text-white/60 border-bg-card"
          }`}
        >
          すべて
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

      {/* メーカー系列フィルタ (折りたたみ) */}
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
            <button
              onClick={() => {
                setGroupFilter("all");
                setGroupOpen(false);
              }}
              className={`px-2 py-1.5 font-dot border ${
                groupFilter === "all"
                  ? "bg-pachi-pink border-pachi-pink"
                  : "bg-bg-panel border-bg-card text-white/60"
              }`}
            >
              全系列
            </button>
            {MAKER_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGroupFilter(g);
                  setGroupOpen(false);
                }}
                className={`px-2 py-1.5 font-dot border ${
                  groupFilter === g
                    ? "bg-pachi-pink border-pachi-pink"
                    : "bg-bg-panel border-bg-card text-white/60"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
      {/* /sticky filter wrapper */}

      {msg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-pachi-yellow text-bg-base font-dot text-xs shadow-pixel">
          {msg}
        </div>
      )}

      <ul className="px-4 py-3 space-y-2">
        {machines.length === 0 ? (
          <li className="text-center text-xs text-white/50 py-8">
            {filter === "owned"
              ? "まだ所持機種がありません。ガチャで入手しましょう。"
              : "該当なし"}
          </li>
        ) : (
          machines.map((m) => (
            <MachineRow
              key={m.id}
              machine={m}
              owned={user?.ownedMachines[m.id] ?? 0}
              installedCount={
                shop?.layout.find((e) => e.machineId === m.id)?.count ?? 0
              }
              canInstall={(user?.ownedMachines[m.id] ?? 0) > 0 && shop != null}
              onInstall={() => handleInstall(m.id)}
            />
          ))
        )}
      </ul>
    </div>
  );
}

/** P-World 風の白背景テーブル行 */
function MachineRow({
  machine,
  owned,
  installedCount,
  canInstall,
  onInstall,
}: {
  machine: Machine;
  owned: number;
  installedCount: number;
  canInstall: boolean;
  onInstall: () => void;
}) {
  return (
    <li className="bg-white text-black border-2 border-black flex">
      <div className="shrink-0 w-12 h-16 bg-bg-base border-r-2 border-black">
        <MachineThumb
          machineId={machine.id}
          name={machine.name}
          rarity={machine.rarity}
          className="w-full h-full"
        />
      </div>
      <div className="flex-1 min-w-0 px-2 py-1 flex flex-col justify-between">
        <div>
          <p className="font-dot text-[12px] leading-tight line-clamp-2 text-black">
            {machine.name}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5 truncate">
            {machine.maker} · {getMakerGroup(machine.maker)} · {machine.releaseYear}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`font-pixel text-[10px] px-1 ${
              machine.rarity === "SSR"
                ? "bg-yellow-200 text-yellow-800"
                : machine.rarity === "SR"
                  ? "bg-purple-200 text-purple-800"
                  : machine.rarity === "R"
                    ? "bg-green-200 text-green-800"
                    : "bg-gray-200 text-gray-700"
            }`}
          >
            {machine.rarity}
          </span>
          <div className="flex gap-2 text-[10px] text-gray-700">
            {owned > 0 && <span>所持×{owned}</span>}
            {installedCount > 0 && (
              <span className="text-pachi-red font-bold">設置×{installedCount}</span>
            )}
          </div>
        </div>
      </div>
      {canInstall && (
        <button
          onClick={onInstall}
          className="shrink-0 px-3 bg-pachi-red text-white font-pixel text-[10px] border-l-2 border-black"
        >
          設置
        </button>
      )}
    </li>
  );
}
