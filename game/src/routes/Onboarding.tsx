import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../stores/useGameStore";
import { useLiteStore } from "../stores/useLiteStore";
import { LitePicker } from "./lite/Picker";

type Phase = "welcome" | "transition" | "intro" | "pick" | "register";

export function Onboarding() {
  const navigate = useNavigate();
  const initUser = useGameStore((s) => s.initUser);
  const createFullShop = useGameStore((s) => s.createShop);
  const registerShop = useGameStore((s) => s.registerShop);
  const setDream = useGameStore((s) => s.setDreamMachines);
  const liteShop = useLiteStore((s) => s.shop);
  const liteCreate = useLiteStore((s) => s.createShop);
  const [phase, setPhase] = useState<Phase>("welcome");

  useEffect(() => {
    initUser();
  }, [initUser]);

  const handlePickDone = () => {
    setPhase("register");
  };

  const handleRegisterDone = (info: {
    shopName: string;
    managerName: string;
    birthday: string;
  }) => {
    if (!liteShop) return;
    setDream(liteShop.entries);
    createFullShop(info.shopName);
    registerShop(info);
    navigate("/shop");
  };

  if (phase === "welcome") {
    return <WelcomePhase onEnter={() => setPhase("transition")} />;
  }
  if (phase === "transition") {
    return <TransitionPhase onComplete={() => setPhase("intro")} />;
  }
  if (phase === "intro") {
    return (
      <IntroPhase
        onNext={() => {
          if (!liteShop) liteCreate("マイ・ドリームホール");
          setPhase("pick");
        }}
      />
    );
  }
  if (phase === "pick") {
    return <PickPhase onDone={handlePickDone} />;
  }
  return <RegisterPhase onDone={handleRegisterDone} />;
}

// ============================================================
// Phase 5: Register (店舗名 / 店長名 / 誕生日)
// ============================================================

