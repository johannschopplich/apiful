import type { Listener } from 'listhen'
import type { ApiClient } from '../../src/client'
import { afterAll, assertType, beforeAll, describe, expect, it } from 'vitest'
import { apiRouterBuilder, createClient } from '../../src/index'
import { createListener } from '../utils'

describe('apiRouterBuilder adapter', () => {
  let _listener: Listener
  let _client: ApiClient

  beforeAll(async () => {
    _listener = await createListener()
    _client = createClient({
      baseURL: _listener.url,
      headers: {
        'X-Foo': 'bar',
      },
    })
  })

  afterAll(async () => {
    await _listener.close()
  })

  it('handles GET request for static constant endpoint', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.static!.constant!.get<{ value: string }>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('handles POST request with JSON body', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.post({ foo: 'bar' })
    expect(response.method).toEqual('POST')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles PUT request with JSON body', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.put({ foo: 'bar' })
    expect(response.method).toEqual('PUT')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles DELETE request without body', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.delete()
    expect(response.method).toEqual('DELETE')
  })

  it('handles PATCH request with JSON body', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.patch({ foo: 'bar' })
    expect(response.method).toEqual('PATCH')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles GET request with query parameters', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.query!.get({ value: 'bar' })
    expect(response).toEqual({ value: 'bar' })
  })

  it('includes default headers in requests', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.post(undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(response.headers).to.include({
      'x-foo': 'bar',
      'content-type': 'application/json',
    })
  })

  it('overrides default headers with request-specific headers', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.post(undefined, {
      headers: { 'X-Foo': 'baz' },
    })
    expect(response.headers).to.include({ 'x-foo': 'baz' })
  })

  it('supports bracket notation for path segments', async () => {
    const client = _client.with(apiRouterBuilder())
    // eslint-disable-next-line dot-notation
    const response = await client.echo!.static!['constant']!.get<{ value: string }>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('supports function call syntax for path segments', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.static!('constant').get<{ value: string }>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('supports multiple path segments in single call', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client('echo', 'static', 'constant').get<{ value: string }>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ value: string }>(response)
  })

  it('throws error for non-existent endpoints', async () => {
    const client = _client.with(apiRouterBuilder())
    await expect(async () => {
      await client.baz!.get<{ value: string }>()
    }).rejects.toThrow(/404/)
  })
})
