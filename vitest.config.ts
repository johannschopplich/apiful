import type { UserConfig } from 'vite'
import { defineConfig } from 'vitest/config'

const config: UserConfig = defineConfig({
  test: {
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})

export default config