function RegisterPhase({
  onDone,
}: {
  onDone: (info: {
    shopName: string;
    managerName: string;
    birthday: string;
  }) => void;
}) {
  const liteShop = useLiteStore((s) => s.shop);
  const [shopName, setShopName] = useState(
    liteShop?.name && liteShop.name !== "マイ・ドリームホール" ? liteShop.name : ""
  );
  const [managerName, setManagerName] = useState("");
  const [birthday, setBirthday] = useState("");

  const trimmedShop = shopName.trim();
  const trimmedManager = managerName.trim();
  const ready =
    trimmedShop.length >= 1 &&
    trimmedManager.length >= 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthday);

  return (
    <div className="min-h-dvh bg-bg-base relative px-6 py-8">
      <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
      <div className="relative max-w-md mx-auto">
        <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest text-center mb-2">
          STEP 3 / 3 · 店舗登録
        </p>
        <h1 className="font-pixel text-lg text-center leading-tight mb-2">
          <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
            あなたの店舗を世界に登録
          </span>
        </h1>
        <p className="text-[11px] text-white/60 text-center leading-relaxed">
          店舗名は世界で 1 つ。
          <br />
          誕生日は仮パスワードとして使われます。
        </p>

        <div className="pixel-panel p-4 mt-5 space-y-4">
          <label className="block">
            <span className="text-xs text-pachi-cyan font-pixel">店舗名 (ID)</span>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="例: 銀河パーク本店"
              maxLength={20}
              className="block w-full mt-1 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
            <span className="block text-[10px] text-white/50 mt-1">
              他の店長と被らないユニークな名前を
            </span>
          </label>

          <label className="block">
            <span className="text-xs text-pachi-pink font-pixel">店長名</span>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="例: にとう"
              maxLength={20}
              className="block w-full mt-1 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs text-pachi-yellow font-pixel">
              店長の生年月日 (仮パスワード)
            </span>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="block w-full mt-1 px-3 py-3 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
            <span className="block text-[10px] text-white/50 mt-1">
              ※ 後から店長メニューでパスワードを設定できます
            </span>
          </label>
        </div>

        <button
          onClick={() =>
            onDone({
              shopName: trimmedShop,
              managerName: trimmedManager,
              birthday,
            })
          }
          disabled={!ready}
          className="pixel-btn w-full mt-6 py-4 text-sm disabled:opacity-30 animate-rolling-pulse"
          style={{ animationDuration: "1.4s" }}
        >
          ▶ ゲームスタート
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Phase 1: Welcome (ネオン店 + ENTER)
// ============================================================

function WelcomePhase({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0a0420] to-[#1a0a3a] relative overflow-hidden flex flex-col items-center justify-end pb-12 pt-6 px-4">
      <Stars />
      <div
        className="absolute top-12 right-12 w-14 h-14 bg-pachi-yellow opacity-80"
        style={{ borderRadius: "50%" }}
      />

      {/* タイトルロゴ */}
      <div className="relative mb-2">
        <div className="rainbow-gradient animate-rainbow-bg px-6 py-3 border-4 border-black animate-ssr-glow">
          <p className="font-pixel text-xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] tracking-wider">
            ★ マイパチ店 ★
          </p>
        </div>
        <p className="mt-2 text-center font-pixel text-[10px] text-pachi-yellow animate-blink">
          NEON CITY
        </p>
      </div>

      <PachiBuilding />

      <div className="relative mt-2 flex flex-col items-center">
        <ManagerCharacter />
      </div>

      <button
        onClick={onEnter}
        className="mt-6 pixel-btn text-sm py-4 px-8 animate-rolling-pulse"
        style={{ animationDuration: "1.4s" }}
      >
        ▶ パチ屋店長になろう
      </button>
    </div>
  );
}

function Stars() {
  const stars = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: (i * 37) % 100,
    y: (i * 53) % 50,
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

function PachiBuilding() {
  return (
    <svg
      viewBox="0 0 240 160"
      className="w-72 max-w-full"
      style={{ imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
    >
      <rect x="20" y="40" width="200" height="110" fill="#1a1a2e" />
      <rect x="20" y="40" width="200" height="6" fill="#ff0066" />
      <rect x="40" y="50" width="160" height="28" fill="#ffcc00" />
      <rect x="44" y="54" width="152" height="20" fill="#0a0a14" />
      <text
        x="120"
        y="64"
        fontSize="9"
        fill="#ff0066"
        fontFamily='"Press Start 2P", monospace'
        textAnchor="middle"
      >
        PACHINKO
      </text>
      <text
        x="120"
        y="73"
        fontSize="7"
        fill="#00e5ff"
        fontFamily='"DotGothic16", monospace'
        textAnchor="middle"
      >
        スロット
      </text>
      <rect x="22" y="80" width="6" height="60" fill="#00e5ff">
        <animate
          attributeName="opacity"
          values="0.3;1;0.3"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="212" y="80" width="6" height="60" fill="#ff4d94">
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </rect>
      {[60, 100, 140, 180].map((x, i) => (
        <g key={i}>
          <rect x={x - 12} y="85" width="24" height="18" fill="#22223a" />
          <rect x={x - 10} y="87" width="20" height="14" fill="#ffcc00">
            <animate
              attributeName="opacity"
              values="0.7;1;0.7"
              dur={`${1 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </rect>
        </g>
      ))}
      <rect x="100" y="115" width="40" height="35" fill="#0a0a14" />
      <rect x="104" y="118" width="32" height="30" fill="#00e5ff" opacity="0.5">
        <animate
          attributeName="opacity"
          values="0.3;0.7;0.3"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="103" y="108" width="34" height="6" fill="#ffcc00" />
      <text
        x="120"
        y="113"
        fontSize="4"
        fill="#000"
        fontFamily='"Press Start 2P", monospace'
        textAnchor="middle"
      >
        ENTER
      </text>
    </svg>
  );
}

function ManagerCharacter() {
  return (
    <svg
      viewBox="0 0 16 24"
      width="48"
      height="72"
      style={{ imageRendering: "pixelated" }}
      shapeRendering="crispEdges"
    >
      <rect x="4" y="2" width="8" height="3" fill="#ff0066" />
      <rect x="3" y="3" width="10" height="2" fill="#ff0066" />
      <rect x="5" y="5" width="6" height="4" fill="#ffd9b4" />
      <rect x="6" y="7" width="1" height="1" fill="#000" />
      <rect x="9" y="7" width="1" height="1" fill="#000" />
      <rect x="6" y="9" width="4" height="1" fill="#ffcc00" />
      <rect x="3" y="10" width="10" height="6" fill="#1a1a2e" />
      <rect x="5" y="11" width="6" height="4" fill="#fff" />
      <rect x="2" y="11" width="1" height="4" fill="#1a1a2e" />
      <rect x="13" y="11" width="1" height="4" fill="#1a1a2e" />
      <rect x="2" y="14" width="1" height="2" fill="#ffd9b4" />
      <rect x="13" y="14" width="1" height="2" fill="#ffd9b4" />
      <rect x="5" y="16" width="2" height="6" fill="#22223a" />
      <rect x="9" y="16" width="2" height="6" fill="#22223a" />
      <rect x="5" y="22" width="2" height="2" fill="#000" />
      <rect x="9" y="22" width="2" height="2" fill="#000" />
    </svg>
  );
}

// ============================================================
// Phase 2: Transition (white-out)
// ============================================================

function TransitionPhase({ onComplete }: { onComplete: () => void }) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(1), 50);
    const t2 = setTimeout(() => onComplete(), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);
  return (
    <div className="min-h-dvh relative overflow-hidden bg-bg-base">
      <div
        className="absolute inset-0 bg-white transition-opacity duration-1000"
        style={{ opacity }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center font-pixel text-2xl text-bg-base transition-opacity duration-700"
        style={{ opacity: opacity > 0.5 ? 1 : 0 }}
      >
        ENTERING...
      </div>
    </div>
  );
}

// ============================================================
// Phase 3: Intro (世界観)
// ============================================================

function IntroPhase({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-dvh bg-bg-base relative px-6 py-8">
      <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
      <div className="relative max-w-md mx-auto">
        <p className="font-pixel text-[10px] text-pachi-cyan tracking-widest text-center mb-2">
          STEP 1 / 2 · 世界観
        </p>
        <h1 className="font-pixel text-lg text-center leading-tight">
          <span className="rainbow-gradient animate-rainbow-bg bg-clip-text text-transparent">
            まずは、自分の理想の店舗を
          </span>
          <br />
          <span className="text-pachi-yellow">決めましょう</span>
        </h1>

        <div className="mt-6 pixel-panel p-4 text-[12px] leading-relaxed text-white/85 space-y-3">
          <p>
            この世界では、SNS で{" "}
            <span className="text-pachi-pink">店長が自分の店を宣伝</span> する時代。
          </p>
          <p>
            <span className="text-pachi-yellow font-pixel text-xs">
              100台 / 25機種
            </span>{" "}
            は店長の好きな台で、
            <br />
            それが <span className="text-pachi-cyan">「お店の方針」</span> になる。
          </p>
          <p>
            お客はそれを見て店を選ぶ。
            <br />
            <span className="text-pachi-pink font-pixel text-xs">
              推し店長
            </span>{" "}
            のいる店が超人気。
          </p>
          <p className="border-t-2 border-bg-card pt-3">
            目指すのは{" "}
            <span className="text-pachi-yellow font-pixel">世界一の店舗</span> と
            <br />
            <span className="text-pachi-yellow font-pixel">世界一の店長</span>。
          </p>
          <p className="text-[10px] text-white/60">
            あなたが選ぶ機種は、
            <br />
            <span className="text-pachi-cyan">あなたの理想店プロフィール</span>{" "}
            として
            <br />
            世界中に共有されます。
          </p>
        </div>

        <button
          onClick={onNext}
          className="pixel-btn w-full mt-6 py-4 text-sm animate-rolling-pulse"
          style={{ animationDuration: "1.4s" }}
        >
          ▶ 機種を選ぶ
        </button>
        <p className="mt-3 text-center text-[10px] text-white/50">
          STEP 2: 100台 / 25機種を選択 →
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Phase 4: Pick (LitePicker をラップ)
// ============================================================

function PickPhase({ onDone }: { onDone: () => void }) {
  const liteShop = useLiteStore((s) => s.shop);
  const totalMachines = liteShop
    ? Object.values(liteShop.entries).reduce((a, b) => a + b, 0)
    : 0;
  const totalKinds = liteShop ? Object.keys(liteShop.entries).length : 0;
  const ready = totalKinds > 0;

  return (
    <div className="relative pb-20">
      <LitePicker />
      <div className="fixed bottom-0 inset-x-0 z-30 px-4 py-3 bg-bg-panel/95 border-t-4 border-pachi-yellow backdrop-blur-sm">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <div className="flex-1 text-[10px]">
            <p className="font-pixel text-pachi-cyan">
              {totalMachines}/100台 · {totalKinds}/25機種
            </p>
            <p className="text-white/60">
              {ready
                ? "プロフィール完成! 本格モードへ"
                : "1 機種以上を選んでください"}
            </p>
          </div>
          <button
            onClick={onDone}
            disabled={!ready}
            className="pixel-btn text-xs py-3 px-4 disabled:opacity-30"
          >
            開店!
          </button>
        </div>
      </div>
    </div>
  );
}
