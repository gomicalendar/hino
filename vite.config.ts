import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages のサブパス（https://<user>.github.io/<repo>/）で配信する。
// リポジトリ名が違う場合は BASE_PATH で上書きできる（CI もこれを渡している）。
const base = process.env.BASE_PATH ?? '/hino-gomi/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
