import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiteStore, totalMachines, totalKinds } from "../../stores/useLiteStore";
import { PageHeader } from "../../components/PageHeader";
import { MACHINES_BY_ID } from "../../data/machines";
import { calcScore, totalCost, starRating } from "../../lib/litePricing";

export function LiteEntry() {
  const navigate = useNavigate();
  const shop = useLiteStore((s) => s.shop);
  const createShop = useLiteStore((s) => s.createShop);
  const renameShop = useLiteStore((s) => s.renameShop);
  const resetShop = useLiteStore((s) => s.resetShop);
  const [name, setName] = useState(shop?.name ?? "");

  const handleStart = () => {
    if (!shop) {
      createShop(name);
    } else if (name.trim() && name.trim() !== shop.name) {
      renameShop(name);
    }
    navigate("/lite/build");
  };

  const handleReset = () => {
    if (confirm("ライトモードのお店データをリセットしますか？")) {
      resetShop();
      setName("");
    }
  };

  const score = shop ? calcScore(shop.entries, MACHINES_BY_ID) : null;
  const cost = shop ? totalCost(shop.entries, MACHINES_BY_ID) : 0;

  return (
    <div>
      <PageHeader
        title="理想のお店を作ろう"
        subtitle="あなたの夢のパチ屋を形にして、本格モードで実現しよう"
      />
      <div className="px-4 py-5 flex flex-col gap-5">
        {/* イントロ */}
        <section className="pixel-panel p-5 relative overflow-hidden">
          <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
          <p className="font-pixel text-[11px] text-pachi-yellow leading-relaxed">
            DREAM MODE
          </p>
          <p className="mt-3 text-xs text-white/80 leading-relaxed">
            ① 自由に機種を選んで
            <br />② 「あなたの理想のお店」を表示
            <br />③ 本格モードで実現に向けて経営開始
          </p>
        </section>

        <section className="pixel-panel p-4">
          <label className="text-xs text-white/70">
            あなたが店長のお店、名前は？
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={shop?.name ?? "例: 夢ホール◯◯店"}
              maxLength={20}
              className="block w-full mt-2 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
          </label>
          <button onClick={handleStart} className="pixel-btn w-full mt-4 text-xs">
            {shop ? "理想の機種を選ぶ" : "理想のお店を作る"}
          </button>
        </section>

        {/* 既存の理想の店サマリ */}
        {shop && score && (
          <section className="pixel-panel p-4">
            <p className="font-pixel text-[11px] text-pachi-cyan mb-2">
              現在の理想:「{shop.name}」
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-white/60">設置</span>
                <span className="text-white">
                  {totalMachines(shop)} 台 / {totalKinds(shop)} 機種
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">理想店レベル</span>
                <span className="font-pixel text-pachi-yellow">
                  {starRating(score.total)}{" "}
                  <span className="text-white/60">
                    ({score.total.toFixed(1)})
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">実現コスト</span>
                <span className="font-pixel text-pachi-pink">
                  ¥{cost.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/lite/view")}
                className="pixel-btn-secondary text-xs"
              >
                理想店を見る
              </button>
              <button
                onClick={handleReset}
                className="pixel-btn-secondary text-xs text-pachi-red"
              >
                リセット
              </button>
            </div>
          </section>
        )}

        <section className="px-1 text-[11px] text-white/40 leading-relaxed">
          <p>※ ここはあなたの夢を形にするモード。予算・台数の制約なし。</p>
          <p>※ 保存は端末内 (localStorage) のみ。</p>
        </section>
      </div>
    </div>
  );
}
