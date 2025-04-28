import type { CommandDef } from 'citty'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { generateDTS } from '../../openapi/generate.ts'
import { loadConfig } from '../utils.ts'

const command: CommandDef<{
  outfile: {
    type: 'string'
    description: string
    default: string
    required: false
  }
  root: {
    type: 'string'
    description: string
    required: false
  }
}> = defineCommand({
  meta: {
    name: 'generate',
    description: 'Generates TypeScript definitions from OpenAPI schemas',
  },
  args: {
    outfile: {
      type: 'string',
      description: 'Path to the output file',
      default: 'apiful.d.ts',
      required: false,
    },
    root: {
      type: 'string',
      description: 'Path to the project root',
      required: false,
    },
  },
  async run({ args }) {
    const rootDir = args.root || process.cwd()
    const { config } = await loadConfig(rootDir)

    if (Object.keys(config).length === 0) {
      consola.error('Configuration file `apiful.config.{js,ts,mjs,cjs,json}` is empty or does not exist')
      process.exit(1)
    }

    const resolvedOpenAPIServices = Object.fromEntries(
      Object.entries(config?.services ?? {})
        .filter(([, service]) => Boolean(service.schema)),
    )

    if (Object.keys(resolvedOpenAPIServices).length === 0) {
      consola.info('No OpenAPI schemas found, skipping generation')
      return
    }

    for (const service of Object.values(resolvedOpenAPIServices)) {
      if (typeof service.schema === 'string' && !service.schema.startsWith('http')) {
        service.schema = path.resolve(rootDir, service.schema)
      }
    }

    const types = await generateDTS(resolvedOpenAPIServices)
    const outfilePath = path.resolve(rootDir, args.outfile)
    await fsp.writeFile(outfilePath, types)

    const relativePath = path.relative(rootDir, outfilePath)
    consola.success(`Generated \`${relativePath}\` types`)
  },
})

export default command
