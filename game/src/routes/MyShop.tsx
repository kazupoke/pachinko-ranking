import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";
import { PageHeader } from "../components/PageHeader";
import { buildShareUrl } from "../lib/shareUrl";
import { getBannerById, BANNERS } from "../data/banners";
import { BannerImage } from "../components/BannerImage";
import { ShopFloor } from "../components/ShopFloor";
import { BizHoursGauge } from "../components/BizHoursGauge";
import { ShopDashboard } from "../components/ShopDashboard";

export function MyShop() {
  const navigate = useNavigate();
  const shop = useGameStore((s) => s.shop);
  const activeBannerId = useGameStore((s) => s.activeBannerId);
  const banner = getBannerById(activeBannerId) ?? BANNERS[0];

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

      {/* 主要 2 メトリクス + 店舗詳細ボタン */}
      <QuickStats />

      {/* 俯瞰のみ (ラインナップは パチスロタブに移動) */}
      <ShopFloor
        entries={shop.layout.map((e) => ({ machineId: e.machineId, count: e.count }))}
        customerCount={shop.dailyCustomers}
      />
      <p className="px-4 mt-2 text-[10px] text-white/40 text-center">
        詳細なラインナップは「パチスロ」タブから確認できます
      </p>

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



function QuickStats() {
  const shop = useGameStore((s) => s.shop);
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  if (!shop) return null;
  const totalMachines = shop.layout.reduce((s, e) => s + e.count, 0);
  // 現在店舗にいる客 (シミュ簡易): dailyCustomers / 4 を上限に
  const playingNow = Math.min(totalMachines, Math.floor(shop.dailyCustomers / 4));
  const todayRevenue = shop.dailyCustomers * 5_000;
  return (
    <div className="px-4 mt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="pixel-panel p-3">
          <p className="text-[10px] text-white/60">現在の客数</p>
          <p className="mt-1 font-pixel text-pachi-green">
            <span className="text-base">{playingNow}</span>{" "}
            <span className="text-[10px] text-white/50">名</span>
          </p>
          <p className="text-[9px] text-white/40 mt-0.5">
            本日 {shop.dailyCustomers.toLocaleString()} 名来店
          </p>
        </div>
        <div className="pixel-panel p-3">
          <p className="text-[10px] text-white/60">今日の売上</p>
          <p className="mt-1 font-pixel text-pachi-yellow">
            <span className="text-base">¥{todayRevenue.toLocaleString()}</span>
          </p>
          <p className="text-[9px] text-white/40 mt-0.5">概算 (実装中)</p>
        </div>
      </div>
      <button
        onClick={() => setShowDetail((v) => !v)}
        className="pixel-btn-secondary w-full mt-2 text-[11px] py-2"
      >
        {showDetail ? "▲ 詳細を閉じる" : "▼ 店舗詳細を見る (売上/支出/常連)"}
      </button>
      {showDetail && (
        <div className="mt-2">
          <ShopDashboard />
          <button
            onClick={() => navigate("/manager/regulars")}
            className="pixel-btn-secondary w-full mt-2 text-[11px] py-2"
          >
            常連リストへ →
          </button>
        </div>
      )}
    </div>
  );
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
