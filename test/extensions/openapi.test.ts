/* eslint-disable test/prefer-lowercase-title */
import type { Listener } from 'listhen'
import type { ApiClient } from '../../src'
import { assertType, beforeAll, describe, expect, it } from 'vitest'
import { createClient, OpenAPIBuilder } from '../../src'
import { createListener } from '../utils'

describe('OpenAPI adapter', () => {
  let _listener: Listener
  let _client: ApiClient

  beforeAll(async () => {
    _listener = await createListener()
    _client = createClient({
      baseURL: _listener.url,
    })
  })

  describe('GET endpoints', () => {
    it('should get foo with value "bar"', async () => {
      const client = _client.with(OpenAPIBuilder<'sampleApi'>())
      const response = await client('/foo')
      expect(response).toEqual({ foo: 'bar' })
      assertType<{ foo: string }>(response)
    })

    it('should get foo with value "1"', async () => {
      const client = _client.with(OpenAPIBuilder<'sampleApi'>())
      const response = await client('/foo/1')
      expect(response).toEqual({ foo: '1' })
      assertType<{ foo: string }>(response)
    })

    it('should get query parameters', async () => {
      const client = _client.with(OpenAPIBuilder<'sampleApi'>())
      const response = await client('/params', {
        query: {
          foo: 'bar',
        },
      })
      expect(response).toEqual({ foo: 'bar' })
      assertType<Record<string, string>>(response)
    })
  })

  describe('POST endpoints', () => {
    it('should post to /bar with body', async () => {
      const client = _client.with(OpenAPIBuilder<'sampleApi'>())
      const response = await client('/bar', {
        method: 'POST',
        body: { foo: 'bar' },
      })
      expect(response.body).toEqual({ foo: 'bar' })
    })
  })

  it('should handle error responses', async () => {
    const client = _client.with(OpenAPIBuilder<'sampleApi'>())
    expect(async () => client('/bar', {
      method: 'POST',
      body: {
        throw: true,
      },
    })).rejects.toThrow()
  })
})
