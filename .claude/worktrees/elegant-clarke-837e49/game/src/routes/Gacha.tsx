import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import { useGameStore } from "../stores/useGameStore";
import { GACHA_COST_SINGLE, GACHA_COST_TEN, pullSingle, pullTen, type PullResult } from "../lib/gacha";
import type { Rarity } from "../lib/types";

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

export function Gacha() {
  const user = useGameStore((s) => s.user);
  const addCash = useGameStore((s) => s.addCash);
  const addMachines = useGameStore((s) => s.addMachines);
  const bumpPity = useGameStore((s) => s.bumpPity);
  const resetPity = useGameStore((s) => s.resetPity);
  const pity = useGameStore((s) => s.gachaPity);

  const [results, setResults] = useState<PullResult[]>([]);
  const [rolling, setRolling] = useState(false);

  const doPull = (count: 1 | 10) => {
    if (rolling) return;
    const cost = count === 1 ? GACHA_COST_SINGLE : GACHA_COST_TEN;
    if (!user || user.cash < cost) return;
    addCash(-cost);
    setRolling(true);
    setResults([]);

    const pulls = count === 1 ? [pullSingle()].filter(Boolean) as PullResult[] : pullTen();

    setTimeout(() => {
      const hasSsr = pulls.some((p) => p.rarity === "SSR");
      if (hasSsr) resetPity();
      else bumpPity(pulls.length);
      addMachines(pulls);
      setResults(pulls);
      setRolling(false);
    }, 600);
  };

  return (
    <div>
      <PageHeader title="ガチャ" subtitle="機種を引き当てて自分のお店に設置しよう" />

      <div className="px-4 py-4">
        <div className="pixel-panel p-3 flex justify-between text-xs">
          <span className="text-white/60">所持金</span>
          <span className="font-pixel text-pachi-yellow">
            ¥{(user?.cash ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="pixel-panel p-3 flex justify-between text-xs mt-2">
          <span className="text-white/60">天井カウント</span>
          <span className="font-pixel text-pachi-cyan">{pity} / 200</span>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => doPull(1)}
          disabled={rolling || !user || user.cash < GACHA_COST_SINGLE}
          className="pixel-btn-secondary py-4 text-xs disabled:opacity-40"
        >
          単発
          <br />
          <span className="text-[10px] text-pachi-yellow">¥{GACHA_COST_SINGLE.toLocaleString()}</span>
        </button>
        <button
          onClick={() => doPull(10)}
          disabled={rolling || !user || user.cash < GACHA_COST_TEN}
          className="pixel-btn py-4 text-xs disabled:opacity-40"
        >
          10連
          <br />
          <span className="text-[10px] text-white">¥{GACHA_COST_TEN.toLocaleString()}</span>
        </button>
      </div>

      <div className="px-4 mt-4 grid grid-cols-4 gap-2 text-[10px] text-center">
        {(["SSR", "SR", "R", "N"] as Rarity[]).map((r) => (
          <div key={r} className="pixel-panel p-2">
            <p className={`font-pixel ${RARITY_COLOR[r]}`}>{r}</p>
            <p className="text-white/70 mt-1">
              {r === "SSR" ? "1%" : r === "SR" ? "6%" : r === "R" ? "23%" : "70%"}
            </p>
          </div>
        ))}
      </div>

      {rolling && (
        <div className="px-4 py-6 text-center font-pixel text-xs text-pachi-yellow animate-blink">
          ROLLING...
        </div>
      )}

      {!rolling && results.length > 0 && (
        <div className="px-4 py-5">
          <p className="font-pixel text-xs text-pachi-pink mb-3">★ RESULT ★</p>
          {/* 10連はグリッド、単発は横長カード */}
          {results.length >= 5 ? (
            <div className="grid grid-cols-5 gap-2">
              {results.map((r, i) => (
                <div key={i} className="pixel-panel overflow-hidden">
                  <div className="aspect-[2/3] bg-bg-base">
                    <MachineThumb
                      machineId={r.machine.id}
                      name={r.machine.name}
                      rarity={r.rarity}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-1 text-center">
                    <span className={`font-pixel text-[8px] ${RARITY_COLOR[r.rarity]}`}>
                      {r.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li key={i} className="pixel-panel overflow-hidden flex">
                  <div className="shrink-0 w-14 h-16 bg-bg-base">
                    <MachineThumb
                      machineId={r.machine.id}
                      name={r.machine.name}
                      rarity={r.rarity}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0 p-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-dot text-xs truncate">{r.machine.name}</p>
                      <p className="text-[10px] text-white/50 mt-0.5">{r.machine.maker}</p>
                    </div>
                    <span className={`font-pixel text-[11px] shrink-0 ml-2 ${RARITY_COLOR[r.rarity]}`}>
                      {r.rarity}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
