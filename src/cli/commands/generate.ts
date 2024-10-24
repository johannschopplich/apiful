import type { ApifulConfig } from '../../config'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand } from 'citty'
import { consola } from 'consola'
import { createJiti } from 'jiti'
import { generateDTS } from '../../openapi/generate'

export default defineCommand({
  meta: {
    name: 'generate',
    description: 'Generates TypeScript definitions from OpenAPI schemas',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to the configuration file',
      default: 'apiful.config.ts',
      required: false,
    },
    definition: {
      type: 'string',
      description: 'Path to the output file',
      default: 'apiful.d.ts',
      required: false,
    },
    cwd: {
      type: 'string',
      description: 'Current working directory',
      required: false,
    },
  },
  async run({ args }) {
    const cwd = args.cwd || process.cwd()
    const configPath = path.resolve(cwd, args.config)

    const jiti = createJiti(cwd)
    const config = (await jiti.import(
      configPath,
      { default: true, try: true },
    )) as ApifulConfig

    if (!config) {
      consola.error(`Configuration file \`${args.config}\` not found`)
      process.exit(1)
    }

    const resolvedOpenAPIServices = Object.fromEntries(
      Object.entries(config.services)
        .filter(([, service]) => Boolean(service.schema)),
    )

    if (Object.keys(resolvedOpenAPIServices).length === 0) {
      consola.info('No OpenAPI schemas found, skipping generation')
      return
    }

    for (const service of Object.values(resolvedOpenAPIServices)) {
      if (typeof service.schema === 'string' && !service.schema.startsWith('http')) {
        service.schema = path.resolve(cwd, service.schema)
      }
    }

    const types = await generateDTS(resolvedOpenAPIServices)
    await fsp.writeFile(path.resolve(cwd, args.definition), types)
    consola.success(`Generated \`${args.definition}\` types`)
  },
})
