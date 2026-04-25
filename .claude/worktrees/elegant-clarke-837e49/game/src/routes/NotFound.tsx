import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-dvh bg-bg-base text-white flex flex-col items-center justify-center p-6 text-center">
      <p className="font-pixel text-3xl text-pachi-pink animate-blink">404</p>
      <p className="mt-4 text-sm text-white/70">ページが見つかりません</p>
      <Link to="/" className="pixel-btn mt-8 text-xs">
        ホームへ戻る
      </Link>
    </div>
  );
}
