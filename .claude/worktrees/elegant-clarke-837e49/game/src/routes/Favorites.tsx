import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { FML_WEIGHTS, type FMLEntry, type Machine, type Rarity } from "../lib/types";
import { useGameStore } from "../stores/useGameStore";
import { ALL_MACHINES, MACHINES_BY_ID } from "../data/machines";

const COOLDOWN_DAYS = 7;

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / 86400000);
}

export function Favorites() {
  const user = useGameStore((s) => s.user);
  const setFML = useGameStore((s) => s.setFML);
  const [pickingRank, setPickingRank] = useState<number | null>(null);

  const cooldownRemaining = useMemo(() => {
    if (!user?.fmlLastChangedAt) return 0;
    const last = new Date(user.fmlLastChangedAt);
    const elapsed = daysBetween(new Date(), last);
    return Math.max(0, COOLDOWN_DAYS - elapsed);
  }, [user?.fmlLastChangedAt]);

  const fml = user?.fml ?? [];
  const entryByRank = new Map<number, FMLEntry>(fml.map((e) => [e.rank, e]));

  const handlePick = (machineId: string) => {
    if (pickingRank == null) return;
    const next: FMLEntry[] = [
      // 他のランクに同じ機種があれば除外
      ...fml.filter((e) => e.rank !== pickingRank && e.machineId !== machineId),
      { rank: pickingRank, machineId },
    ];
    next.sort((a, b) => a.rank - b.rank);
    setFML(next);
    setPickingRank(null);
  };

  const handleClear = (rank: number) => {
    setFML(fml.filter((e) => e.rank !== rank));
  };

  return (
    <div>
      <PageHeader
        title="好きな台ランキング"
        subtitle="TOP10で登録。覆面調査で行ける店と評価の重みを決めます"
      />

      <div className="px-4 pt-3">
        {cooldownRemaining > 0 ? (
          <p className="text-[10px] text-pachi-yellow">
            ※ 変更から {COOLDOWN_DAYS - cooldownRemaining}日 経過 · あと {cooldownRemaining}日で再変更可
          </p>
        ) : (
          <p className="text-[10px] text-white/50">
            ※ 変更は7日クールダウン · 他プレイヤーには非公開
          </p>
        )}
      </div>

      <ul className="px-4 py-3 space-y-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((rank) => {
          const entry = entryByRank.get(rank);
          const machine = entry ? MACHINES_BY_ID[entry.machineId] : null;
          return (
            <li key={rank} className="pixel-panel p-3">
              <div className="flex items-center gap-3">
                <span className="font-pixel text-[11px] text-pachi-yellow w-8 shrink-0">
                  #{rank}
                </span>
                <span className="font-pixel text-[10px] text-pachi-cyan w-14 shrink-0">
                  ×{FML_WEIGHTS[rank]}
                </span>
                <div className="flex-1 min-w-0">
                  {machine ? (
                    <>
                      <p className="font-dot text-sm truncate">{machine.name}</p>
                      <p className="text-[10px] text-white/50 truncate">
                        <span className={RARITY_COLOR[machine.rarity]}>{machine.rarity}</span>
                        {" · "}
                        {machine.maker}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-white/40">未登録</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => setPickingRank(rank)}
                    className="px-2 py-1 text-[10px] bg-bg-card font-dot"
                  >
                    選ぶ
                  </button>
                  {machine && (
                    <button
                      onClick={() => handleClear(rank)}
                      className="px-2 py-1 text-[10px] text-pachi-pink"
                    >
                      解除
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {pickingRank != null && (
        <PickerSheet
          rank={pickingRank}
          onPick={handlePick}
          onClose={() => setPickingRank(null)}
          machines={ALL_MACHINES}
        />
      )}
    </div>
  );
}

function PickerSheet({
  rank,
  onPick,
  onClose,
  machines,
}: {
  rank: number;
  onPick: (machineId: string) => void;
  onClose: () => void;
  machines: Machine[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return machines.slice(0, 80);
    const qs = q.toLowerCase();
    return machines
      .filter(
        (m) =>
          m.name.toLowerCase().includes(qs) || m.maker.toLowerCase().includes(qs)
      )
      .slice(0, 80);
  }, [q, machines]);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-pachi-red bg-bg-panel">
        <span className="font-pixel text-xs text-pachi-yellow">#{rank} に登録する機種</span>
        <button onClick={onClose} className="text-xs text-white/70">
          × 閉じる
        </button>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="検索: 機種名 or メーカー"
        className="mx-3 mt-3 px-3 py-2 bg-bg-base border-2 border-bg-card text-white text-sm font-dot"
      />
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className="w-full text-left pixel-panel p-2 flex items-center justify-between active:bg-bg-card"
          >
            <div className="min-w-0">
              <p className="font-dot text-sm truncate">{m.name}</p>
              <p className="text-[10px] text-white/50 mt-0.5">
                {m.maker} · {m.releaseYear}
              </p>
            </div>
            <span className={`font-pixel text-[10px] ${RARITY_COLOR[m.rarity]}`}>
              {m.rarity}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-xs text-white/50 py-8">該当なし</p>
        )}
      </div>
    </div>
  );
}
