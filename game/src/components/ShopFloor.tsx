import { useMemo, useState } from "react";
import { MachineThumb } from "./MachineThumb";
import { MACHINES_BY_ID } from "../data/machines";

/**
 * 初代ポケモン (ゲームコーナー) 風の縦横スクロール俯瞰ビュー
 *
 * - タイルベース (16px / 2x スケール = 表示 32px)
 * - 1F / B1F の 2 フロア + エスカレーター
 * - 1F は中央カウンター + 2 箇所の出入口 + 自販機
 * - B1F はカウンター無し、機種だらけ
 * - 客 NPC は ~5 秒ごとに方向ランダムウォーク
 */

const TILE = 16;
const SCALE = 2;

type T = "." | "W" | "D" | "C" | "V" | "E" | "L" | "R" | "S";
//        floor wall door counter vending escalator machineL machineR stairUp/Down

interface FloorMap {
  name: string;
  rows: T[][];
}

const F1: FloorMap = {
  name: "1F",
  rows: stringToGrid([
    "WWWWWWDDWWWWWWWWWWDDWWWWW",
    "W.......................W",
    "W..LR..LR..LR..LR..LR..W",
    "W..LR..LR..LR..LR..LR..W",
    "W.......................W",
    "W.......................W",
    "W.......CCCCCCCC........W",
    "W.......CCCCCCCC........W",
    "W.......................W",
    "W..LR..LR.........LR....W",
    "W..LR..LR.........LR....W",
    "W.......................W",
    "WV...................V..W",
    "W................EEEE...W",
    "W................EEEE...W",
    "WWWWWWWWWWWWWWWWWWWWWWWWW",
  ]),
};

const B1: FloorMap = {
  name: "B1",
  rows: stringToGrid([
    "WWWWWWWWWWWWWWWWWWWWWWWWW",
    "W.......................W",
    "W..LR..LR..LR..LR..LR..W",
    "W..LR..LR..LR..LR..LR..W",
    "W.......................W",
    "W..LR..LR..LR..LR..LR..W",
    "W..LR..LR..LR..LR..LR..W",
    "W.......................W",
    "W..LR..LR..LR..LR..LR..W",
    "W..LR..LR..LR..LR..LR..W",
    "W.......................W",
    "W..LR..LR.........LR....W",
    "W..LR..LR.........LR....W",
    "WV...............EEEE.V.W",
    "W................EEEE...W",
    "WWWWWWWWWWWWWWWWWWWWWWWWW",
  ]),
};

function stringToGrid(lines: string[]): T[][] {
  return lines.map((l) => l.split("") as T[]);
}

interface CustomerPos {
  id: number;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
  color: string;
  hat: string;
}

const CUSTOMER_COLORS = [
  { color: "#ff4d94", hat: "#ff0066" },
  { color: "#00e5ff", hat: "#4a6fff" },
  { color: "#ffcc00", hat: "#dc6428" },
  { color: "#00ff88", hat: "#643c50" },
  { color: "#b066ff", hat: "#3c1428" },
  { color: "#ffb450", hat: "#dc6428" },
];

interface ShopEntry {
  machineId: string;
  count: number;
}

interface Props {
  /** 設置機種一覧 */
  entries: ShopEntry[];
  /** 客数 */
  customerCount: number;
}

/** floor map から機種スロット位置を抽出 (L/R タイル) */
function machineSlots(map: FloorMap): Array<{ x: number; y: number; side: "L" | "R" }> {
  const slots: Array<{ x: number; y: number; side: "L" | "R" }> = [];
  for (let y = 0; y < map.rows.length; y++) {
    for (let x = 0; x < map.rows[y].length; x++) {
      const t = map.rows[y][x];
      if (t === "L") slots.push({ x, y, side: "L" });
      if (t === "R") slots.push({ x, y, side: "R" });
    }
  }
  return slots;
}

/** entries を レア度→年代の優先度で展開し、台ごとに 1 つずつのリストにする */
function expandEntries(entries: ShopEntry[]): string[] {
  const list: { mid: string; rarity: number; year: number }[] = [];
  for (const e of entries) {
    const m = MACHINES_BY_ID[e.machineId];
    if (!m) continue;
    const rarityRank = { N: 0, R: 1, SR: 2, SSR: 3 }[m.rarity] ?? 0;
    for (let i = 0; i < e.count; i++) {
      list.push({ mid: e.machineId, rarity: rarityRank, year: m.releaseYear });
    }
  }
  list.sort((a, b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    return b.year - a.year;
  });
  return list.map((x) => x.mid);
}

