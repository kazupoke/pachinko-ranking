"""
パチンコ店イベント ランキング生成スクリプト
hall-navi.com から今日・明日のイベント情報を取得し、スコア順にランキングHTMLを生成する

エリア:
  - マイホール（手動登録の近隣店舗）
  - 神奈川県全域（自動取得）

使用ライブラリ:
  curl_cffi - Cloudflare回避（ブラウザTLS指紋を模倣）
  BeautifulSoup4 - HTML解析
"""

import io
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timedelta
from curl_cffi import requests
from bs4 import BeautifulSoup


# マイホール（手動登録の近隣店舗）
MY_HALL_HIDS = [
    "254001300000014260",  # マルハン平塚店
    "254001300000058382",  # ＡＲＲＯＷ平塚店
    "254004300000001310",  # スーパーDステーション平塚駅前
    "254004300000005180",  # キコーナ平塚店
    "254006500000041450",  # シーザースパレス
    "254007600000001150",  # ジャラン平塚店
    "254082100000000180",  # ニラク平塚黒部丘店
    "259121300000077610",  # グランドホール金目店
    "243003100000053120",  # マルハン厚木店
    "243043300000000560",  # キコーナ海老名店
    "253007300000133710",  # マルハン茅ヶ崎店
    "253006100000016222",  # キコーナ茅ヶ崎店
    "257001500000047010",  # ジャパンニューアルファテームズ
]

BASE_URL = "https://hall-navi.com/hole_view?hid="


