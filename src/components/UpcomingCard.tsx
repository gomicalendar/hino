import { useMemo } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { AreaCalendar } from '../lib/catalog.ts'
import { categoryColor, daysBetween, formatDate, relativeDayLabel } from '../lib/format.ts'
import { categoryMap, resolveCategories, upcoming } from '../lib/schedule.ts'

const WINDOW_DAYS = 14

type Props = { cal: AreaCalendar | null; today: string }

export default function UpcomingCard({ cal, today }: Props) {
  const map = useMemo(() => (cal ? categoryMap(cal) : new Map()), [cal])
  const result = useMemo(() => (cal ? upcoming(cal, today, WINDOW_DAYS) : null), [cal, today])

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          直近 {WINDOW_DAYS} 日の収集日
        </Typography>

        {!cal || !result ? (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Stack>
        ) : result.status === 'after' ? (
          <Alert severity="info">
            この年の版（{cal.range.start} 〜 {cal.range.end}）は終了しています。新しい年を選んでください。
          </Alert>
        ) : (
          <>
            {result.status === 'before' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                まだ開始前の版です。{formatDate(cal.range.start)}からの収集日を表示しています。
              </Alert>
            )}

            {result.days.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                収集日はありません。
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={1.5}>
                {result.days.map((day) => {
                  const diff = daysBetween(today, day.date)
                  return (
                    <Box key={day.date} sx={{ pt: 0.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                        <Typography variant="subtitle1" component="span">
                          {formatDate(day.date, day.weekday)}
                        </Typography>
                        {diff >= 0 && diff <= WINDOW_DAYS && (
                          <Typography variant="caption" color="text.secondary">
                            {relativeDayLabel(diff)}
                          </Typography>
                        )}
                        {day.holiday && (
                          <Typography variant="caption" color="error">
                            {day.holiday}
                          </Typography>
                        )}
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={0.5}
                        useFlexGap
                        sx={{ flexWrap: 'wrap', mt: 0.5 }}
                      >
                        {resolveCategories(map, day.categories).map((category) => (
                          <Chip
                            key={category.id}
                            label={category.short_label}
                            size="small"
                            color={categoryColor(category)}
                            variant="outlined"
                          />
                        ))}
                      </Stack>

                      {day.notes?.map((note) => (
                        <Typography
                          key={note}
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          ※ {note}
                        </Typography>
                      ))}
                    </Box>
                  )
                })}
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
