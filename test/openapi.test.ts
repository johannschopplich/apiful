import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../src/config'
import { generateDTS } from '../src/openapi/index'
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

  it('generates types for OpenAPI schema', async () => {
    const types = await generateDTS(config.services)
    expect(types).toMatchSnapshot()
  })
})
