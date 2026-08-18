# hino

東京都日野市の「ごみ・資源分別カレンダー」を、地区ごとの **iCalendar（.ics）** として
配布する静的サイトです。データは [hino-gomi-py](https://github.com/gomicalendar/hino-gomi-py) が PDF から変換したものを
`public/<西暦>/` に置いて使います。

公開先: https://gomicalendar.github.io/hino/

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

## データを追加する（年次更新）

通常は自動です。`.github/workflows/update-calendar.yml` が毎日 06:30 JST に
[hino-gomi-dl](https://github.com/gomicalendar/hino-gomi-dl) の PDF を見に行き、
更新があれば [hino-gomi-py](https://github.com/gomicalendar/hino-gomi-py) で変換して
`public/<西暦>/` を commit し、そのまま Pages に反映します。→ [自動更新](#自動更新)

手で入れる場合：

1. [hino-gomi-py](https://github.com/gomicalendar/hino-gomi-py) で新しい年の PDF を変換する
2. 出力を `public/2027/` のようにコピーする（`<地区>.json` と `<地区>.ics`）
3. `npm run build`（または `npm run dev`）を実行する

`list.json` が作り直され、年セレクトに追加されます。**コードの修正は不要です。**

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

静的ホスティングにはディレクトリ一覧が無いため、「どの年のデータが存在するか」を
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
      "era": "令和8年",
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

`years` は新しい年が先。パスはすべて public ルートからの相対で、
サブパス配信でも壊れないようアプリ側で `import.meta.env.BASE_URL` を前置します。

### `public/latest/` と `subscribe`

`.ics` は年別のファイルなので、`2026/kamida.ics` を購読すると翌年に URL を
貼り替えてもらう必要が出てしまいます。これを避けるため、最新年の `.ics` を
`public/latest/<地区>.ics` に複製し、そこを購読 URL として案内しています。

`UID` は `{日付}-{地区id}@hino-gomi` で年をまたいでも一意なので、配信内容が
翌年のものに入れ替わってもイベントは重複せず、素直に更新されます。

`subscribe` は最新年の地区にだけ付きます。過去の年を選んでいるときは
恒久 URL を案内できないので、アプリはその旨を表示します。

## デプロイ（GitHub Pages）

`.github/workflows/deploy.yml` が `main` への push でビルドして Pages に公開します。
`base` はリポジトリ名から決めるため（`BASE_PATH=/<repo>/`）、リポジトリ名を変えても
そのまま動きます。ローカルの既定値は `vite.config.ts` の `/hino/` です。

リポジトリ設定の **Settings → Pages → Source** を `GitHub Actions` にしてください。

## 自動更新

`.github/workflows/update-calendar.yml` が毎日 21:30 UTC（06:30 JST）に走ります。
hino-gomi-dl の `download.yml` が 20:17 UTC 開始・最大 30 分なので、その後です。

走るかどうかは**日付ではなく入力の指紋**で決めます。`scripts/sync-calendar.py` が
hino-gomi-dl の `data/<版>/manifest.json` にある PDF の sha256 と、hino-gomi-py の
`hino_gomi.py` の sha256 を集めて、前回の記録（`.github/state/source.json`）と比べます。

| 状況 | 挙動 |
|---|---|
| PDF も変換スクリプトも同じ | 何もしない（manifest 数 KB を読むだけ、PDF は取りに行かない） |
| PDF が更新された | その版だけ再変換 |
| 新しい版（`r9`）が現れた | その版だけ変換し、`public/2027/` が増える |
| 変換ロジックを直した | PDF が同じでも全版を再生成 |
| 同じ PDF を再取得しただけ | 何もしない（manifest の日時は指紋に含めない） |
| 数日ジョブが動かなかった | 次に動いたときに正しく再生成される |

コミット日時で判定していないので、GitHub 障害などで実行が飛んでも取りこぼしません。

```
.github/state/source.json   ← 前回どの入力から生成したかの記録。git log がそのまま実行ログになる
```

手動で叩くときは Actions から **カレンダーデータの更新** を実行します
（`force` を付けると指紋が一致していても再生成）。ローカルでも同じスクリプトが動きます。

```
python scripts/sync-calendar.py --data ../hino-gomi-dl/data --converter ../hino-gomi-py
```

`--check` を付けると判定だけして生成しません。

`GITHUB_TOKEN` による push は `push` イベントを発火しない（GitHub の無限ループ防止）ため、
deploy.yml は自動では走りません。`workflow_call` で update-calendar.yml から明示的に呼びます。

## 構成

```
src/
├── App.tsx                 選択状態（年・地区）と読み込みの管理
├── theme.ts                OS のダークモードに追従（colorSchemeSelector: 'media'）
├── components/
│   ├── AreaPicker.tsx      年・地区セレクト
│   ├── SubscribeCard.tsx   購読 URL のコピーと各カレンダーへのリンク
│   ├── DownloadCard.tsx    リマインダー選択と .ics のダウンロード
│   └── UpcomingCard.tsx    直近 2 週間の収集日
└── lib/
    ├── catalog.ts          list.json / 地区 JSON の型と取得
    ├── ics.ts              VALARM の差し込み、購読 URL 組み立て
    ├── schedule.ts         直近の収集日の抽出
    └── format.ts           日付・容量の表示、品目の色
```

選択した年と地区は `?year=&area=` に反映されるので、URL の共有で地区を指定できます。
地区は `localStorage` にも保存して次回に復元します。

## 仕様上の注意

- **リマインダー付きは購読では実現できません。** 配信ファイルは素の `.ics` なので、
  `VALARM` はダウンロード時にブラウザで差し込んでいます。
- 終日イベントのアラームは収集日の 0:00 起点で解釈されるため、`-PT240M` は前日 20 時です。
  ただしクライアントによっては終日イベント用の既定通知時刻が優先されます。
- 表示内容は変換結果であり、正となるのは配布元の PDF です。
