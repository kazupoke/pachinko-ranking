import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useGameStore } from "../stores/useGameStore";
import { MACHINES_BY_ID } from "../data/machines";

export function AppLayout() {
  const initUser = useGameStore((s) => s.initUser);
  const tickSimulation = useGameStore((s) => s.tickSimulation);
  const location = useLocation();
  const isShopView = location.pathname.startsWith("/s/");

  useEffect(() => {
    initUser();
  }, [initUser]);

  useEffect(() => {
    const rarityMap: Record<string, "N" | "R" | "SR" | "SSR"> = {};
    for (const id in MACHINES_BY_ID) {
      rarityMap[id] = MACHINES_BY_ID[id].rarity;
    }
    tickSimulation(rarityMap);
    const iv = window.setInterval(() => tickSimulation(rarityMap), 30_000);
    return () => window.clearInterval(iv);
  }, [tickSimulation]);

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base text-white">
      {/* P-World 風: 上部ヘッダ (店ロゴバナー) */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-pachi-red to-[#c5004f] border-b-4 border-black">
        <div className="px-3 py-1.5 flex items-center justify-between">
          <NavLink
            to="/"
            className="font-pixel text-[13px] text-white leading-none tracking-wider drop-shadow-[1px_1px_0_rgba(0,0,0,0.7)] flex items-center gap-2"
          >
            <span className="text-pachi-yellow">★</span>
            <span>マイパチ店</span>
          </NavLink>
          <CashDisplay />
        </div>
        {/* 細いライン (P-World 看板の二重線風) */}
        <div className="h-[2px] bg-pachi-yellow" />
      </header>

      {/* P-World 風: 上部メニュータブ (横スクロール) */}
      {!isShopView && <TopNav />}

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function CashDisplay() {
  const user = useGameStore((s) => s.user);
  if (!user) return <span className="font-pixel text-[10px] text-white/70">v0.0.1</span>;
  return (
    <div className="font-pixel text-[10px] text-pachi-yellow bg-black/40 px-2 py-1 border border-pachi-yellow/50">
      ¥{user.cash.toLocaleString()}
    </div>
  );
}

const NAV_ITEMS = [
  { to: "/shop",       label: "基本情報" },
  { to: "/",           label: "最新情報" },
  { to: "/collection", label: "パチスロ" },
  { to: "/gacha",      label: "新台!!" },
  { to: "/ranking",    label: "ランキング" },
  { to: "/manager",    label: "店長" },
];

function TopNav() {
  return (
    <nav className="sticky top-[40px] z-20 bg-white border-b-4 border-black overflow-x-auto">
      <ul className="flex">
        {NAV_ITEMS.map((item, idx) => (
          <li key={item.to} className="shrink-0 flex">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 font-dot text-[12px] whitespace-nowrap font-bold transition-colors ${
                  isActive
                    ? "bg-pachi-red text-white"
                    : "bg-white text-bg-base hover:bg-pachi-yellow/20"
                }`
              }
            >
              {item.label}
            </NavLink>
            {idx < NAV_ITEMS.length - 1 && (
              <div className="w-[2px] bg-black" />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
