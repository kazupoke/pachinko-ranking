"""
パチンコ店イベント ランキング生成スクリプト
hall-navi.com から今日・明日のイベント情報を取得し、スコア順にランキングHTMLを生成する

エリア:
  - 湘南地区（手動登録の近隣店舗）
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
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))
from curl_cffi import requests
from bs4 import BeautifulSoup


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "data")
DOCS_DIR = os.path.join(REPO_ROOT, "docs")
CACHE_DIR = os.path.join(REPO_ROOT, "cache")


# 湘南地区（手動登録の近隣店舗）
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


def load_store_hids(filename):
    """JSONファイルからHIDリストを読み込む"""
    json_path = os.path.join(DATA_DIR, filename)
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


def generate_html(my_entries, kanagawa_entries, yamanashi_entries, today, tomorrow):
    """タブ切り替え付きランキングHTMLを生成"""
    today_str = f"{today.month}/{today.day}"
    tomorrow_str = f"{tomorrow.month}/{tomorrow.day}"
    weekdays = "月火水木金土日"
    today_wd = weekdays[today.weekday()]
    tomorrow_wd = weekdays[tomorrow.weekday()]

    rank_priority = {"S": 0, "A": 1, "B": 2, "C": 3}

    def hall_score_color(score):
        if score >= 10: return "#ff4444"
        if score >= 7: return "#22aa44"
        return "#3388dd"

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

            sc = hall_score_color(e["score"])
            score_link = f'<a href="{e["url"]}" class="score" style="color:{sc}" target="_blank">{e["score"]}</a>' if e.get("url") else f'<div class="score" style="color:{sc}">{e["score"]}</div>'
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
    yamanashi_content = make_tab_content(yamanashi_entries, "tab-yamanashi")

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
  .updated {{ text-align: center; font-size: 11px; color: #888; margin-bottom: 8px; }}
  .map-btn {{
    display: block; text-align: center; margin: 0 auto 16px;
    background: #e94560; color: #fff; text-decoration: none;
    padding: 12px 0; border-radius: 8px; font-size: 16px; font-weight: bold;
    max-width: 300px;
  }}

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
  .score {{ font-size: 22px; font-weight: bold; min-width: 50px; text-align: right; }}
  .details {{ flex: 1; min-width: 0; }}
  a.score {{ text-decoration: none; }}
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
  <a href="./map.html" class="map-btn">マップで見る</a>

  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('tab-my', this)">湘南地区</button>
    <button class="tab-btn" onclick="switchTab('tab-kanagawa', this)">神奈川県</button>
    <button class="tab-btn" onclick="switchTab('tab-yamanashi', this)">山梨県</button>
  </div>

  {my_content}
  {kanagawa_content}
  {yamanashi_content}

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


def generate_map_html(all_entries, today, tomorrow):
    """スコア付きマップHTMLを生成"""
    today_str = f"{today.month}/{today.day}"
    tomorrow_str = f"{tomorrow.month}/{tomorrow.day}"
    weekdays = "月火水木金土日"
    today_wd = weekdays[today.weekday()]
    tomorrow_wd = weekdays[tomorrow.weekday()]

    # 店舗JSONから緯度経度を読み込み
    store_coords = {}
    for filename in ["kanagawa_stores.json", "yamanashi_stores.json"]:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, encoding="utf-8") as f:
                for s in json.load(f):
                    if s.get("lat") and s.get("lon"):
                        store_coords[s["hid"]] = (s["lat"], s["lon"])

    # エントリからHIDを抽出
    def hid_from_url(url):
        if "hid=" in url:
            return url.split("hid=")[1].split("&")[0]
        return ""

    # 店舗ごとにスコアを集約
    store_scores = {}
    for e in all_entries:
        hid = hid_from_url(e.get("url", ""))
        if not hid or hid not in store_coords:
            continue
        if hid not in store_scores:
            store_scores[hid] = {
                "store": e["store"], "url": e["url"],
                "pworld": e.get("pworld", ""),
                "today_score": 0, "today_events": [],
                "tomorrow_score": 0, "tomorrow_events": [],
            }
        ss = store_scores[hid]
        if e["date"] == today_str:
            if e["score"] > ss["today_score"]:
                ss["today_score"] = e["score"]
            ss["today_events"].append(f"{e['rank']} {e['event']}")
        elif e["date"] == tomorrow_str:
            if e["score"] > ss["tomorrow_score"]:
                ss["tomorrow_score"] = e["score"]
            ss["tomorrow_events"].append(f"{e['rank']} {e['event']}")

    def score_color(score):
        if score >= 10: return "#ff4444"
        if score >= 7: return "#22aa44"
        if score > 0: return "#3388dd"
        return "#666666"

    def make_markers(date_key, label):
        markers = ""
        for hid, (lat, lon) in store_coords.items():
            ss = store_scores.get(hid)
            score = 0
            events = []
            if ss:
                if date_key == "today":
                    score = ss["today_score"]
                    events = ss["today_events"]
                else:
                    score = ss["tomorrow_score"]
                    events = ss["tomorrow_events"]

            name = ss["store"] if ss else ""
            if not name:
                continue

            color = score_color(score)
            score_text = str(score) if score > 0 else "-"
            hall_url = f"https://hall-navi.com/hole_view?hid={hid}"

            events_html = "<br>".join(e.replace('"', '\\"') for e in events[:3]) if events else "イベントなし"
            popup = f"<b>{name.replace(chr(34), '&quot;')}</b><br>スコア: <b>{score_text}</b><br>{events_html}<br><a href=\\\"{ hall_url}\\\" target=\\\"_blank\\\">hall-navi</a>"

            markers += f"""      {{lat:{lat},lon:{lon},score:"{score_text}",color:"{color}",popup:"{popup}"}},\n"""
        return markers

    today_markers = make_markers("today", "今日")
    tomorrow_markers = make_markers("tomorrow", "明日")

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>パチンコ店マップ</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body {{ margin: 0; padding: 0; font-family: sans-serif; }}
  #map {{ width: 100%; height: 100vh; }}
  .top-bar {{
    position: absolute; top: 10px; left: 50px; right: 50px; z-index: 1000;
    display: flex; gap: 8px; justify-content: center;
  }}
  .map-tab {{
    padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;
    font-size: 14px; font-weight: bold;
    background: rgba(26,26,46,0.85); color: #888;
  }}
  .map-tab.active {{ background: #e94560; color: #fff; }}
  .back-link {{
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;
    background: rgba(26,26,46,0.9); color: #eee; padding: 10px 24px;
    border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold;
  }}
  .score-icon {{
    background: none; border: none;
    font-size: 12px; font-weight: bold; text-align: center;
    line-height: 22px; width: 28px; height: 22px;
    border-radius: 4px; color: #fff;
  }}
</style>
</head>
<body>
<div class="top-bar">
  <button class="map-tab active" onclick="showDay('today',this)">今日 {today_str}({today_wd})</button>
  <button class="map-tab" onclick="showDay('tomorrow',this)">明日 {tomorrow_str}({tomorrow_wd})</button>
</div>
<a href="./index.html" class="back-link">ランキングに戻る</a>
<div id="map"></div>
<script>
var map = L.map("map").setView([35.35, 139.35], 11);
L.tileLayer("https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png", {{
  attribution: "&copy; OpenStreetMap"
}}).addTo(map);

var todayData = [
{today_markers}];
var tomorrowData = [
{tomorrow_markers}];

var currentMarkers = [];

function clearMarkers() {{
  currentMarkers.forEach(function(m) {{ map.removeLayer(m); }});
  currentMarkers = [];
}}

function showMarkers(data) {{
  clearMarkers();
  data.forEach(function(d) {{
    var icon = L.divIcon({{
      className: 'score-icon',
      html: '<div style="background:'+d.color+';border-radius:6px;padding:2px 6px;font-size:16px;font-weight:bold;color:#fff;text-align:center;white-space:nowrap;border:2px solid rgba(255,255,255,0.5);">'+d.score+'</div>',
      iconSize: [44, 28],
      iconAnchor: [22, 14]
    }});
    var m = L.marker([d.lat, d.lon], {{icon: icon}}).addTo(map).bindPopup(d.popup);
    currentMarkers.push(m);
  }});
}}

function showDay(day, btn) {{
  document.querySelectorAll('.map-tab').forEach(function(b) {{ b.classList.remove('active'); }});
  btn.classList.add('active');
  showMarkers(day === 'today' ? todayData : tomorrowData);
}}

showMarkers(todayData);
</script>
</body>
</html>"""
    return html


