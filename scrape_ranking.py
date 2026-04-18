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


def _extract_thumb(el):
    """h4要素周辺からサムネイル画像URLを探す"""
    BASE = "https://hall-navi.com"

    def normalize(src):
        if not src:
            return ""
        src = src.strip()
        low = src.lower()
        if src.endswith(".gif") or src.endswith(".svg"):
            return ""
        if any(x in low for x in ("icon", "logo", "banner", "arrow", "btn", "blank")):
            return ""
        if src.startswith("//"):
            return "https:" + src
        if src.startswith("/"):
            return BASE + src
        if src.startswith("http"):
            return src
        return ""

    def find_img(tag):
        if not hasattr(tag, "find"):
            return ""
        img = tag.find("img")
        if not img:
            return ""
        for attr in ("src", "data-src", "data-original", "data-lazy"):
            n = normalize(img.get(attr, ""))
            if n:
                return n
        return ""

    src = find_img(el)
    if src:
        return src
    for prev in el.find_previous_siblings():
        if getattr(prev, "name", None) in ("h3", "h4"):
            break
        src = find_img(prev)
        if src:
            return src
    for nxt in el.find_next_siblings():
        if getattr(nxt, "name", None) in ("h3", "h4"):
            break
        src = find_img(nxt)
        if src:
            return src
    return ""


