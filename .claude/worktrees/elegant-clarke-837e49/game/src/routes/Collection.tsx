import { useMemo, useState } from "react";
import { ALL_MACHINES } from "../data/machines";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import { useGameStore } from "../stores/useGameStore";
import type { Machine, Rarity } from "../lib/types";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];
const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

type Filter = "owned" | "all";

export function Collection() {
  const user = useGameStore((s) => s.user);
  const shop = useGameStore((s) => s.shop);
  const installMachine = useGameStore((s) => s.installMachine);

  const [filter, setFilter] = useState<Filter>("owned");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [msg, setMsg] = useState<string | null>(null);

  const machines = useMemo(() => {
    let list: Machine[] = ALL_MACHINES;
    if (filter === "owned") {
      list = list.filter((m) => (user?.ownedMachines[m.id] ?? 0) > 0);
    }
    if (rarityFilter !== "all") {
      list = list.filter((m) => m.rarity === rarityFilter);
    }
    return [...list].sort((a, b) => {
      const r = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      if (r !== 0) return r;
      return b.releaseYear - a.releaseYear;
    });
  }, [filter, rarityFilter, user]);

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
        title="機種コレクション"
        subtitle={`収録 ${ALL_MACHINES.length} 機種 · 所持 ${Object.values(user?.ownedMachines ?? {}).reduce((a, b) => a + b, 0)} 台`}
      />

      <div className="px-4 pt-3 flex gap-2 text-xs">
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
    <li className="pixel-panel overflow-hidden">
      <div className="flex gap-0">
        {/* サムネイル */}
        <div className="shrink-0 w-16 h-20 bg-bg-base">
          <MachineThumb
            machineId={machine.id}
            name={machine.name}
            rarity={machine.rarity}
            className="w-full h-full"
          />
        </div>
        {/* 情報 */}
        <div className="flex-1 min-w-0 p-2 flex flex-col justify-between">
          <div>
            <p className="font-dot text-xs leading-tight line-clamp-2">{machine.name}</p>
            <p className="text-[10px] text-white/50 mt-1">
              {machine.maker} · {machine.releaseYear}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className={`font-pixel text-[10px] ${RARITY_COLOR[machine.rarity]}`}>
              {machine.rarity}
            </span>
            <div className="flex gap-2 text-[10px]">
              <span className="text-white/70">所持×{owned}</span>
              {installedCount > 0 && (
                <span className="text-pachi-green">設置×{installedCount}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {canInstall && (
        <button
          onClick={onInstall}
          className="pixel-btn-secondary w-full text-[11px] py-2 border-t-2 border-black"
        >
          店に設置 +1台
        </button>
      )}
    </li>
  );
}