def save_cache(key, data, date_str):
    """スクレイピング結果をキャッシュに保存"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(CACHE_DIR, f"{key}_{date_str.replace('/', '-')}.json")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def load_cache(key, date_str):
    """当日のキャッシュがあれば読み込み、なければNone"""
    cache_path = os.path.join(CACHE_DIR, f"{key}_{date_str.replace('/', '-')}.json")
    if os.path.exists(cache_path):
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)
    return None


def scrape_or_cache(key, hids, today_str, tomorrow_str, label):
    """キャッシュがあれば使用、なければスクレイピングしてキャッシュ保存"""
    cached = load_cache(key, today_str)
    if cached is not None:
        print(f"  キャッシュ使用 ({len(cached)}件)")
        return cached
    entries = scrape_stores(hids, today_str, tomorrow_str, label)
    save_cache(key, entries, today_str)
    return entries


def main():
    today = datetime.now(JST)
    tomorrow = today + timedelta(days=1)
    today_str = f"{today.month}/{today.day}"
    tomorrow_str = f"{tomorrow.month}/{tomorrow.day}"
    date_key = today.strftime("%Y-%m-%d")

    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    # --force オプションでキャッシュ無視
    force = "--force" in sys.argv

    if force:
        # キャッシュを削除
        if os.path.exists(CACHE_DIR):
            for f in os.listdir(CACHE_DIR):
                os.remove(os.path.join(CACHE_DIR, f))
        print("キャッシュを無視して再取得します")

    print(f"パチンコ店ランキング生成中... ({today.strftime('%Y/%m/%d %H:%M')})")

    # --- 湘南地区 ---
    print(f"\n[湘南地区] {len(MY_HALL_HIDS)}店舗")
    my_entries = scrape_or_cache("shonan", MY_HALL_HIDS, today_str, tomorrow_str, "湘南地区")

    # --- 神奈川県全域 ---
    kanagawa_hids = load_store_hids("kanagawa_stores.json")
    print(f"\n[神奈川県] {len(kanagawa_hids)}店舗")
    kanagawa_entries = scrape_or_cache("kanagawa", kanagawa_hids, today_str, tomorrow_str, "神奈川県")

    # --- 山梨県全域 ---
    yamanashi_hids = load_store_hids("yamanashi_stores.json")
    print(f"\n[山梨県] {len(yamanashi_hids)}店舗")
    yamanashi_entries = scrape_or_cache("yamanashi", yamanashi_hids, today_str, tomorrow_str, "山梨県")

    # HTML生成
    output_dir = DOCS_DIR
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "index.html")

    html_content = generate_html(my_entries, kanagawa_entries, yamanashi_entries, today, tomorrow)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # マップHTML生成（スコア付き）
    all_entries = my_entries + kanagawa_entries + yamanashi_entries
    map_html = generate_map_html(all_entries, today, tomorrow)
    map_path = os.path.join(output_dir, "map.html")
    with open(map_path, "w", encoding="utf-8") as f:
        f.write(map_html)

    total = len(all_entries)
    print(f"\n完了! 湘南地区{len(my_entries)}件 + 神奈川{len(kanagawa_entries)}件 + 山梨{len(yamanashi_entries)}件 = {total}件")
    print(f"HTML出力: {output_path}")
    print(f"マップ出力: {map_path}")


if __name__ == "__main__":
    main()
