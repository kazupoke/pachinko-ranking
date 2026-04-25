import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import type { ShopInterior, Rarity } from "../lib/types";
import { MACHINES_BY_ID } from "../data/machines";

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};


export function MyShop() {
  const navigate = useNavigate();
  const shop = useGameStore((s) => s.shop);
  const user = useGameStore((s) => s.user);
  const uninstall = useGameStore((s) => s.uninstallMachine);
  const [mode, setMode] = useState<"overview" | "pworld">("overview");

  const totalMachines = useMemo(
    () => shop?.layout.reduce((s, e) => s + e.count, 0) ?? 0,
    [shop]
  );

  if (!shop) {
    return (
      <div className="p-6 text-center text-sm text-white/70">
        <p>まだお店がありません。</p>
        <button onClick={() => navigate("/")} className="pixel-btn mt-6 text-xs">
          お店を作る
        </button>
      </div>
    );
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/s/${shop.id}`;
    const text = `【${shop.name}】設置台数 ${totalMachines}台 / ${shop.layout.length}機種\n遊びに来てね！`;
    // Web Share API 優先
    if ("share" in navigator) {
      try {
        await navigator.share({ title: shop.name, text, url });
        return;
      } catch {
        // キャンセルされても無視
      }
    }
    // fallback: Twitter intent
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank");
  };

  return (
    <div>
      <PageHeader
        title={shop.name}
        subtitle={`Tier ${shop.tier} · ${totalMachines}/${shop.capacity.machines}台 · ${shop.layout.length}/${shop.capacity.types}機種`}
      />

      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <Stat label="本日の客数" value={shop.dailyCustomers.toLocaleString()} color="text-pachi-green" />
        <Stat label="累計来店" value={shop.totalCustomers.toLocaleString()} color="text-pachi-cyan" />
        <Stat label="所持金" value={"¥" + (user?.cash ?? 0).toLocaleString()} color="text-pachi-yellow" />
        <Stat label="豪華度" value={calcInteriorScore(shop.interior) + " / 100"} color="text-pachi-pink" />
      </div>

      <div className="px-4 flex gap-2 text-xs">
        <button
          onClick={() => setMode("overview")}
          className={`flex-1 py-2 font-dot border-2 ${
            mode === "overview"
              ? "bg-pachi-red border-pachi-red"
              : "bg-bg-panel border-bg-card text-white/60"
          }`}
        >
          俯瞰
        </button>
        <button
          onClick={() => setMode("pworld")}
          className={`flex-1 py-2 font-dot border-2 ${
            mode === "pworld"
              ? "bg-pachi-red border-pachi-red"
              : "bg-bg-panel border-bg-card text-white/60"
          }`}
        >
          ラインナップ
        </button>
      </div>

      {mode === "overview" ? (
        <OverviewView shop={shop} />
      ) : (
        <PWorldView shop={shop} onRemove={(id) => uninstall(id, 1)} />
      )}

      <div className="px-4 mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => navigate("/collection")} className="pixel-btn-secondary text-xs">
          台を配置
        </button>
        <button onClick={() => navigate("/expand")} className="pixel-btn-secondary text-xs">
          店舗拡張
        </button>
        <button onClick={handleShare} className="pixel-btn text-xs col-span-2">
          シェアする
        </button>
      </div>
      <p className="px-4 mt-3 text-[10px] text-white/40 text-center">
        （リンク踏み→客数UP はサーバー連携後に反映）
      </p>
    </div>
  );
}

/** ドット絵の客キャラクター（ランダムカラー） */
function PixelCustomer({ seed }: { seed: number }) {
  const colors = ["#ff4d94", "#ffcc00", "#00e5ff", "#00ff88", "#b066ff", "#ff0066"];
  const color = colors[seed % colors.length];
  return (
    <svg viewBox="0 0 8 12" width="8" height="12" style={{ imageRendering: "pixelated" }}>
      {/* 頭 */}
      <rect x="2" y="0" width="4" height="4" fill={color} />
      {/* 体 */}
      <rect x="1" y="4" width="6" height="4" fill={color} opacity="0.8" />
      {/* 足 */}
      <rect x="1" y="8" width="2" height="4" fill={color} opacity="0.6" />
      <rect x="5" y="8" width="2" height="4" fill={color} opacity="0.6" />
    </svg>
  );
}

function OverviewView({ shop }: { shop: ReturnType<typeof useGameStore.getState>["shop"] }) {
  if (!shop) return null;

  const uniqueMachines = shop.layout.slice(0, 12);
  const totalCount = shop.layout.reduce((s, e) => s + e.count, 0);
  const customerCount = Math.min(shop.dailyCustomers, 20);

  return (
    <div className="mx-4 mt-3">
      {/* 店内フロアビュー */}
      <div className="bg-bg-panel border-2 border-bg-card relative overflow-hidden p-3">
        <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />

        {uniqueMachines.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[11px] text-white/50 leading-relaxed">
              空の店舗です
              <br />
              ガチャで台を引いてから
              <br />
              コレクションで設置しよう
            </p>
          </div>
        ) : (
          <>
            {/* 設置台グリッド */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {uniqueMachines.map((entry) => {
                const m = MACHINES_BY_ID[entry.machineId];
                if (!m) return null;
                return (
                  <div key={entry.machineId} className="flex flex-col items-center gap-1">
                    <div className="w-full aspect-[2/3] bg-bg-base border border-bg-card">
                      <MachineThumb
                        machineId={m.id}
                        name={m.name}
                        rarity={m.rarity}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="font-pixel text-[7px] text-white/60">×{entry.count}</span>
                  </div>
                );
              })}
            </div>
            {/* 客ドット絵 */}
            {customerCount > 0 && (
              <div className="border-t border-bg-card pt-2">
                <p className="text-[9px] text-white/40 mb-1 font-pixel">CUSTOMERS</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: customerCount }, (_, i) => (
                    <PixelCustomer key={i} seed={i * 7 + totalCount} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PWorldView({
  shop,
  onRemove,
}: {
  shop: ReturnType<typeof useGameStore.getState>["shop"];
  onRemove: (machineId: string) => void;
}) {
  if (!shop) return null;
  if (shop.layout.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[11px] text-white/50">
        まだ台が設置されていません
      </div>
    );
  }
  return (
    <div className="mx-4 mt-3">
      <div className="bg-white text-black font-dot border-2 border-black">
        <div className="bg-black text-white px-3 py-2 flex justify-between text-xs">
          <span>{shop.name}</span>
          <span className="text-pachi-yellow">設置機種一覧</span>
        </div>
        <table className="w-full text-[11px]">
          <thead className="bg-gray-200">
            <tr>
              <th className="text-left px-2 py-1">機種名</th>
              <th className="text-left px-2 py-1">メーカー</th>
              <th className="text-right px-2 py-1">台数</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shop.layout.map((entry) => {
              const m = MACHINES_BY_ID[entry.machineId];
              if (!m) return null;
              return (
                <tr key={entry.machineId} className="border-t border-gray-300">
                  <td className="px-2 py-1.5 align-top">
                    <span className="block truncate max-w-[170px]">{m.name}</span>
                    <span className={`text-[9px] ${RARITY_COLOR[m.rarity]} font-pixel`}>
                      {m.rarity}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 align-top">{m.maker}</td>
                  <td className="px-2 py-1.5 text-right font-pixel">{entry.count}</td>
                  <td className="px-1 py-1.5 text-right">
                    <button
                      onClick={() => onRemove(entry.machineId)}
                      className="text-[10px] text-red-600 px-1"
                    >
                      外す
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="pixel-panel p-3">
      <p className="text-[10px] text-white/60">{label}</p>
      <p className={`mt-1 font-pixel text-xs ${color}`}>{value}</p>
    </div>
  );
}

function calcInteriorScore(i: ShopInterior): number {
  const sum =
    i.floor + i.wall + i.ceiling + i.entrance + i.counter + i.lounge + i.decor + i.signboard + i.restroom + i.parking;
  return Math.round((sum / 50) * 100);
}
