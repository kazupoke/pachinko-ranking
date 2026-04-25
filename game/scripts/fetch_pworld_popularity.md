# P-World 機種コメント数 (人気指標) スクレイプ手順

## 概要

P-World の各機種ページから掲示板コメント数を取得し、game の人気指標として利用。
Chrome DevTools Protocol (claude-in-chrome MCP) 経由で実行する。

## 出力

`game/src/data/pworld_popularity.json` (machine_id → { bbs: コメント数, pv: 週間 PV })

## 手順 (claude-in-chrome MCP / Chrome 拡張版)

1. Chrome の MCP タブで P-World にアクセス: `https://www.p-world.co.jp/machine/database/10460`
2. DevTools コンソール (または MCP の javascript_exec) で以下を貼り付けて実行:

```js
(() => {
  if (window.__popScraper && window.__popScraper.running) return 'already running';
  window.__popScraper = { running: true, stop: false };
  (async () => {
    const mapUrl = 'https://kazupoke.github.io/pachinko-ranking/g-1d107813b2/machines_thumb.json';
    const map = await (await fetch(mapUrl)).json();
    const entries = Object.entries(map);
    const data = JSON.parse(localStorage.getItem('pworld_pop_data') || '{}');
    let processed = Object.keys(data).length;
    for (const [mid, pid] of entries) {
      if (window.__popScraper.stop) break;
      if (data[mid] !== undefined) continue;
      try {
        const r = await fetch(`https://www.p-world.co.jp/machine/database/${pid}`, { credentials: 'same-origin' });
        if (r.ok) {
          const html = await r.text();
          const bbsM = html.match(/掲示板[\(\uff08](\d+)[\)\uff09]/);
          const pvM = html.match(/掲示板アクセス数[\s\S]{0,200}?(\d+)\s*pv/);
          data[mid] = { bbs: bbsM ? parseInt(bbsM[1],10) : 0, pv: pvM ? parseInt(pvM[1],10) : 0 };
        } else data[mid] = { err: r.status };
      } catch (e) { data[mid] = { err: String(e).slice(0, 80) }; }
      processed++;
      if (processed % 10 === 0) {
        localStorage.setItem('pworld_pop_data', JSON.stringify(data));
        localStorage.setItem('pworld_pop_progress', JSON.stringify({ total: entries.length, done: processed, ts: Date.now() }));
      }
      await new Promise(r => setTimeout(r, 600));
    }
    localStorage.setItem('pworld_pop_data', JSON.stringify(data));
    localStorage.setItem('pworld_pop_progress', JSON.stringify({ total: entries.length, done: processed, ts: Date.now(), complete: true }));
    window.__popScraper.running = false;
  })();
  return 'started';
})()
```

3. 進捗確認: `JSON.parse(localStorage.getItem('pworld_pop_progress'))`
4. 完了 (10 分前後) 後にダウンロード:

```js
const data = JSON.parse(localStorage.getItem('pworld_pop_data'));
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a'); a.href = url; a.download = 'pworld_popularity.json';
document.body.appendChild(a); a.click();
```

5. ダウンロードしたファイルを `game/src/data/pworld_popularity.json` に置く
6. ビルドすると `lib/marketSupply.ts` が import して反映

## 注意

- 同一ドメイン fetch なので CORS 問題なし
- 600ms スリープで bot 検知回避
- 結果は localStorage 経由で永続化、途中で止めても再開可能
