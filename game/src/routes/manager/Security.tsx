import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useGameStore } from "../../stores/useGameStore";

export function Security() {
  const navigate = useNavigate();
  const credentials = useGameStore((s) => s.credentials);
  const setPassword = useGameStore((s) => s.setPassword);
  const clearPassword = useGameStore((s) => s.clearPassword);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 2000);
  };

  if (!credentials) {
    return (
      <div className="pb-6">
        <PageHeader title="店舗セキュリティ" />
        <div className="px-4 pt-2">
          <button
            onClick={() => navigate("/manager")}
            className="text-[11px] text-white/60 underline"
          >
            ← 店長メニューに戻る
          </button>
        </div>
        <div className="mx-4 mt-4 pixel-panel p-4 text-center text-[11px] text-white/60">
          店舗未登録です。最初にオンボーディングを完了してください。
        </div>
      </div>
    );
  }

  const handleSet = () => {
    if (pw.length < 4) {
      flash("4 文字以上のパスワードを入力してください");
      return;
    }
    if (pw !== pw2) {
      flash("パスワードが一致しません");
      return;
    }
    setPassword(pw);
    setPw("");
    setPw2("");
    flash("パスワードを設定しました");
  };

  const handleClear = () => {
    if (!confirm("パスワードを削除しますか？仮パスワード(誕生日)に戻ります")) return;
    clearPassword();
    flash("パスワードを削除しました");
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="店舗セキュリティ"
        subtitle="ログイン情報の確認・パスワード設定"
      />

      <div className="px-4 pt-2">
        <button
          onClick={() => navigate("/manager")}
          className="text-[11px] text-white/60 underline"
        >
          ← 店長メニューに戻る
        </button>
      </div>

      {msg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-pachi-yellow text-bg-base font-dot text-xs shadow-pixel">
          {msg}
        </div>
      )}

      {/* 登録情報 */}
      <div className="px-4 mt-3">
        <div className="pixel-panel p-3 space-y-2 text-[11px]">
          <p className="font-pixel text-[10px] text-pachi-cyan mb-1">登録情報</p>
          <Row label="店舗ID (店舗名)" value={credentials.shopName} />
          <Row label="店長名" value={credentials.managerName} />
          <Row
            label="仮パスワード (生年月日)"
            value={credentials.birthday}
          />
          <Row
            label="登録日"
            value={credentials.registeredAt.slice(0, 10)}
          />
        </div>
      </div>

      {/* パスワード設定 */}
      <div className="px-4 mt-3">
        <div className="pixel-panel p-3">
          <p className="font-pixel text-[10px] text-pachi-pink mb-2">
            追加パスワード {credentials.password ? "(設定済み)" : "(未設定)"}
          </p>
          <p className="text-[10px] text-white/60 leading-relaxed mb-3">
            生年月日は誕生日が分かれば誰でもログインできてしまいます。
            <br />
            セキュリティ強化のため任意のパスワードを設定できます。
          </p>

          <label className="block mb-2">
            <span className="text-[10px] text-white/70">新しいパスワード (4 文字以上)</span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="********"
              className="block w-full mt-1 px-3 py-2 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
          </label>
          <label className="block mb-3">
            <span className="text-[10px] text-white/70">確認のため再入力</span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="********"
              className="block w-full mt-1 px-3 py-2 bg-bg-base border-2 border-bg-card text-white font-dot text-sm focus:border-pachi-pink outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleSet} className="pixel-btn text-xs">
              {credentials.password ? "変更" : "設定"}
            </button>
            <button
              onClick={handleClear}
              disabled={!credentials.password}
              className="pixel-btn-secondary text-xs disabled:opacity-30"
            >
              削除
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <p className="text-[10px] text-white/50 leading-relaxed">
          ※ 現在はローカル保存のみ。サーバー側のグローバルなユニーク確認・
          ログイン同期は実装中。
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-white/60 font-dot">{label}</span>
      <span className="font-pixel text-pachi-yellow truncate">{value}</span>
    </div>
  );
}
