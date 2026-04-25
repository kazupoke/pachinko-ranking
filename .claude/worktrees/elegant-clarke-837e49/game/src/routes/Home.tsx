import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";

export function Home() {
  const navigate = useNavigate();
  const shop = useGameStore((s) => s.shop);
  const user = useGameStore((s) => s.user);
  const createShop = useGameStore((s) => s.createShop);
  const claimLoginBonus = useGameStore((s) => s.claimLoginBonus);
  const loginBonus = useGameStore((s) => s.loginBonus);
  const [name, setName] = useState("");
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const claimed = loginBonus.lastClaimDate === today;

  useEffect(() => {
    if (bonusMsg) {
      const t = setTimeout(() => setBonusMsg(null), 3200);
      return () => clearTimeout(t);
    }
  }, [bonusMsg]);

  const handleClaim = () => {
    const res = claimLoginBonus();
    if (res.claimed) {
      setBonusMsg(
        `店長出勤ボーナス ¥${res.amount.toLocaleString()} 獲得！ (${res.streak}日連続)`
      );
    }
  };

  const handleCreate = () => {
    const trimmed = name.trim() || "ドットパチンコ店";
    createShop(trimmed);
    navigate("/shop");
  };

  return (
    <div className="px-4 py-6 flex flex-col gap-5">
      <section className="pixel-panel p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 scanlines pointer-events-none" />
        <h2 className="font-pixel text-[11px] text-pachi-yellow leading-relaxed">
          YOUR OWN
          <br />
          PACHINKO
          <br />
          <span className="text-pachi-pink">SHOP</span>
        </h2>
        <p className="mt-4 text-xs text-white/70 leading-relaxed">
          200台・40機種から始めて
          <br />
          SNSでシェアしてお店を育てよう
        </p>
      </section>

      {/* 出勤ボーナス */}
      <section className="pixel-panel p-4">
        <p className="font-pixel text-[11px] text-pachi-cyan mb-2">店長出勤ボーナス</p>
        <p className="text-[11px] text-white/60">
          連続 {loginBonus.streak} 日 · 本日:{" "}
          <span className={claimed ? "text-pachi-green" : "text-pachi-yellow"}>
            {claimed ? "受け取り済" : "未受け取り"}
          </span>
        </p>
        <button
          onClick={handleClaim}
          disabled={claimed}
          className="pixel-btn w-full mt-3 text-xs disabled:opacity-40"
        >
          {claimed ? "明日また出勤してね" : "出勤する"}
        </button>
        {bonusMsg && (
          <p className="mt-3 text-xs text-pachi-yellow animate-blink text-center">
            {bonusMsg}
          </p>
        )}
      </section>

      {/* 所持金 */}
      {user && (
        <section className="pixel-panel p-4 flex justify-between items-center">
          <span className="text-xs text-white/60">所持金</span>
          <span className="font-pixel text-xs text-pachi-yellow">
            ¥{user.cash.toLocaleString()}
          </span>
        </section>
      )}

      {shop ? (
        <section className="pixel-panel p-4">
          <p className="text-xs text-white/60">現在のお店</p>
          <p className="mt-1 font-pixel text-xs text-pachi-cyan">{shop.name}</p>
          <p className="mt-2 text-[11px] text-white/50">
            客数: {shop.dailyCustomers} 人 / 台数:{" "}
            {shop.layout.reduce((s, e) => s + e.count, 0)} / {shop.capacity.machines}
          </p>
          <button
            onClick={() => navigate("/shop")}
            className="pixel-btn w-full mt-4 text-xs"
          >
            マイショップへ
          </button>
        </section>
      ) : (
        <section className="pixel-panel p-4">
          <label className="text-xs text-white/70">
            店名を入力
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ドットパチンコ店"
              maxLength={20}
              className="block w-full mt-2 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
          </label>
          <button onClick={handleCreate} className="pixel-btn w-full mt-4 text-xs">
            店を開く
          </button>
        </section>
      )}

      <section className="px-1 text-[11px] text-white/40 leading-relaxed">
        <p>※ プレビュー用・開発中版です</p>
        <p>※ 保存は端末内のみ。サーバー連携は今後実装</p>
      </section>
    </div>
  );
}
