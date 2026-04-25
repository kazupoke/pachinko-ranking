import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useGameStore } from "../stores/useGameStore";

function nextMachineCost(currentMachines: number): number {
  return Math.round(1_000_000 * Math.pow(1.02, currentMachines - 200));
}

function nextTypeCost(currentTypes: number): number {
  return Math.round(10_000_000 * Math.pow(1.15, currentTypes - 40));
}

export function Expand() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const shop = useGameStore((s) => s.shop);
  const expandMachineSlot = useGameStore((s) => s.expandMachineSlot);
  const expandTypeSlot = useGameStore((s) => s.expandTypeSlot);
  const [msg, setMsg] = useState<string | null>(null);
  const [bulk, setBulk] = useState<1 | 10>(1);

  if (!shop || !user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-white/70">まだお店がありません</p>
        <button onClick={() => navigate("/")} className="pixel-btn mt-5 text-xs">
          ホームへ
        </button>
      </div>
    );
  }

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 1800);
  };

  const doExpandMachine = () => {
    let added = 0;
    let totalCost = 0;
    for (let i = 0; i < bulk; i++) {
      const res = expandMachineSlot();
      if (!res.ok) {
        if (res.reason === "max") flash("台数は上限400台です");
        else if (res.reason === "no-cash") flash(`資金不足: ¥${res.cost.toLocaleString()}必要`);
        break;
      }
      added++;
      totalCost += res.cost;
    }
    if (added > 0) flash(`+${added}台（¥${totalCost.toLocaleString()}）`);
  };

  const doExpandType = () => {
    let added = 0;
    let totalCost = 0;
    for (let i = 0; i < bulk; i++) {
      const res = expandTypeSlot();
      if (!res.ok) {
        if (res.reason === "max") flash("機種枠は上限60です");
        else if (res.reason === "no-cash") flash(`資金不足: ¥${res.cost.toLocaleString()}必要`);
        break;
      }
      added++;
      totalCost += res.cost;
    }
    if (added > 0) flash(`+${added}枠（¥${totalCost.toLocaleString()}）`);
  };

  const mCost = nextMachineCost(shop.capacity.machines);
  const tCost = nextTypeCost(shop.capacity.types);

  return (
    <div>
      <PageHeader title="店舗拡張" subtitle="台数と機種枠を増やす（1台/1枠ずつ購入）" />

      <div className="px-4 py-3 pixel-panel mx-4 mt-3 flex justify-between text-xs">
        <span className="text-white/60">所持金</span>
        <span className="font-pixel text-pachi-yellow">
          ¥{user.cash.toLocaleString()}
        </span>
      </div>

      <div className="px-4 pt-4 flex gap-2 text-xs">
        <button
          onClick={() => setBulk(1)}
          className={`px-3 py-2 font-dot border-2 ${
            bulk === 1
              ? "bg-pachi-red border-pachi-red"
              : "bg-bg-panel text-white/60 border-bg-card"
          }`}
        >
          ×1
        </button>
        <button
          onClick={() => setBulk(10)}
          className={`px-3 py-2 font-dot border-2 ${
            bulk === 10
              ? "bg-pachi-red border-pachi-red"
              : "bg-bg-panel text-white/60 border-bg-card"
          }`}
        >
          ×10
        </button>
      </div>

      <section className="pixel-panel mx-4 mt-4 p-4">
        <p className="font-pixel text-[11px] text-pachi-cyan">設置台数</p>
        <p className="mt-2 text-xs">
          現在: <span className="font-pixel text-pachi-yellow">{shop.capacity.machines}</span> / 400台
        </p>
        <p className="mt-2 text-[11px] text-white/60">
          次の1台: ¥{mCost.toLocaleString()}
        </p>
        <button
          onClick={doExpandMachine}
          disabled={shop.capacity.machines >= 400 || user.cash < mCost}
          className="pixel-btn w-full mt-3 text-xs disabled:opacity-40"
        >
          台数を +{bulk} 増やす
        </button>
      </section>

      <section className="pixel-panel mx-4 mt-4 p-4">
        <p className="font-pixel text-[11px] text-pachi-cyan">機種枠</p>
        <p className="mt-2 text-xs">
          現在: <span className="font-pixel text-pachi-yellow">{shop.capacity.types}</span> / 60機種
        </p>
        <p className="mt-2 text-[11px] text-white/60">
          次の1枠: ¥{tCost.toLocaleString()}
        </p>
        <button
          onClick={doExpandType}
          disabled={shop.capacity.types >= 60 || user.cash < tCost}
          className="pixel-btn w-full mt-3 text-xs disabled:opacity-40"
        >
          機種枠を +{bulk} 増やす
        </button>
      </section>

      {msg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-pachi-yellow text-bg-base font-dot text-xs shadow-pixel">
          {msg}
        </div>
      )}

      <div className="px-4 mt-6">
        <button onClick={() => navigate("/shop")} className="pixel-btn-secondary w-full text-xs">
          マイショップに戻る
        </button>
      </div>
    </div>
  );
}
