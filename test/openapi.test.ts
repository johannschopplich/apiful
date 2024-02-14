/* eslint-disable test/prefer-lowercase-title */
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defineOpenAPIEndpoints, generateOpenAPITypes } from '../src'
import { currentDir } from './utils'

describe('OpenAPI Adapter', () => {
  const endpoints = defineOpenAPIEndpoints({
    sampleApi: {
      schema: resolve(currentDir, 'fixtures/sample-api-schema.yml'),
    },
  })

  it('defines OpenAPI endpoints', () => {
    expect(endpoints).toHaveProperty('sampleApi')
    expect(endpoints.sampleApi).toHaveProperty('schema')
  })

  it('generates OpenAPI types', async () => {
    const types = await generateOpenAPITypes(endpoints)
    expect(types).toMatchSnapshot()
  })
})
