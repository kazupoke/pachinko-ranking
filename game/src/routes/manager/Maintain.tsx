import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";

/**
 * メンテナンス画面 (台 / 設備の故障修理)
 * 故障システム (液晶割れ・レバー故障・基盤故障 等 + 設備故障) は次のPRで実装。
 */
export function Maintain() {
  const navigate = useNavigate();

  return (
    <div className="pb-6">
      <PageHeader
        title="メンテナンス"
        subtitle="台と設備の故障を修理する"
      />

      <div className="px-4 pt-2">
        <button
          onClick={() => navigate("/manager")}
          className="text-[11px] text-white/60 underline"
        >
          ← 店長メニューに戻る
        </button>
      </div>

      <div className="mx-4 mt-4 pixel-panel p-4 text-center">
        <p className="font-pixel text-xs text-pachi-yellow mb-3">
          🔧 COMING SOON
        </p>
        <p className="text-[11px] text-white/70 leading-relaxed">
          台と設備に「ライフ」が導入され、
          <br />
          稼働で徐々に消耗・故障するようになります。
        </p>
        <p className="mt-3 text-[10px] text-white/50 leading-relaxed">
          故障種別:
          <br />
          ・液晶割れ / レバー故障 / 基盤故障 / ボタン不良 (台)
          <br />
          ・床 / トイレ / 駐車場 / 空調 / カウンター (設備)
        </p>
        <p className="mt-3 text-[10px] text-white/50">
          このページで修理コストを払って復旧できるようになります。
        </p>
      </div>
    </div>
  );
}
