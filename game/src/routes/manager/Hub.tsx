import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useGameStore } from "../../stores/useGameStore";

interface MenuItem {
  to: string;
  label: string;
  desc: string;
  emoji: string;
  accent: string;
}

const MENU: MenuItem[] = [
  {
    to: "/manager/inspect",
    label: "覆面調査",
    desc: "他店を訪問して報酬を受け取る",
    emoji: "🕵️",
    accent: "border-pachi-cyan",
  },
  {
    to: "/manager/shop",
    label: "看板を買う",
    desc: "店舗の看板バナーを購入・設定",
    emoji: "🪧",
    accent: "border-pachi-yellow",
  },
  {
    to: "/manager/sell",
    label: "台の売却",
    desc: "所持している台を売って現金化",
    emoji: "💴",
    accent: "border-pachi-green",
  },
  {
    to: "/manager/maintain",
    label: "メンテナンス",
    desc: "故障した台を修理する",
    emoji: "🔧",
    accent: "border-pachi-pink",
  },
];

export function ManagerHub() {
  const navigate = useNavigate();
  const user = useGameStore((s) => s.user);

  return (
    <div>
      <PageHeader
        title="店長メニュー"
        subtitle={`所持金 ¥${(user?.cash ?? 0).toLocaleString()}`}
      />
      <ul className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MENU.map((m) => (
          <li key={m.to}>
            <button
              onClick={() => navigate(m.to)}
              className={`w-full pixel-panel p-4 border-2 ${m.accent} text-left flex items-center gap-3`}
            >
              <span className="text-3xl shrink-0">{m.emoji}</span>
              <div className="min-w-0">
                <p className="font-pixel text-xs text-white">{m.label}</p>
                <p className="text-[10px] text-white/60 mt-1 leading-relaxed">
                  {m.desc}
                </p>
              </div>
              <span className="ml-auto font-pixel text-pachi-yellow shrink-0">▶</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
