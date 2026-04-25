/**
 * 設置機種一覧 (P-World 風 白テーブル)
 * - /collection (パチスロ) と他で共通利用
 */
import { useGameStore } from "../stores/useGameStore";
import { MACHINES_BY_ID } from "../data/machines";
import type { Rarity } from "../lib/types";

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};

interface Props {
  className?: string;
}

export function LineupTable({ className = "" }: Props) {
  const shop = useGameStore((s) => s.shop);
  const user = useGameStore((s) => s.user);
  const installMachine = useGameStore((s) => s.installMachine);
  const uninstall = useGameStore((s) => s.uninstallMachine);
  if (!shop) return null;
  if (shop.layout.length === 0) {
    return (
      <div className={`px-4 py-6 text-center text-[11px] text-white/50 ${className}`}>
        まだ台が設置されていません
      </div>
    );
  }
  const sortedLayout = [...shop.layout].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const ma = MACHINES_BY_ID[a.machineId];
    const mb = MACHINES_BY_ID[b.machineId];
    if (!ma || !mb) return 0;
    return mb.releaseYear - ma.releaseYear;
  });
  return (
    <div className={`bg-white text-black font-dot border-2 border-black ${className}`}>
      <div className="bg-black text-white px-3 py-2 flex justify-between text-xs">
        <span>{shop.name}</span>
        <span className="text-pachi-yellow">設置機種一覧</span>
      </div>
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
                  <span className="block text-[10px] text-gray-500 mt-0.5 sm:hidden">
                    {m.maker}
                  </span>
                  <div className="mt-0.5 flex gap-1 items-center">
                    <span className={`text-[9px] ${RARITY_COLOR[m.rarity]} font-pixel`}>
                      {m.rarity}
                    </span>
                    <span
                      className={`text-[9px] font-pixel px-1 ${settingBg} text-gray-800`}
                      title="設定値"
                    >
                      設{setting}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-gray-600 align-top hidden sm:table-cell">
                  {m.maker}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => uninstall(entry.machineId, 1)}
                      className="w-6 h-6 font-pixel text-[10px] bg-gray-200 border border-gray-400 text-gray-700"
                    >
                      −
                    </button>
                    <span className="font-pixel text-xs w-7 text-center">
                      {entry.count}
                    </span>
                    <button
                      onClick={() => installMachine(entry.machineId, 1)}
                      disabled={!canAdd}
                      className="w-6 h-6 font-pixel text-[10px] bg-pachi-red border border-pachi-red text-white disabled:opacity-30"
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
                    onClick={() => uninstall(entry.machineId, entry.count)}
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
  );
}