def fetch_page(url):
    """curl_cffiでページを取得（Cloudflare回避）"""
    resp = requests.get(
        url,
        impersonate="chrome",
        headers={"Accept-Language": "ja,en;q=0.9"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.text


def load_kanagawa_hids():
    """kanagawa_stores.jsonから神奈川県のみのHIDリストを読み込む"""
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kanagawa_stores.json")
    with open(json_path, encoding="utf-8") as f:
        stores = json.load(f)
    return [s["hid"] for s in stores]


def extract_store_data(html, today_str, tomorrow_str):
    """HTMLから店舗名・今日/明日のスコアとイベントを抽出"""
    soup = BeautifulSoup(html, "html.parser")

    h1 = soup.select_one("h1.box_hole_view_hole_name")
    store_name = h1.get_text(strip=True) if h1 else "不明"

    pworld_link = ""
    for a in soup.select("a[href*='p-world']"):
        pworld_link = a.get("href", "")
        break

    entries = []

    # --- 当日の評価スコア ---
    for h2 in soup.select("h2.falat_subt"):
        if "当日" in h2.get_text() and today_str in h2.get_text():
            for sibling in h2.find_next_siblings():
                if sibling.name == "h2":
                    break
                text = sibling.get_text()
                match = re.search(r"合計\s*([+\-]?[\d.]+)", text)
                if match:
                    entries.append({
                        "date": today_str,
                        "score": float(match.group(1)),
                        "rank": "-",
                        "event": "当日評価",
                    })
                    break

    # --- 翌日以降のスケジュール（h3 + h4）---
    current_date = ""
    current_score = 0.0

    for el in soup.select("h3.flat_subtt_os_eve, h4.flat_subtt_down"):
        text = " ".join(el.get_text().split())

        if el.name == "h3":
            date_match = re.search(r"(\d+)/(\d+)\([月火水木金土日]\)", text)
            score_match = re.search(r"([\d.]+)\s*評価", text)
            if date_match:
                current_date = f"{date_match.group(1)}/{date_match.group(2)}"
                current_score = float(score_match.group(1)) if score_match else 0.0

        elif el.name == "h4":
            if current_date in (today_str, tomorrow_str) and current_score > 0:
                rank = text[0] if text else "-"
                event_name = text[2:].strip() if len(text) > 2 else text
                entries.append({
                    "date": current_date,
                    "score": current_score,
                    "rank": rank,
                    "event": event_name,
                })

    return store_name, entries, pworld_link


def scrape_stores(hids, today_str, tomorrow_str, label=""):
    """店舗リストをスクレイピング"""
    all_entries = []
    total = len(hids)

    for i, hid in enumerate(hids):
        url = BASE_URL + hid
        print(f"  [{i+1}/{total}] ", end="", flush=True)
        try:
            html = fetch_page(url)
            store_name, entries, pworld_link = extract_store_data(html, today_str, tomorrow_str)
            print(f"{store_name} ({len(entries)}件)")
            for entry in entries:
                all_entries.append({
                    "store": store_name,
                    "url": url,
                    "pworld": pworld_link,
                    **entry,
                })
        except Exception as e:
            print(f"エラー: {e}")

        if i < total - 1:
            time.sleep(random.uniform(1.5, 3.0))

    return all_entries


def generate_html(my_entries, kanagawa_entries, today, tomorrow):
    """タブ切り替え付きランキングHTMLを生成"""
    today_str = f"{today.month}/{today.day}"
    tomorrow_str = f"{tomorrow.month}/{tomorrow.day}"
    weekdays = "月火水木金土日"
    today_wd = weekdays[today.weekday()]
    tomorrow_wd = weekdays[tomorrow.weekday()]

    rank_priority = {"S": 0, "A": 1, "B": 2, "C": 3}

    def rank_color(rank):
        colors = {"S": "#ff4444", "A": "#ff8800", "B": "#44aa44", "C": "#4488cc"}
        return colors.get(rank, "#888888")

    def merge_same_store(entries):
        merged = {}
        for e in entries:
            key = (e["store"], e["date"])
            if key not in merged:
                merged[key] = {
                    "store": e["store"], "date": e["date"],
                    "score": e["score"], "rank": e["rank"],
                    "url": e.get("url", ""), "pworld": e.get("pworld", ""),
                    "events": [{"rank": e["rank"], "event": e["event"]}],
                }
            else:
                merged[key]["events"].append({"rank": e["rank"], "event": e["event"]})
                if e["score"] > merged[key]["score"]:
                    merged[key]["score"] = e["score"]
                if rank_priority.get(e["rank"], 99) < rank_priority.get(merged[key]["rank"], 99):
                    merged[key]["rank"] = e["rank"]
        return list(merged.values())

    def make_ranking_section(entries, date_str, label, wd):
        if not entries:
            return f'<div class="section"><h2>{label} {date_str}({wd})</h2><p class="no-data">イベントなし</p></div>'

        rows = ""
        for i, e in enumerate(entries, 1):
            event_lines = ""
            for ev in e["events"]:
                erc = rank_color(ev["rank"])
                event_lines += f'<div class="event-line"><span class="event-rank" style="background:{erc}">{ev["rank"]}</span> {ev["event"]}</div>'

            score_link = f'<a href="{e["url"]}" class="score" target="_blank">{e["score"]}</a>' if e.get("url") else f'<div class="score">{e["score"]}</div>'
            store_link = f'<a href="{e["pworld"]}" class="store" target="_blank">{e["store"]}</a>' if e.get("pworld") else f'<span class="store">{e["store"]}</span>'

            rows += f"""<div class="entry">
                    <div class="rank-num">#{i}</div>
                    {score_link}
                    <div class="details">{store_link}<div class="events">{event_lines}</div></div>
                </div>"""

        return f'<div class="section"><h2>{label} {date_str}({wd})</h2>{rows}</div>'

    def make_tab_content(entries, tab_id):
        today_e = merge_same_store(sorted([e for e in entries if e["date"] == today_str], key=lambda x: x["score"], reverse=True))
        today_e.sort(key=lambda x: x["score"], reverse=True)
        tomorrow_e = merge_same_store(sorted([e for e in entries if e["date"] == tomorrow_str], key=lambda x: x["score"], reverse=True))
        tomorrow_e.sort(key=lambda x: x["score"], reverse=True)

        today_sec = make_ranking_section(today_e, today_str, "今日", today_wd)
        tomorrow_sec = make_ranking_section(tomorrow_e, tomorrow_str, "明日", tomorrow_wd)
        return f'<div id="{tab_id}" class="tab-content">{today_sec}{tomorrow_sec}</div>'

    my_content = make_tab_content(my_entries, "tab-my")
    kanagawa_content = make_tab_content(kanagawa_entries, "tab-kanagawa")

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>パチンコ店ランキング</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, 'Hiragino Sans', 'Meiryo', sans-serif;
    background: #1a1a2e;
    color: #eee;
    padding: 12px;
    max-width: 600px;
    margin: 0 auto;
  }}
  h1 {{ text-align: center; font-size: 18px; padding: 12px 0; border-bottom: 2px solid #e94560; margin-bottom: 8px; }}
  .updated {{ text-align: center; font-size: 11px; color: #888; margin-bottom: 12px; }}

  /* タブ */
  .tabs {{
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
  }}
  .tab-btn {{
    flex: 1;
    padding: 10px 0;
    background: #16213e;
    color: #888;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }}
  .tab-btn.active {{
    background: #e94560;
    color: #fff;
  }}
  .tab-content {{
    display: none;
  }}
  .tab-content.active {{
    display: block;
  }}

  .section {{ margin-bottom: 20px; }}
  h2 {{ font-size: 16px; padding: 8px 12px; background: #16213e; border-left: 4px solid #e94560; border-radius: 4px; margin-bottom: 8px; }}
  .no-data {{ padding: 12px; color: #666; text-align: center; }}
  .entry {{ display: flex; align-items: center; padding: 10px 8px; border-bottom: 1px solid #2a2a4a; gap: 10px; }}
  .rank-num {{ font-size: 18px; font-weight: bold; color: #e94560; min-width: 32px; }}
  .score {{ font-size: 22px; font-weight: bold; color: #ffd700; min-width: 50px; text-align: right; }}
  .details {{ flex: 1; min-width: 0; }}
  a.score {{ text-decoration: none; color: #ffd700; }}
  a.score:active {{ opacity: 0.7; }}
  .store, a.store {{ font-size: 14px; font-weight: bold; color: #eee; text-decoration: none; }}
  a.store:active {{ opacity: 0.7; }}
  .events {{ margin-top: 3px; }}
  .event-line {{ font-size: 12px; color: #aaa; margin-top: 2px; }}
  .event-rank {{ display: inline-block; color: #fff; font-weight: bold; font-size: 10px; padding: 0px 5px; border-radius: 3px; margin-right: 3px; }}
</style>
</head>
<body>
  <h1>パチンコ店ランキング</h1>
  <div class="updated">更新: {today.strftime('%Y/%m/%d %H:%M')}</div>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('tab-my', this)">マイホール</button>
    <button class="tab-btn" onclick="switchTab('tab-kanagawa', this)">神奈川県</button>
  </div>

  {my_content}
  {kanagawa_content}

  <script>
  function switchTab(tabId, btn) {{
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
  }}
  document.getElementById('tab-my').classList.add('active');
  </script>
</body>
</html>"""
    return html


def main():
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    today_str = f"{today.month}/{today.day}"
    tomorrow_str = f"{tomorrow.month}/{tomorrow.day}"

    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    print(f"パチンコ店ランキング生成中... ({today.strftime('%Y/%m/%d %H:%M')})")

    # --- マイホール ---
    print(f"\n[マイホール] {len(MY_HALL_HIDS)}店舗")
    my_entries = scrape_stores(MY_HALL_HIDS, today_str, tomorrow_str, "マイホール")

    # --- 神奈川県全域 ---
    print("\n[神奈川県] 店舗リスト読み込み中...")
    kanagawa_hids = load_kanagawa_hids()
    print(f"[神奈川県] {len(kanagawa_hids)}店舗")
    kanagawa_entries = scrape_stores(kanagawa_hids, today_str, tomorrow_str, "神奈川県")

    # HTML生成
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "index.html")

    html_content = generate_html(my_entries, kanagawa_entries, today, tomorrow)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    total = len(my_entries) + len(kanagawa_entries)
    print(f"\n完了! マイホール{len(my_entries)}件 + 神奈川{len(kanagawa_entries)}件 = {total}件")
    print(f"HTML出力: {output_path}")


if __name__ == "__main__":
    main()