export function ShopFloor({ entries, customerCount }: Props) {
  const [floor, setFloor] = useState<"F1" | "B1" | "B2">("F1");

  // 機種を 1F 優先で割り当て
  const { f1Map, b1Map } = useMemo(() => {
    const f1Slots = machineSlots(F1);
    const b1Slots = machineSlots(B1);
    const machines = expandEntries(entries);
    const f1Map = new Map<string, string>(); // "x,y" -> machineId
    const b1Map = new Map<string, string>();
    let i = 0;
    for (const s of f1Slots) {
      if (i >= machines.length) break;
      f1Map.set(`${s.x},${s.y}`, machines[i++]);
    }
    for (const s of b1Slots) {
      if (i >= machines.length) break;
      b1Map.set(`${s.x},${s.y}`, machines[i++]);
    }
    return { f1Map, b1Map };
  }, [entries]);

  const machineMap = floor === "F1" ? f1Map : b1Map;
  if (floor === "B2") {
    return (
      <div className="mx-3 mt-3 bg-bg-panel border-2 border-bg-card overflow-hidden">
        <div className="bg-black px-3 py-1.5 flex justify-between items-center text-[10px] border-b-2 border-pachi-red">
          <span className="font-pixel text-pachi-red">🔒 B2F LOCKED</span>
          <div className="flex gap-1">
            <FloorBtn label="1F" active={false} onClick={() => setFloor("F1")} />
            <FloorBtn label="B1" active={false} onClick={() => setFloor("B1")} />
            <FloorBtn label="B2" active onClick={() => {}} />
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="font-pixel text-xs text-pachi-yellow mb-3 animate-blink">
            🔒 OFFLIMITS
          </p>
          <p className="text-[11px] text-white/70 leading-relaxed">
            B2 フロアは「店舗拡張」で解放されます
            <br />
            さらに 100 台分のスペースを追加できます
          </p>
        </div>
      </div>
    );
  }
  const map = floor === "F1" ? F1 : B1;
  const cols = map.rows[0].length;
  const rows = map.rows.length;

  // 客は機種の前 (席) に座る
  // L タイル → 席は (x-1, y) / R タイル → 席は (x+1, y)
  const seatedCustomers = useMemo<CustomerPos[]>(() => {
    const placed: CustomerPos[] = [];
    let id = 0;
    // 設置中スロットに対応する席候補
    const seats: Array<{
      x: number;
      y: number;
      facing: CustomerPos["facing"];
      machineId: string | undefined;
      rarity: number;
    }> = [];
    for (let y = 0; y < map.rows.length; y++) {
      for (let x = 0; x < map.rows[y].length; x++) {
        const t = map.rows[y][x];
        if (t === "L" || t === "R") {
          const seatX = t === "L" ? x - 1 : x + 1;
          if (seatX < 0 || seatX >= cols) continue;
          if (map.rows[y][seatX] !== ".") continue;
          const mid = machineMap.get(`${x},${y}`);
          const m = mid ? MACHINES_BY_ID[mid] : undefined;
          if (!m) continue;
          // 設定値はわからない (ShopFloor は entries だけ持つ) → レア度で代用
          const rarityRank =
            m.rarity === "SSR" ? 4 : m.rarity === "SR" ? 3 : m.rarity === "R" ? 2 : 1;
          seats.push({
            x: seatX,
            y,
            facing: t === "L" ? "right" : "left",
            machineId: mid,
            rarity: rarityRank,
          });
        }
      }
    }
    // レア度高い順 + ランダム少しで席を選ぶ
    const sorted = seats
      .map((s) => ({ ...s, score: s.rarity + Math.random() * 0.5 }))
      .sort((a, b) => b.score - a.score);
    const num = Math.min(customerCount, sorted.length);
    for (let i = 0; i < num; i++) {
      const s = sorted[i];
      const palette = CUSTOMER_COLORS[id % CUSTOMER_COLORS.length];
      placed.push({
        id: id++,
        x: s.x,
        y: s.y,
        facing: s.facing,
        color: palette.color,
        hat: palette.hat,
      });
    }
    return placed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, customerCount, machineMap, cols, rows]);

  const customers = seatedCustomers;

  const widthPx = cols * TILE * SCALE;
  const heightPx = rows * TILE * SCALE;

  return (
    <div className="mx-3 mt-3 bg-bg-panel border-2 border-bg-card overflow-hidden">
      {/* フロア切替バー */}
      <div className="bg-black px-3 py-1.5 flex justify-between items-center text-[10px] border-b-2 border-pachi-red">
        <span className="font-pixel text-pachi-pink animate-blink">● OPEN</span>
        <div className="flex gap-1">
          <FloorBtn label="1F" active={floor === "F1"} onClick={() => setFloor("F1")} />
          <FloorBtn label="B1" active={floor === "B1"} onClick={() => setFloor("B1")} />
          <FloorBtn label="B2" active={false} onClick={() => setFloor("B2")} locked />
        </div>
      </div>

      {/* スクロール領域 */}
      <div
        className="overflow-auto"
        style={{ maxHeight: "60vh", touchAction: "pan-x pan-y" }}
      >
        <div
          className="relative"
          style={{
            width: widthPx,
            height: heightPx,
            imageRendering: "pixelated",
          }}
        >
          {/* タイル */}
          {map.rows.map((row, y) =>
            row.map((t, x) => {
              if (t === "L" || t === "R") {
                const mid = machineMap.get(`${x},${y}`);
                return (
                  <MachineTile
                    key={`${x},${y}`}
                    x={x}
                    y={y}
                    side={t}
                    machineId={mid}
                  />
                );
              }
              return <Tile key={`${x},${y}`} type={t} x={x} y={y} />;
            })
          )}

          {/* 客 */}
          {customers.map((c) => (
            <Customer key={c.id} pos={c} />
          ))}
        </div>
      </div>

      {/* フッタ */}
      <div className="bg-bg-panel px-3 py-1.5 text-[9px] font-pixel text-white/50 flex justify-between border-t border-bg-card">
        <span>{map.name} · 客 {customers.length} 名</span>
        <span>← → ↑ ↓ スクロールで店内を見渡せます</span>
      </div>
    </div>
  );
}

