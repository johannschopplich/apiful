import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineEndpoints, generateDTS } from '../src/openapi'
import { currentDir } from './utils'

// eslint-disable-next-line test/prefer-lowercase-title
describe('OpenAPI Adapter', () => {
  const endpoints = defineEndpoints({
    sampleApi: {
      schema: path.join(currentDir, 'fixtures/sample-api-schema.yml'),
    },
  })

  it('defines OpenAPI endpoints', () => {
    expect(endpoints).toHaveProperty('sampleApi')
    expect(endpoints.sampleApi).toHaveProperty('schema')
  })

  it('generates OpenAPI types', async () => {
    const types = await generateDTS(endpoints)
    expect(types).toMatchSnapshot()
  })
})
