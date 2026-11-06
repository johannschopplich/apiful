import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { useTemporaryDirectories } from 'utilful/cli/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { loadOpenAPIDocument } from '../../src/openapi/load'
import { currentDir } from '../utils'

const fixturesDir = path.join(currentDir, 'fixtures')
const multiFileRoot = path.join(fixturesDir, 'multi-file/root.yaml')
const createDirectory = useTemporaryDirectories()

describe('loadOpenAPIDocument', () => {
  let server: ReturnType<typeof createServer>
  let baseURL: string

  beforeAll(async () => {
    server = createServer(async (request, response) => {
      try {
        const content = await readFile(path.join(fixturesDir, new URL(request.url!, 'http://localhost').pathname))
        response.end(content)
      }
      catch {
        response.statusCode = 404
        response.end()
      }
    })
    await new Promise<void>(resolve => server.listen(0, resolve))
    baseURL = `http://localhost:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
  })

  describe('sources', () => {
    it('resolves a relative path against rootDir', async () => {
      const document = await loadOpenAPIDocument('test-echo-api-schema.yml', { rootDir: fixturesDir })

      expect(document.info.title).toBe('Test Echo API')
    })

    it('reads a file: URL', async () => {
      const document = await loadOpenAPIDocument(pathToFileURL(path.join(fixturesDir, 'pet-store-api-schema.json')).href)

      expect(document.info.title).toBe('Swagger Petstore - OpenAPI 3.0')
    })

    it('fetches an http URL and resolves its relative refs against it', async () => {
      const document = await loadOpenAPIDocument(new URL('/multi-file/root.yaml', baseURL))

      expect(Object.keys(document.components!.schemas!)).toContain('pet-2')
    })

    it('bundles an in-memory object without changing it', async () => {
      const source = {
        openapi: '3.0.3',
        info: { title: 'In-Memory API', version: '1.0.0' },
        paths: {},
        components: { schemas: { Tag: { $ref: './multi-file/schemas/tag.yaml' } } },
      }

      const document = await loadOpenAPIDocument(source, { rootDir: fixturesDir })

      expect(document.components!.schemas!.Tag).toEqual({ $ref: '#/components/schemas/tag' })
      expect(source.components.schemas.Tag).toEqual({ $ref: './multi-file/schemas/tag.yaml' })
    })

    it('awaits an async function', async () => {
      const document = await loadOpenAPIDocument(async () => ({
        openapi: '3.2.0',
        info: { title: 'Deferred API', version: '1.0.0' },
      }))

      expect(document.info.title).toBe('Deferred API')
    })
  })

  describe('bundling', () => {
    it('hoists external components under the names Redocly 1.x gives them', async () => {
      const { components } = await loadOpenAPIDocument(multiFileRoot)

      expect(Object.keys(components!.schemas!)).toEqual([
        'Id',
        'Error',
        'pet',
        'owner',
        'tag',
        'cat',
        'Dog',
        'animal',
        'errors_Error',
        'pet-2',
      ])
      expect(Object.keys(components!.parameters!)).toEqual(['PetId'])
      expect(Object.keys(components!.responses!)).toEqual(['Error', 'responses_Error'])
    })

    it('rewrites refs of a cross-file cycle and back to the root document', async () => {
      const { components } = await loadOpenAPIDocument(multiFileRoot)
      const { pet, owner } = components!.schemas! as Record<string, any>

      expect(pet.properties.id).toEqual({ $ref: '#/components/schemas/Id' })
      expect(pet.properties.owner).toEqual({ $ref: '#/components/schemas/owner' })
      expect(owner.properties.pets.items).toEqual({ $ref: '#/components/schemas/pet' })
    })

    it('rewrites discriminator mapping values that point into other files', async () => {
      const { components } = await loadOpenAPIDocument(multiFileRoot)
      const { animal } = components!.schemas! as Record<string, any>

      expect(animal.discriminator.mapping).toEqual({
        cat: '#/components/schemas/cat',
        dog: '#/components/schemas/Dog',
      })
    })

    it('bundles the refs in OpenAPI 3.2 components.mediaTypes', async () => {
      const { components } = await loadOpenAPIDocument({
        openapi: '3.2.0',
        info: { title: 'Media Types', version: '1.0.0' },
        components: { mediaTypes: { Tag: { schema: { $ref: './multi-file/schemas/tag.yaml' } } } },
      }, { rootDir: fixturesDir })

      expect(components!.mediaTypes!.Tag).toEqual({ schema: { $ref: '#/components/schemas/tag' } })
    })

    it('leaves the refs in an OpenAPI 3.1 components.mediaTypes as they are', async () => {
      const { components } = await loadOpenAPIDocument({
        openapi: '3.1',
        info: { title: 'Media Types', version: '1.0.0' },
        components: { mediaTypes: { Tag: { schema: { $ref: './multi-file/schemas/tag.yaml' } } } },
      }, { rootDir: fixturesDir })

      expect(components!.mediaTypes!.Tag).toEqual({ schema: { $ref: './multi-file/schemas/tag.yaml' } })
    })

    it('keeps the siblings of an OpenAPI 3.1 $ref', async () => {
      const { paths } = await loadOpenAPIDocument(multiFileRoot) as Record<string, any>

      expect(paths['/owners'].get.responses['200'].content['application/json'].schema.items).toEqual({
        $ref: '#/components/schemas/owner',
        description: 'An owner with their pets',
      })
    })

    it('keeps a YAML date as the string it is written as', async () => {
      const { info } = await loadOpenAPIDocument(multiFileRoot)

      expect(info.version).toBe('2024-01-01')
    })

    it('inlines a referenced file in neither format as text', async () => {
      const { paths } = await loadOpenAPIDocument(multiFileRoot) as Record<string, any>

      expect(paths['/pets/{id}'].get['x-codeSamples'][0].source).toBe('curl https://api.example.com/pets/1\n')
    })

    it('hoists a component under its unescaped name and escapes it in the rewritten ref', async () => {
      const directory = createDirectory({
        'other.yaml': [
          'schema: { type: string }',
          '/pets: { get: { responses: { 200: { content: { application/json: { schema: { type: integer } } } } } } }',
          '100%: { type: number }',
        ].join('\n'),
      })
      const source = createDocument({
        String: { $ref: './other.yaml#/schema' },
        Count: { $ref: './other.yaml#/~1pets/get/responses/200/content/application~1json/schema' },
        Share: { $ref: './other.yaml#/100%25' },
      })

      const { components } = await loadOpenAPIDocument(source, { rootDir: directory })

      expect(components!.schemas!.Count).toEqual({ $ref: '#/components/schemas/application~1json-schema' })
      expect(components!.schemas!['application/json-schema']).toEqual({ type: 'integer' })
      expect(components!.schemas!.Share).toEqual({ $ref: '#/components/schemas/100%25' })
      expect(components!.schemas!['100%']).toEqual({ type: 'number' })
    })

    it('keeps two refs of one file apart when a hoisted name matches the other ref', async () => {
      const directory = createDirectory({
        'common.yaml': [
          'Legacy: { properties: { bar: { $ref: \'#/legacy/Bar\' } } }',
          'Current: { properties: { bar: { $ref: \'#/components/schemas/Bar\' } } }',
          'legacy: { Bar: { type: string } }',
          'components: { schemas: { Bar: { type: integer } } }',
        ].join('\n'),
      })
      const source = createDocument({
        Legacy: { $ref: './common.yaml#/Legacy' },
        Current: { $ref: './common.yaml#/Current' },
      })

      const { components } = await loadOpenAPIDocument(source, { rootDir: directory })

      expect((components!.schemas!.Current as any).properties.bar).toEqual({ $ref: '#/components/schemas/schemas-Bar' })
      expect(components!.schemas!['schemas-Bar']).toEqual({ type: 'integer' })
    })
  })

  describe('errors', () => {
    it('rejects a Swagger 2.0 document', async () => {
      await expect(loadOpenAPIDocument({ swagger: '2.0', info: { title: 'Legacy API', version: '1.0.0' } }))
        .rejects
        .toThrow('Swagger 2.0')
    })

    it('rejects a document declaring openapi 2.0.0', async () => {
      await expect(loadOpenAPIDocument({ openapi: '2.0.0', info: { title: 'Legacy API', version: '1.0.0' } }))
        .rejects
        .toThrow('unsupported OpenAPI version `2.0.0`')
    })

    it('names a $ref whose file is missing', async () => {
      await expect(loadOpenAPIDocument(createDocument({ Pet: { $ref: './missing.yaml' } }), { rootDir: fixturesDir }))
        .rejects
        .toThrow('Failed to resolve `$ref` `./missing.yaml`')
    })

    it('names the file it fails to read', async () => {
      await expect(loadOpenAPIDocument('missing.yaml', { rootDir: fixturesDir }))
        .rejects
        .toThrow(path.join(fixturesDir, 'missing.yaml'))
    })

    it('names the URL it fails to fetch', async () => {
      await expect(loadOpenAPIDocument(`${baseURL}/missing.yaml`))
        .rejects
        .toThrow(`${baseURL}/missing.yaml`)
    })

    it('names the URL whose fetch times out', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => init?.signal
        ? Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
        : Promise.reject(new Error('Fetched without a timeout')))

      try {
        await expect(loadOpenAPIDocument(`${baseURL}/slow.yaml`))
          .rejects
          .toThrow(`Timed out fetching \`${baseURL}/slow.yaml\` after 30 seconds`)
      }
      finally {
        fetchSpy.mockRestore()
      }
    })

    it('names the URL whose body times out after the headers arrive', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ReadableStream({
        start(controller) {
          controller.error(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
        },
      })))

      try {
        await expect(loadOpenAPIDocument(`${baseURL}/slow.yaml`))
          .rejects
          .toThrow(`Timed out fetching \`${baseURL}/slow.yaml\` after 30 seconds`)
      }
      finally {
        fetchSpy.mockRestore()
      }
    })

    it('names the status of an error response whose body fails', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ReadableStream({
        start(controller) {
          controller.error(new TypeError('terminated'))
        },
      }), { status: 404, statusText: 'Not Found' }))

      try {
        await expect(loadOpenAPIDocument(`${baseURL}/missing.yaml`))
          .rejects
          .toThrow(`Failed to fetch \`${baseURL}/missing.yaml\` – 404 Not Found`)
      }
      finally {
        fetchSpy.mockRestore()
      }
    })

    it('names a $ref holding a malformed percent escape', async () => {
      const source = createDocument({
        Tag: { $ref: './multi-file/schemas/tag.yaml' },
        Share: { $ref: '#/components/schemas/100%' },
      })

      await expect(loadOpenAPIDocument(source, { rootDir: fixturesDir }))
        .rejects
        .toThrow('Failed to resolve `$ref` `#/components/schemas/100%`')
    })

    it('names the file it fails to parse', async () => {
      const filePath = path.join(createDirectory({ 'invalid.yaml': 'openapi: [3.1.0\n' }), 'invalid.yaml')

      await expect(loadOpenAPIDocument(filePath))
        .rejects
        .toThrow(filePath)
    })
  })
})

function createDocument(schemas: Record<string, unknown>) {
  return {
    openapi: '3.1.0',
    info: { title: 'Bundled API', version: '1.0.0' },
    paths: {},
    components: { schemas },
  }
}
