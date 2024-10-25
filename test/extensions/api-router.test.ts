import type { Listener } from 'listhen'
import type { ApiClient } from '../../src'
import { afterAll, assertType, beforeAll, describe, expect, it } from 'vitest'
import { apiRouterBuilder, createClient } from '../../src'
import { createListener } from '../utils'

interface FooResponse {
  foo: string
}

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

  it('handles GET request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.foo!.get<FooResponse>()
    expect(response).toEqual({ foo: 'bar' })
  })

  it('handles POST request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.bar!.post({ foo: 'bar' })
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.method).toEqual('POST')
  })

  it('handles PUT request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.bar!.put({ foo: 'bar' })
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.method).toEqual('PUT')
  })

  it('handles DELETE request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.bar!.delete()
    expect(response.method).toEqual('DELETE')
  })

  it('handles PATCH request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.bar!.patch({ foo: 'bar' })
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.method).toEqual('PATCH')
  })

  it('handles query parameters', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.params!.get({ test: 'true' })
    expect(response).toEqual({ test: 'true' })
  })

  it('handles default options', async () => {
    const client = _client.with(apiRouterBuilder())
    const { headers } = await client.bar!.post(undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(headers).to.include({
      'x-foo': 'bar',
      'content-type': 'application/json',
    })
  })

  it('should override default options', async () => {
    const client = _client.with(apiRouterBuilder())
    const { headers } = await client.bar!.post(undefined, {
      headers: { 'X-Foo': 'baz' },
    })
    expect(headers).to.include({ 'x-foo': 'baz' })
  })

  it('supports bracket syntax for path segment', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.foo!['1']!.get<FooResponse>()
    expect(response).toEqual({ foo: '1' })
    assertType<{ foo: string }>(response)
  })

  it('supports chain syntax for path segment', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.foo!(1).get<FooResponse>()
    expect(response).toEqual({ foo: '1' })
    assertType<{ foo: string }>(response)
  })

  it('supports multiple path segments', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client('foo', '1').get<FooResponse>()
    expect(response).toEqual({ foo: '1' })
    assertType<{ foo: string }>(response)
  })

  it('handles error responses', async () => {
    const client = _client.with(apiRouterBuilder())
    expect(async () => {
      await client.baz!.get<FooResponse>()
    }).rejects.toThrow(/404/)
  })
})
