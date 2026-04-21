"""
p-world から全機種のサムネ画像を game/cache/machines_original/ に DL する。

- machines_thumb.json を元にループ
- 既に DL 済みのファイルはスキップ (レジューム対応)
- リクエスト間に 0.6 秒 sleep (p-world 負荷配慮)
- 404 / 失敗は失敗ログに記録して続行
- 原本はコミットしない (cache/ は .gitignore 済み)
"""

from __future__ import annotations
import json
import sys
import time
from pathlib import Path
from curl_cffi import requests

ROOT = Path(__file__).parent.parent
THUMB_JSON = ROOT / "public" / "machines_thumb.json"
OUT_DIR = ROOT / "cache" / "machines_original"
FAIL_LOG = ROOT / "cache" / "download_failures.txt"

URL_TMPL = "https://idn.p-world.co.jp/machines/{pid}/image/thumb_1.jpg"
SLEEP_SEC = 0.4  # curl_cffi は高速 (chrome 偽装でボット判定回避)
TIMEOUT_SEC = 15


def fetch_one(pworld_id: int, out_path: Path) -> tuple[bool, str]:
    url = URL_TMPL.format(pid=pworld_id)
    try:
        r = requests.get(
            url,
            impersonate="chrome",
            timeout=TIMEOUT_SEC,
            headers={"Referer": "https://www.p-world.co.jp/"},
        )
    except Exception as e:
        return False, f"ERR {type(e).__name__}: {e}"

    if r.status_code != 200:
        return False, f"HTTP {r.status_code}"

    data = r.content
    if len(data) < 500:
        return False, f"TOO_SMALL ({len(data)}B)"

    out_path.write_bytes(data)
    return True, "OK"


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with THUMB_JSON.open(encoding="utf-8") as f:
        mapping: dict[str, int] = json.load(f)

    total = len(mapping)
    print(f"対象: {total} 機種 / 保存先: {OUT_DIR}")

    done = 0
    skipped = 0
    failed: list[tuple[str, int, str]] = []

    for i, (mid, pid) in enumerate(mapping.items(), start=1):
        out_path = OUT_DIR / f"{pid}.jpg"
        if out_path.exists() and out_path.stat().st_size > 500:
            skipped += 1
            continue

        ok, msg = fetch_one(pid, out_path)
        if ok:
            done += 1
            print(f"[{i:4d}/{total}] OK  {mid} -> {pid}.jpg ({out_path.stat().st_size // 1024}KB)")
        else:
            failed.append((mid, pid, msg))
            print(f"[{i:4d}/{total}] NG  {mid} pid={pid} {msg}")

        time.sleep(SLEEP_SEC)

    print(f"\n完了: 新規 DL {done} / スキップ {skipped} / 失敗 {len(failed)}")

    if failed:
        with FAIL_LOG.open("w", encoding="utf-8") as f:
            for mid, pid, msg in failed:
                f.write(f"{mid}\t{pid}\t{msg}\n")
        print(f"失敗ログ: {FAIL_LOG}")

    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
