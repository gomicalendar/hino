# hino-gomi

東京都日野市の「ごみ・資源分別カレンダー」を、地区ごとの **iCalendar（.ics）** として
配布する静的サイトです。データは [hino-gomi-py](../hino-gomi-py) が PDF から変換したものを
`public/<西暦>/` に置いて使います。

- 購読（URL 登録）とダウンロードの両方に対応
- ダウンロード時にリマインダー（前日 20:00 など）をブラウザ側で差し込める
- 選んだ地区の直近 2 週間の収集日を表示して、地区の選び間違いに気づけるようにしている
- JSON もそのまま配布するので、他のアプリからも使える

## 開発

```
npm install
npm run dev      # public/list.json を生成してから Vite を起動
npm run build    # 同上 → tsc -b → vite build
npm run lint
```

| スクリプト | 内容 |
|---|---|
| `npm run list` | `public/<西暦>/` を走査して `public/list.json` と `public/latest/` を生成 |
| `npm run dev` / `npm run build` | 上記を自動で先に実行する（`predev` / `prebuild`） |

## データを追加する（年度更新）

1. [hino-gomi-py](../hino-gomi-py) で新しい年度の PDF を変換する
2. 出力を `public/2027/` のようにコピーする（`<地区>.json` と `<地区>.ics`）
3. `npm run build`（または `npm run dev`）を実行する

`list.json` が作り直され、年度セレクトに追加されます。**コードの修正は不要です。**

```
public/
├── 2026/            ← hino-gomi-py の出力をそのまま置く
│   ├── kamida.json
│   ├── kamida.ics
│   │   …
│   └── all.json
├── 2027/            ← 増えていく
├── list.json        ← 生成物（gitignore）
└── latest/          ← 生成物（gitignore）
```

## 世代管理：`public/list.json`

静的ホスティングにはディレクトリ一覧が無いため、「どの年度のデータが存在するか」を
アプリに伝える索引が必要です。年を決め打ちで探索する方法は脆く、TypeScript に
書き込む方法は毎年コード修正が必要になるので、`scripts/build-list.mjs` が
実ファイルから索引を生成しています。

地区名まで索引に含めているので、**地区セレクトの描画に `all.json`（741KB）を
取得する必要がありません。** 選択後に読むのは対象地区の JSON（約 60KB）だけです。

```json
{
  "schema_version": "1.0",
  "municipality": "東京都日野市",
  "generated_at": "2026-08-17T07:52:11.402Z",
  "latest": 2026,
  "years": [
    {
      "year": 2026,
      "era": "令和8年度",
      "range": { "start": "2025-12-01", "end": "2026-12-31" },
      "converted_at": "2026-08-17T16:32:54+09:00",
      "areas": [
        {
          "id": "kamida",
          "name": "上田・宮・万願寺・石田・新井",
          "ics": "2026/kamida.ics",
          "json": "2026/kamida.json",
          "ics_bytes": 41112,
          "days": 244,
          "subscribe": "latest/kamida.ics"
        }
      ]
    }
  ]
}
```

`years` は新しい年度が先。パスはすべて public ルートからの相対で、
サブパス配信でも壊れないようアプリ側で `import.meta.env.BASE_URL` を前置します。

### `public/latest/` と `subscribe`

`.ics` は年度別のファイルなので、`2026/kamida.ics` を購読すると翌年度に URL を
貼り替えてもらう必要が出てしまいます。これを避けるため、最新年度の `.ics` を
`public/latest/<地区>.ics` に複製し、そこを購読 URL として案内しています。

`UID` は `{日付}-{地区id}@hino-gomi` で年度をまたいでも一意なので、配信内容が
翌年度のものに入れ替わってもイベントは重複せず、素直に更新されます。

`subscribe` は最新年度の地区にだけ付きます。過去の年度を選んでいるときは
恒久 URL を案内できないので、アプリはその旨を表示します。

## デプロイ（GitHub Pages）

`.github/workflows/deploy.yml` が `main` への push でビルドして Pages に公開します。
`base` はリポジトリ名から決めるため（`BASE_PATH=/<repo>/`）、リポジトリ名を変えても
そのまま動きます。ローカルの既定値は `vite.config.ts` の `/hino-gomi/` です。

リポジトリ設定の **Settings → Pages → Source** を `GitHub Actions` にしてください。

## 構成

```
src/
├── App.tsx                 選択状態（年度・地区）と読み込みの管理
├── theme.ts                OS のダークモードに追従（colorSchemeSelector: 'media'）
├── components/
│   ├── AreaPicker.tsx      年度・地区セレクト
│   ├── SubscribeCard.tsx   購読 URL のコピーと各カレンダーへのリンク
│   ├── DownloadCard.tsx    リマインダー選択と .ics のダウンロード
│   └── UpcomingCard.tsx    直近 2 週間の収集日
└── lib/
    ├── catalog.ts          list.json / 地区 JSON の型と取得
    ├── ics.ts              VALARM の差し込み、購読 URL 組み立て
    ├── schedule.ts         直近の収集日の抽出
    └── format.ts           日付・容量の表示、品目の色
```

選択した年度と地区は `?year=&area=` に反映されるので、URL の共有で地区を指定できます。
地区は `localStorage` にも保存して次回に復元します。

## 仕様上の注意

- **リマインダー付きは購読では実現できません。** 配信ファイルは素の `.ics` なので、
  `VALARM` はダウンロード時にブラウザで差し込んでいます。
- 終日イベントのアラームは収集日の 0:00 起点で解釈されるため、`-PT240M` は前日 20 時です。
  ただしクライアントによっては終日イベント用の既定通知時刻が優先されます。
- 表示内容は変換結果であり、正となるのは配布元の PDF です。
