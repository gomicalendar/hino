import { createTheme } from '@mui/material/styles'

// colorSchemeSelector: 'media' なので、OS のダーク設定にそのまま追従する。
// 切り替え UI を持たないぶん、初期化スクリプトも不要。
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#2e7d32' },
        background: { default: '#fdf9ec', paper: '#fffdf7' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#81c784' },
        background: { default: '#14170f', paper: '#1c2016' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Roboto',
      '"Hiragino Sans"',
      '"Noto Sans JP"',
      '"Yu Gothic UI"',
      'Meiryo',
      'sans-serif',
    ].join(','),
  },
})

export default theme
