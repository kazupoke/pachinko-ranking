# NitoTool_Pachinko

パチンコ店のイベントランキング（今日・明日・明後日）を公開するサイト。GitHub Actions が毎朝 `scripts/scrape_ranking.py` を動かし、`docs/` を GitHub Pages に出す。

- **このリポジトリは公開**。独自データ・解析・メモ・店内の記録は入れない。公開ページの外に出せないものは `../NitoTool_PachiData`（ローカル専用）へ
- データベース・機種の知識・収集の道具は `../NitoTool_PachiData`。まず同フォルダの `docs/データの地図.md` を読む
- 作業前に `git pull`、作業後に push（Actions が毎日積むので）。本線のみ
