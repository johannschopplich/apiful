import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineApifulConfig } from '../src/config'
import { generateDTS } from '../src/openapi'
import { currentDir } from './utils'

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPI TypeScript definitions generation', () => {
  const config = defineApifulConfig({
    services: {
      sampleApi: {
        schema: path.join(currentDir, 'fixtures/sample-api-schema.yml'),
      },
    },
  })

  it('generates OpenAPI types', async () => {
    const types = await generateDTS(config.services)
    expect(types).toMatchSnapshot()
  })
})
