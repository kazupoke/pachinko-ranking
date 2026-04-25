"""
P-World から機種名 → ID マッピングを取得し、
game/public/machines_thumb.json として保存する。
"""
import json, re, time, urllib.request, urllib.parse
from pathlib import Path
from difflib import SequenceMatcher

BASE = "https://www.p-world.co.jp"
OUT = Path(__file__).parent.parent / "public" / "machines_thumb.json"
MACHINES_JSON = Path(__file__).parent.parent / "src" / "data" / "machines.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ja,en;q=0.9",
}

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        raw = r.read()
    for enc in ["euc-jp", "shift-jis", "utf-8"]:
        try:
            return raw.decode(enc)
        except Exception:
            continue
    return raw.decode("utf-8", errors="replace")

def get_all_slot_machines() -> dict[str, int]:
    """P-World スロット機種一覧から 機種名→ID を収集"""
    name_to_id: dict[str, int] = {}
    # AT / BT / ノーマル をまとめて取得
    for key in ["AT", "BT", "NORMAL", "ART"]:
        start = 0
        while True:
            url = f"{BASE}/_machine/t_machine.cgi?mode=slot_type&key={key}&aflag=1&start={start}"
            try:
                html = fetch(url)
            except Exception as e:
                print(f"  fetch error {url}: {e}")
                break
            # 機種リンクを抽出: <a href="/machine/database/12345"><strong>機種名</strong></a>
            links = re.findall(r'/machine/database/(\d+)"[^>]*><strong>([^<]+)</strong>', html)
            if not links:
                break
            count = 0
            for mid, name in links:
                name_clean = name.strip().replace("\u3000", " ").replace("　", " ")
                if name_clean and not name_clean.startswith("http"):
                    name_to_id[name_clean] = int(mid)
                    count += 1
            print(f"  {key} start={start}: {count}件")
            # 次ページへ (50件/ページ)
            next_start = start + 50
            if f"start={next_start}" not in html:
                break
            start = next_start
            time.sleep(0.3)
    return name_to_id

def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def normalize(s: str) -> str:
    """機種名正規化：全角英数→半角、スペース統一"""
    s = s.strip()
    # 全角→半角
    s = s.translate(str.maketrans(
        "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ"
        "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
        "０１２３４５６７８９",
        "abcdefghijklmnopqrstuvwxyz"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789"
    ))
    s = s.replace("　", " ").replace("\u3000", " ")
    return s

def main():
    with open(MACHINES_JSON, encoding="utf-8") as f:
        our_machines = json.load(f)

    print("P-World スロット機種一覧を取得中...")
    pw_map = get_all_slot_machines()
    print(f"取得: {len(pw_map)} 機種")

    result = {}
    unmatched = []

    for m in our_machines:
        our_name = normalize(m["name"])
        best_score = 0.0
        best_id = None
        # 完全一致優先
        for pw_name, pw_id in pw_map.items():
            pw_norm = normalize(pw_name)
            if our_name == pw_norm:
                best_id = pw_id
                best_score = 1.0
                break
            score = similarity(our_name, pw_norm)
            if score > best_score:
                best_score = score
                best_id = pw_id
        if best_id and best_score >= 0.75:
            result[m["id"]] = best_id
        else:
            unmatched.append(m["name"])

    print(f"マッチ: {len(result)} / {len(our_machines)}")
    print(f"未マッチ: {len(unmatched)} 件")
    if unmatched[:10]:
        print("未マッチ例:", unmatched[:10])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"保存: {OUT}")

if __name__ == "__main__":
    main()
