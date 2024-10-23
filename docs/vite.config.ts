import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: [
      'vitepress',
    ],
  },
  plugins: [
    UnoCSS(),
  ],
})
