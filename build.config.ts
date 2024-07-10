import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/adapters', 'src/openapi'],
  externals: ['apiful/schema'],
  clean: true,
  declaration: true,
})
