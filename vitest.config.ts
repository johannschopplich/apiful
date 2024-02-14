import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      threads: {
        isolate: false,
        singleThread: true,
      },
    },
  },
})
