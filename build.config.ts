import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/adapters',
    'src/openapi',
    'src/http-status-codes',
    'src/http-status-phrases',
  ],
  externals: ['apiful/schema'],
  clean: true,
  declaration: true,
})
