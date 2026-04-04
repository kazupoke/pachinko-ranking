"""
パチンコ店イベント ランキング生成スクリプト
hall-navi.com から今日・明日のイベント情報を取得し、スコア順にランキングHTMLを生成する

使用ライブラリ:
  curl_cffi - Cloudflare回避（ブラウザTLS指紋を模倣）
  BeautifulSoup4 - HTML解析
"""

import io
import os
import re
import sys
import time
from datetime import datetime, timedelta
from curl_cffi import requests
from bs4 import BeautifulSoup


# 対象店舗のURL一覧
URLS = [
    "https://hall-navi.com/hole_view?hid=254001300000014260",
    "https://hall-navi.com/hole_view?hid=254001300000058382",
    "https://hall-navi.com/hole_view?hid=254004300000001310",
    "https://hall-navi.com/hole_view?hid=254004300000005180",
    "https://hall-navi.com/hole_view?hid=254006500000041450",
    "https://hall-navi.com/hole_view?hid=254007600000001150",
    "https://hall-navi.com/hole_view?hid=254082100000000180",
    "https://hall-navi.com/hole_view?hid=259121300000077610",
]


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


def extract_store_data(html, today_str, tomorrow_str):
    """HTMLから店舗名・今日/明日のスコアとイベントを抽出"""
    soup = BeautifulSoup(html, "html.parser")

    h1 = soup.select_one("h1.box_hole_view_hole_name")
    store_name = h1.get_text(strip=True) if h1 else "不明"

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

    return store_name, entries


def generate_html(all_entries, today, tomorrow):
    """スマホ向けランキングHTMLを生成"""
    today_str = f"{today.month}/{today.day}"
    tomorrow_str = f"{tomorrow.month}/{tomorrow.day}"
    weekdays = "月火水木金土日"
    today_wd = weekdays[today.weekday()]
    tomorrow_wd = weekdays[tomorrow.weekday()]

    def rank_color(rank):
        colors = {"S": "#ff4444", "A": "#ff8800", "B": "#44aa44", "C": "#4488cc"}
        return colors.get(rank, "#888888")

    def make_ranking_section(entries, date_str, label, wd):
        if not entries:
            return f"""
            <div class="section">
                <h2>{label} {date_str}({wd})</h2>
                <p class="no-data">イベントなし</p>
            </div>"""

        rows = ""
        for i, e in enumerate(entries, 1):
            rc = rank_color(e["rank"])
            rows += f"""
                <div class="entry">
                    <div class="rank-num">#{i}</div>
                    <div class="score">{e['score']}</div>
                    <div class="details">
                        <span class="rank-badge" style="background:{rc}">{e['rank']}</span>
                        <span class="store">{e['store']}</span>
                        <div class="event">{e['event']}</div>
                    </div>
                </div>"""

        return f"""
            <div class="section">
                <h2>{label} {date_str}({wd})</h2>
                {rows}
            </div>"""

    today_entries = sorted(
        [e for e in all_entries if e["date"] == today_str],
        key=lambda x: x["score"], reverse=True
    )
    tomorrow_entries = sorted(
        [e for e in all_entries if e["date"] == tomorrow_str],
        key=lambda x: x["score"], reverse=True
    )

    today_section = make_ranking_section(today_entries, today_str, "今日", today_wd)
    tomorrow_section = make_ranking_section(tomorrow_entries, tomorrow_str, "明日", tomorrow_wd)

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
  h1 {{
    text-align: center;
    font-size: 18px;
    padding: 12px 0;
    border-bottom: 2px solid #e94560;
    margin-bottom: 8px;
  }}
  .updated {{
    text-align: center;
    font-size: 11px;
    color: #888;
    margin-bottom: 16px;
  }}
  .section {{
    margin-bottom: 20px;
  }}
  h2 {{
    font-size: 16px;
    padding: 8px 12px;
    background: #16213e;
    border-left: 4px solid #e94560;
    border-radius: 4px;
    margin-bottom: 8px;
  }}
  .no-data {{
    padding: 12px;
    color: #666;
    text-align: center;
  }}
  .entry {{
    display: flex;
    align-items: center;
    padding: 10px 8px;
    border-bottom: 1px solid #2a2a4a;
    gap: 10px;
  }}
  .rank-num {{
    font-size: 18px;
    font-weight: bold;
    color: #e94560;
    min-width: 32px;
  }}
  .score {{
    font-size: 22px;
    font-weight: bold;
    color: #ffd700;
    min-width: 50px;
    text-align: right;
  }}
  .details {{
    flex: 1;
    min-width: 0;
  }}
  .rank-badge {{
    display: inline-block;
    color: #fff;
    font-weight: bold;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
    margin-right: 4px;
  }}
  .store {{
    font-size: 14px;
    font-weight: bold;
  }}
  .event {{
    font-size: 12px;
    color: #aaa;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }}
</style>
</head>
<body>
  <h1>パチンコ店ランキング</h1>
  <div class="updated">更新: {today.strftime('%Y/%m/%d %H:%M')}</div>
  {today_section}
  {tomorrow_section}
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

    all_entries = []

    for i, url in enumerate(URLS):
        print(f"  [{i+1}/{len(URLS)}] ", end="", flush=True)
        try:
            html = fetch_page(url)
            store_name, entries = extract_store_data(html, today_str, tomorrow_str)
            print(f"{store_name} ({len(entries)}件)")
            for entry in entries:
                all_entries.append({"store": store_name, **entry})
        except Exception as e:
            print(f"エラー: {e}")
        if i < len(URLS) - 1:
            time.sleep(1.5)

    # HTML生成
    output_dir = os.path.join(os.path.dirname(__file__), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "index.html")

    html_content = generate_html(all_entries, today, tomorrow)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"\n完了! {len(all_entries)}件のイベントを取得")
    print(f"HTML出力: {output_path}")


if __name__ == "__main__":
    main()
