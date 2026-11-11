import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 相对 base：既能在本地预览，也能直接部署到 GitHub Pages 的任意子路径。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
