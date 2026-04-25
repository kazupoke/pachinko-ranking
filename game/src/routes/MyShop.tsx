import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import type { ShopInterior, Rarity } from "../lib/types";
import { MACHINES_BY_ID } from "../data/machines";
import { buildShareUrl } from "../lib/shareUrl";

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

  const totalCount = shop.layout.reduce((s, e) => s + e.count, 0);
  const customerCount = Math.min(shop.dailyCustomers, 30);

  // 設置機種を島 (3 機種ごと) に分割
  const islands: typeof shop.layout[] = [];
  for (let i = 0; i < shop.layout.length; i += 3) {
    islands.push(shop.layout.slice(i, i + 3));
  }

  if (shop.layout.length === 0) {
    return (
      <div className="mx-4 mt-3 bg-bg-panel border-2 border-bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
        <div className="text-center">
          <p className="font-pixel text-xs text-pachi-yellow mb-3 animate-blink">
            CLOSED
          </p>
          <p className="text-[11px] text-white/60 leading-relaxed">
            空の店舗です
            <br />
            ガチャで台を引いて
            <br />
            コレクションで設置しよう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 bg-bg-panel border-2 border-bg-card relative overflow-hidden">
      {/* スキャンライン */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />

      {/* 営業中 ネオン看板 */}
      <div className="bg-black border-b-2 border-pachi-red px-3 py-1.5 flex justify-between items-center text-[10px]">
        <span className="font-pixel text-pachi-pink animate-blink">● OPEN</span>
        <span className="font-pixel text-pachi-yellow">本日 {shop.dailyCustomers} 名</span>
      </div>

      {/* フロア (背景チェッカ) */}
      <div
        className="relative px-3 py-3"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px)",
        }}
      >
        {/* 島ごとに2列の台を配置 + 中央通路 */}
        <div className="space-y-3">
          {islands.map((island, idx) => (
            <Island key={idx} entries={island} />
          ))}
        </div>

        {/* 通路を歩く客 (右へ流れる) */}
        {customerCount > 0 && (
          <div className="mt-3 pt-2 border-t-2 border-bg-card relative h-6 overflow-hidden bg-bg-base">
            <div
              className="absolute inset-y-0 flex items-center gap-2 animate-[slide_18s_linear_infinite]"
              style={{ animationName: "customerWalk" }}
            >
              {Array.from({ length: customerCount }, (_, i) => (
                <PixelCustomer key={i} seed={i * 7 + totalCount} />
              ))}
              {/* ループ用に2セット */}
              {Array.from({ length: customerCount }, (_, i) => (
                <PixelCustomer key={`d${i}`} seed={i * 7 + totalCount + 999} />
              ))}
            </div>
            <style>{`
              @keyframes customerWalk {
                0%   { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .animate-\\[slide_18s_linear_infinite\\] {
                animation: customerWalk 18s linear infinite;
              }
            `}</style>
          </div>
        )}

        {/* フロア底ライン */}
        <div className="mt-2 flex justify-between items-center text-[9px] font-pixel text-white/40">
          <span>FLOOR · {shop.layout.length}機種 / {totalCount}台</span>
          <span>稼働率 {Math.min(100, Math.round((shop.dailyCustomers / Math.max(totalCount, 1)) * 100))}%</span>
        </div>
      </div>
    </div>
  );
}

/** 1 島 = 表裏背中合わせの台ペア (最大3機種) */
function Island({ entries }: { entries: { machineId: string; count: number; islandX: number; islandY: number }[] }) {
  return (
    <div className="bg-bg-card/40 border border-bg-card p-2">
      <div className="grid grid-cols-3 gap-1.5">
        {entries.map((entry) => {
          const m = MACHINES_BY_ID[entry.machineId];
          if (!m) return null;
          const isSsr = m.rarity === "SSR";
          const isSr = m.rarity === "SR";
          const borderColor =
            m.rarity === "SSR"
              ? "border-rarity-ssr"
              : m.rarity === "SR"
                ? "border-rarity-sr"
                : m.rarity === "R"
                  ? "border-rarity-r"
                  : "border-bg-card";
          return (
            <div
              key={entry.machineId}
              className={`relative bg-bg-base border-2 ${borderColor} ${
                isSsr ? "animate-ssr-glow" : isSr ? "shadow-[0_0_6px_rgba(167,139,250,0.4)]" : ""
              }`}
            >
              <div className="aspect-[2/3]">
                <MachineThumb
                  machineId={m.id}
                  name={m.name}
                  rarity={m.rarity}
                  className="w-full h-full"
                  size={48}
                />
              </div>
              {/* 台座: 椅子 + 台数バッジ */}
              <div className="bg-black/60 px-1 py-0.5 flex justify-between items-center text-[8px] font-pixel">
                <span className={RARITY_COLOR[m.rarity]}>{m.rarity}</span>
                <span className="text-pachi-yellow">×{entry.count}</span>
              </div>
            </div>
          );
        })}
        {/* 3 未満の島は空きで埋める */}
        {Array.from({ length: 3 - entries.length }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="bg-bg-base/40 border-2 border-dashed border-bg-card aspect-[2/3] flex items-center justify-center"
          >
            <span className="text-[8px] text-white/20">空</span>
          </div>
        ))}
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
