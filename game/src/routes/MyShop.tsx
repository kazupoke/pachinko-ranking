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
import { BizHoursGauge } from "../components/BizHoursGauge";
import { ShopDashboard } from "../components/ShopDashboard";

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
      {/* 店舗バナー (現在使用中) — 細めに */}
      <div
        className="bg-bg-base border-b-2 border-bg-card overflow-hidden"
        style={{ aspectRatio: "5 / 1", maxHeight: 80 }}
      >
        <BannerImage
          banner={banner}
          shopName={shop.name}
          className="w-full h-full object-cover"
        />
      </div>

      <PageHeader
        title={shop.name}
        subtitle={`Tier ${shop.tier} · ${totalMachines}/${shop.capacity.machines}台 · ${shop.layout.length}/${shop.capacity.types}機種`}
      />

      {/* 店舗外観 (写真風プレースホルダ) */}
      <div className="mx-3 mt-3 pixel-panel overflow-hidden">
        <ShopExteriorPlaceholder banner={banner} shopName={shop.name} />
      </div>

      {/* 営業時間ゲージ */}
      <div className="px-4 pt-3">
        <BizHoursGauge />
      </div>

      {/* ダッシュボード (売上/支出/客数 等) */}
      <ShopDashboard />

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
              const setting = entry.setting ?? 1;
              const settingBg =
                setting >= 5
                  ? "bg-yellow-200"
                  : setting === 4
                    ? "bg-green-200"
                    : setting === 3
                      ? "bg-cyan-200"
                      : "bg-gray-200";
              return (
                <tr key={entry.machineId} className="border-t border-gray-300">
                  <td className="px-2 py-1.5 align-top">
                    <span className="block truncate max-w-[170px]">{m.name}</span>
                    <span className={`text-[9px] ${RARITY_COLOR[m.rarity]} font-pixel`}>
                      {m.rarity}
                    </span>
                    <span
                      className={`ml-1 inline-block text-[9px] font-pixel px-1 ${settingBg} text-gray-800`}
                      title="設定値"
                    >
                      設{setting}
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


function calcInteriorScore(i: ShopInterior): number {
  const sum =
    i.floor + i.wall + i.ceiling + i.entrance + i.counter + i.lounge + i.decor + i.signboard + i.restroom + i.parking;
  return Math.round((sum / 50) * 100);
}

/** 店舗外観 (写真風プレースホルダ SVG) */
function ShopExteriorPlaceholder({
  banner,
  shopName,
}: {
  banner: { primary: string; secondary: string; accent: string; prefix?: string };
  shopName: string;
}) {
  return (
    <svg
      viewBox="0 0 400 200"
      className="block w-full h-auto"
      style={{ imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
    >
      {/* 空 (グラデ) */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0a3a" />
          <stop offset="60%" stopColor="#3c1428" />
          <stop offset="100%" stopColor="#643c50" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#sky)" />
      {/* 月 */}
      <circle cx="340" cy="40" r="14" fill="#ffcc00" opacity="0.85" />
      {/* 星 */}
      <g fill="#fff8dc">
        <rect x="60" y="20" width="2" height="2" />
        <rect x="120" y="35" width="2" height="2" />
        <rect x="200" y="18" width="2" height="2" />
        <rect x="260" y="42" width="2" height="2" />
        <rect x="380" y="60" width="2" height="2" />
      </g>
      {/* 地面 (アスファルト) */}
      <rect x="0" y="170" width="400" height="30" fill="#22223a" />
      {/* 駐車場の白線 */}
      <g fill="#fff" opacity="0.4">
        <rect x="20" y="180" width="20" height="2" />
        <rect x="60" y="180" width="20" height="2" />
        <rect x="100" y="180" width="20" height="2" />
        <rect x="320" y="180" width="20" height="2" />
        <rect x="360" y="180" width="20" height="2" />
      </g>
      {/* 建物本体 */}
      <rect x="40" y="60" width="320" height="110" fill="#1a1a2e" />
      <rect x="40" y="60" width="320" height="6" fill={banner.primary} />
      <rect x="40" y="160" width="320" height="10" fill={banner.primary} opacity="0.6" />
      {/* 看板 (上部) */}
      <rect x="60" y="70" width="280" height="32" fill={banner.primary} />
      <rect x="64" y="74" width="272" height="24" fill="#0a0a14" />
      <text
        x="200"
        y="86"
        fontSize="10"
        fill={banner.secondary}
        fontFamily='"Press Start 2P", monospace'
        textAnchor="middle"
      >
        {banner.prefix ?? "PACHI"}
      </text>
      <text
        x="200"
        y="98"
        fontSize="9"
        fill={banner.accent}
        fontFamily='"DotGothic16", monospace'
        textAnchor="middle"
      >
        {shopName}
      </text>
      {/* 窓 (中段) */}
      <g>
        {[80, 130, 180, 230, 280, 330].map((x, i) => (
          <g key={i}>
            <rect x={x - 14} y="115" width="28" height="20" fill="#22223a" />
            <rect x={x - 12} y="117" width="24" height="16" fill="#ffcc00" opacity="0.7" />
          </g>
        ))}
      </g>
      {/* 入口 (中央) */}
      <rect x="180" y="138" width="40" height="22" fill="#0a0a14" />
      <rect x="184" y="142" width="32" height="18" fill={banner.secondary} opacity="0.6" />
      {/* ネオン縦看板 */}
      <rect x="50" y="110" width="6" height="50" fill={banner.accent} />
      <rect x="344" y="110" width="6" height="50" fill={banner.accent} />
    </svg>
  );
}
