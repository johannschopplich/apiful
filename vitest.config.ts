import type { UserConfig } from 'vite'
import { defineConfig } from 'vitest/config'

const config: UserConfig = defineConfig({
  test: {
    maxWorkers: 1,
  },
})

export default config
