import { defineCommand, runMain } from 'citty'
import { name, version } from '../../package.json'

const command = defineCommand({
  meta: {
    name,
    version,
    description: 'APIful CLI: Extensible, Typed API Tooling',
  },
  subCommands: {
    generate: () => import('./commands/generate').then(r => r.default),
  },
})

runMain(command)
