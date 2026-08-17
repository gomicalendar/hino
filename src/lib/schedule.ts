import type { AreaCalendar, Category, Day } from './catalog.ts'
import { daysBetween } from './format.ts'

export type Upcoming = {
  /**
   * in-range: 今日が収録期間内。before: まだ期間が始まっていない（先の年度を見ている）。
   * after: 期間が終わっている（古い年度を見ている）。
   */
  status: 'in-range' | 'before' | 'after'
  days: Day[]
}

export function categoryMap(cal: AreaCalendar): Map<string, Category> {
  return new Map(cal.categories.map((c) => [c.id, c]))
}

export function resolveCategories(map: Map<string, Category>, ids: string[]): Category[] {
  return ids.flatMap((id) => {
    const category = map.get(id)
    return category ? [category] : []
  })
}

/**
 * 今日以降 windowDays 日ぶんの収集日。
 * 期間外の年度を選んでいるときは、代わりに先頭（before）を返して空表示を避ける。
 */
export function upcoming(cal: AreaCalendar, todayIso: string, windowDays = 14): Upcoming {
  const collections = cal.days.filter((d) => d.categories.length > 0)

  if (todayIso > cal.range.end) return { status: 'after', days: [] }

  const status = todayIso < cal.range.start ? 'before' : 'in-range'
  const from = status === 'before' ? cal.range.start : todayIso

  return {
    status,
    days: collections.filter((d) => d.date >= from && daysBetween(from, d.date) < windowDays),
  }
}
