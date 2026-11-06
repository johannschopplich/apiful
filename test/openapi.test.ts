import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../src/config'
import { generateDTS, generateDTSFragments, SchemaGenerationError } from '../src/openapi/index'
import { currentDir } from './utils'

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPI types generation', () => {
  const config = defineApifulConfig({
    services: {
      testEcho: {
        schema: path.join(currentDir, 'fixtures/test-echo-api-schema.yml'),
      },
    },
  })

  it('generates an entry and one fragment per service', async () => {
    const { entry, fragments } = await generateDTSFragments(config.services)

    expect(entry).toMatchSnapshot()
    expect(fragments).toMatchSnapshot()
  })

  it('joins the entry and the fragments into a single declaration file', async () => {
    const { entry, fragments } = await generateDTSFragments(config.services)
    const types = await generateDTS(config.services)

    expect(types).toBe(`${entry}\n${Object.values(fragments).join('\n\n')}`)
  })

  it('generates the entry alone for a configuration listing no service', async () => {
    expect(await generateDTS({})).toBe((await generateDTSFragments({})).entry)
  })

  it('rejects services whose generated type names collide', async () => {
    const service = config.services.testEcho!

    await expect(generateDTSFragments({ foo: service, fooModel: service }))
      .rejects
      .toThrow(new SchemaGenerationError('Services `foo` and `fooModel` both generate the type `FooModel`'))
    await expect(generateDTSFragments({ foo: service, fooPaths: service }))
      .rejects
      .toThrow(new SchemaGenerationError('Services `foo` and `fooPaths` both generate the type `FooPaths`'))
  })
})
