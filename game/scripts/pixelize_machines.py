"""
cache/machines_original/*.jpg の原本を、レトロパチ屋パレットに量子化したドット絵に変換。

Claude Design が出したサンプル (assets/machines/pachi_*.png) の再現がゴール:
- 内部グリッド幅 32/48/64/96px (高さはアスペクト比維持)
- 16 色固定パレット (Tailwind pachi 系 + rarity 系) で最近傍量子化
- GB 風は 4 色グレー
- ネイティブ解像度で保存 (ブラウザ側で image-rendering: pixelated で拡大)

出力: game/public/machines_pixel/{machine_id}_{48|64|96|gb48}.png
"""

from __future__ import annotations
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
THUMB_JSON = ROOT / "public" / "machines_thumb.json"
SRC_DIR = ROOT / "cache" / "machines_original"
OUT_DIR = ROOT / "public" / "machines_pixel"

# Claude Design サンプルから抽出した 16 色
PACHI_PALETTE = [
    (0x0a, 0x0a, 0x14),  # bgBase
    (0x1a, 0x1a, 0x2e),  # bgPanel
    (0x22, 0x22, 0x3a),  # bgCard
    (0xff, 0xff, 0xff),  # white
    (0xb4, 0xaa, 0xbe),  # coolGray
    (0xff, 0x00, 0x66),  # red
    (0xff, 0x4d, 0x94),  # pink
    (0xff, 0xcc, 0x00),  # yellow
    (0x00, 0xff, 0x88),  # green
    (0x00, 0xe5, 0xff),  # cyan
    (0x4a, 0x6f, 0xff),  # blue
    (0xb0, 0x66, 0xff),  # purple
    (0x64, 0x3c, 0x50),  # plum
    (0x3c, 0x14, 0x28),  # darkPlum
    (0xdc, 0x64, 0x28),  # orange
    (0xff, 0xb4, 0x50),  # tan
]

# GB 風 4 色
GB_PALETTE = [
    (0x0f, 0x0f, 0x14),
    (0x50, 0x50, 0x5f),
    (0xa5, 0xa0, 0xaf),
    (0xe6, 0xe1, 0xeb),
]

SIZES_COLOR = [48, 64, 96]  # カラー版の内部グリッド幅
GB_SIZE = 48


def build_palette_image(palette: list[tuple[int, int, int]]) -> Image.Image:
    """PIL の quantize(palette=...) に渡すためのパレット画像を作る"""
    pal_img = Image.new("P", (1, 1))
    flat: list[int] = []
    for rgb in palette:
        flat.extend(rgb)
    # 256 色分まで埋める (足りない分は最後の色で埋める)
    while len(flat) < 256 * 3:
        flat.extend(palette[-1])
    pal_img.putpalette(flat)
    return pal_img


PACHI_PAL_IMG = build_palette_image(PACHI_PALETTE)
GB_PAL_IMG = build_palette_image(GB_PALETTE)


def pixelize(src: Image.Image, grid_w: int, pal_img: Image.Image, grayscale: bool = False) -> Image.Image:
    """縮小 → パレット量子化して PNG を返す (ネイティブ解像度で保存)"""
    w, h = src.size
    grid_h = max(1, round(grid_w * h / w))
    # ダウンサンプル (LANCZOS で輪郭を保ちつつ小さく)
    small = src.convert("RGB").resize((grid_w, grid_h), Image.LANCZOS)
    if grayscale:
        small = small.convert("L").convert("RGB")
    # 最近傍量子化 (ディザなし = くっきり 2D ゲーム風)
    quant = small.quantize(palette=pal_img, dither=Image.Dither.NONE)
    return quant.convert("RGB").convert("P", palette=Image.Palette.ADAPTIVE)


def process_one(mid: str, src_path: Path) -> list[Path]:
    try:
        img = Image.open(src_path)
    except Exception as e:
        print(f"[SKIP] {mid}: open failed {e}")
        return []

    outs: list[Path] = []
    for sz in SIZES_COLOR:
        out = OUT_DIR / f"{mid}_{sz}.png"
        pixelize(img, sz, PACHI_PAL_IMG, grayscale=False).save(out, optimize=True)
        outs.append(out)

    out_gb = OUT_DIR / f"{mid}_gb{GB_SIZE}.png"
    pixelize(img, GB_SIZE, GB_PAL_IMG, grayscale=True).save(out_gb, optimize=True)
    outs.append(out_gb)

    return outs


def all_outputs_exist(mid: str) -> bool:
    for sz in SIZES_COLOR:
        if not (OUT_DIR / f"{mid}_{sz}.png").exists():
            return False
    if not (OUT_DIR / f"{mid}_gb{GB_SIZE}.png").exists():
        return False
    return True


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with THUMB_JSON.open(encoding="utf-8") as f:
        mapping: dict[str, int] = json.load(f)

    # コマンドライン引数
    args = sys.argv[1:]
    force = "--force" in args
    only = set(a for a in args if a != "--force")
    if only:
        print(f"指定モード: {len(only)} 機種のみ処理")
    if force:
        print("強制再生成モード: 既存ファイルも上書き")

    total = len(mapping)
    done = 0
    skipped = 0
    missing = 0
    for i, (mid, pid) in enumerate(mapping.items(), start=1):
        if only and mid not in only and str(pid) not in only:
            continue
        src = SRC_DIR / f"{pid}.jpg"
        if not src.exists():
            missing += 1
            continue
        # 既に全出力が揃っていればスキップ (インクリメンタル対応)
        if not force and all_outputs_exist(mid):
            skipped += 1
            continue
        outs = process_one(mid, src)
        if outs:
            done += 1
            if done % 20 == 0 or only:
                print(f"[{i:4d}/{total}] {mid} -> {len(outs)} files")

    print(f"\n完了: 新規 {done} / スキップ {skipped} / 原本なし {missing}")
    print(f"出力先: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
