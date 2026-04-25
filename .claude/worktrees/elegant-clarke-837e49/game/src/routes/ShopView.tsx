import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

export function ShopView() {
  const { shopId } = useParams();
  return (
    <div>
      <PageHeader
        title="ゲストビュー"
        subtitle={`shopId: ${shopId}（サーバー連携後に実装）`}
      />
      <div className="px-4 py-6 text-center text-sm text-white/60">
        <p>このページからリンクを踏むと</p>
        <p className="mt-1">店長の店に客が入ります。</p>
        <Link to="/" className="inline-block mt-6 pixel-btn-secondary text-xs">
          自分もお店を作る
        </Link>
      </div>
    </div>
  );
}
