import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { MachineThumb } from "../components/MachineThumb";
import { CapacityBar } from "../components/CapacityBar";
import { useGameStore } from "../stores/useGameStore";
import {
  GACHA_COST_SINGLE,
  GACHA_COST_TEN,
  pullSingle,
  pullTen,
  type PullResult,
} from "../lib/gacha";
import type { Rarity } from "../lib/types";

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

const RARITY_RANK: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3 };

const ROLL_MS = 1500;
const REVEAL_INTERVAL_MS = 220;

type Phase = "idle" | "rolling" | "revealing" | "done";

export function Gacha() {
  const user = useGameStore((s) => s.user);
  const addCash = useGameStore((s) => s.addCash);
  const addMachines = useGameStore((s) => s.addMachines);
  const bumpPity = useGameStore((s) => s.bumpPity);
  const resetPity = useGameStore((s) => s.resetPity);
  const pity = useGameStore((s) => s.gachaPity);

  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<PullResult[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);

  // 自動進行用タイマーをクリーンに管理
  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const setT = (cb: () => void, ms: number) => {
    const id = window.setTimeout(cb, ms);
    timersRef.current.push(id);
  };

  const doPull = (count: 1 | 10) => {
    if (phase === "rolling" || phase === "revealing") return;
    const cost = count === 1 ? GACHA_COST_SINGLE : GACHA_COST_TEN;
    if (!user || user.cash < cost) return;

    addCash(-cost);
    setResults([]);
    setRevealedCount(0);
    setPhase("rolling");

    const pulls =
      count === 1
        ? ([pullSingle()].filter(Boolean) as PullResult[])
        : pullTen();

    setT(() => {
      const hasSsr = pulls.some((p) => p.rarity === "SSR");
      if (hasSsr) resetPity();
      else bumpPity(pulls.length);
      addMachines(pulls);
      setResults(pulls);
      setPhase("revealing");
      // 順番にカードをめくる
      pulls.forEach((_, i) => {
        setT(() => setRevealedCount(i + 1), i * REVEAL_INTERVAL_MS);
      });
      // 全部めくり終わったら done
      setT(() => setPhase("done"), pulls.length * REVEAL_INTERVAL_MS + 400);
    }, ROLL_MS);
  };

  const dismissResults = () => {
    setPhase("idle");
    setResults([]);
    setRevealedCount(0);
  };

  const isSpinning = phase === "rolling" || phase === "revealing";
  const maxRarity = results.reduce<Rarity>(
    (acc, r) => (RARITY_RANK[r.rarity] > RARITY_RANK[acc] ? r.rarity : acc),
    "N"
  );

  return (
    <div className="relative">
      <PageHeader
        title="ガチャ"
        subtitle="機種を引き当てて自分のお店に設置しよう"
      />

      <div className="px-4 py-4">
        <div className="pixel-panel p-3 flex justify-between text-xs">
          <span className="text-white/60">所持金</span>
          <span className="font-pixel text-pachi-yellow">
            ¥{(user?.cash ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="pixel-panel p-3 flex justify-between text-xs mt-2">
          <span className="text-white/60">天井カウント</span>
          <span className="font-pixel text-pachi-cyan">{pity} / 200</span>
        </div>

        {/* 理想店進捗 */}
        <DreamProgress />
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => doPull(1)}
          disabled={isSpinning || !user || user.cash < GACHA_COST_SINGLE}
          className="pixel-btn-secondary py-4 text-xs disabled:opacity-40"
        >
          単発
          <br />
          <span className="text-[10px] text-pachi-yellow">
            ¥{GACHA_COST_SINGLE.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => doPull(10)}
          disabled={isSpinning || !user || user.cash < GACHA_COST_TEN}
          className="pixel-btn py-4 text-xs disabled:opacity-40"
        >
          10連
          <br />
          <span className="text-[10px] text-white">
            ¥{GACHA_COST_TEN.toLocaleString()}
          </span>
        </button>
      </div>

      <div className="px-4 mt-4 grid grid-cols-4 gap-2 text-[10px] text-center">
        {(["SSR", "SR", "R", "N"] as Rarity[]).map((r) => (
          <div key={r} className="pixel-panel p-2">
            <p className={`font-pixel ${RARITY_COLOR[r]}`}>{r}</p>
            <p className="text-white/70 mt-1">
              {r === "SSR" ? "1%" : r === "SR" ? "6%" : r === "R" ? "23%" : "70%"}
            </p>
          </div>
        ))}
      </div>

      {/* === ガチャ演出オーバーレイ === */}
      {phase === "rolling" && <RollingOverlay />}

      {phase !== "idle" && results.length > 0 && (
        <ResultStage
          results={results}
          revealedCount={revealedCount}
          done={phase === "done"}
          maxRarity={maxRarity}
          onClose={dismissResults}
          onAgain={() => doPull(results.length === 1 ? 1 : 10)}
        />
      )}
    </div>
  );
}

// ============================================================
// ガチャ演出: ロール中の全画面オーバーレイ
// ============================================================

function RollingOverlay() {
  return (
    <div className="fixed inset-0 z-40 gacha-stage flex items-center justify-center">
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
      {/* 中央リール */}
      <div className="relative perspective-card">
        <div
          className="w-32 h-44 sm:w-40 sm:h-56 rainbow-gradient animate-rainbow-bg shadow-pixel border-4 border-black flex items-center justify-center animate-rolling-pulse"
          style={{ animationDuration: "0.8s" }}
        >
          <span className="font-pixel text-2xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
            ?
          </span>
        </div>
        {/* スパークル */}
        <Sparkle className="absolute -top-3 -left-3" delay="0s" />
        <Sparkle className="absolute -top-2 -right-3" delay="0.3s" />
        <Sparkle className="absolute -bottom-2 -left-2" delay="0.6s" />
        <Sparkle className="absolute -bottom-3 -right-3" delay="0.9s" />
      </div>
      <p className="absolute bottom-24 left-1/2 -translate-x-1/2 font-pixel text-sm text-pachi-yellow animate-blink">
        ROLLING...
      </p>
    </div>
  );
}

function Sparkle({
  className = "",
  delay = "0s",
}: {
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`w-4 h-4 animate-sparkle ${className}`}
      style={{ animationDelay: delay }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full">
        <path
          d="M8 0 L9.5 6.5 L16 8 L9.5 9.5 L8 16 L6.5 9.5 L0 8 L6.5 6.5 Z"
          fill="#ffcc00"
          stroke="#fff"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}

// ============================================================
// 結果表示ステージ (順番にカードがめくれる)
// ============================================================

function ResultStage({
  results,
  revealedCount,
  done,
  maxRarity,
  onClose,
  onAgain,
}: {
  results: PullResult[];
  revealedCount: number;
  done: boolean;
  maxRarity: Rarity;
  onClose: () => void;
  onAgain: () => void;
}) {
  const single = results.length === 1;

  return (
    <div className="fixed inset-0 z-30 gacha-stage overflow-y-auto">
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

      {/* 上部バナー: 最高レアに応じて色変え */}
      <div className="relative pt-6 px-4">
        <div
          className={`mx-auto w-fit px-6 py-2 border-4 border-black font-pixel text-sm ${
            maxRarity === "SSR"
              ? "rainbow-gradient animate-rainbow-bg text-white"
              : maxRarity === "SR"
                ? "bg-rarity-sr text-bg-base"
                : maxRarity === "R"
                  ? "bg-rarity-r text-bg-base"
                  : "bg-bg-card text-white"
          }`}
        >
          {done && maxRarity === "SSR"
            ? "★ 大当たり！ SSR ★"
            : done && maxRarity === "SR"
              ? "SR 確定！"
              : done && maxRarity === "R"
                ? "R 入り"
                : "RESULT"}
        </div>
      </div>

      {/* カード群 */}
      <div className="px-4 py-6">
        {single ? (
          <div className="flex justify-center">
            {results.map((r, i) => (
              <ResultCard
                key={i}
                result={r}
                revealed={revealedCount > i}
                large
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
            {results.map((r, i) => (
              <ResultCard
                key={i}
                result={r}
                revealed={revealedCount > i}
              />
            ))}
          </div>
        )}
      </div>

      {/* アクションボタン (めくり終わってから表示) */}
      {done && (
        <div className="sticky bottom-0 left-0 right-0 px-4 py-4 bg-bg-panel/95 border-t-2 border-bg-card backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <button onClick={onClose} className="pixel-btn-secondary text-xs">
              閉じる
            </button>
            <button onClick={onAgain} className="pixel-btn text-xs">
              もう一回
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  revealed,
  large = false,
}: {
  result: PullResult;
  revealed: boolean;
  large?: boolean;
}) {
  const isSsr = result.rarity === "SSR";
  const isSr = result.rarity === "SR";

  return (
    <div className={`perspective-card ${large ? "w-48" : ""}`}>
      <div
        className={`relative ${large ? "" : ""}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {!revealed ? (
          // カード裏面
          <div
            className={`pixel-panel overflow-hidden ${
              large ? "aspect-[2/3]" : "aspect-[2/3]"
            } bg-gradient-to-br from-pachi-purple via-pachi-pink to-pachi-red flex items-center justify-center animate-card-pop`}
          >
            <span className="font-pixel text-2xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
              ?
            </span>
          </div>
        ) : (
          // カード表面 (レア度に応じた装飾)
          <div
            className={`relative pixel-panel overflow-hidden border-2 ${
              RARITY_BORDER[result.rarity]
            } ${
              isSsr
                ? "animate-ssr-glow"
                : isSr
                  ? "shadow-[0_0_8px_2px_rgba(167,139,250,0.5)]"
                  : ""
            } animate-card-flip`}
          >
            {/* SSRは虹色背景帯 */}
            {isSsr && (
              <div className="absolute inset-0 rainbow-gradient animate-rainbow-bg opacity-20 pointer-events-none" />
            )}
            <div className={`${large ? "aspect-[2/3]" : "aspect-[2/3]"} bg-bg-base`}>
              <MachineThumb
                machineId={result.machine.id}
                name={result.machine.name}
                rarity={result.rarity}
                size={large ? 96 : 48}
                className="w-full h-full"
              />
            </div>
            <div className="bg-black/70 px-1 py-1 text-center">
              <span
                className={`font-pixel ${large ? "text-sm" : "text-[8px]"} ${RARITY_COLOR[result.rarity]}`}
              >
                {result.rarity}
              </span>
              {large && (
                <p className="font-dot text-[10px] text-white truncate mt-1">
                  {result.machine.name}
                </p>
              )}
            </div>
            {/* SSR にスパークル */}
            {isSsr && (
              <>
                <Sparkle className="absolute -top-1 -left-1" delay="0s" />
                <Sparkle className="absolute -top-1 -right-1" delay="0.4s" />
                <Sparkle className="absolute -bottom-1 -left-1" delay="0.8s" />
                <Sparkle className="absolute -bottom-1 -right-1" delay="1.2s" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function DreamProgress() {
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
    <div className="pixel-panel p-3 mt-3 border-2 border-pachi-pink">
      <p className="font-pixel text-[10px] text-pachi-pink mb-2">
        ★ 理想店への道
      </p>
      <CapacityBar
        label="目標機種を集めた数"
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
      <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
        ガチャを引いて、理想ラインナップを完成させよう
      </p>
    </div>
  );
}
