import { useGameStore } from "../stores/useGameStore";

/**
 * 売上 / 支出ダッシュボード (基本情報用)
 * 実装中の値以外はプレースホルダ。実装に合わせて差し替え予定。
 */
export function ShopDashboard() {
  const shop = useGameStore((s) => s.shop);
  const user = useGameStore((s) => s.user);

  if (!shop) return null;

  const totalMachines = shop.layout.reduce((s, e) => s + e.count, 0);
  // プレースホルダ: 実装次第で差し替え
  const monthlyCustomers = shop.totalCustomers; // 現状は累計をそのまま
  const todayRevenue = shop.dailyCustomers * 5_000;
  const monthlyRevenue = todayRevenue * 30;
  const monthlyRent = 1_500_000;
  const monthlyElectric = 800_000;
  const monthlyLabor = 2_400_000;
  const monthlyMaintenance = 0;
  const monthlyEvent = 0;
  const monthlyEquipment = 0;
  const monthlyExpense =
    monthlyRent + monthlyElectric + monthlyLabor + monthlyMaintenance + monthlyEvent + monthlyEquipment;
  const monthlyProfit = monthlyRevenue - monthlyExpense;
  const managerSavings = 0; // 店長コスト削減額 (仮)
  const playingNow = Math.min(totalMachines, Math.floor(shop.dailyCustomers / 4));

  return (
    <div className="px-4 mt-3">
      <div className="pixel-panel p-3">
        <p className="font-pixel text-[10px] text-pachi-cyan mb-2">経営ダッシュボード</p>

        {/* 客数 */}
        <Section label="客数">
          <Item label="現在遊戯中" value={`${playingNow} 名`} />
          <Item label="今日の来店" value={shop.dailyCustomers.toLocaleString() + " 名"} />
          <Item label="累計来店" value={shop.totalCustomers.toLocaleString() + " 名"} />
          <Item
            label="今月の来店"
            value={monthlyCustomers.toLocaleString() + " 名"}
            placeholder
          />
        </Section>

        {/* 売上 */}
        <Section label="売上">
          <Item
            label="今日の売上"
            value={"¥" + todayRevenue.toLocaleString()}
            color="text-pachi-green"
            placeholder
          />
          <Item
            label="今月の売上"
            value={"¥" + monthlyRevenue.toLocaleString()}
            color="text-pachi-green"
            placeholder
          />
        </Section>

        {/* 支出内訳 */}
        <Section label="今月の支出">
          <Item
            label="家賃"
            value={"¥" + monthlyRent.toLocaleString()}
            color="text-pachi-pink"
            placeholder
          />
          <Item
            label="電気代"
            value={"¥" + monthlyElectric.toLocaleString()}
            color="text-pachi-pink"
            placeholder
          />
          <Item
            label="人件費"
            value={"¥" + monthlyLabor.toLocaleString()}
            color="text-pachi-pink"
            placeholder
          />
          <Item
            label="修繕費"
            value={"¥" + monthlyMaintenance.toLocaleString()}
            placeholder
          />
          <Item
            label="イベント費"
            value={"¥" + monthlyEvent.toLocaleString()}
            placeholder
          />
          <Item
            label="設備投資"
            value={"¥" + monthlyEquipment.toLocaleString()}
            placeholder
          />
          <Item
            label="支出合計"
            value={"¥" + monthlyExpense.toLocaleString()}
            color="text-pachi-red"
            placeholder
          />
        </Section>

        {/* 損益 */}
        <Section label="損益">
          <Item
            label="今月の利益"
            value={"¥" + monthlyProfit.toLocaleString()}
            color={monthlyProfit >= 0 ? "text-pachi-green" : "text-pachi-red"}
            placeholder
          />
          <Item
            label="店長の節約額"
            value={"¥" + managerSavings.toLocaleString()}
            placeholder
          />
        </Section>

        {/* 所持金 */}
        <div className="mt-3 pt-2 border-t border-bg-card flex justify-between items-baseline">
          <span className="font-pixel text-[10px] text-pachi-yellow">店の現金</span>
          <span className="font-pixel text-pachi-yellow text-sm">
            ¥{(user?.cash ?? 0).toLocaleString()}
          </span>
        </div>

        <p className="mt-2 text-[9px] text-white/40">
          ※ ⚠ 印は実装中の概算値です
        </p>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="font-pixel text-[9px] text-white/50 mt-2 mb-1">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({
  label,
  value,
  color = "text-white",
  placeholder,
}: {
  label: string;
  value: string;
  color?: string;
  placeholder?: boolean;
}) {
  return (
    <div className="flex justify-between text-[11px] py-0.5">
      <span className="text-white/60 font-dot">
        {label}
        {placeholder && <span className="text-pachi-yellow ml-1">⚠</span>}
      </span>
      <span className={`font-pixel ${color}`}>{value}</span>
    </div>
  );
}
