import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import type { Catalog, ListYear } from '../lib/catalog.ts'

type Props = {
  catalog: Catalog
  year: ListYear
  areaId: string
  onYearChange: (year: number) => void
  onAreaChange: (areaId: string) => void
}

export default function AreaPicker({ catalog, year, areaId, onYearChange, onAreaChange }: Props) {
  // 横並びだと地区名が詰まるので、md 未満は上下に積む（スマホ・タブレット縦は常に縦並び）
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField
        select
        label="年"
        value={year.year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}
      >
        {catalog.years.map((y) => (
          <MenuItem key={y.year} value={y.year}>
            {y.era}（{y.year}年）
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="地区"
        value={areaId}
        onChange={(e) => onAreaChange(e.target.value)}
        helperText="お住まいの町名を含む地区を選んでください"
        fullWidth
      >
        {year.areas.map((a) => (
          <MenuItem key={a.id} value={a.id}>
            {a.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}
