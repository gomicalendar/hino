import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DownloadIcon from '@mui/icons-material/Download'
import { fetchIcs, type ListArea, type ListYear } from '../lib/catalog.ts'
import { downloadText, icsFileName, reminderNote, REMINDERS, withAlarm } from '../lib/ics.ts'
import { formatBytes } from '../lib/format.ts'

type Props = { year: ListYear; area: ListArea }

export default function DownloadCard({ year, area }: Props) {
  const [minutes, setMinutes] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 配信ファイルはリマインダー無しなので、常に本文を取得してから必要なら加工する。
  // ファイル名もこちらで決められるので、取り込み先で地区が分かる。
  async function download() {
    setBusy(true)
    setError(null)
    try {
      const ics = await fetchIcs(area)
      downloadText(icsFileName(year.year, area.id), withAlarm(ics, minutes))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          ダウンロード
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          .ics ファイルを保存して、カレンダーアプリに取り込みます。取り込み直しても
          イベントは重複しません。
        </Typography>

        {/* 縦並びのときは主要ボタンを幅いっぱいにして押しやすくする */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <TextField
            select
            label="リマインダー"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            sx={{ minWidth: 180 }}
          >
            {REMINDERS.map((r) => (
              <MenuItem key={r.minutes} value={r.minutes}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={download}
            loading={busy}
            sx={{ mt: { sm: 1 } }}
          >
            .ics をダウンロード
          </Button>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2 }}
        >
          {formatBytes(area.ics_bytes)} / 収集日 {area.days}日（{year.range.start} 〜{' '}
          {year.range.end}）
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {reminderNote(minutes)}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
