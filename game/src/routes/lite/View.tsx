import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiteStore, totalMachines, totalKinds } from "../../stores/useLiteStore";
import { MACHINES_BY_ID } from "../../data/machines";
import type { Machine, Rarity } from "../../lib/types";

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

  const handleShare = async () => {
    const text = `【${shop.name}】設置 ${totalCount}台 / ${kindCount}機種\n#マイパチ店`;
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

  return (
    <div className="pb-6">
      {/* P-World 風ヘッダ */}
      <div className="bg-pachi-red text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-pixel text-[10px] text-white/80">PACHINKO SHOP</p>
          <h1 className="font-pixel text-sm leading-tight">{shop.name}</h1>
        </div>
        <div className="text-right">
          <p className="font-pixel text-[10px] text-white/80">設置台数</p>
          <p className="font-pixel text-sm">
            {totalCount} <span className="text-[10px]">台</span>
          </p>
        </div>
      </div>

      {/* P-World 風テーブル本体 */}
      <div className="mx-3 mt-3">
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

      {/* アクション */}
      <div className="px-4 mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/lite/build")}
          className="pixel-btn-secondary text-xs"
        >
          機種を編集
        </button>
        <button
          onClick={() => navigate("/lite")}
          className="pixel-btn-secondary text-xs"
        >
          お店設定
        </button>
        <button
          onClick={handleShare}
          className="pixel-btn text-xs col-span-2"
          disabled={rows.length === 0}
        >
          シェアする
        </button>
      </div>
    </div>
  );
}
