import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";

type Mode = "menu" | "login";

export function Title() {
  const navigate = useNavigate();
  const credentials = useGameStore((s) => s.credentials);
  const shop = useGameStore((s) => s.shop);
  const resetAll = useGameStore((s) => s.resetAll);

  const [mode, setMode] = useState<Mode>("menu");

  const hasSave = !!shop && !!credentials;

  const handleNewGame = () => {
    if (hasSave) {
      if (
        !confirm(
          "現在のセーブデータをリセットしてはじめからプレイしますか？\n(店舗・倉庫・常連すべて消えます)"
        )
      )
        return;
    }
    resetAll();
    navigate("/onboarding");
  };

  const handleContinue = () => {
    if (!hasSave) return;
    navigate("/shop");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0a0420] to-[#1a0a3a] relative overflow-hidden flex flex-col items-center justify-center px-6 py-10">
      {/* 背景の星 */}
      <Stars />

      <div className="relative max-w-md w-full">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-block rainbow-gradient animate-rainbow-bg px-6 py-3 border-4 border-black animate-ssr-glow">
            <p className="font-pixel text-2xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] tracking-wider">
              ★ マイパチ店 ★
            </p>
          </div>
          <p className="mt-3 font-pixel text-[10px] text-pachi-yellow animate-blink">
            TITLE SCREEN
          </p>
        </div>

        {mode === "menu" ? (
          <MenuView
            hasSave={hasSave}
            credentials={credentials}
            onNewGame={handleNewGame}
            onContinue={handleContinue}
            onLogin={() => setMode("login")}
          />
        ) : (
          <LoginForm onBack={() => setMode("menu")} />
        )}
      </div>
    </div>
  );
}

function MenuView({
  hasSave,
  credentials,
  onNewGame,
  onContinue,
  onLogin,
}: {
  hasSave: boolean;
  credentials: { shopName: string; managerName: string } | null;
  onNewGame: () => void;
  onContinue: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* 現在のセーブ表示 */}
      {hasSave && credentials && (
        <div className="pixel-panel p-3 border-2 border-pachi-cyan">
          <p className="font-pixel text-[10px] text-pachi-cyan mb-1">SAVE DATA</p>
          <p className="font-pixel text-xs text-pachi-yellow">
            {credentials.shopName}
          </p>
          <p className="text-[11px] text-white/70 mt-0.5">
            店長: {credentials.managerName}
          </p>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!hasSave}
        className="pixel-btn w-full py-4 text-sm disabled:opacity-30"
      >
        ▶ つづきから
      </button>

      <button
        onClick={onNewGame}
        className="pixel-btn-secondary w-full py-4 text-sm"
      >
        はじめから
      </button>

      <button
        onClick={onLogin}
        className="pixel-btn-secondary w-full py-3 text-xs"
      >
        🔐 ログイン (店舗名 + 誕生日)
      </button>

      <p className="mt-4 text-[10px] text-white/40 text-center leading-relaxed">
        ※ ログインは現状ローカルのみ。
        <br />
        サーバー対応は順次。
      </p>
    </div>
  );
}

function LoginForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const credentials = useGameStore((s) => s.credentials);
  const [shopName, setShopName] = useState("");
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const handleLogin = () => {
    if (!credentials) {
      setMsg("ローカルにセーブデータがありません");
      return;
    }
    if (shopName.trim() !== credentials.shopName) {
      setMsg("店舗名が一致しません");
      return;
    }
    // パスワードが設定されていれば優先、なければ誕生日チェック
    const expected = credentials.password || credentials.birthday;
    if (secret !== expected) {
      setMsg("パスワード/誕生日が一致しません");
      return;
    }
    navigate("/shop");
  };

  return (
    <div className="pixel-panel p-4 space-y-3">
      <p className="font-pixel text-[10px] text-pachi-pink">ログイン</p>
      <p className="text-[10px] text-white/60 leading-relaxed">
        店舗名 (ID) + 誕生日 (YYYY-MM-DD) または設定したパスワードでログイン
      </p>

      <label className="block">
        <span className="text-[10px] text-white/70">店舗名</span>
        <input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="店舗名を入力"
          className="block w-full mt-1 px-3 py-2 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
        />
      </label>

      <label className="block">
        <span className="text-[10px] text-white/70">
          パスワード / 誕生日 (YYYY-MM-DD)
        </span>
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="********"
          className="block w-full mt-1 px-3 py-2 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
        />
      </label>

      {msg && (
        <p className="text-[11px] text-pachi-red font-pixel animate-blink">
          {msg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={onBack} className="pixel-btn-secondary text-xs">
          戻る
        </button>
        <button onClick={handleLogin} className="pixel-btn text-xs">
          ログイン
        </button>
      </div>
    </div>
  );
}

function Stars() {
  const stars = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: (i * 37) % 100,
    y: (i * 53) % 100,
    delay: (i % 5) * 0.4,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute w-1 h-1 bg-white animate-pulse"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
