#!/usr/bin/env node
// public/<西暦>/ を走査して public/list.json を生成する。
//
// 静的ホスティングにはディレクトリ一覧が無いので、「どの年のデータが存在するか」を
// アプリに伝える手段がこれしかない。地区名までここに含めておくことで、地区セレクトの
// 描画に all.json（741KB）を取得する必要がなくなる。
//
// public/2027/ を置いて再実行するだけで反映される（predev / prebuild で自動実行）。

import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const outFile = join(publicDir, 'list.json')
const latestDir = join(publicDir, 'latest')

/** 年フォルダ（西暦4桁）を新しい順に返す。 */
async function findYearDirs() {
  const entries = await readdir(publicDir, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => Number(e.name))
    .sort((a, b) => b - a)
}

/** 1 年ぶんの地区一覧と版情報を、地区 JSON から組み立てる。 */
async function readYear(year) {
  const dir = join(publicDir, String(year))
  const files = await readdir(dir)
  const ids = files
    .filter((f) => f.endsWith('.json') && f !== 'all.json')
    .map((f) => f.slice(0, -'.json'.length))
    .sort()

  if (ids.length === 0) throw new Error(`${year}/ に地区 JSON がありません`)

  const areas = []
  const editions = new Set()
  const municipalities = new Set()
  let convertedAt = ''

  for (const id of ids) {
    const cal = JSON.parse(await readFile(join(dir, `${id}.json`), 'utf8'))
    const ics = join(dir, `${id}.ics`)
    const icsStat = await stat(ics).catch(() => null)
    if (!icsStat) throw new Error(`${year}/${id}.ics がありません（--no-ics で生成しませんでしたか？）`)

    areas.push({
      id,
      name: cal.area.name,
      ics: `${year}/${id}.ics`,
      json: `${year}/${id}.json`,
      ics_bytes: icsStat.size,
      days: cal.days.filter((d) => d.categories.length > 0).length,
    })

    editions.add(JSON.stringify({ era: cal.edition.era, range: cal.range }))
    municipalities.add(cal.municipality)
    if (cal.source?.converted_at > convertedAt) convertedAt = cal.source.converted_at
  }

  // 同じ年の地区で版や期間が食い違っていたら、混在に気づけるよう知らせる（処理は続ける）。
  if (editions.size > 1) {
    console.warn(`[warn] ${year}: 地区ごとに era / range が異なります。先頭の値を使います`)
  }
  const { era, range } = JSON.parse([...editions][0])

  return {
    year,
    era,
    range,
    converted_at: convertedAt || null,
    municipality: [...municipalities][0],
    areas,
  }
}

/**
 * 最新年度の .ics を public/latest/ に複製する。
 *
 * 購読者に「年度が変わったら URL を貼り替えて」と言わずに済ませるため。
 * UID は日付＋地区 ID なので年をまたいでも一意で、配信内容が翌年度に入れ替わっても
 * カレンダー側は重複せず更新される。
 */
async function writeLatestMirror(entry) {
  await mkdir(latestDir, { recursive: true })

  const wanted = new Set(entry.areas.map((a) => `${a.id}.ics`))
  // 地区が減った場合に古いファイルが残らないようにする（.ics 以外は触らない）。
  for (const f of await readdir(latestDir)) {
    if (f.endsWith('.ics') && !wanted.has(f)) await rm(join(latestDir, f))
  }

  for (const area of entry.areas) {
    await copyFile(join(publicDir, area.ics), join(latestDir, `${area.id}.ics`))
    area.subscribe = `latest/${area.id}.ics`
  }
}

const years = await findYearDirs()
if (years.length === 0) {
  console.error(`[error] ${publicDir} に年フォルダ（例: 2026）がありません`)
  process.exit(1)
}

const entries = []
for (const year of years) entries.push(await readYear(year))

await writeLatestMirror(entries[0])

const list = {
  schema_version: '1.0',
  municipality: entries[0].municipality,
  generated_at: new Date().toISOString(),
  latest: entries[0].year,
  years: entries.map(({ municipality: _municipality, ...rest }) => rest),
}

await writeFile(outFile, `${JSON.stringify(list, null, 2)}\n`, 'utf8')
console.log(
  `[OK] public/list.json  ${entries.length}年 / ` +
    entries.map((e) => `${e.year}:${e.areas.length}地区`).join(' '),
)
console.log(`[OK] public/latest/    ${entries[0].year}年度の .ics を ${entries[0].areas.length}件 複製`)
