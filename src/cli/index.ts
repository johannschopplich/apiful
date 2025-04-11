import { defineCommand, runMain } from 'citty'
import packageJson from '../../package.json' with { type: 'json' }

const { name, version } = packageJson

const command = defineCommand({
  meta: {
    name,
    version,
    description: 'APIful CLI: Extensible, Typed API Tooling',
  },
  subCommands: {
    generate: () => import('./commands/generate.ts').then(r => r.default),
  },
})

runMain(command)