def load_store_hids(filename):
    """JSONファイルからHIDリストを読み込む"""
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
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
                    "thumb": _extract_thumb(el),
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

    def rank_color(rank):
        return {"S": "#ff375f", "A": "#ff9f0a", "B": "#30d158", "C": "#0a84ff"}.get(rank, "#888888")

    def score_cls(score):
        if score >= 10: return "hot"
        if score >= 7: return "warm"
        return "cool"

    def score_color(score):
        if score >= 10: return "#ff3b30"
        if score >= 7: return "#30d158"
        return "#0a84ff"

    def merge_same_store(entries):
        merged = {}
        for e in entries:
            key = (e["store"], e["date"])
            if key not in merged:
                merged[key] = {
                    "store": e["store"], "date": e["date"],
                    "score": e["score"], "rank": e["rank"],
                    "url": e.get("url", ""), "pworld": e.get("pworld", ""),
                    "events": [{"rank": e["rank"], "event": e["event"], "thumb": e.get("thumb", "")}],
                }
            else:
                merged[key]["events"].append({"rank": e["rank"], "event": e["event"], "thumb": e.get("thumb", "")})
                if e["score"] > merged[key]["score"]:
                    merged[key]["score"] = e["score"]
                if rank_priority.get(e["rank"], 99) < rank_priority.get(merged[key]["rank"], 99):
                    merged[key]["rank"] = e["rank"]
        return list(merged.values())

    def make_entry(e, i, max_score):
        sc = score_color(e["score"])
        bar_w = int(e["score"] / max_score * 100) if max_score > 0 else 0
        rank_cls = f"rank-{i}" if i <= 3 else ""

        evts = ""
        for ev in e["events"]:
            erc = rank_color(ev["rank"])
            thumb = (f'<img src="{ev["thumb"]}" class="ethumb" loading="lazy" onerror="this.style.display=\'none\'">'
                     if ev.get("thumb") else "")
            evts += (f'<div class="evt">'
                     f'<span class="rbadge" style="background:{erc};box-shadow:0 0 5px {erc}66">{ev["rank"]}</span>'
                     f'<span class="ename">{ev["event"]}</span>{thumb}</div>')

        score_tag = (f'<a href="{e["url"]}" target="_blank" class="score {score_cls(e["score"])}" style="color:{sc}">{e["score"]}</a>'
                     if e.get("url") else
                     f'<span class="score {score_cls(e["score"])}" style="color:{sc}">{e["score"]}</span>')
        store_tag = (f'<a href="{e["pworld"]}" target="_blank" class="sname">{e["store"]}</a>'
                     if e.get("pworld") else
                     f'<span class="sname">{e["store"]}</span>')

        return (f'<div class="entry {rank_cls}">'
                f'<div class="rnk">#{i}</div>'
                f'<div class="body">'
                f'<div class="toprow">{store_tag}{score_tag}</div>'
                f'<div class="sbar"><div style="width:{bar_w}%;background:{sc}"></div></div>'
                f'<div class="evts">{evts}</div>'
                f'</div></div>')

    def make_section(entries, date_str, label, wd):
        if not entries:
            return (f'<div class="sec"><div class="shead">'
                    f'<span class="slabel">{label} {date_str}({wd})</span>'
                    f'<span class="scnt">0件</span></div>'
                    f'<p class="nodata">イベントなし</p></div>')
        max_s = max(e["score"] for e in entries)
        rows = "".join(make_entry(e, i, max_s) for i, e in enumerate(entries, 1))
        return (f'<div class="sec"><div class="shead">'
                f'<span class="slabel">{label} {date_str}({wd})</span>'
                f'<span class="scnt">{len(entries)}店舗</span></div>{rows}</div>')

    def make_tab(entries, tab_id):
        te = sorted(merge_same_store([e for e in entries if e["date"] == today_str]),
                    key=lambda x: x["score"], reverse=True)
        me = sorted(merge_same_store([e for e in entries if e["date"] == tomorrow_str]),
                    key=lambda x: x["score"], reverse=True)
        return (f'<div id="{tab_id}" class="tab-content">'
                f'{make_section(te, today_str, "今日", today_wd)}'
                f'{make_section(me, tomorrow_str, "明日", tomorrow_wd)}</div>')

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>パチンコ店ランキング</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,'Hiragino Sans','Meiryo',sans-serif;background:#0b0e1a;background-image:radial-gradient(ellipse at top,#1a1a3a 0%,#0b0e1a 70%);color:#e8eaf0;padding:12px;max-width:600px;margin:0 auto;min-height:100vh}}
.hdr{{text-align:center;padding:16px 0 12px;border-bottom:1px solid rgba(233,69,96,.3);margin-bottom:12px}}
.hdr h1{{font-size:20px;font-weight:800;background:linear-gradient(135deg,#e94560,#f0a500);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}}
.hdr .sub{{font-size:11px;color:#7a7f9a;margin-top:4px}}
.mapbtn{{display:block;text-align:center;margin:0 auto 16px;background:linear-gradient(135deg,#e94560,#c0213d);color:#fff;text-decoration:none;padding:12px 0;border-radius:12px;font-size:15px;font-weight:bold;max-width:320px;box-shadow:0 4px 20px rgba(233,69,96,.3)}}
.mapbtn:active{{opacity:.8}}
.tabs{{display:flex;gap:6px;margin-bottom:16px;background:rgba(255,255,255,.04);padding:4px;border-radius:12px}}
.tb{{flex:1;padding:10px 4px;background:transparent;color:#7a7f9a;border:none;border-radius:8px;font-size:13px;font-weight:bold;cursor:pointer;transition:all .2s}}
.tb.active{{background:#e94560;color:#fff;box-shadow:0 2px 12px rgba(233,69,96,.4)}}
.tab-content{{display:none}}
.tab-content.active{{display:block}}
.sec{{margin-bottom:24px}}
.shead{{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(233,69,96,.1);border-left:3px solid #e94560;border-radius:4px 8px 8px 4px;margin-bottom:10px}}
.slabel{{font-size:15px;font-weight:bold;color:#fff}}
.scnt{{font-size:12px;color:#7a7f9a}}
.nodata{{padding:20px;color:#7a7f9a;text-align:center;font-size:14px}}
.entry{{display:flex;gap:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;margin-bottom:8px;align-items:flex-start}}
.entry:active{{opacity:.85}}
.entry.rank-1{{border-color:rgba(255,214,10,.5);background:rgba(255,214,10,.06)}}
.entry.rank-2{{border-color:rgba(192,192,192,.35);background:rgba(192,192,192,.04)}}
.entry.rank-3{{border-color:rgba(205,127,50,.35);background:rgba(205,127,50,.04)}}
.rnk{{min-width:28px;font-size:13px;font-weight:900;color:#555;text-align:center;padding-top:6px;line-height:1.2}}
.entry.rank-1 .rnk{{color:#ffd60a;font-size:15px}}
.entry.rank-2 .rnk{{color:#c0c0c0;font-size:14px}}
.entry.rank-3 .rnk{{color:#cd7f32;font-size:14px}}
.body{{flex:1;min-width:0}}
.toprow{{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:5px}}
.sname,a.sname{{font-size:14px;font-weight:bold;color:#e8eaf0;text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
a.sname:active{{opacity:.7}}
.score,a.score{{font-size:22px;font-weight:900;text-decoration:none;flex-shrink:0}}
a.score:active{{opacity:.7}}
.score.hot{{color:#ff3b30;text-shadow:0 0 10px rgba(255,59,48,.5)}}
.score.warm{{color:#30d158;text-shadow:0 0 10px rgba(48,209,88,.5)}}
.score.cool{{color:#0a84ff;text-shadow:0 0 10px rgba(10,132,255,.5)}}
.sbar{{height:3px;background:rgba(255,255,255,.08);border-radius:2px;margin-bottom:8px;overflow:hidden}}
.sbar>div{{height:100%;border-radius:2px}}
.evts{{display:flex;flex-direction:column;gap:5px}}
.evt{{display:flex;align-items:center;gap:6px;min-height:20px}}
.rbadge{{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:10px;font-weight:bold;color:#fff;flex-shrink:0}}
.ename{{font-size:12px;color:#9095b0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.ethumb{{width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,.12)}}
</style>
</head>
<body>
<div class="hdr">
  <h1>パチンコ店ランキング</h1>
  <div class="sub">更新: {today.strftime('%Y/%m/%d %H:%M')} JST</div>
</div>
<a href="./map.html" class="mapbtn">マップで見る</a>
<div class="tabs">
  <button class="tb active" onclick="sw('tab-my',this)">湘南地区</button>
  <button class="tb" onclick="sw('tab-kanagawa',this)">神奈川県</button>
  <button class="tb" onclick="sw('tab-yamanashi',this)">山梨県</button>
</div>
{make_tab(my_entries, "tab-my")}
{make_tab(kanagawa_entries, "tab-kanagawa")}
{make_tab(yamanashi_entries, "tab-yamanashi")}
<script>
function sw(id,btn){{
  document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.tb').forEach(e=>e.classList.remove('active'));
  document.getElementById(id).classList.add('active');
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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    store_coords = {}
    for filename in ["kanagawa_stores.json", "yamanashi_stores.json"]:
        filepath = os.path.join(base_dir, filename)
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


CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")


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
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
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
