// 配信している .ics は素のまま（リマインダー無し）なので、必要な人だけ
// ブラウザ側で VALARM を差し込んでからダウンロードする。

export type Reminder = {
  /** DTSTART（収集日の 00:00）からの分オフセット。負なら前倒し。0 は付けない */
  minutes: number
  label: string
}

export const REMINDERS: Reminder[] = [
  { minutes: 0, label: 'なし' },
  { minutes: -240, label: '前日 20:00' },
  { minutes: -180, label: '前日 21:00' },
  { minutes: -120, label: '前日 22:00' },
  { minutes: 360, label: '当日 6:00' },
  { minutes: 420, label: '当日 7:00' },
]

/**
 * 各 VEVENT に VALARM を差し込む。既存の行には一切手を触れないので、
 * 生成側が守っている 75 オクテット折り返しをそのまま保てる。
 */
export function withAlarm(ics: string, minutes: number): string {
  if (!minutes) return ics

  const trigger = `${minutes < 0 ? '-' : ''}PT${Math.abs(minutes)}M`
  const alarm = [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:ごみ収集',
    `TRIGGER:${trigger}`,
    'END:VALARM',
  ]

  const out: string[] = []
  for (const line of ics.split(/\r?\n/)) {
    if (line === 'END:VEVENT') out.push(...alarm)
    out.push(line)
  }
  return out.join('\r\n')
}

/** 終日イベントのアラームは 00:00 起点で解釈される、という前提の説明文。 */
export function reminderNote(minutes: number): string {
  if (!minutes) return 'カレンダーアプリの既定の通知に従います。'
  return '終日イベントのため収集日の 0:00 を起点に通知します。クライアントによっては独自の既定時刻が優先されます。'
}

export function icsFileName(year: number, areaId: string): string {
  return `hino-gomi-${year}-${areaId}.ics`
}

export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** 購読用 URL。https:// を webcal:// に替えるとカレンダーアプリが直接開く。 */
export function webcalUrl(httpUrl: string): string {
  return httpUrl.replace(/^https?:/, 'webcal:')
}

/** Google カレンダーの「URL で追加」画面を開くリンク。 */
export function googleCalendarUrl(httpUrl: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(httpUrl))}`
}
