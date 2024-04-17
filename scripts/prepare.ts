import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'
import { consola } from 'consola'
import { defineEndpoints, generateDTS } from '../src/openapi'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

export const endpoints = defineEndpoints({
  sampleApi: {
    schema: resolve(rootDir, 'test/fixtures/sample-api-schema.yml'),
  },
  petStore: {
    schema: resolve(rootDir, 'playground/schemas/pet-store.json'),
  },
})

const types = await generateDTS(endpoints)
await writeFile(resolve(rootDir, 'apiverse.d.ts'), types)
consola.success('Generated `apiverse` types')
