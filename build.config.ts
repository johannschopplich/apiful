import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  externals: ['apiverse', 'openapi-typescript'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
})
