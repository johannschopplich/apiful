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

  it('handles GET static response', async () => {
    const client = _client.with(OpenAPIBuilder<'testEcho'>())
    const response = await client('/echo/static/constant')
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('handles GET query parameters', async () => {
    const client = _client.with(OpenAPIBuilder<'testEcho'>())
    const response = await client('/echo/query', {
      query: {
        value: 'bar',
      },
    })
    expect(response).toEqual({ value: 'bar' })
    assertType<Record<string, string>>(response)
  })

  it('handles POST request', async () => {
    const client = _client.with(OpenAPIBuilder<'testEcho'>())
    const response = await client('/echo/request', {
      method: 'POST',
      body: { foo: 'bar' },
    })
    expect(response.method).toBe('POST')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles error responses', async () => {
    const client = _client.with(OpenAPIBuilder<'testEcho'>())
    await expect(() => {
      return client(
        // @ts-expect-error: Path not defined in OpenAPI schema
        '/not-found',
      )
    }).rejects.toThrow()
  })
})
