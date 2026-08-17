import { useState, type FocusEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { absoluteUrl, type Catalog, type ListArea, type ListYear } from '../lib/catalog.ts'
import { googleCalendarUrl, webcalUrl } from '../lib/ics.ts'

type Props = { catalog: Catalog; year: ListYear; area: ListArea }

export default function SubscribeCard({ catalog, year, area }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  // 最新年度なら latest/ 経由の恒久 URL、過去の年度ならその年度のファイルを直接指す。
  const isLatest = year.year === catalog.latest
  const httpUrl = absoluteUrl(area.subscribe ?? area.ics)
  const url = webcalUrl(httpUrl)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setToast('購読 URL をコピーしました')
    } catch {
      // http 配信や権限拒否でクリップボードが使えないとき。黙って失敗させない。
      setToast('コピーできませんでした。URL を長押しして選択してください')
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          購読（おすすめ）
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          URL を登録しておくと、カレンダーアプリが定期的に読み直します。
          {isLatest && ' この URL は年度が切り替わっても差し替え不要です。'}
        </Typography>

        <TextField
          label="購読 URL"
          value={url}
          fullWidth
          slotProps={{
            // クリップボードが使えない環境でも手で選べるよう、フォーカスで全選択する。
            // 文字サイズは 16px 未満にしない（iOS がフォーカス時に拡大してしまう）。
            htmlInput: {
              readOnly: true,
              spellCheck: false,
              onFocus: (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
            },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="コピー">
                    <IconButton onClick={copy} edge="end" aria-label="購読 URL をコピー">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<EventRepeatIcon />} href={url}>
            カレンダーアプリで開く
          </Button>
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={googleCalendarUrl(httpUrl)}
            target="_blank"
            rel="noreferrer"
          >
            Google カレンダーに追加
          </Button>
        </Stack>

        {!isLatest && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {year.year}年度ぶんだけの URL です。最新年度（{catalog.latest}
            年度）を選ぶと、毎年使える URL になります。
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          リマインダー付きにしたい場合は、購読ではなくダウンロードを使ってください。
        </Typography>

        <Snackbar
          open={toast !== null}
          autoHideDuration={3000}
          onClose={() => setToast(null)}
          message={toast}
        />
      </CardContent>
    </Card>
  )
}
