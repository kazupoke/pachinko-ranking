import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import { CapacityBar } from "../components/CapacityBar";
import { useGameStore } from "../stores/useGameStore";
import { SHOP_SERIES } from "../lib/shopSeries";
import {
  PLAY_COST,
  playMachine,
  todaysVisitableShops,
  type VisitableShop,
  type SettingValue,
  type PlayResult,
} from "../lib/visitGacha";
import type { Machine, Rarity } from "../lib/types";

const RARITY_COLOR: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
};
const RARITY_BORDER: Record<Rarity, string> = {
  N: "border-rarity-n",
  R: "border-rarity-r",
  SR: "border-rarity-sr",
  SSR: "border-rarity-ssr",
};

type Phase = "select-shop" | "in-shop" | "playing" | "result";

export function Gacha() {
  const user = useGameStore((s) => s.user);
  const addCash = useGameStore((s) => s.addCash);
  const addMachines = useGameStore((s) => s.addMachines);

  const shops = useMemo(() => todaysVisitableShops(SHOP_SERIES), []);
  const [phase, setPhase] = useState<Phase>("select-shop");
  const [selectedShop, setSelectedShop] = useState<VisitableShop | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<{
    machine: Machine;
    setting: SettingValue;
  } | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);

  const cash = user?.cash ?? 0;

  const handlePlay = (m: Machine, setting: SettingValue) => {
    if (!selectedShop) return;
    if (cash < PLAY_COST) return;
    addCash(-PLAY_COST);
    setSelectedMachine({ machine: m, setting });
    setPhase("playing");
    // 演出 1.8s
    setTimeout(() => {
      const r = playMachine(m, setting, selectedShop.payoutMult);
      setResult(r);
      if (r.drop) addMachines([{ machine: r.drop.machine }]);
      setPhase("result");
    }, 1800);
  };

  const goBackToShop = () => {
    setPhase("in-shop");
    setSelectedMachine(null);
    setResult(null);
  };

  const goBackToSelect = () => {
    setPhase("select-shop");
    setSelectedShop(null);
    setSelectedMachine(null);
    setResult(null);
  };

  return (
    <div>
      <PageHeader
        title="新台を狙う"
        subtitle={`他店訪問 → 台選び → 出玉勝負で機種ドロップ · 1プレイ ¥${PLAY_COST.toLocaleString()}`}
      />

      {/* 所持金 + 理想店進捗 */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2 text-xs">
        <div className="pixel-panel p-2 flex justify-between items-baseline">
          <span className="text-white/60">所持金</span>
          <span className="font-pixel text-pachi-yellow">
            ¥{cash.toLocaleString()}
          </span>
        </div>
        <div className="pixel-panel p-2 flex justify-between items-baseline">
          <span className="text-white/60">1プレイ</span>
          <span className="font-pixel text-pachi-pink">
            ¥{PLAY_COST.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="px-4">
        <DreamProgressMini />
      </div>

      {phase === "select-shop" && (
        <SelectShopView
          shops={shops}
          onSelect={(s) => {
            setSelectedShop(s);
            setPhase("in-shop");
          }}
        />
      )}

      {phase === "in-shop" && selectedShop && (
        <InShopView
          shop={selectedShop}
          cash={cash}
          onPlay={handlePlay}
          onBack={goBackToSelect}
        />
      )}

      {phase === "playing" && selectedMachine && (
        <PlayingOverlay machine={selectedMachine.machine} />
      )}

      {phase === "result" && result && selectedMachine && (
        <ResultModal
          machine={selectedMachine.machine}
          result={result}
          onAgain={goBackToShop}
          onLeave={goBackToSelect}
        />
      )}
    </div>
  );
}

// ============================================================
// 理想店進捗ミニ
// ============================================================

function DreamProgressMini() {
  const dream = useGameStore((s) => s.dreamMachines);
  const user = useGameStore((s) => s.user);
  const shop = useGameStore((s) => s.shop);
  const dreamIds = Object.keys(dream ?? {});
  if (dreamIds.length === 0) return null;
  const dreamTotal = Object.values(dream).reduce((a, b) => a + b, 0);
  const owned = user?.ownedMachines ?? {};
  const installed: Record<string, number> = {};
  for (const e of shop?.layout ?? []) installed[e.machineId] = e.count;
  let havingMachines = 0;
  let havingTypes = 0;
  for (const [mid, target] of Object.entries(dream)) {
    const total = (owned[mid] ?? 0) + (installed[mid] ?? 0);
    if (total > 0) havingTypes++;
    havingMachines += Math.min(total, target);
  }
  return (
    <div className="pixel-panel p-3 mb-3 border-2 border-pachi-pink">
      <p className="font-pixel text-[10px] text-pachi-pink mb-2">
        ★ 理想店への道
      </p>
      <CapacityBar
        label="目標機種"
        current={havingTypes}
        max={dreamIds.length}
        color="bg-pachi-pink"
      />
      <CapacityBar
        label="目標台数"
        current={havingMachines}
        max={dreamTotal}
        color="bg-pachi-yellow"
      />
    </div>
  );
}

// ============================================================
// 店舗選択
// ============================================================

function SelectShopView({
  shops,
  onSelect,
}: {
  shops: VisitableShop[];
  onSelect: (s: VisitableShop) => void;
}) {
  return (
    <div className="px-4 py-3 space-y-3">
      <p className="font-pixel text-[11px] text-pachi-cyan">
        本日の訪問先 (毎日 0 時に変わる)
      </p>
      {shops.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className={`pixel-panel w-full p-3 text-left flex items-center gap-3 border-2 hover:border-pachi-yellow`}
        >
          <span className="text-3xl shrink-0">{s.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-pixel text-xs text-white">{s.name}</p>
            <p className="text-[10px] text-pachi-yellow mt-0.5">{s.tagline}</p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {s.lineup.length} 機種 · 出玉倍率 ×{s.payoutMult.toFixed(2)}
            </p>
          </div>
          <span className="font-pixel text-pachi-yellow shrink-0">▶</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// 店内表示 (機種選択)
// ============================================================

function InShopView({
  shop,
  cash,
  onPlay,
  onBack,
}: {
  shop: VisitableShop;
  cash: number;
  onPlay: (m: Machine, setting: SettingValue) => void;
  onBack: () => void;
}) {
  const canPlay = cash >= PLAY_COST;
  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="text-[11px] text-white/60 underline"
        >
          ← 店舗一覧
        </button>
        <div className="text-[11px] text-pachi-yellow font-pixel">
          {shop.name} · 出玉倍率 ×{shop.payoutMult.toFixed(2)}
        </div>
      </div>
      <p className="text-[11px] text-white/70 mb-3 leading-relaxed">
        台をタップしてプレイ。出玉量に応じて新機種をドロップ。
        <br />
        高設定の店ほど出玉が出やすい (= 良いドロップ確率↑)
      </p>
      <ul className="space-y-2">
        {shop.lineup.map(({ machine: m, setting }) => (
          <li
            key={m.id}
            className="pixel-panel p-2 flex items-center gap-3 border-2 border-bg-card"
          >
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
                {m.maker} · {m.releaseYear}
              </p>
              <p
                className={`text-[10px] font-pixel mt-0.5 ${RARITY_COLOR[m.rarity]}`}
              >
                {m.rarity} · 設定{" "}
                <span
                  className={
                    setting >= 5
                      ? "text-pachi-red"
                      : setting >= 4
                        ? "text-pachi-green"
                        : setting >= 3
                          ? "text-pachi-cyan"
                          : "text-white/50"
                  }
                >
                  {setting}
                </span>
              </p>
            </div>
            <button
              onClick={() => onPlay(m, setting)}
              disabled={!canPlay}
              className="pixel-btn text-[11px] py-2 px-3 disabled:opacity-30"
            >
              ▶ 遊ぶ
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// プレイ中演出
// ============================================================

function PlayingOverlay({ machine }: { machine: Machine }) {
  return (
    <div className="fixed inset-0 z-40 gacha-stage flex items-center justify-center">
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
      <div className="relative flex flex-col items-center">
        <div className="w-48 h-32 bg-bg-base border-4 border-pachi-yellow flex items-center justify-center relative overflow-hidden">
          {/* 3 リール */}
          <div className="flex gap-1 px-2 py-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-12 h-24 bg-white border-2 border-black flex items-center justify-center font-pixel text-2xl text-bg-base animate-rolling-pulse"
                style={{ animationDuration: "0.4s", animationDelay: `${i * 0.1}s` }}
              >
                {["7", "★", "♦"][i]}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 font-pixel text-pachi-yellow animate-blink">
          {machine.name}
        </p>
        <p className="mt-1 font-pixel text-[10px] text-white/60">
          演出中...
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 結果モーダル
// ============================================================

function ResultModal({
  machine,
  result,
  onAgain,
  onLeave,
}: {
  machine: Machine;
  result: PlayResult;
  onAgain: () => void;
  onLeave: () => void;
}) {
  const titleColor =
    result.outcome === "big"
      ? "text-pachi-yellow"
      : result.outcome === "medium"
        ? "text-pachi-pink"
        : result.outcome === "small"
          ? "text-pachi-cyan"
          : "text-white/40";
  const titleText =
    result.outcome === "big"
      ? "★ 大当たり! ★"
      : result.outcome === "medium"
        ? "中当たり"
        : result.outcome === "small"
          ? "小当たり"
          : "ハズレ";
  return (
    <div className="fixed inset-0 z-30 gacha-stage overflow-y-auto pb-6">
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
      <div className="relative px-4 pt-6 max-w-md mx-auto">
        <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest text-center">
          PLAYED · {machine.name}
        </p>
        <h2
          className={`mt-2 font-pixel text-2xl text-center ${titleColor} ${result.outcome === "big" ? "animate-blink" : ""}`}
        >
          {titleText}
        </h2>
        <p className="mt-3 text-center font-pixel text-3xl text-pachi-yellow">
          {result.coins.toLocaleString()} 枚
        </p>

        {/* ドロップ */}
        {result.drop ? (
          <div className="mt-6">
            <p className="font-pixel text-[11px] text-pachi-pink text-center mb-2">
              ★ 新機種を獲得! ★
            </p>
            <div
              className={`pixel-panel border-2 ${RARITY_BORDER[result.drop.rarity]} overflow-hidden ${result.drop.rarity === "SSR" ? "animate-ssr-glow" : ""}`}
            >
              <div className="aspect-[2/3] bg-bg-base">
                <MachineThumb
                  machineId={result.drop.machine.id}
                  name={result.drop.machine.name}
                  rarity={result.drop.rarity}
                  size={96}
                  className="w-full h-full"
                />
              </div>
              <div className="bg-black/70 px-2 py-2 text-center">
                <p
                  className={`font-pixel text-xs ${RARITY_COLOR[result.drop.rarity]}`}
                >
                  {result.drop.rarity}
                </p>
                <p className="font-dot text-xs text-white mt-1 truncate">
                  {result.drop.machine.name}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-center text-[11px] text-white/50">
            出玉が足りずドロップなし。次は当てよう!
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onLeave} className="pixel-btn-secondary text-xs">
            店を出る
          </button>
          <button onClick={onAgain} className="pixel-btn text-xs">
            もう一度遊ぶ
          </button>
        </div>
      </div>
    </div>
  );
}
