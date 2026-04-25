import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useGameStore } from "../../stores/useGameStore";
import { MACHINES_BY_ID } from "../../data/machines";
import { MachineThumb } from "../../components/MachineThumb";
import {
  PART_PRICE,
  BROKEN_PARTS,
  ABANDON_THRESHOLD,
  type BrokenPart,
} from "../../lib/repair";

export function Maintain() {
  const navigate = useNavigate();
  const shop = useGameStore((s) => s.shop);
  const inventory = useGameStore((s) => s.partInventory);
  const cash = useGameStore((s) => s.user?.cash ?? 0);
  const managerLevel = useGameStore((s) => s.managerLevel);
  const buyPart = useGameStore((s) => s.buyPart);
  const repairWithPart = useGameStore((s) => s.repairWithPart);
  const repairWithLevel = useGameStore((s) => s.repairWithManagerLevel);
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 2000);
  };

  const broken = (shop?.layout ?? []).filter((e) => e.brokenPart);
  const damaged = (shop?.layout ?? []).filter(
    (e) => !e.brokenPart && (e.hp ?? 100) < 70
  );

  const handleBuy = (p: BrokenPart) => {
    const r = buyPart(p);
    if (!r.ok) flash(r.reason === "no-cash" ? "資金不足" : "購入失敗");
    else flash(`${p} を購入`);
  };

  const handleRepairPart = (mid: string) => {
    const r = repairWithPart(mid);
    if (!r.ok) {
      if (r.reason === "no-part") flash("対応する修理部品がありません");
      else if (r.reason === "abandoned")
        flash("放置されすぎ。店長レベルでのみ修理可能");
      else flash("修理失敗");
      return;
    }
    flash("修理完了!");
  };

  const handleRepairLevel = (mid: string) => {
    const r = repairWithLevel(mid);
    if (!r.ok) {
      if (r.reason === "low-level")
        flash("店長レベル 2 以上が必要 (現在 Lv." + managerLevel + ")");
      else flash("修理失敗");
      return;
    }
    flash("店長レベル -1 で修理完了!");
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="メンテナンス"
        subtitle={`故障 ${broken.length} 台 · 損傷 ${damaged.length} 台 · 店長 Lv.${managerLevel}`}
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

      <div className="px-4 mt-3">
        <div className="pixel-panel p-3">
          <p className="font-pixel text-[10px] text-pachi-cyan mb-2">
            修理部品 (倉庫)
          </p>
          <div className="grid grid-cols-1 gap-2">
            {BROKEN_PARTS.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between bg-bg-base border border-bg-card px-2 py-2 gap-2"
              >
                <span className="font-dot text-[11px] flex-1">{p}</span>
                <span className="text-[10px] text-white/60 w-14 text-right">
                  在庫 {inventory[p]}
                </span>
                <span className="font-pixel text-[10px] text-pachi-yellow w-20 text-right">
                  ¥{PART_PRICE[p].toLocaleString()}
                </span>
                <button
                  onClick={() => handleBuy(p)}
                  disabled={cash < PART_PRICE[p]}
                  className="pixel-btn-secondary text-[10px] px-2 py-1 disabled:opacity-30"
                >
                  購入
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {broken.length > 0 && (
        <div className="px-4 mt-3">
          <p className="font-pixel text-[10px] text-pachi-red mb-2">
            ⚠ 故障中 ({broken.length})
          </p>
          <ul className="space-y-2">
            {broken.map((e) => {
              const m = MACHINES_BY_ID[e.machineId];
              if (!m) return null;
              const since = e.brokenSince ?? 0;
              const abandoned = since >= ABANDON_THRESHOLD;
              const part = e.brokenPart!;
              const hasPart = inventory[part] > 0;
              return (
                <li key={e.machineId} className="pixel-panel p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 shrink-0 border border-bg-card opacity-50">
                      <MachineThumb
                        machineId={m.id}
                        name={m.name}
                        rarity={m.rarity}
                        size={48}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{m.name}</p>
                      <p className="text-[10px] text-pachi-red font-pixel mt-1">
                        故障: {part}
                      </p>
                      <p className="text-[10px] text-white/50">
                        放置: {Math.floor(since)} tick
                        {abandoned && (
                          <span className="text-pachi-red ml-1 animate-blink">
                            (部品修理不可)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRepairPart(e.machineId)}
                      disabled={abandoned || !hasPart}
                      className="pixel-btn-secondary text-[11px] py-2 disabled:opacity-30"
                    >
                      部品で修理
                    </button>
                    <button
                      onClick={() => handleRepairLevel(e.machineId)}
                      className="pixel-btn text-[11px] py-2"
                    >
                      店長Lv修理 (-1)
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {damaged.length > 0 && (
        <div className="px-4 mt-4">
          <p className="font-pixel text-[10px] text-pachi-yellow mb-2">
            状態悪化 (HP 70 未満) {damaged.length} 台
          </p>
          <ul className="space-y-2">
            {damaged.map((e) => {
              const m = MACHINES_BY_ID[e.machineId];
              if (!m) return null;
              const hp = e.hp ?? 100;
              return (
                <li
                  key={e.machineId}
                  className="pixel-panel p-2 flex items-center gap-2"
                >
                  <div className="w-10 h-12 shrink-0 border border-bg-card">
                    <MachineThumb
                      machineId={m.id}
                      name={m.name}
                      rarity={m.rarity}
                      size={48}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate">{m.name}</p>
                    <div className="mt-1 h-1.5 bg-bg-base border border-bg-card overflow-hidden">
                      <div
                        className={`h-full ${
                          hp >= 50
                            ? "bg-pachi-yellow"
                            : hp >= 30
                              ? "bg-pachi-pink"
                              : "bg-pachi-red"
                        }`}
                        style={{ width: `${hp}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-pixel text-[10px] text-pachi-yellow">
                    {Math.round(hp)} HP
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {broken.length === 0 && damaged.length === 0 && (
        <div className="mx-4 mt-4 pixel-panel p-4 text-center text-[11px] text-white/60">
          全台の状態良好 ✓
          <br />
          <span className="text-[10px] text-white/40">
            営業中は HP が減ります。閉店作業中 (営業ゲージ後半 1/4) は回復。
          </span>
        </div>
      )}
    </div>
  );
}
