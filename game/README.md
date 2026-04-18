# マイパチ店 (Pachi Shop Builder)

パチンコ店経営シミュレータ。Vite + React + TypeScript + Tailwind で構築し、将来 Capacitor で iOS/Android ネイティブアプリ化を予定。

## 開発

```bash
cd game
npm install
npm run dev          # LAN公開 (0.0.0.0) + QRコード表示。スマホから即アクセス可
npm run dev:local    # localhost のみ
npm run build        # 本番ビルド
npm run typecheck    # 型チェックのみ
```

初回起動時、ターミナルに LAN URL の QR コードが出るのでスマホで読み取ればそのまま実機確認できます。

## モバイルプレビュー

- LAN 実機確認がメイン（最も信頼できる）
- PC 上で複数デバイス同時確認したいときは `http://localhost:5173/dev/preview` を開く
  - iPhone 15 / iPhone SE / Pixel 8 / iPad mini を iframe で並べて表示
  - 起点パス・向き・拡大率切替可能

## ディレクトリ

```
game/
├── src/
│   ├── main.tsx              エントリ
│   ├── router.tsx            ルーティング
│   ├── components/           共通コンポーネント
│   ├── routes/               画面
│   │   ├── Home.tsx
│   │   ├── MyShop.tsx
│   │   ├── Collection.tsx
│   │   ├── Gacha.tsx
│   │   ├── Favorites.tsx     好きな台ランキング (FML)
│   │   ├── MysteryShopper.tsx
│   │   ├── ShopView.tsx      /s/:shopId 他人の店ビュー
│   │   └── dev/Preview.tsx   開発用デバイスプレビュー
│   ├── stores/               Zustand (永続化あり)
│   ├── data/                 機種モックデータ
│   ├── lib/                  型・ストレージ・ID生成
│   └── styles/
├── public/
└── vite.config.ts
```

## 設計ドキュメント

仕様書: `../docs/GAME_SPEC.md`
