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
      const client = _client.with(OpenAPIBuilder<'testEcho'>())
      const response = await client('/echo/static/constant')
      expect(response).toEqual({ value: 'foo' })
      assertType<{ value: string }>(response)
    })

    it('should get query parameters', async () => {
      const client = _client.with(OpenAPIBuilder<'testEcho'>())
      const response = await client('/echo/query', {
        query: {
          value: 'bar',
        },
      })
      expect(response).toEqual({ value: 'bar' })
      assertType<Record<string, string>>(response)
    })
  })

  describe('POST endpoints', () => {
    it('should post to /bar with body', async () => {
      const client = _client.with(OpenAPIBuilder<'testEcho'>())
      const response = await client('/echo/request', {
        method: 'POST',
        body: { foo: 'bar' },
      })
      expect(response.method).toBe('POST')
      expect(response.body).toEqual({ foo: 'bar' })
    })
  })

  it('should handle error responses', async () => {
    const client = _client.with(OpenAPIBuilder<'testEcho'>())
    // @ts-expect-error: Path not defined in OpenAPI schema
    expect(() => client('/not-found')).rejects.toThrow()
  })
})