function FloorBtn({
  label,
  active,
  onClick,
  locked,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 font-pixel text-[10px] border ${
        active
          ? "bg-pachi-yellow text-bg-base border-pachi-yellow"
          : locked
            ? "bg-transparent text-white/30 border-bg-card"
            : "bg-transparent text-white/60 border-bg-card"
      }`}
    >
      {locked ? "🔒 " : ""}
      {label}
    </button>
  );
}

// ============================================================
// タイル
// ============================================================

function Tile({
  type,
  x,
  y,
}: {
  type: T;
  x: number;
  y: number;
}) {
  const sz = TILE * SCALE;
  const style = {
    position: "absolute" as const,
    left: x * sz,
    top: y * sz,
    width: sz,
    height: sz,
  };
  switch (type) {
    case ".":
      return <div style={{ ...style, background: "#3a3045" }} />;
    case "W":
      return (
        <div
          style={{
            ...style,
            background:
              "repeating-linear-gradient(90deg, #1a1a2e 0 8px, #22223a 8px 16px), #1a1a2e",
          }}
        />
      );
    case "D":
      return (
        <div
          style={{
            ...style,
            background: "linear-gradient(180deg, #ffcc00 0%, #dc6428 100%)",
            border: "2px solid #000",
            boxSizing: "border-box",
          }}
        />
      );
    case "C":
      return (
        <div
          style={{
            ...style,
            background: "#643c50",
            border: "1px solid #3c1428",
            boxSizing: "border-box",
          }}
        />
      );
    case "V":
      return <VendingMachine x={x * sz} y={y * sz} size={sz} />;
    case "E":
      return <Escalator x={x * sz} y={y * sz} size={sz} />;
    case "S":
      return <div style={{ ...style, background: "#3a3045" }} />;
    default:
      return null;
  }
}

function MachineTile({
  x,
  y,
  side,
  machineId,
}: {
  x: number;
  y: number;
  side: "L" | "R";
  machineId: string | undefined;
}) {
  const sz = TILE * SCALE;
  const m = machineId ? MACHINES_BY_ID[machineId] : undefined;
  const style = {
    position: "absolute" as const,
    left: x * sz,
    top: y * sz,
    width: sz,
    height: sz,
  };
  if (!m) {
    // 空きスロット (薄く影だけ)
    return (
      <div style={{ ...style, background: "#22223a", opacity: 0.4 }} />
    );
  }
  // L はそのまま, R は左右反転 (背中合わせの島の演出)
  return (
    <div
      style={{
        ...style,
        background: m.rarity === "SSR" ? "#ffcc00" : m.rarity === "SR" ? "#a78bfa" : m.rarity === "R" ? "#4ade80" : "#22223a",
        padding: 1,
        boxSizing: "border-box",
        transform: side === "R" ? "scaleX(-1)" : undefined,
      }}
    >
      <MachineThumb
        machineId={m.id}
        name={m.name}
        rarity={m.rarity}
        size={48}
        className="w-full h-full"
      />
    </div>
  );
}

function VendingMachine({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg
      style={{ position: "absolute", left: x, top: y }}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width="16" height="16" fill="#3a3045" />
      <rect x="2" y="1" width="12" height="14" fill="#ff0066" />
      <rect x="3" y="2" width="10" height="6" fill="#1a1a2e" />
      <rect x="4" y="3" width="8" height="4" fill="#fff" />
      <rect x="3" y="9" width="2" height="2" fill="#00ff88" />
      <rect x="6" y="9" width="2" height="2" fill="#ffcc00" />
      <rect x="9" y="9" width="2" height="2" fill="#00e5ff" />
      <rect x="3" y="12" width="10" height="2" fill="#1a1a2e" />
    </svg>
  );
}

function Escalator({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg
      style={{ position: "absolute", left: x, top: y }}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width="16" height="16" fill="#22223a" />
      <rect x="0" y="0" width="16" height="2" fill="#00e5ff" />
      <rect x="0" y="14" width="16" height="2" fill="#00e5ff" />
      <g fill="#00e5ff">
        <rect x="2" y="4" width="12" height="1" />
        <rect x="2" y="7" width="12" height="1" />
        <rect x="2" y="10" width="12" height="1" />
      </g>
      <text
        x="8"
        y="9"
        fontSize="6"
        fill="#fff"
        fontFamily='"Press Start 2P", monospace'
        textAnchor="middle"
      >
        ↕
      </text>
    </svg>
  );
}

// ============================================================
// 客 NPC (初代ポケモン風)
// ============================================================

function Customer({ pos }: { pos: CustomerPos }) {
  const sz = TILE * SCALE;
  const px = pos.x * sz;
  const py = pos.y * sz;
  return (
    <svg
      style={{
        position: "absolute",
        left: px,
        top: py,
        transition: "left 0.4s linear, top 0.4s linear",
        zIndex: 5,
      }}
      width={sz}
      height={sz}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
    >
      {/* 帽子 */}
      <rect x="5" y="2" width="6" height="2" fill={pos.hat} />
      <rect x="4" y="3" width="8" height="1" fill={pos.hat} />
      {/* 顔 */}
      <rect x="5" y="4" width="6" height="3" fill="#ffd9b4" />
      {/* 目 */}
      {pos.facing === "down" && (
        <>
          <rect x="6" y="5" width="1" height="1" fill="#000" />
          <rect x="9" y="5" width="1" height="1" fill="#000" />
        </>
      )}
      {pos.facing === "up" && null}
      {pos.facing === "left" && <rect x="6" y="5" width="1" height="1" fill="#000" />}
      {pos.facing === "right" && (
        <rect x="9" y="5" width="1" height="1" fill="#000" />
      )}
      {/* 体 */}
      <rect x="4" y="7" width="8" height="5" fill={pos.color} />
      <rect x="5" y="8" width="6" height="3" fill={pos.color} opacity="0.9" />
      {/* 腕 */}
      <rect x="3" y="8" width="1" height="3" fill={pos.color} />
      <rect x="12" y="8" width="1" height="3" fill={pos.color} />
      {/* 足 */}
      <rect x="5" y="12" width="2" height="3" fill="#1a1a2e" />
      <rect x="9" y="12" width="2" height="3" fill="#1a1a2e" />
    </svg>
  );
}
