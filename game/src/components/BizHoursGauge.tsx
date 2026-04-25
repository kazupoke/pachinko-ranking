import { useEffect, useState } from "react";

/**
 * 営業時間ゲージ
 * 9:00 - 23:00 (14h) を 1 営業日とし、
 * 4 リアル時間 = 1 営業日のスピードで進む。
 * 営業日内の最後 1/4 は「閉店作業」帯。
 *
 * - "biz-day-anchor": localStorage に最初の営業開始時刻 (real time) を保存
 * - 経過時間 = (now - anchor) % 4 hours
 * - その経過 / 4h を 9:00-23:00 にマップ
 */

const REAL_HOURS_PER_BIZ_DAY = 4;
const BIZ_OPEN = 9; // 9:00
const BIZ_CLOSE = 23; // 23:00
const BIZ_DURATION = BIZ_CLOSE - BIZ_OPEN; // 14h

const ANCHOR_KEY = "pachi-biz-anchor-v1";

function getAnchor(): number {
  const v = localStorage.getItem(ANCHOR_KEY);
  if (v) return parseInt(v, 10);
  const now = Date.now();
  localStorage.setItem(ANCHOR_KEY, String(now));
  return now;
}

interface State {
  /** 0.0 - 1.0 */
  pct: number;
  /** 営業時間 9:00-23:00 のうちの現在時 (e.g. 14.3) */
  bizTime: number;
  /** 表示用 hh:mm */
  bizClock: string;
  /** 閉店作業帯か */
  inClosing: boolean;
}

function computeState(): State {
  const anchor = getAnchor();
  const elapsedMs = (Date.now() - anchor) % (REAL_HOURS_PER_BIZ_DAY * 3600_000);
  const pct = elapsedMs / (REAL_HOURS_PER_BIZ_DAY * 3600_000);
  const bizTime = BIZ_OPEN + pct * BIZ_DURATION;
  const hh = Math.floor(bizTime);
  const mm = Math.floor((bizTime - hh) * 60);
  const bizClock = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  const inClosing = pct >= 0.75;
  return { pct, bizTime, bizClock, inClosing };
}

export function BizHoursGauge({ compact }: { compact?: boolean } = {}) {
  const [s, setS] = useState<State>(() => computeState());
  useEffect(() => {
    const iv = window.setInterval(() => setS(computeState()), 30_000); // 30s 更新
    return () => window.clearInterval(iv);
  }, []);

  const widthPct = Math.round(s.pct * 100);
  return (
    <div className={`pixel-panel ${compact ? "p-2" : "p-3"}`}>
      <div className="flex justify-between items-baseline">
        <span className="font-pixel text-[10px] text-pachi-cyan">
          {s.inClosing ? "閉店作業" : "営業中"}
        </span>
        <span className="font-pixel text-[11px] text-pachi-yellow">
          {s.bizClock}
          <span className="text-white/40 text-[9px] ml-1">
            ({BIZ_OPEN}:00-{BIZ_CLOSE}:00)
          </span>
        </span>
      </div>
      <div className="mt-1.5 relative h-3 bg-bg-base border border-bg-card overflow-hidden">
        {/* 進行 */}
        <div
          className={`h-full transition-all duration-1000 ${
            s.inClosing ? "bg-pachi-red" : "bg-pachi-green"
          }`}
          style={{ width: `${widthPct}%` }}
        />
        {/* 閉店作業マーカー (75%) */}
        <div
          className="absolute top-0 bottom-0 w-[1px] bg-pachi-yellow"
          style={{ left: "75%" }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[8px] font-pixel text-white/40">
        <span>OPEN</span>
        <span>閉店作業 →</span>
        <span>CLOSE</span>
      </div>
    </div>
  );
}
