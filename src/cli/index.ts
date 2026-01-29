import { defineCommand, runMain } from 'citty'
import pkg from '../../package.json' with { type: 'json' }

const { name, version } = pkg

const command = defineCommand({
  meta: {
    name,
    version,
    description: 'APIful CLI: Extensible & Type-Safe API Tooling',
  },
  subCommands: {
    generate: () => import('./commands/generate.ts').then(command => command.default),
  },
})

runMain(command)
