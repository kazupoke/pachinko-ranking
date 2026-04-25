import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useGameStore } from "../../stores/useGameStore";
import { MACHINES_BY_ID } from "../../data/machines";
import { MachineThumb } from "../../components/MachineThumb";
import type { Machine, Rarity } from "../../lib/types";

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

/** レア度別の売却単価 (G) — 購入価格の半分くらい */
const SELL_PRICE: Record<Rarity, number> = {
  N: 50_000,
  R: 100_000,
  SR: 250_000,
  SSR: 600_000,
};

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];

export function Sell() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const addCash = useGameStore((s) => s.addCash);
  const [msg, setMsg] = useState<string | null>(null);

  const ownedList = useMemo(() => {
    const list: { machine: Machine; count: number }[] = [];
    for (const [mid, count] of Object.entries(user?.ownedMachines ?? {})) {
      const m = MACHINES_BY_ID[mid];
      if (m && count > 0) list.push({ machine: m, count });
    }
    list.sort((a, b) => {
      const r =
        RARITY_ORDER.indexOf(a.machine.rarity) -
        RARITY_ORDER.indexOf(b.machine.rarity);
      if (r !== 0) return r;
      return b.machine.releaseYear - a.machine.releaseYear;
    });
    return list;
  }, [user?.ownedMachines]);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 1800);
  };

  const handleSell = (mid: string, count: number, total: number) => {
    if (!user) return;
    const next = { ...user.ownedMachines };
    next[mid] = (next[mid] ?? 0) - count;
    if (next[mid] <= 0) delete next[mid];
    useGameStore.setState({
      user: { ...user, ownedMachines: next },
    });
    addCash(total);
    flash(`売却 +¥${total.toLocaleString()}`);
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="台の売却"
        subtitle={`所持金 ¥${(user?.cash ?? 0).toLocaleString()} · 設置していない台のみ売却可能`}
      />

      <div className="px-4 pt-2">
        <button
          onClick={() => navigate("/manager")}
          className="text-[11px] text-white/60 underline"
        >
          ← 店長メニューに戻る
        </button>
      </div>

      {msg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-pachi-yellow text-bg-base font-dot text-xs shadow-pixel">
          {msg}
        </div>
      )}

      {ownedList.length === 0 ? (
        <div className="mx-4 mt-4 pixel-panel p-4 text-center text-[11px] text-white/60">
          売却可能な台がありません
          <br />
          <span className="text-[10px] text-white/40">
            (店舗に設置中の台は売却できません。先に外してから)
          </span>
        </div>
      ) : (
        <ul className="px-4 py-3 space-y-2">
          {ownedList.map(({ machine: m, count }) => {
            const unit = SELL_PRICE[m.rarity];
            return (
              <li key={m.id} className="pixel-panel p-3 flex items-center gap-3">
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
                  <p className="text-[10px] text-white/50 mt-0.5 truncate">
                    {m.maker} · {m.releaseYear}
                  </p>
                  <p
                    className={`text-[10px] font-pixel mt-0.5 ${RARITY_COLOR[m.rarity]}`}
                  >
                    {m.rarity} · 所持 {count} 台 · 単価 ¥{unit.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => handleSell(m.id, 1, unit)}
                    className="pixel-btn-secondary text-[10px] px-2 py-1"
                  >
                    1台 売却
                  </button>
                  <button
                    onClick={() => handleSell(m.id, count, unit * count)}
                    className="pixel-btn text-[10px] px-2 py-1"
                  >
                    全 {count} 台
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
