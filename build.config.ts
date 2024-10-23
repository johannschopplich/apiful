import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/extensions',
    'src/openapi',
    'src/http-status-codes',
    'src/http-status-phrases',
  ],
  externals: ['apiful/schema'],
  clean: true,
  declaration: true,
})
