import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { MachineThumb } from "../../components/MachineThumb";
import { useGameStore } from "../../stores/useGameStore";
import { MACHINES_BY_ID } from "../../data/machines";
import {
  ALL_SETTINGS,
  payoutRate,
  attractFactor,
  settingColor,
  type SettingValue,
} from "../../lib/setting";
import type { Rarity } from "../../lib/types";

const RARITY_ORDER: Rarity[] = ["SSR", "SR", "R", "N"];

export function Settings() {
  const navigate = useNavigate();
  const shop = useGameStore((s) => s.shop);
  const setMachineSetting = useGameStore((s) => s.setMachineSetting);

  const layout = useMemo(() => {
    if (!shop) return [];
    return [...shop.layout].sort((a, b) => {
      const ma = MACHINES_BY_ID[a.machineId];
      const mb = MACHINES_BY_ID[b.machineId];
      if (!ma || !mb) return 0;
      const r =
        RARITY_ORDER.indexOf(ma.rarity) - RARITY_ORDER.indexOf(mb.rarity);
      if (r !== 0) return r;
      return mb.releaseYear - ma.releaseYear;
    });
  }, [shop?.layout]);

  if (!shop || layout.length === 0) {
    return (
      <div className="pb-6">
        <PageHeader title="設定変更" subtitle="台ごとに設定を変更" />
        <div className="px-4 pt-2">
          <button
            onClick={() => navigate("/manager")}
            className="text-[11px] text-white/60 underline"
          >
            ← 店長メニューに戻る
          </button>
        </div>
        <div className="mx-4 mt-4 pixel-panel p-4 text-center text-[11px] text-white/60">
          台が設置されていません
        </div>
      </div>
    );
  }

  // 平均設定 (簡易: 全台の単純平均)
  const totalCount = layout.reduce((s, e) => s + e.count, 0);
  const settingSum = layout.reduce(
    (s, e) => s + (e.setting ?? 1) * e.count,
    0
  );
  const avgSetting = totalCount > 0 ? settingSum / totalCount : 1;

  return (
    <div className="pb-6">
      <PageHeader
        title="設定変更"
        subtitle={`台ごとに 1-6 の設定。平均 ${avgSetting.toFixed(2)}`}
      />

      <div className="px-4 pt-2">
        <button
          onClick={() => navigate("/manager")}
          className="text-[11px] text-white/60 underline"
        >
          ← 店長メニューに戻る
        </button>
      </div>

      <div className="px-4 mt-3">
        <div className="pixel-panel p-2 text-[10px]">
          <p className="font-pixel text-pachi-cyan mb-1">設定の効果</p>
          <ul className="text-white/70 space-y-0.5">
            <li>・高設定 (4-6): 客付き UP / 機械割 100% 超 = 店マイナス</li>
            <li>・低設定 (1-3): 客付き DOWN / 機械割 100% 未満 = 店プラス</li>
            <li>・連続低設定で常連離れ、高設定で常連増 (実装中)</li>
          </ul>
        </div>
      </div>

      <ul className="px-4 mt-3 space-y-2">
        {layout.map((entry) => {
          const m = MACHINES_BY_ID[entry.machineId];
          if (!m) return null;
          const cur = (entry.setting ?? 1) as SettingValue;
          return (
            <li key={entry.machineId} className="pixel-panel p-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 shrink-0 border border-bg-card">
                  <MachineThumb
                    machineId={m.id}
                    name={m.name}
                    rarity={m.rarity}
                    size={48}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{m.name}</p>
                  <p className="text-[10px] text-white/50 mt-0.5 truncate">
                    {m.maker} · 台数 ×{entry.count}
                  </p>
                  <p className="text-[10px] mt-0.5">
                    現在:{" "}
                    <span className={`font-pixel ${settingColor(cur)}`}>
                      設定 {cur}
                    </span>
                    <span className="text-white/40">
                      {" "}
                      (機械割 {payoutRate(m.rarity, cur).toFixed(1)}% / 客付 ×
                      {attractFactor(cur).toFixed(2)})
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-6 gap-1">
                {ALL_SETTINGS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setMachineSetting(m.id, s)}
                    className={`py-1.5 font-pixel text-xs border-2 ${
                      cur === s
                        ? "bg-pachi-pink border-pachi-pink text-white"
                        : "bg-bg-base border-bg-card text-white/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
