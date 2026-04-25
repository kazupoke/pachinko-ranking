import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiteStore, totalMachines, totalKinds } from "../../stores/useLiteStore";
import { PageHeader } from "../../components/PageHeader";

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

  return (
    <div>
      <PageHeader
        title="ライトモード"
        subtitle="機種を選ぶだけで P-World 風お店ページを作成"
      />
      <div className="px-4 py-5 flex flex-col gap-5">
        <section className="pixel-panel p-4">
          <label className="text-xs text-white/70">
            店名
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={shop?.name ?? "例: ドット通り店"}
              maxLength={20}
              className="block w-full mt-2 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
          </label>
          <button onClick={handleStart} className="pixel-btn w-full mt-4 text-xs">
            {shop ? "機種を選ぶ" : "お店を作る"}
          </button>
        </section>

        {shop && (
          <section className="pixel-panel p-4">
            <p className="font-pixel text-[11px] text-pachi-cyan">{shop.name}</p>
            <p className="mt-2 text-[11px] text-white/60">
              設置 {totalMachines(shop)} 台 / {totalKinds(shop)} 機種
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/lite/view")}
                className="pixel-btn-secondary text-xs"
              >
                ページを見る
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
          <p>※ ライトモードは経営シミュ無し。機種を選ぶだけで P-World 風のお店一覧ページが作れます。</p>
          <p>※ 保存は端末内 (localStorage) のみ。</p>
        </section>
      </div>
    </div>
  );
}
