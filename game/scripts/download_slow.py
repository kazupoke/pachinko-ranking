"""
download_machine_images.py のラッパー: ゆっくり・bot 検知耐性版。

通常の download_machine_images.py から fetch_one を流用し、以下を強化:
- 基本 sleep 6 秒 + ジッタ ±2 秒
- 非 200 / TOO_SMALL を bot 検知の可能性ありとみなし、連続失敗時は指数バックオフ
- 連続成功で sleep を少しずつ短縮 (4 秒下限)
- 進捗を逐次 cache/download_progress.txt に書き出し (バックグラウンド実行時の可視化用)
- 中断・再開対応 (既存ファイルはスキップ)

使い方:
  python game/scripts/download_slow.py
"""
from __future__ import annotations
import json
import random
import sys
import time
from pathlib import Path

# 同階層のスクリプトを import
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from download_machine_images import fetch_one  # type: ignore

ROOT = HERE.parent
THUMB_JSON = ROOT / "public" / "machines_thumb.json"
OUT_DIR = ROOT / "cache" / "machines_original"
FAIL_LOG = ROOT / "cache" / "download_failures.txt"
PROGRESS = ROOT / "cache" / "download_progress.txt"

BASE_SLEEP = 6.0
MIN_SLEEP = 4.0
MAX_SLEEP = 60.0
JITTER = 2.0
COOLDOWN_AFTER = 5  # 連続失敗 5 回でクールダウン
COOLDOWN_SEC = 600  # 10 分


def write_progress(line: str) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with PROGRESS.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {line}\n")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with THUMB_JSON.open(encoding="utf-8") as f:
        mapping: dict[str, int] = json.load(f)

    total = len(mapping)
    write_progress(f"START total={total}")
    print(f"対象: {total} 機種 / 保存先: {OUT_DIR}")

    sleep_sec = BASE_SLEEP
    consecutive_fail = 0
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
            consecutive_fail = 0
            sleep_sec = max(MIN_SLEEP, sleep_sec - 0.2)
            line = f"[{i:4d}/{total}] OK  {mid} -> {pid}.jpg ({out_path.stat().st_size // 1024}KB) sleep={sleep_sec:.1f}"
            print(line)
            write_progress(line)
        else:
            consecutive_fail += 1
            failed.append((mid, pid, msg))
            sleep_sec = min(MAX_SLEEP, sleep_sec * 1.5)
            line = f"[{i:4d}/{total}] NG  {mid} pid={pid} {msg} sleep={sleep_sec:.1f} consecutive_fail={consecutive_fail}"
            print(line)
            write_progress(line)
            if consecutive_fail >= COOLDOWN_AFTER:
                cool = COOLDOWN_SEC
                write_progress(f"COOLDOWN {cool}s due to {consecutive_fail} consecutive failures")
                print(f"  ... クールダウン {cool}s")
                time.sleep(cool)
                consecutive_fail = 0
                sleep_sec = BASE_SLEEP

        # ジッタ付きスリープ
        actual = max(0.5, sleep_sec + random.uniform(-JITTER, JITTER))
        time.sleep(actual)

    summary = f"DONE 新規DL {done} / スキップ {skipped} / 失敗 {len(failed)}"
    print(f"\n{summary}")
    write_progress(summary)

    if failed:
        with FAIL_LOG.open("w", encoding="utf-8") as f:
            for mid, pid, msg in failed:
                f.write(f"{mid}\t{pid}\t{msg}\n")
        print(f"失敗ログ: {FAIL_LOG}")

    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
