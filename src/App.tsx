import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import AreaPicker from './components/AreaPicker.tsx'
import DownloadCard from './components/DownloadCard.tsx'
import SubscribeCard from './components/SubscribeCard.tsx'
import UpcomingCard from './components/UpcomingCard.tsx'
import {
  assetUrl,
  fetchAreaCalendar,
  fetchCatalog,
  findArea,
  findYear,
  type AreaCalendar,
  type Catalog,
} from './lib/catalog.ts'
import { formatTimestamp, todayIso } from './lib/format.ts'

const STORAGE_KEY = 'hino-gomi.area'

function readStoredArea(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // プライベートモードなどで localStorage が使えないだけなので無視する
  }
}

function storeArea(areaId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, areaId)
  } catch {
    /* 同上 */
  }
}

/** ?area=... 付き URL の共有を優先し、無ければ前回の選択を復元する。 */
function initialSelection(): { year: number | null; areaId: string | null } {
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year'))
  return {
    year: Number.isInteger(year) && year > 0 ? year : null,
    areaId: params.get('area') ?? readStoredArea(),
  }
}

function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [selection, setSelection] = useState(initialSelection)
  const [picked, setPicked] = useState(false)
  const [cal, setCal] = useState<AreaCalendar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = useMemo(() => todayIso(), [])

  function select(next: Partial<{ year: number; areaId: string }>) {
    setPicked(true)
    setSelection((s) => ({ ...s, ...next }))
  }

  useEffect(() => {
    fetchCatalog()
      .then(setCatalog)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  // 該当が無ければ最新年・先頭の地区に落ちる（古い共有 URL でも壊れない）。
  const year = catalog ? findYear(catalog, selection.year) : null
  const area = year ? findArea(year, selection.areaId) : null

  useEffect(() => {
    if (!area) return
    setCal(null)
    let cancelled = false
    fetchAreaCalendar(area)
      .then((c) => {
        if (!cancelled) setCal(c)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [area])

  // 開いただけで ?year=&area= が付くと勝手にリダイレクトされたように見えるので、
  // 自分で選び直したときにだけ URL に反映する（そのまま共有できる）。
  useEffect(() => {
    if (!picked || !year || !area) return
    storeArea(area.id)
    const params = new URLSearchParams(window.location.search)
    params.set('year', String(year.year))
    params.set('area', area.id)
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [picked, year, area])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Box
            component="img"
            src={assetUrl('logo.png')}
            alt=""
            sx={{ width: 32, height: 32, mr: 1.5, borderRadius: '50%' }}
          />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            日野市 ごみカレンダー
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, flexGrow: 1 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          ごみ収集日を、いつものカレンダーに
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          地区を選ぶと、iCalendar 形式（.ics）で受け取れます。Google カレンダー・
          Apple カレンダー・Outlook などで使えます。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            データを読み込めませんでした。時間をおいて再読み込みしてください。
            <Typography variant="caption" sx={{ display: 'block' }}>
              {error}
            </Typography>
          </Alert>
        )}

        {!catalog || !year || !area ? (
          <Stack spacing={3}>
            <Skeleton variant="rounded" height={72} />
            <Skeleton variant="rounded" height={220} />
            <Skeleton variant="rounded" height={220} />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <AreaPicker
              catalog={catalog}
              year={year}
              areaId={area.id}
              onYearChange={(y) => select({ year: y })}
              onAreaChange={(a) => select({ areaId: a })}
            />
            <SubscribeCard catalog={catalog} year={year} area={area} />
            <DownloadCard year={year} area={area} />
            <UpcomingCard cal={cal} today={today} />

            <Box component="footer">
              <Divider sx={{ mb: 2 }} />
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                sx={{ display: 'block' }}
              >
                {catalog.municipality}が配布する「ごみ・資源分別カレンダー」PDF を変換したデータです。
                内容は配布元の PDF が正となります（変換日 {formatTimestamp(year.converted_at)}）。
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                JSON でも配布しています：
                <Link href={assetUrl(area.json)} target="_blank" rel="noreferrer">
                  {area.id}.json
                </Link>
              </Typography>
            </Box>
          </Stack>
        )}
      </Container>
    </Box>
  )
}

export default App
