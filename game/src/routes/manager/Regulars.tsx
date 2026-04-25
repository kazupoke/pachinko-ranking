import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useGameStore } from "../../stores/useGameStore";
import { MACHINES_BY_ID } from "../../data/machines";
import {
  CATEGORY_LABELS,
  categoryColor,
  regularRank,
  type CustomerCategory,
} from "../../lib/customer";

export function Regulars() {
  const navigate = useNavigate();
  const regulars = useGameStore((s) => s.regulars);

  const sorted = useMemo(
    () => [...regulars].sort((a, b) => b.level - a.level),
    [regulars]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, typeof regulars> = {};
    for (const r of regulars) {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r);
    }
    return map;
  }, [regulars]);

  return (
    <div className="pb-6">
      <PageHeader
        title="抱え込み常連"
        subtitle={`現在 ${regulars.length} 名 / 最大 50 名`}
      />

      <div className="px-4 pt-2">
        <button
          onClick={() => navigate("/manager")}
          className="text-[11px] text-white/60 underline"
        >
          ← 店長メニューに戻る
        </button>
      </div>

      {/* カテゴリ別サマリ */}
      <div className="px-4 mt-3">
        <div className="pixel-panel p-3">
          <p className="font-pixel text-[10px] text-pachi-cyan mb-2">
            カテゴリ別
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const arr = byCategory[key] ?? [];
              return (
                <div
                  key={key}
                  className="bg-bg-base border border-bg-card px-2 py-1.5"
                >
                  <p
                    className={`font-pixel text-[10px] ${categoryColor(
                      key as CustomerCategory
                    )}`}
                  >
                    {label}
                  </p>
                  <p className="text-pachi-yellow font-pixel mt-0.5">
                    {arr.length} 名
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="mx-4 mt-4 pixel-panel p-4 text-center text-[11px] text-white/60">
          まだ常連はいません
          <br />
          <span className="text-[10px] text-white/40">
            (台を設置して客が来店すると常連になります)
          </span>
        </div>
      ) : (
        <ul className="px-4 mt-3 space-y-2">
          {sorted.map((r) => {
            const m = MACHINES_BY_ID[r.favoriteMachineId];
            return (
              <li key={r.id} className="pixel-panel p-3">
                <div className="flex items-baseline justify-between">
                  <p
                    className={`font-pixel text-xs ${categoryColor(
                      r.category as CustomerCategory
                    )}`}
                  >
                    {CATEGORY_LABELS[r.category as CustomerCategory] ?? r.category}
                  </p>
                  <span className="font-pixel text-[10px] text-pachi-yellow">
                    {regularRank(r.level)} (Lv.{r.level})
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-white/80">
                  好きな台:{" "}
                  <span className="text-pachi-cyan">
                    {m ? m.name : r.favoriteMachineId}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-white/50">
                  <span>来店 {r.visits} 回</span>
                  <span>最終: {r.lastVisitAt.slice(0, 10)}</span>
                </div>
                {/* レベルバー */}
                <div className="mt-2 h-1.5 bg-bg-base border border-bg-card overflow-hidden">
                  <div
                    className="bg-pachi-pink h-full"
                    style={{ width: `${r.level}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
