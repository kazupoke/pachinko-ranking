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
import { pullSingle, pullTen, type PullResult } from "../lib/gacha";
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

const DAILY_VISIT_LIMIT = 5; // 1 日あたり 5 回まで遊戯可能
const GACHA_SINGLE_COST = 500; // 貯玉
const GACHA_TEN_COST = 4500; // 貯玉

type Tab = "play" | "gacha";
type Phase = "select-shop" | "in-shop" | "playing" | "result" | "gacha-rolling" | "gacha-result";

export function Gacha() {
  const cash = useGameStore((s) => s.user?.cash ?? 0);
  const chodama = useGameStore((s) => s.chodama);
  const dailyVisits = useGameStore((s) => s.dailyVisits);
  const dailyVisitsResetDate = useGameStore((s) => s.dailyVisitsResetDate);
  const addCash = useGameStore((s) => s.addCash);
  const addChodama = useGameStore((s) => s.addChodama);
  const spendChodama = useGameStore((s) => s.spendChodama);
  const recordVisit = useGameStore((s) => s.recordVisit);
  const addMachines = useGameStore((s) => s.addMachines);
  const withdrawFromMarket = useGameStore((s) => s.withdrawFromMarket);

  // 日付チェック (リセット用)
  const today = new Date().toISOString().slice(0, 10);
  const visitsToday = dailyVisitsResetDate === today ? dailyVisits : 0;

  const shops = useMemo(() => todaysVisitableShops(SHOP_SERIES), []);
  const [tab, setTab] = useState<Tab>("play");
  const [phase, setPhase] = useState<Phase>("select-shop");
  const [selectedShop, setSelectedShop] = useState<VisitableShop | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<{
    machine: Machine;
    setting: SettingValue;
  } | null>(null);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);

  const handlePlay = (m: Machine, setting: SettingValue) => {
    if (!selectedShop) return;
    if (cash < PLAY_COST) return;
    if (visitsToday >= DAILY_VISIT_LIMIT) return;
    addCash(-PLAY_COST);
    setSelectedMachine({ machine: m, setting });
    setPhase("playing");
    setTimeout(() => {
      const r = playMachine(m, setting, selectedShop.payoutMult);
      setResult(r);
      // 出玉を 貯玉 に貯める (機種ドロップは無し)
      if (r.coins > 0) addChodama(r.coins);
      recordVisit();
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

  const handlePullSingle = () => {
    if (!spendChodama(GACHA_SINGLE_COST)) return;
    const r = pullSingle();
    if (!r) return;
    setPullResults([r]);
    addMachines([r]);
    withdrawFromMarket(r.machine.id, 1);
    setPhase("gacha-rolling");
    setTimeout(() => setPhase("gacha-result"), 1200);
  };

  const handlePullTen = () => {
    if (!spendChodama(GACHA_TEN_COST)) return;
    const rs = pullTen();
    setPullResults(rs);
    addMachines(rs);
    rs.forEach((r) => withdrawFromMarket(r.machine.id, 1));
    setPhase("gacha-rolling");
    setTimeout(() => setPhase("gacha-result"), 1500);
  };

  const dismissGacha = () => {
    setPhase("select-shop");
    setPullResults([]);
  };

  return (
    <div>
      <PageHeader
        title="新台 / 貯玉"
        subtitle={`貯玉 ${chodama.toLocaleString()} 玉 · 本日訪問 ${visitsToday}/${DAILY_VISIT_LIMIT}`}
      />

      {/* 残高サマリ */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-xs">
        <div className="pixel-panel p-2 flex flex-col">
          <span className="text-[9px] text-white/60">所持金</span>
          <span className="font-pixel text-pachi-yellow">
            ¥{cash.toLocaleString()}
          </span>
        </div>
        <div className="pixel-panel p-2 flex flex-col border-2 border-pachi-cyan">
          <span className="text-[9px] text-white/60">貯玉</span>
          <span className="font-pixel text-pachi-cyan">
            {chodama.toLocaleString()} 玉
          </span>
        </div>
        <div className="pixel-panel p-2 flex flex-col">
          <span className="text-[9px] text-white/60">本日訪問</span>
          <span className="font-pixel text-pachi-pink">
            {visitsToday}/{DAILY_VISIT_LIMIT}
          </span>
        </div>
      </div>

      <div className="px-4">
        <DreamProgressMini />
      </div>

      {/* タブ切り替え */}
      <div className="px-4 mt-2 flex gap-1">
        <button
          onClick={() => setTab("play")}
          className={`flex-1 py-2 font-dot text-xs border-2 ${
            tab === "play"
              ? "bg-pachi-red border-pachi-red text-white"
              : "bg-bg-panel border-bg-card text-white/60"
          }`}
        >
          🎰 訪問プレイ (貯玉を貯める)
        </button>
        <button
          onClick={() => setTab("gacha")}
          className={`flex-1 py-2 font-dot text-xs border-2 ${
            tab === "gacha"
              ? "bg-pachi-cyan border-pachi-cyan text-bg-base"
              : "bg-bg-panel border-bg-card text-white/60"
          }`}
        >
          🎁 貯玉ガチャ
        </button>
      </div>

      {tab === "play" && (
        <>
          {phase === "select-shop" && (
            <SelectShopView
              shops={shops}
              onSelect={(s) => {
                setSelectedShop(s);
                setPhase("in-shop");
              }}
              visitsToday={visitsToday}
              limit={DAILY_VISIT_LIMIT}
            />
          )}
          {phase === "in-shop" && selectedShop && (
            <InShopView
              shop={selectedShop}
              cash={cash}
              visitsLeft={DAILY_VISIT_LIMIT - visitsToday}
              onPlay={handlePlay}
              onBack={goBackToSelect}
            />
          )}
          {phase === "playing" && selectedMachine && (
            <PlayingOverlay machine={selectedMachine.machine} />
          )}
          {phase === "result" && result && selectedMachine && (
            <PlayResultModal
              machine={selectedMachine.machine}
              result={result}
              onAgain={goBackToShop}
              onLeave={goBackToSelect}
            />
          )}
        </>
      )}

      {tab === "gacha" && (
        <GachaPullView
          chodama={chodama}
          singleCost={GACHA_SINGLE_COST}
          tenCost={GACHA_TEN_COST}
          phase={phase}
          results={pullResults}
          onSingle={handlePullSingle}
          onTen={handlePullTen}
          onClose={dismissGacha}
        />
      )}
    </div>
  );
}

// ============================================================
// 理想店進捗
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
// 訪問: 店舗選択
// ============================================================

function SelectShopView({
  shops,
  onSelect,
  visitsToday,
  limit,
}: {
  shops: VisitableShop[];
  onSelect: (s: VisitableShop) => void;
  visitsToday: number;
  limit: number;
}) {
  const remaining = limit - visitsToday;
  return (
    <div className="px-4 py-3 space-y-3">
      <p className="font-pixel text-[11px] text-pachi-cyan">
        本日の訪問先 (残り {remaining}/{limit} 回)
      </p>
      {remaining <= 0 && (
        <p className="text-[11px] text-pachi-red">
          ⚠ 本日の訪問回数を使い切りました。明日また訪問してください。
        </p>
      )}
      {shops.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          disabled={remaining <= 0}
          className="pixel-panel w-full p-3 text-left flex items-center gap-3 border-2 hover:border-pachi-yellow disabled:opacity-30"
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
// 訪問: 店内表示
// ============================================================

function InShopView({
  shop,
  cash,
  visitsLeft,
  onPlay,
  onBack,
}: {
  shop: VisitableShop;
  cash: number;
  visitsLeft: number;
  onPlay: (m: Machine, setting: SettingValue) => void;
  onBack: () => void;
}) {
  const canPlay = cash >= PLAY_COST && visitsLeft > 0;
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
          {shop.name} · 残り {visitsLeft} 回
        </div>
      </div>
      <p className="text-[11px] text-white/70 mb-3 leading-relaxed">
        台をタップして 1 プレイ ¥{PLAY_COST.toLocaleString()}。
        <br />
        出玉が <span className="text-pachi-cyan">貯玉</span> に貯まる
        (換金不可)。
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
        <p className="mt-1 font-pixel text-[10px] text-white/60">演出中...</p>
      </div>
    </div>
  );
}

// ============================================================
// 訪問結果モーダル
// ============================================================

function PlayResultModal({
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
          {result.coins.toLocaleString()} 玉 獲得
        </p>
        <p className="mt-2 text-center text-[11px] text-pachi-cyan">
          → 貯玉に追加されました
        </p>
        <p className="mt-1 text-center text-[10px] text-white/60">
          貯玉でガチャを引いて新機種を獲得しよう
        </p>

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

// ============================================================
// 貯玉ガチャ
// ============================================================

function GachaPullView({
  chodama,
  singleCost,
  tenCost,
  phase,
  results,
  onSingle,
  onTen,
  onClose,
}: {
  chodama: number;
  singleCost: number;
  tenCost: number;
  phase: Phase;
  results: PullResult[];
  onSingle: () => void;
  onTen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="pixel-panel p-3 border-2 border-pachi-cyan">
        <p className="font-pixel text-[10px] text-pachi-cyan mb-1">
          貯玉でガチャ
        </p>
        <p className="text-[11px] text-white/70 leading-relaxed">
          訪問で貯めた{" "}
          <span className="font-pixel text-pachi-cyan">
            {chodama.toLocaleString()} 玉
          </span>{" "}
          を使って機種を獲得。
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={onSingle}
          disabled={chodama < singleCost}
          className="pixel-btn-secondary py-4 text-xs disabled:opacity-30"
        >
          単発
          <br />
          <span className="text-[10px] text-pachi-cyan">
            {singleCost.toLocaleString()} 玉
          </span>
        </button>
        <button
          onClick={onTen}
          disabled={chodama < tenCost}
          className="pixel-btn py-4 text-xs disabled:opacity-30"
        >
          10連
          <br />
          <span className="text-[10px] text-white">
            {tenCost.toLocaleString()} 玉
          </span>
        </button>
      </div>

      <p className="mt-3 text-[10px] text-white/50 text-center">
        SR 以上 1 枠保証 (10 連時)
      </p>

      {phase === "gacha-rolling" && (
        <div className="fixed inset-0 z-40 gacha-stage flex items-center justify-center">
          <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
          <div className="relative">
            <div
              className="w-32 h-44 rainbow-gradient animate-rainbow-bg shadow-pixel border-4 border-black flex items-center justify-center animate-rolling-pulse"
              style={{ animationDuration: "0.6s" }}
            >
              <span className="font-pixel text-3xl text-white">?</span>
            </div>
            <p className="mt-4 text-center font-pixel text-pachi-yellow animate-blink">
              ROLLING...
            </p>
          </div>
        </div>
      )}

      {phase === "gacha-result" && results.length > 0 && (
        <div className="fixed inset-0 z-30 gacha-stage overflow-y-auto pb-6">
          <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
          <div className="relative px-4 pt-6 max-w-md mx-auto">
            <p className="font-pixel text-[10px] text-pachi-cyan text-center">
              GACHA RESULT
            </p>
            <h2 className="mt-2 font-pixel text-xl text-center">
              <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
                {results.length}機種 獲得！
              </span>
            </h2>
            <div
              className={`mt-4 grid gap-2 ${results.length >= 5 ? "grid-cols-5" : "grid-cols-1 max-w-xs mx-auto"}`}
            >
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`relative pixel-panel overflow-hidden border-2 ${RARITY_BORDER[r.rarity]} ${
                    r.rarity === "SSR" ? "animate-ssr-glow" : ""
                  }`}
                >
                  <div className="aspect-[2/3] bg-bg-base">
                    <MachineThumb
                      machineId={r.machine.id}
                      name={r.machine.name}
                      rarity={r.rarity}
                      size={results.length >= 5 ? 48 : 96}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="bg-black/70 px-1 py-0.5 text-center">
                    <span className={`font-pixel text-[9px] ${RARITY_COLOR[r.rarity]}`}>
                      {r.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="pixel-btn w-full mt-6 text-xs py-3"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
