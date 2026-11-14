import type { CommandDef, RunMainOptions } from 'utilful/cli'
import pkg from 'apiful/package.json' with { type: 'json' }
import { defineCommand } from 'utilful/cli'
import { GenerationError } from '../openapi/generate.ts'
import generateCommand from './commands/generate.ts'

const { name, version, description } = pkg

export const cliOptions: RunMainOptions = {
  expectedErrors: [GenerationError],
}

export const mainCommand: CommandDef = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  subCommands: {
    generate: generateCommand,
  },
})
