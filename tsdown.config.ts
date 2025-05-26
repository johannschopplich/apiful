import type { UserConfig, UserConfigFn } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const config: UserConfig | UserConfigFn = defineConfig({
  entry: [
    'src/cli/index.ts',
    'src/config.ts',
    'src/extensions/index.ts',
    'src/index.ts',
    'src/openapi/index.ts',
    'src/generated/http-status-codes.ts',
    'src/generated/http-status-phrases.ts',
    'src/utils/index.ts',
  ],
  external: [
    'apiful/schema',
    'json-schema',
    'json-schema-to-typescript-lite',
    'openapi-typescript',
  ],
  dts: true,
})

export default config
