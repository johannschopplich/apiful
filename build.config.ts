import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/cli/index',
    'src/config',
    'src/extensions/index',
    'src/index',
    'src/openapi/index',
    'src/generated/http-status-codes',
    'src/generated/http-status-phrases',
    'src/utils/index',
  ],
  externals: [
    'apiful/schema',
    'json-schema',
    'json-schema-to-typescript-lite',
    'openapi-typescript',
  ],
  clean: true,
  declaration: true,
})
