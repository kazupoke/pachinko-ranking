"""
神奈川県パチンコ店 全店舗リスト作成スクリプト
hall-naviから全HIDを取得し、各ページから店名・住所を収集
神奈川県の店舗のみをフィルターしてJSONファイルに保存
"""

import io
import json
import os
import random
import re
import sys
import time
from curl_cffi import requests
from bs4 import BeautifulSoup

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def fetch_kanagawa_hids():
    """ランキングページから全HIDを取得"""
    all_hids = set()
    page = 1
    while True:
        url = f"https://hall-navi.com/osusume_list?ken=2&page={page}&area=kanto"
        try:
            resp = requests.get(url, impersonate="chrome", timeout=30)
            soup = BeautifulSoup(resp.text, "html.parser")
            new_hids = set()
            for a in soup.select('a[href*="hole_view"]'):
                href = a.get("href", "")
                if "hid=" in href:
                    hid = href.split("hid=")[1].split("&")[0]
                    new_hids.add(hid)
            before = len(all_hids)
            all_hids.update(new_hids)
            if len(all_hids) == before:
                break
            page += 1
            time.sleep(2)
        except Exception:
            break
    return sorted(all_hids)


def get_store_info(hid):
    """店舗ページから店名・住所・P-Worldリンクを取得"""
    url = f"https://hall-navi.com/hole_view?hid={hid}"
    resp = requests.get(url, impersonate="chrome", timeout=30)
    text = resp.content.decode("utf-8", errors="replace")
    soup = BeautifulSoup(text, "html.parser")

    name_el = soup.select_one("h1.box_hole_view_hole_name")
    name = name_el.get_text(strip=True) if name_el else "不明"

    pworld = ""
    for a in soup.select("a[href*='p-world']"):
        pworld = a.get("href", "")
        break

    address = ""
    for h2 in soup.select("h2"):
        if "基本情報" in h2.get_text(strip=True):
            section_text = ""
            for sib in h2.find_next_siblings():
                if sib.name == "h2":
                    break
                section_text += sib.get_text()
            m = re.search(
                r"住所\s*((?:東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県|北海道|.{2,3}県)[^\n電話]{5,50})",
                section_text,
            )
            if m:
                address = m.group(1).strip()
            break

    return {"hid": hid, "name": name, "address": address, "pworld": pworld}


def main():
    print("神奈川県パチンコ店 全店舗リスト作成")
    print("=" * 50)

    # HID一覧取得
    print("\n[1] ランキングページからHID一覧を取得中...")
    hids = fetch_kanagawa_hids()
    print(f"  → {len(hids)}件のHIDを取得")

    # 各店舗の情報取得
    print(f"\n[2] 各店舗の情報を取得中...")
    all_stores = []
    kanagawa_stores = []

    for i, hid in enumerate(hids):
        print(f"  [{i+1}/{len(hids)}] ", end="", flush=True)
        try:
            info = get_store_info(hid)
            all_stores.append(info)
            is_kanagawa = info["address"].startswith("神奈川県")
            mark = "✓" if is_kanagawa else "✗"
            print(f"{mark} {info['name']} | {info['address']}")
            if is_kanagawa:
                kanagawa_stores.append(info)
        except Exception as e:
            print(f"エラー: {e}")

        if i < len(hids) - 1:
            time.sleep(random.uniform(1.5, 3.0))

    # 結果保存
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "kanagawa_stores.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(kanagawa_stores, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 50}")
    print(f"全{len(all_stores)}店舗中、神奈川県: {len(kanagawa_stores)}店舗")
    print(f"除外（県外）: {len(all_stores) - len(kanagawa_stores)}店舗")
    print(f"保存先: {output_path}")


if __name__ == "__main__":
    main()
