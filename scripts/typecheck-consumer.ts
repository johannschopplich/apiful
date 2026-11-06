/**
 * Type-checks a consumer of the built package against every supported TypeScript version.
 * The consumer imports each public subpath from `dist` and resolves `apiful/schema` to the
 * committed `test/fixtures/apiful.d.ts`, so run `pnpm run build` first.
 *
 * node scripts/typecheck-consumer.ts
 */
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'

// Keep in sync with the TypeScript requirement in docs/guide/getting-started.md.
const TYPESCRIPT_VERSIONS = ['5.9', '6.0', '7.0']

const rootDir = path.join(import.meta.dirname, '..')

const CONSUMER_SOURCE = `
import type { PetStore, PetStoreModel } from 'apiful/schema'
import { apiRouterBuilder, createClient, ofetchBuilder, openAPIBuilder } from 'apiful'
import { defineApifulConfig } from 'apiful/config'
import { OK } from 'apiful/http-status-codes'
import { OK as OK_PHRASE } from 'apiful/http-status-phrases'
import { generateDeclarations } from 'apiful/openapi/generate'
import { jsonToTypeDefinition } from 'apiful/utils'
import packageJson from 'apiful/package.json' with { type: 'json' }

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
declare function expectTrue<T extends true>(): void

const petStore = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(openAPIBuilder<'petStore'>())

export async function getPet(): Promise<PetStoreModel<'Pet'>> {
  const pet = await petStore('/pet/{petId}', { method: 'GET', path: { petId: 1 } })
  expectTrue<Equal<typeof pet, PetStore<'/pet/{petId}', 'get'>['response']>>()

  // @ts-expect-error The path parameter is a number.
  await petStore('/pet/{petId}', { method: 'GET', path: { petId: 'one' } })

  return pet
}

// @ts-expect-error The service is not part of the generated schema.
openAPIBuilder<'unknownService'>()

export const fetchClient = createClient().with(ofetchBuilder())
export const routerClient = createClient().with(apiRouterBuilder())
export const config = defineApifulConfig({ services: { petStore: { schema: 'pet-store.json' } } })
export const okStatus: [200, 'OK'] = [OK, OK_PHRASE]
export const declarations: Promise<{ entry: string }> = generateDeclarations({})
export const definition: string = jsonToTypeDefinition({ id: 1 })
export const packageVersion: string = packageJson.version
`

const consumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiful-consumer-'))

try {
  writeJSON('package.json', {
    private: true,
    type: 'module',
    dependencies: {
      apiful: `link:${rootDir}`,
      ...Object.fromEntries(TYPESCRIPT_VERSIONS.map(version => [`typescript-${version}`, `npm:typescript@~${version}.0`])),
    },
  })
  writeJSON('tsconfig.json', {
    compilerOptions: {
      target: 'ESNext',
      lib: ['ESNext', 'DOM'],
      module: 'NodeNext',
      strict: true,
      noEmit: true,
      types: [],
    },
    files: ['apiful.d.ts', 'consumer.ts', 'undici.d.ts'],
  })
  // ofetch's declarations import `undici`, which only its Node build depends on. Stubbing it
  // keeps the library check on for every other declaration, `dist` and the fixture included.
  fs.writeFileSync(path.join(consumerDir, 'undici.d.ts'), `declare module 'undici'\n`)
  fs.copyFileSync(path.join(rootDir, 'test/fixtures/apiful.d.ts'), path.join(consumerDir, 'apiful.d.ts'))
  fs.writeFileSync(path.join(consumerDir, 'consumer.ts'), CONSUMER_SOURCE.trimStart())

  execFileSync('pnpm', ['install', '--silent'], { cwd: consumerDir, stdio: 'inherit' })

  const failedVersions = TYPESCRIPT_VERSIONS.filter((version) => {
    const tscPath = path.join(consumerDir, 'node_modules', `typescript-${version}`, 'bin', 'tsc')

    try {
      const compilerVersion = execFileSync(tscPath, ['--version'], { encoding: 'utf-8' }).trim()
      console.log(`${compilerVersion}:`)
      execFileSync(tscPath, ['-p', consumerDir], { stdio: 'inherit' })
      console.log('  no errors')
      return false
    }
    catch {
      return true
    }
  })

  if (failedVersions.length > 0) {
    console.error(`The consumer fails to type-check with TypeScript ${failedVersions.join(', ')}`)
    process.exitCode = 1
  }
}
finally {
  fs.rmSync(consumerDir, { recursive: true, force: true })
}

function writeJSON(fileName: string, value: unknown): void {
  fs.writeFileSync(path.join(consumerDir, fileName), `${JSON.stringify(value, null, 2)}\n`)
}
