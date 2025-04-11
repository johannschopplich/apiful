import type { UserConfig } from 'vite'
import { defineConfig } from 'vitest/config'

const vite: UserConfig = defineConfig({
  test: {
    poolOptions: {
      forks: {
        isolate: false,
        singleFork: true,
      },
    },
  },
})

export default vite
