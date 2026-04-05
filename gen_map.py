"""マップHTML生成スクリプト（神奈川+山梨）"""
import io
import json
import sys

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# 両県のデータを読み込み
all_stores = []
for filename in ["kanagawa_stores.json", "yamanashi_stores.json"]:
    with open(filename, encoding="utf-8") as f:
        all_stores.extend(json.load(f))

markers_js = ""
for s in all_stores:
    lat = s.get("lat")
    lon = s.get("lon")
    if not lat or not lon:
        continue
    name = s["name"].replace('"', '\\"')
    addr = s["address"].replace('"', '\\"')
    hall_url = f"https://hall-navi.com/hole_view?hid={s['hid']}"
    pworld_url = s.get("pworld", "")

    popup_parts = [
        f"<b>{name}</b>",
        f"<br>{addr}",
        f'<br><a href=\\"{hall_url}\\" target=\\"_blank\\">hall-navi</a>',
    ]
    if pworld_url:
        popup_parts.append(f' | <a href=\\"{pworld_url}\\" target=\\"_blank\\">P-World</a>')

    popup = "".join(popup_parts)
    markers_js += f'L.marker([{lat}, {lon}]).addTo(map).bindPopup("{popup}");\n'

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
  body {{ margin: 0; padding: 0; }}
  #map {{ width: 100%; height: 100vh; }}
  .info {{
    position: absolute; top: 10px; left: 50px; z-index: 1000;
    background: rgba(26,26,46,0.9); color: #eee;
    padding: 8px 16px; border-radius: 6px;
    font-family: sans-serif; font-size: 14px;
  }}
</style>
</head>
<body>
<div class="info">パチンコ店マップ {len(all_stores)}店舗（神奈川+山梨）</div>
<div id="map"></div>
<script>
var map = L.map("map").setView([35.5, 139.2], 9);
L.tileLayer("https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png", {{
  attribution: "&copy; OpenStreetMap"
}}).addTo(map);
{markers_js}
</script>
</body>
</html>"""

with open("docs/map.html", "w", encoding="utf-8") as f:
    f.write(html)
print(f"Map generated: {len(all_stores)} markers")
