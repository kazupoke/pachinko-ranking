import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiteStore, totalMachines, totalKinds } from "../../stores/useLiteStore";
import { MACHINES_BY_ID } from "../../data/machines";
import type { Machine, Rarity } from "../../lib/types";
import { calcScore, totalCost, starRating } from "../../lib/litePricing";
import { useGameStore } from "../../stores/useGameStore";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];
const RARITY_BADGE: Record<Rarity, string> = {
  N: "bg-gray-300 text-gray-700",
  R: "bg-green-200 text-green-800",
  SR: "bg-purple-200 text-purple-800",
  SSR: "bg-yellow-200 text-yellow-800",
};

export function LiteView() {
  const navigate = useNavigate();
  const shop = useLiteStore((s) => s.shop);
  const removeMachine = useLiteStore((s) => s.removeMachine);
  const fullGameShop = useGameStore((s) => s.shop);
  const createFullShop = useGameStore((s) => s.createShop);

  // 開いた瞬間の演出
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(t);
  }, []);

  const entries = shop?.entries;
  const rows = useMemo(() => {
    const list: { machine: Machine; count: number }[] = [];
    if (!entries) return list;
    for (const [mid, count] of Object.entries(entries)) {
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
  }, [entries]);

  if (!shop) {
    return (
      <div className="p-6 text-center text-sm text-white/70">
        <p>ライトモードのお店がありません。</p>
        <button
          onClick={() => navigate("/lite")}
          className="pixel-btn mt-6 text-xs"
        >
          お店を作る
        </button>
      </div>
    );
  }

  const totalCount = totalMachines(shop);
  const kindCount = totalKinds(shop);
  const score = calcScore(shop.entries, MACHINES_BY_ID);
  const cost = totalCost(shop.entries, MACHINES_BY_ID);

  const handleShare = async () => {
    const text = `【${shop.name}】設置 ${totalCount}台 / ${kindCount}機種\n理想店レベル ${starRating(score.total)} (${score.total.toFixed(1)})\n#マイパチ店`;
    const url = window.location.href;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: shop.name, text, url });
        return;
      } catch {
        /* キャンセルは無視 */
      }
    }
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank");
  };

  const handleStartFullMode = () => {
    if (!fullGameShop) {
      // 本格モードの店をライトの店名で作って、夢の店としてリンク
      createFullShop(shop.name);
    }
    navigate("/shop");
  };

  return (
    <div className="pb-6">
      {/* === 「これがあなたの理想のお店！」演出ヘッダ === */}
      <div className="bg-bg-base relative overflow-hidden">
        <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
        <div className="px-4 py-6 text-center relative">
          <p
            className={`font-pixel text-[10px] text-pachi-cyan tracking-widest transition-opacity duration-700 ${
              revealed ? "opacity-100" : "opacity-0"
            }`}
          >
            これがあなたの
          </p>
          <h1
            className={`mt-2 font-pixel text-base sm:text-lg leading-tight transition-all duration-700 ${
              revealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
              理想のお店
            </span>
          </h1>
          <p
            className={`mt-1 font-pixel text-base text-pachi-yellow leading-tight transition-all duration-700 delay-200 ${
              revealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            「{shop.name}」
          </p>
          {/* 評価 */}
          <div
            className={`mt-4 inline-block transition-all duration-700 delay-400 ${
              revealed ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            <div className="font-pixel text-2xl text-pachi-yellow tracking-widest drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">
              {starRating(score.total)}
            </div>
            <div className="text-[10px] text-white/60 mt-1">
              理想店レベル {score.total.toFixed(1)} / 5.0
            </div>
          </div>
        </div>
      </div>

      {/* 評価コメント */}
      <div className="px-4 mt-3">
        <div className="pixel-panel p-3">
          <p className="font-pixel text-[10px] text-pachi-cyan mb-2">
            鑑定コメント
          </p>
          <ul className="space-y-1 text-[11px] text-white/80">
            {score.comments.map((c, i) => (
              <li key={i}>・{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* スタッツ 4 連 */}
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

      {/* 本格モードへの導線 (PRIMARY CTA) */}
      <div className="px-4 mt-4">
        <div className="pixel-panel p-4 border-2 border-pachi-pink relative overflow-hidden">
          <div className="absolute inset-0 rainbow-gradient animate-rainbow-bg opacity-10 pointer-events-none" />
          <p className="font-pixel text-[11px] text-pachi-pink mb-2">
            ▶ NEXT STEP
          </p>
          <p className="text-[11px] text-white leading-relaxed">
            この理想のお店を、本格モードで実現しよう！
            <br />
            ガチャで台を集めて、お店を育てよう。
          </p>
          <button
            onClick={handleStartFullMode}
            className="pixel-btn w-full mt-3 text-xs"
          >
            本格モードで実現する
          </button>
        </div>
      </div>

      {/* P-World 風テーブル本体 */}
      <div className="mx-3 mt-4">
        <div className="bg-white text-black font-dot border-2 border-black">
          <div className="bg-black text-white px-3 py-2 flex justify-between text-[11px]">
            <span>設置機種一覧</span>
            <span className="text-pachi-yellow">{kindCount} 機種</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-gray-500">
              まだ機種が選ばれていません
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left px-2 py-1">機種名</th>
                  <th className="text-left px-2 py-1 hidden sm:table-cell">メーカー</th>
                  <th className="text-right px-2 py-1">台数</th>
                  <th />
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
                    <td className="px-1 py-1.5 text-right">
                      <button
                        onClick={() => removeMachine(m.id)}
                        className="text-[10px] text-red-600 px-1"
                      >
                        外す
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="bg-gray-100 px-3 py-2 text-[10px] text-gray-500 flex justify-between border-t border-gray-300">
            <span>更新: {shop.updatedAt.slice(0, 10)}</span>
            <span>generated by マイパチ店</span>
          </div>
        </div>
      </div>

      {/* セカンダリアクション */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => navigate("/lite/build")}
          className="pixel-btn-secondary text-xs"
        >
          編集
        </button>
        <button
          onClick={() => navigate("/lite")}
          className="pixel-btn-secondary text-xs"
        >
          設定
        </button>
        <button
          onClick={handleShare}
          className="pixel-btn-secondary text-xs"
          disabled={rows.length === 0}
        >
          シェア
        </button>
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
