import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useGameStore } from "../stores/useGameStore";
import { MACHINES_BY_ID } from "../data/machines";
import { IconHome, IconShop, IconSlot, IconGacha, IconMystery } from "./PixelIcons";

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
    // 起動時に即1回
    tickSimulation(rarityMap);
    // その後30秒ごと
    const iv = window.setInterval(() => tickSimulation(rarityMap), 30_000);
    return () => window.clearInterval(iv);
  }, [tickSimulation]);

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base text-white">
      <header className="sticky top-0 z-20 bg-bg-panel border-b-4 border-pachi-red px-3 py-2 flex items-center justify-between">
        <NavLink to="/" className="font-pixel text-xs text-pachi-yellow leading-tight">
          マイパチ店
        </NavLink>
        <span className="font-pixel text-[10px] text-pachi-cyan">v0.0.1</span>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      {!isShopView && <BottomNav />}
    </div>
  );
}

const NAV_ITEMS = [
  { to: "/",          label: "ホーム", Icon: IconHome    },
  { to: "/shop",      label: "マイ店", Icon: IconShop    },
  { to: "/collection",label: "機種",   Icon: IconSlot    },
  { to: "/gacha",     label: "ガチャ", Icon: IconGacha   },
  { to: "/mystery",   label: "覆面",   Icon: IconMystery },
];

function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-bg-panel border-t-4 border-pachi-red z-20">
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 font-dot text-[11px] transition-colors ${
                  isActive ? "text-pachi-yellow" : "text-white/50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon size={22} className={isActive ? "text-pachi-yellow" : "text-white/50"} />
                  <span className="mt-1">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
