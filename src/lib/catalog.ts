// public/list.json と public/<年>/<地区>.{json,ics} を読むための型と取得処理。
// list.json は scripts/build-list.mjs が生成する。

export type Kind = 'gomi' | 'shigen'

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export type Category = {
  id: string
  label: string
  short_label: string
  kind: Kind
}

export type DateRange = { start: string; end: string }

export type Day = {
  date: string
  weekday: Weekday
  /** 祝日の日にだけ現れる */
  holiday?: string
  /** 注記がある日にだけ現れる */
  notes?: string[]
  categories: string[]
}

/** public/<年>/<地区>.json */
export type AreaCalendar = {
  schema_version: string
  municipality: string
  area: { id: string; name: string }
  edition: { era: string; year: number }
  source: { file: string; sha256: string; pages: number; converted_at: string }
  range: DateRange
  categories: Category[]
  days: Day[]
  by_category: Record<string, string[]>
}

export type ListArea = {
  id: string
  name: string
  /** public ルートからの相対パス */
  ics: string
  json: string
  ics_bytes: number
  /** 収集がある日の数 */
  days: number
  /**
   * 年に依存しない購読用パス（latest/<地区>.ics）。最新年にだけ付く。
   * 過去の年を選んでいるときは購読を勧めない、という判断に使う。
   */
  subscribe?: string
}

export type ListYear = {
  year: number
  era: string
  range: DateRange
  converted_at: string | null
  areas: ListArea[]
}

/** public/list.json */
export type Catalog = {
  schema_version: string
  municipality: string
  generated_at: string
  latest: number
  /** 新しい年が先 */
  years: ListYear[]
}

/** GitHub Pages のサブパス配信でも壊れないよう、必ず base を通す。 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`
}

/** webcal:// や Google カレンダーに渡すための絶対 URL。 */
export function absoluteUrl(path: string): string {
  return new URL(assetUrl(path), window.location.href).href
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(assetUrl(path))
  if (!res.ok) throw new Error(`${path} を取得できませんでした（HTTP ${res.status}）`)
  return res.text()
}

export async function fetchCatalog(): Promise<Catalog> {
  return JSON.parse(await fetchText('list.json')) as Catalog
}

export async function fetchAreaCalendar(area: ListArea): Promise<AreaCalendar> {
  return JSON.parse(await fetchText(area.json)) as AreaCalendar
}

export async function fetchIcs(area: ListArea): Promise<string> {
  return fetchText(area.ics)
}

export function findYear(catalog: Catalog, year: number | null): ListYear {
  return catalog.years.find((y) => y.year === year) ?? catalog.years[0]
}

export function findArea(year: ListYear, areaId: string | null): ListArea {
  return year.areas.find((a) => a.id === areaId) ?? year.areas[0]
}
