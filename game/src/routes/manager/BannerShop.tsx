import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useGameStore } from "../../stores/useGameStore";
import { BANNERS } from "../../data/banners";
import { BannerImage } from "../../components/BannerImage";

export function BannerShop() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);
  const shop = useGameStore((s) => s.shop);
  const ownedBanners = useGameStore((s) => s.ownedBanners);
  const activeBannerId = useGameStore((s) => s.activeBannerId);
  const buyBanner = useGameStore((s) => s.buyBanner);
  const setActiveBanner = useGameStore((s) => s.setActiveBanner);

  const [msg, setMsg] = useState<string | null>(null);
  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 2000);
  };

  const shopName = shop?.name ?? "マイパチ店";

  const handleBuy = (id: string, price: number) => {
    const r = buyBanner(id, price);
    if (!r.ok) {
      if (r.reason === "no-cash") flash("所持金が足りません");
      else if (r.reason === "already-owned") flash("既に所持しています");
      else flash("購入できませんでした");
      return;
    }
    flash(`購入完了！ -¥${price.toLocaleString()}`);
    // 自動で適用
    setActiveBanner(id);
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="看板を買う"
        subtitle={`所持金 ¥${(user?.cash ?? 0).toLocaleString()}`}
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

      <ul className="px-3 mt-3 space-y-3">
        {BANNERS.map((b) => {
          const owned = ownedBanners.includes(b.id);
          const isActive = activeBannerId === b.id;
          const canAfford = (user?.cash ?? 0) >= b.price;
          return (
            <li
              key={b.id}
              className={`pixel-panel overflow-hidden border-2 ${
                isActive ? "border-pachi-yellow" : "border-bg-card"
              }`}
            >
              {/* プレビュー */}
              <div className="bg-bg-base">
                <BannerImage banner={b} shopName={shopName} />
              </div>

              {/* 情報 */}
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-pixel text-xs text-white">{b.name}</p>
                  {isActive && (
                    <span className="font-pixel text-[9px] text-pachi-yellow border border-pachi-yellow px-1">
                      使用中
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/60 mt-1">{b.tagline}</p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-pixel text-[11px] text-pachi-yellow">
                    {b.price === 0 ? "無料" : `¥${b.price.toLocaleString()}`}
                  </span>
                  {owned ? (
                    isActive ? (
                      <span className="text-[10px] text-pachi-green">適用中</span>
                    ) : (
                      <button
                        onClick={() => setActiveBanner(b.id)}
                        className="pixel-btn-secondary text-[11px] px-3 py-1"
                      >
                        選択
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleBuy(b.id, b.price)}
                      disabled={!canAfford}
                      className="pixel-btn text-[11px] px-3 py-1 disabled:opacity-40"
                    >
                      {canAfford ? "購入" : "資金不足"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
