import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";
import { pullTen, type PullResult } from "../lib/gacha";
import { MachineThumb } from "../components/MachineThumb";
import type { Rarity } from "../lib/types";
import { SHOP_SERIES, getSeriesById, type ShopSeries } from "../lib/shopSeries";

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

const ROLL_MS = 2500;
const STAGGER_MS = 30;

type Phase = "chooseShop" | "welcome" | "rolling" | "revealing" | "summary";

export function Onboarding() {
  const navigate = useNavigate();
  const initUser = useGameStore((s) => s.initUser);
  const addMachines = useGameStore((s) => s.addMachines);
  const setDream = useGameStore((s) => s.setDreamMachines);
  const setShopSeries = useGameStore((s) => s.setShopSeries);
  const createShop = useGameStore((s) => s.createShop);
  const existingShop = useGameStore((s) => s.shop);

  const [phase, setPhase] = useState<Phase>("chooseShop");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [results, setResults] = useState<PullResult[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [shopName, setShopName] = useState("");
  const timersRef = useRef<number[]>([]);

  const series: ShopSeries | null = getSeriesById(selectedSeriesId);

  useEffect(() => {
    initUser();
  }, [initUser]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const setT = (cb: () => void, ms: number) => {
    const id = window.setTimeout(cb, ms);
    timersRef.current.push(id);
  };

  const startPulls = () => {
    // 10 連 × 10 = 100 連 (シリーズバイアス付き)
    const all: PullResult[] = [];
    for (let i = 0; i < 10; i++) {
      all.push(...pullTen(Math.random, series));
    }
    setResults(all);
    setRevealedCount(0);
    setPhase("rolling");

    setT(() => {
      setPhase("revealing");
      // 30ms 間隔でカード公開 (100 枚 × 30ms = 3 秒)
      all.forEach((_, i) => {
        setT(() => setRevealedCount(i + 1), i * STAGGER_MS);
      });
      setT(() => {
        // 全所持を addMachines 経由で反映
        addMachines(all);
        setPhase("summary");
      }, all.length * STAGGER_MS + 600);
    }, ROLL_MS);
  };

  const finalize = () => {
    // 引いた台を理想ラインナップとして登録
    const dream: Record<string, number> = {};
    for (const r of results) {
      dream[r.machine.id] = (dream[r.machine.id] ?? 0) + 1;
    }
    setDream(dream);
    // 本格モードの店を作成 (既存があれば名前のみ更新)
    const trimmed = shopName.trim() || "ドリームホール";
    if (!existingShop) {
      createShop(trimmed);
    }
    navigate("/shop");
  };

  const handleSelectShop = (id: string) => {
    setSelectedSeriesId(id);
    setShopSeries(id);
    // 店舗名のデフォルトを店舗名に
    const s = getSeriesById(id);
    if (s && !shopName) setShopName(s.name);
    setPhase("welcome");
  };

  // ============================================================
  // フェーズ別 UI
  // ============================================================
  if (phase === "chooseShop") {
    return <ChooseShopPhase onSelect={handleSelectShop} />;
  }

  if (phase === "welcome") {
    return (
      <div className="min-h-dvh gacha-stage flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
        <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
        <div className="relative max-w-md w-full">
          <div className="text-center">
            <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest mb-2">
              WELCOME TO
            </p>
            <h1 className="font-pixel text-2xl leading-tight">
              <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
                マイパチ店
              </span>
            </h1>
            <p className="mt-4 text-[11px] text-white/80 leading-relaxed">
              まずは100連を回して、
              <br />
              あなたの<span className="text-pachi-yellow">運命の機種</span>と出会おう。
              <br />
              引いた台で「あなたの理想ホール」が決まります。
            </p>
          </div>

          <div className="pixel-panel p-4 mt-6">
            <label className="text-xs text-white/70">
              店長として開く店の名前
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="例: ドリームホール"
                maxLength={20}
                className="block w-full mt-2 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
              />
            </label>
            <button
              onClick={startPulls}
              className="pixel-btn w-full mt-4 text-sm py-4 animate-rolling-pulse"
              style={{ animationDuration: "1.4s" }}
            >
              ★ 運命の100連を引く ★
            </button>
            <p className="text-[10px] text-white/50 text-center mt-3">
              ※ 無料 / 必要時間 約8秒
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "rolling") {
    return (
      <div className="min-h-dvh gacha-stage flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
        <div className="relative">
          <div
            className="w-40 h-56 rainbow-gradient animate-rainbow-bg shadow-pixel border-4 border-black flex items-center justify-center animate-rolling-pulse"
            style={{ animationDuration: "0.6s" }}
          >
            <span className="font-pixel text-3xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
              100
            </span>
          </div>
          <p className="mt-6 text-center font-pixel text-sm text-pachi-yellow animate-blink">
            運命の機種を引いています...
          </p>
        </div>
      </div>
    );
  }

  // revealing or summary 共用: カードグリッド
  const ssrCount = results.filter((r) => r.rarity === "SSR").length;
  const srCount = results.filter((r) => r.rarity === "SR").length;
  const rCount = results.filter((r) => r.rarity === "R").length;
  const nCount = results.filter((r) => r.rarity === "N").length;
  const uniqueMachineCount = new Set(results.map((r) => r.machine.id)).size;

  return (
    <div className="min-h-dvh gacha-stage relative">
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />

      <div className="relative px-3 py-4">
        {phase === "summary" && (
          <div className="text-center mb-4">
            <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest">
              YOUR DESTINY
            </p>
            <h2 className="mt-2 font-pixel text-xl">
              <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
                これがあなたの理想ホール！
              </span>
            </h2>
            <p className="mt-3 text-[11px] text-white/70 leading-relaxed">
              この {results.length} 台のラインナップを実現するのが
              <br />
              本格モードの目標です
            </p>
          </div>
        )}

        {phase === "revealing" && (
          <p className="text-center font-pixel text-xs text-pachi-yellow animate-blink mb-3">
            REVEALING... ({revealedCount}/{results.length})
          </p>
        )}

        {/* 100 枚カードグリッド (5 列) */}
        <div className="grid grid-cols-5 gap-1.5 max-w-md mx-auto">
          {results.map((r, i) => {
            const revealed = revealedCount > i;
            return (
              <ResultCard key={i} result={r} revealed={revealed} />
            );
          })}
        </div>

        {phase === "summary" && (
          <>
            {/* スタッツ */}
            <div className="mt-6 max-w-md mx-auto pixel-panel p-3">
              <p className="font-pixel text-[10px] text-pachi-cyan mb-2">
                ラインナップ内訳
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <RarityCount label="SSR" count={ssrCount} color="text-rarity-ssr" />
                <RarityCount label="SR" count={srCount} color="text-rarity-sr" />
                <RarityCount label="R" count={rCount} color="text-rarity-r" />
                <RarityCount label="N" count={nCount} color="text-rarity-n" />
              </div>
              <p className="mt-3 text-[11px] text-white/70 text-center">
                ユニーク機種:{" "}
                <span className="font-pixel text-pachi-yellow">
                  {uniqueMachineCount}
                </span>
              </p>
            </div>

            {/* CTA */}
            <div className="mt-5 max-w-md mx-auto">
              <button
                onClick={finalize}
                className="pixel-btn w-full py-4 text-sm"
              >
                ▶ 本格モードを開始する
              </button>
              <p className="text-[10px] text-white/50 text-center mt-3">
                この {uniqueMachineCount} 機種を集めるのが目標になります
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  revealed,
}: {
  result: PullResult;
  revealed: boolean;
}) {
  if (!revealed) {
    return (
      <div className="aspect-[2/3] bg-gradient-to-br from-pachi-purple via-pachi-pink to-pachi-red border-2 border-black flex items-center justify-center">
        <span className="font-pixel text-base text-white/80">?</span>
      </div>
    );
  }
  const isSsr = result.rarity === "SSR";
  return (
    <div
      className={`relative aspect-[2/3] bg-bg-base border-2 ${
        RARITY_BORDER[result.rarity]
      } ${isSsr ? "animate-ssr-glow" : ""} animate-card-pop`}
    >
      <MachineThumb
        machineId={result.machine.id}
        name={result.machine.name}
        rarity={result.rarity}
        size={48}
        className="w-full h-full"
      />
      <div
        className={`absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-center font-pixel text-[8px] ${RARITY_COLOR[result.rarity]}`}
      >
        {result.rarity}
      </div>
    </div>
  );
}

function RarityCount({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div>
      <p className={`font-pixel ${color}`}>{label}</p>
      <p className="font-pixel text-pachi-yellow mt-1">{count}</p>
    </div>
  );
}

// ============================================================
// 店舗選択フェーズ (3 軒からスワイプで選ぶ)
// ============================================================

function ChooseShopPhase({ onSelect }: { onSelect: (id: string) => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // スクロール位置から activeIdx を計算
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  const scrollTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="min-h-dvh gacha-stage relative flex flex-col">
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

      {/* ヘッダ */}
      <div className="relative px-4 pt-6 pb-2 text-center">
        <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest">
          STEP 1 / 3
        </p>
        <h1 className="mt-2 font-pixel text-base">
          <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
            開店する店舗を選ぼう
          </span>
        </h1>
        <p className="mt-2 text-[11px] text-white/60">
          ← スワイプで切り替え →
        </p>
      </div>

      {/* スワイプ可能なカードカルーセル */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="relative flex-1 flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {SHOP_SERIES.map((s) => (
          <div
            key={s.id}
            className="snap-center shrink-0 w-full px-4 py-3"
          >
            <ShopCard series={s} onSelect={() => onSelect(s.id)} />
          </div>
        ))}
      </div>

      {/* ページインジケータ */}
      <div className="relative flex justify-center gap-2 py-3">
        {SHOP_SERIES.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`w-2 h-2 transition-all ${
              i === activeIdx
                ? "bg-pachi-yellow w-6"
                : "bg-white/30"
            }`}
            aria-label={`店舗 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function ShopCard({
  series,
  onSelect,
}: {
  series: ShopSeries;
  onSelect: () => void;
}) {
  return (
    <div
      className={`pixel-panel border-2 ${series.accent} h-full flex flex-col`}
    >
      {/* 看板 */}
      <div
        className={`${series.bannerBg} px-4 py-3 border-b-4 border-black flex items-center justify-between`}
      >
        <div>
          <p className="font-pixel text-xs leading-tight">{series.name}</p>
          <p className="font-dot text-[10px] mt-0.5 opacity-80">
            {series.tagline}
          </p>
        </div>
        <span className="text-3xl">{series.emoji}</span>
      </div>

      {/* チラシ風情報 */}
      <div className="bg-bg-base px-4 py-4 flex-1 flex flex-col gap-3 text-[11px]">
        <div className="flex justify-between items-baseline border-b border-bg-card pb-2">
          <span className="font-pixel text-[10px] text-pachi-yellow">特日</span>
          <span className="text-white">{series.specialDay}</span>
        </div>
        <div className="flex justify-between items-baseline border-b border-bg-card pb-2">
          <span className="font-pixel text-[10px] text-pachi-pink">本日のイベント</span>
          <span className="text-white">{series.event}</span>
        </div>
        <div className="flex justify-between items-baseline border-b border-bg-card pb-2">
          <span className="font-pixel text-[10px] text-pachi-cyan">来店演者</span>
          <span className="text-white">{series.mascot}</span>
        </div>
        <div className="border-b border-bg-card pb-2">
          <span className="font-pixel text-[10px] text-pachi-green">看板機種</span>
          <ul className="mt-1.5 space-y-0.5">
            {series.examples.map((ex, i) => (
              <li key={i} className="text-white/80 truncate">
                ・{ex}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-2">
          <button
            onClick={onSelect}
            className="pixel-btn w-full text-xs py-3"
          >
            この店で開店する
          </button>
        </div>
      </div>
    </div>
  );
}
