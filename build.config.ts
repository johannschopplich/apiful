import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/adapters', 'src/openapi'],
  externals: ['apiverse/schema'],
  clean: true,
  declaration: true,
})
