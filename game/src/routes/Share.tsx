import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { decodeShop } from "../lib/shareUrl";
import { MACHINES_BY_ID } from "../data/machines";
import { calcScore, totalCost, starRating } from "../lib/litePricing";
import { getSeriesById } from "../lib/shopSeries";
import type { Machine, Rarity } from "../lib/types";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];
const RARITY_BADGE: Record<Rarity, string> = {
  N: "bg-gray-300 text-gray-700",
  R: "bg-green-200 text-green-800",
  SR: "bg-purple-200 text-purple-800",
  SSR: "bg-yellow-200 text-yellow-800",
};

/**
 * シェアURL から店舗を表示する公開ページ
 * 例: /share?n=...&s=...&m=...
 */
export function Share() {
  const navigate = useNavigate();
  const location = useLocation();
  const shop = useMemo(
    () => decodeShop(location.search.replace(/^\?/, "")),
    [location.search]
  );

  if (!shop) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-bg-base text-white">
        <p className="font-pixel text-xs text-pachi-red mb-4">
          シェアリンクが無効です
        </p>
        <button
          onClick={() => navigate("/")}
          className="pixel-btn text-xs"
        >
          ホームへ
        </button>
      </div>
    );
  }

  const series = getSeriesById(shop.seriesId);
  const score = calcScore(shop.entries, MACHINES_BY_ID);
  const cost = totalCost(shop.entries, MACHINES_BY_ID);
  const totalCount = Object.values(shop.entries).reduce((a, b) => a + b, 0);
  const kindCount = Object.keys(shop.entries).length;

  const rows: { machine: Machine; count: number }[] = [];
  for (const [mid, count] of Object.entries(shop.entries)) {
    const m = MACHINES_BY_ID[mid];
    if (m && count > 0) rows.push({ machine: m, count });
  }
  rows.sort((a, b) => {
    const r =
      RARITY_ORDER.indexOf(a.machine.rarity) -
      RARITY_ORDER.indexOf(b.machine.rarity);
    if (r !== 0) return r;
    return b.machine.releaseYear - a.machine.releaseYear;
  });

  return (
    <div className="min-h-dvh bg-bg-base text-white pb-10">
      {/* ヒーロー */}
      <div className="bg-bg-base relative overflow-hidden">
        <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
        <div className="px-4 py-6 text-center relative">
          <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest">
            SHARED IDEAL SHOP
          </p>
          <h1 className="mt-2 font-pixel text-base">
            <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
              {shop.name || "理想のお店"}
            </span>
          </h1>
          {series && (
            <p className="mt-1 font-pixel text-[10px] text-pachi-yellow">
              {series.tagline} · {series.name}
            </p>
          )}
          <div className="mt-4">
            <div className="font-pixel text-2xl text-pachi-yellow tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">
              {starRating(score.total)}
            </div>
            <div className="text-[10px] text-white/60 mt-1">
              理想店レベル {score.total.toFixed(1)} / 5.0
            </div>
          </div>
        </div>
      </div>

      {/* 系列フレーバー (チラシ風) */}
      {series && (
        <div className="mx-3 mt-3 bg-bg-panel border-2 border-bg-card overflow-hidden">
          <div
            className={`${series.bannerBg} px-3 py-2 border-b-4 border-black flex items-center justify-between`}
          >
            <span className="font-pixel text-[11px]">{series.name}</span>
            <span className="text-2xl">{series.emoji}</span>
          </div>
          <div className="px-3 py-3 grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <p className="font-pixel text-[9px] text-pachi-yellow mb-1">
                特日
              </p>
              <p className="text-white">{series.specialDay}</p>
            </div>
            <div>
              <p className="font-pixel text-[9px] text-pachi-pink mb-1">
                イベント
              </p>
              <p className="text-white">{series.event}</p>
            </div>
            <div>
              <p className="font-pixel text-[9px] text-pachi-cyan mb-1">
                来店演者
              </p>
              <p className="text-white">{series.mascot}</p>
            </div>
          </div>
        </div>
      )}

      {/* スタッツ */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-2">
        <Stat label="設置台数" value={`${totalCount} 台`} color="text-pachi-green" />
        <Stat label="機種数" value={`${kindCount} 機種`} color="text-pachi-cyan" />
        <Stat
          label="実現コスト"
          value={`¥${cost.toLocaleString()}`}
          color="text-pachi-pink"
        />
        <Stat
          label="想定客数"
          value={`${Math.round(totalCount * 0.8 + score.total * 30)} 人/日`}
          color="text-pachi-yellow"
        />
      </div>

      {/* テーブル */}
      <div className="mx-3 mt-4">
        <div className="bg-white text-black font-dot border-2 border-black">
          <div className="bg-black text-white px-3 py-2 flex justify-between text-[11px]">
            <span>設置機種一覧</span>
            <span className="text-pachi-yellow">{kindCount} 機種</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-gray-500">
              機種がありません
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left px-2 py-1">機種名</th>
                  <th className="text-left px-2 py-1 hidden sm:table-cell">メーカー</th>
                  <th className="text-right px-2 py-1">台数</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ machine: m, count }) => (
                  <tr key={m.id} className="border-t border-gray-300 align-top">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1 font-pixel rounded-sm ${RARITY_BADGE[m.rarity]}`}
                        >
                          {m.rarity}
                        </span>
                        <span className="block max-w-[180px] truncate">{m.name}</span>
                      </div>
                      <span className="block text-[10px] text-gray-500 mt-0.5 sm:hidden">
                        {m.maker}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-600 hidden sm:table-cell">
                      {m.maker}
                    </td>
                    <td className="px-2 py-1.5 text-right font-pixel">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="bg-gray-100 px-3 py-2 text-[10px] text-gray-500 text-center border-t border-gray-300">
            generated by マイパチ店
          </div>
        </div>
      </div>

      {/* 自分も作る CTA */}
      <div className="px-4 mt-5">
        <div className="pixel-panel p-4 border-2 border-pachi-pink">
          <p className="font-pixel text-[11px] text-pachi-pink mb-2">
            あなたも理想のホールを作ろう
          </p>
          <button
            onClick={() => navigate("/")}
            className="pixel-btn w-full text-xs"
          >
            マイパチ店を始める
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="pixel-panel p-3">
      <p className="text-[10px] text-white/60">{label}</p>
      <p className={`mt-1 font-pixel text-xs ${color}`}>{value}</p>
    </div>
  );
}
