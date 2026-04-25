"""
パチンコ店 全店舗リスト作成スクリプト
hall-naviのホール検索から全HIDを取得し、各ページから店名・住所を収集
対象: 神奈川県、山梨県
"""

import io
import json
import os
import random
import re
import sys
import time
import urllib.parse
from curl_cffi import requests
from bs4 import BeautifulSoup

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# 対象県の設定
PREFECTURES = {
    "kanagawa": {"ken": 2, "area": "kanto", "name": "神奈川県", "prefix": "神奈川県"},
    "yamanashi": {"ken": 19, "area": "chubu", "name": "山梨県", "prefix": "山梨県"},
}


def fetch_all_hids(ken, area):
    """ホール検索ページから全HIDを取得"""
    all_hids = set()
    page = 1
    while True:
        url = f"https://hall-navi.com/serch_hole_result?k={ken}&c=all&area={area}&page={page}"
        try:
            resp = requests.get(url, impersonate="chrome", timeout=30)
            text = resp.content.decode("utf-8", errors="replace")
            soup = BeautifulSoup(text, "html.parser")
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
        except Exception as e:
            print(f"    ページ取得エラー: {e}")
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
                r"住所\s*((?:東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県|北海道|山梨県|.{2,3}県)[^\n電話]{5,50})",
                section_text,
            )
            if m:
                address = m.group(1).strip()
            break

    return {"hid": hid, "name": name, "address": address, "pworld": pworld}


def geocode(address):
    """国土地理院APIで住所→緯度経度"""
    url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + urllib.parse.quote(address)
    try:
        resp = requests.get(url, impersonate="chrome", timeout=10)
        data = resp.json()
        if data:
            coords = data[0]["geometry"]["coordinates"]
            return coords[1], coords[0]
    except Exception:
        pass
    return None, None


def build_pref_list(pref_key):
    """1県分の店舗リストを作成"""
    cfg = PREFECTURES[pref_key]
    print(f"\n{'=' * 55}")
    print(f"  {cfg['name']} 店舗リスト作成")
    print(f"{'=' * 55}")

    # HID一覧取得
    print(f"\n[1] ホール検索から全HIDを取得中...")
    hids = fetch_all_hids(cfg["ken"], cfg["area"])
    print(f"  → {len(hids)}件のHIDを取得")

    # 各店舗の情報取得
    print(f"\n[2] 各店舗の情報を取得中...")
    stores = []
    for i, hid in enumerate(hids):
        print(f"  [{i+1}/{len(hids)}] ", end="", flush=True)
        try:
            info = get_store_info(hid)
            is_target = info["address"].startswith(cfg["prefix"])
            mark = "✓" if is_target else "✗"
            print(f"{mark} {info['name']} | {info['address']}")
            if is_target:
                stores.append(info)
        except Exception as e:
            print(f"エラー: {e}")
        if i < len(hids) - 1:
            time.sleep(random.uniform(1.5, 3.0))

    # ジオコーディング
    print(f"\n[3] 緯度経度を取得中...")
    geo_ok = 0
    for i, store in enumerate(stores):
        lat, lon = geocode(store["address"])
        store["lat"] = lat
        store["lon"] = lon
        if lat:
            geo_ok += 1
        if (i + 1) % 20 == 0:
            print(f"  [{i+1}/{len(stores)}] {geo_ok}件成功")
        time.sleep(0.3)

    # 保存
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    output_path = os.path.join(output_dir, f"{pref_key}_stores.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(stores, f, ensure_ascii=False, indent=2)

    print(f"\n  {cfg['name']}: {len(stores)}店舗 (除外: {len(hids) - len(stores)}件)")
    print(f"  ジオコーディング: {geo_ok}/{len(stores)}件成功")
    print(f"  保存先: {output_path}")
    return stores


def main():
    print("パチンコ店 全店舗リスト作成")

    for pref_key in PREFECTURES:
        build_pref_list(pref_key)

    print(f"\n{'=' * 55}")
    print("  完了!")
    print(f"{'=' * 55}")


if __name__ == "__main__":
    main()
