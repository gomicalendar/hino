import type { Category, Weekday } from './catalog.ts'

const WEEKDAY_JA: Record<Weekday, string> = {
  sun: '日',
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
}

export function weekdayLabel(weekday: Weekday): string {
  return WEEKDAY_JA[weekday]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** JSON の日付はローカル日付なので、Date を経由せず文字列のまま扱う。 */
export function formatDate(iso: string, weekday?: Weekday): string {
  const [, month, day] = iso.split('-')
  const base = `${Number(month)}月${Number(day)}日`
  return weekday ? `${base}（${weekdayLabel(weekday)}）` : base
}

/** 収集日までの距離を人間向けに。 */
export function relativeDayLabel(diff: number): string {
  if (diff === 0) return '今日'
  if (diff === 1) return '明日'
  if (diff === 2) return 'あさって'
  return `${diff}日後`
}

export function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return '不明'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

/** ローカルの今日を YYYY-MM-DD で。UTC 変換でずれないよう手で組み立てる。 */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** YYYY-MM-DD 同士の日数差。 */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

type ChipColor = 'default' | 'error' | 'info' | 'success' | 'warning'

const CATEGORY_COLOR: Record<string, ChipColor> = {
  burnable: 'warning',
  nonburnable: 'default',
  plastic: 'success',
  hazardous: 'error',
}

/** 資源（かん・びん…）は同じ日にまとまって出るので、一括で info に寄せる。 */
export function categoryColor(category: Category): ChipColor {
  return CATEGORY_COLOR[category.id] ?? (category.kind === 'shigen' ? 'info' : 'default')
}
