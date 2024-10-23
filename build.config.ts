import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/extensions',
    'src/openapi',
    {
      builder: 'mkdist',
      input: 'src/generated',
      outDir: 'dist',
    },
  ],
  externals: ['apiful/schema'],
  clean: true,
  declaration: true,
  failOnWarn: false,
})
