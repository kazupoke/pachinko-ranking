import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";
import { PageHeader } from "../components/PageHeader";
import type { ShopInterior, Rarity } from "../lib/types";
import { MACHINES_BY_ID } from "../data/machines";
import { buildShareUrl } from "../lib/shareUrl";
import { getBannerById, BANNERS } from "../data/banners";
import { BannerImage } from "../components/BannerImage";
import { ShopFloor } from "../components/ShopFloor";

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
  const activeBannerId = useGameStore((s) => s.activeBannerId);
  const banner = getBannerById(activeBannerId) ?? BANNERS[0];
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
    // 設置台数を {machineId: count} に
    const entries: Record<string, number> = {};
    for (const e of shop.layout) entries[e.machineId] = e.count;
    const url = buildShareUrl({
      name: shop.name,
      seriesId: useGameStore.getState().shopSeriesId,
      entries,
    });
    const text = `【${shop.name}】設置台数 ${totalMachines}台 / ${shop.layout.length}機種\n遊びに来てね！\n#マイパチ店`;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: shop.name, text, url });
        return;
      } catch {
        // キャンセルされても無視
      }
    }
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank");
  };

  const handleViewShareScreen = () => {
    const entries: Record<string, number> = {};
    for (const e of shop.layout) entries[e.machineId] = e.count;
    const url = buildShareUrl({
      name: shop.name,
      seriesId: useGameStore.getState().shopSeriesId,
      entries,
    });
    // 同タブで開いて "戻る" で戻れる
    window.open(url, "_blank");
  };

  return (
    <div>
      {/* 店舗バナー (現在使用中) */}
      <div className="bg-bg-base border-b-2 border-bg-card">
        <BannerImage banner={banner} shopName={shop.name} />
      </div>

      <PageHeader
        title={shop.name}
        subtitle={`Tier ${shop.tier} · ${totalMachines}/${shop.capacity.machines}台 · ${shop.layout.length}/${shop.capacity.types}機種`}
      />

      {/* 設置容量メーター — ゲームの核となる「200台×40機種枠」を可視化 */}
      <div className="px-4 pt-3">
        <div className="pixel-panel p-3">
          <p className="font-pixel text-[10px] text-pachi-cyan mb-2">
            理想店進捗
          </p>
          <CapacityBar
            label="台数"
            current={totalMachines}
            max={shop.capacity.machines}
            color="bg-pachi-green"
          />
          <CapacityBar
            label="機種数"
            current={shop.layout.length}
            max={shop.capacity.types}
            color="bg-pachi-pink"
          />
          <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
            この枠を埋めて、SNSで自慢のラインナップをシェアしよう
          </p>
        </div>
      </div>

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
        <ShopFloor
          entries={shop.layout.map((e) => ({ machineId: e.machineId, count: e.count }))}
          customerCount={shop.dailyCustomers}
        />
      ) : (
        <PWorldView
          shop={shop}
          onRemove={(id) => uninstall(id, 1)}
          onAdd={(id) => useGameStore.getState().installMachine(id, 1)}
        />
      )}

      <div className="px-4 mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => navigate("/collection")} className="pixel-btn-secondary text-xs">
          台を配置
        </button>
        <button onClick={() => navigate("/expand")} className="pixel-btn-secondary text-xs">
          店舗拡張
        </button>
        <button
          onClick={handleViewShareScreen}
          className="pixel-btn-secondary text-xs col-span-2"
        >
          シェア用画面を開く (スクショ向け)
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


function PWorldView({
  shop,
  onRemove,
  onAdd,
}: {
  shop: ReturnType<typeof useGameStore.getState>["shop"];
  onRemove: (machineId: string) => void;
  onAdd: (machineId: string) => { ok: boolean; reason?: string };
}) {
  const user = useGameStore((s) => s.user);
  if (!shop) return null;
  if (shop.layout.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[11px] text-white/50">
        まだ台が設置されていません
      </div>
    );
  }
  // 設置機種は 台数DESC + 年代DESC で並べる
  const sortedLayout = [...shop.layout].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const ma = MACHINES_BY_ID[a.machineId];
    const mb = MACHINES_BY_ID[b.machineId];
    if (!ma || !mb) return 0;
    return mb.releaseYear - ma.releaseYear;
  });
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
            {sortedLayout.map((entry) => {
              const m = MACHINES_BY_ID[entry.machineId];
              if (!m) return null;
              const ownedExtra = user?.ownedMachines[entry.machineId] ?? 0;
              const canAdd = ownedExtra > 0;
              return (
                <tr key={entry.machineId} className="border-t border-gray-300">
                  <td className="px-2 py-1.5 align-top">
                    <span className="block truncate max-w-[170px]">{m.name}</span>
                    <span className={`text-[9px] ${RARITY_COLOR[m.rarity]} font-pixel`}>
                      {m.rarity}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 align-top">{m.maker}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onRemove(entry.machineId)}
                        className="w-6 h-6 font-pixel text-[10px] bg-gray-200 border border-gray-400 text-gray-700"
                        aria-label="台数を減らす"
                      >
                        −
                      </button>
                      <span className="font-pixel text-xs w-8 text-center">
                        {entry.count}
                      </span>
                      <button
                        onClick={() => onAdd(entry.machineId)}
                        disabled={!canAdd}
                        className="w-6 h-6 font-pixel text-[10px] bg-pachi-red border border-pachi-red text-white disabled:opacity-30"
                        aria-label="台数を増やす"
                      >
                        +
                      </button>
                    </div>
                    {ownedExtra > 0 && (
                      <span className="block text-[9px] text-gray-500 mt-0.5">
                        所持 +{ownedExtra}
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <button
                      onClick={() =>
                        useGameStore
                          .getState()
                          .uninstallMachine(entry.machineId, entry.count)
                      }
                      className="text-[9px] text-red-600 px-1"
                    >
                      全外
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

function CapacityBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((current / Math.max(1, max)) * 100));
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between items-baseline text-[10px]">
        <span className="text-white/70 font-dot">{label}</span>
        <span className="font-pixel text-pachi-yellow">
          {current} / {max}{" "}
          <span className="text-white/40">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-2 bg-bg-base border border-bg-card overflow-hidden">
        <div
          className={`${color} h-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function calcInteriorScore(i: ShopInterior): number {
  const sum =
    i.floor + i.wall + i.ceiling + i.entrance + i.counter + i.lounge + i.decor + i.signboard + i.restroom + i.parking;
  return Math.round((sum / 50) * 100);
}
