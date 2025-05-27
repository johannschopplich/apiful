import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../src/config.ts'
import { generateDTS } from '../src/openapi/index.ts'
import { currentDir } from './utils.ts'

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPI to TypeScript', () => {
  const config = defineApifulConfig({
    services: {
      testEcho: {
        schema: path.join(currentDir, 'fixtures/test-echo-api-schema.yml'),
      },
    },
  })

  it('generates OpenAPI types', async () => {
    const types = await generateDTS(config.services)
    expect(types).toMatchSnapshot()
  })
})
