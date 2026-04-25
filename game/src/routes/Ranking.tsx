import { useMemo } from "react";
import { PageHeader } from "../components/PageHeader";
import { useGameStore } from "../stores/useGameStore";

interface RankShop {
  id: string;
  name: string;
  manager: string;
  machines: number;
  types: number;
  score: number;
  isMe?: boolean;
}

// モックデータ (将来サーバー連携で実データに差し替え予定)
const MOCK_TOP: Omit<RankShop, "isMe">[] = [
  { id: "s_001", name: "デルパラ7銀座店", manager: "デルパラ太郎", machines: 200, types: 25, score: 9820 },
  { id: "s_002", name: "ジアス新百合ヶ丘", manager: "ジアスK", machines: 200, types: 24, score: 9540 },
  { id: "s_003", name: "ベラジオ難波", manager: "ベラ次郎", machines: 198, types: 25, score: 9210 },
  { id: "s_004", name: "アクエリアス本厚木", manager: "アクア", machines: 195, types: 23, score: 8890 },
  { id: "s_005", name: "ABC緑橋店", manager: "ABCマスター", machines: 190, types: 24, score: 8670 },
  { id: "s_006", name: "コンサート大宮", manager: "C大", machines: 188, types: 22, score: 8410 },
  { id: "s_007", name: "プレイランドハッピー", manager: "ハピ", machines: 182, types: 22, score: 8180 },
  { id: "s_008", name: "GAIA高田馬場", manager: "ガイア", machines: 178, types: 21, score: 7920 },
  { id: "s_009", name: "MGM名古屋", manager: "MGM", machines: 174, types: 20, score: 7720 },
  { id: "s_010", name: "ピーアーク水戸", manager: "ピアK", machines: 168, types: 20, score: 7500 },
];

export function Ranking() {
  const shop = useGameStore((s) => s.shop);
  const credentials = useGameStore((s) => s.credentials);

  const myEntry: RankShop | null = shop
    ? {
        id: shop.id,
        name: shop.name,
        manager: credentials?.managerName ?? "店長",
        machines: shop.layout.reduce((s, e) => s + e.count, 0),
        types: shop.layout.length,
        score: Math.round(
          shop.totalCustomers * 0.5 + shop.layout.length * 80 +
            shop.layout.reduce((s, e) => s + e.count, 0) * 12
        ),
        isMe: true,
      }
    : null;

  const ranked = useMemo(() => {
    const all: RankShop[] = [...MOCK_TOP];
    if (myEntry) all.push(myEntry);
    all.sort((a, b) => b.score - a.score);
    return all.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [myEntry]);

  const myRank = myEntry
    ? ranked.find((r) => r.id === myEntry.id)?.rank
    : null;

  return (
    <div>
      <PageHeader
        title="店舗ランキング"
        subtitle={
          myRank
            ? `あなたは ${myRank} 位 (全 ${ranked.length} 店中)`
            : `全 ${ranked.length} 店`
        }
      />

      <p className="px-4 pt-2 text-[10px] text-white/50">
        ※ 現状はモック (実サーバー連携で実店舗との競争に切り替え予定)
      </p>

      <ul className="px-3 mt-3 space-y-2">
        {ranked.map((r) => (
          <li
            key={r.id}
            className={`pixel-panel p-3 flex items-center gap-3 ${
              r.isMe
                ? "border-2 border-pachi-yellow animate-pulse"
                : ""
            } ${r.rank === 1 ? "border-2 border-rarity-ssr" : ""}`}
          >
            <div className="shrink-0 w-10 text-center">
              <span
                className={`font-pixel text-lg ${
                  r.rank === 1
                    ? "text-rarity-ssr"
                    : r.rank === 2
                      ? "text-white"
                      : r.rank === 3
                        ? "text-pachi-yellow"
                        : "text-white/60"
                }`}
              >
                {r.rank}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-xs text-white truncate">
                {r.name}
                {r.isMe && (
                  <span className="ml-2 text-[9px] text-pachi-yellow">
                    YOU
                  </span>
                )}
              </p>
              <p className="text-[10px] text-white/60 mt-0.5">
                店長: {r.manager} · {r.machines}台 / {r.types}機種
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-pixel text-pachi-yellow text-sm">
                {r.score.toLocaleString()}
              </p>
              <p className="text-[9px] text-white/40">スコア</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
