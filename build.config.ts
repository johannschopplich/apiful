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
  ],
  externals: ['apiful/schema'],
  clean: true,
  declaration: true,
})
