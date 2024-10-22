import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { defineEndpoints, generateDTS } from '../src/openapi'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

export const endpoints = defineEndpoints({
  sampleApi: {
    schema: path.join(rootDir, 'test/fixtures/sample-api-schema.yml'),
  },
  petStore: {
    schema: path.join(rootDir, 'playground/schemas/pet-store.json'),
  },
})

const types = await generateDTS(endpoints)
await fsp.writeFile(path.join(rootDir, 'apiful.d.ts'), types)
consola.success('Generated `apiful` types')
