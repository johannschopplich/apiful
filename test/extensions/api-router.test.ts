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
    const response = await client.echo!.static!.constant!.get<FooResponse>()
    expect(response).toEqual({ value: 'foo' })
  })

  it('handles POST request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.post({ foo: 'bar' })
    expect(response.method).toEqual('POST')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles PUT request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.put({ foo: 'bar' })
    expect(response.method).toEqual('PUT')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles DELETE request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.delete()
    expect(response.method).toEqual('DELETE')
  })

  it('handles PATCH request', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.request!.patch({ foo: 'bar' })
    expect(response.method).toEqual('PATCH')
    expect(response.body).toEqual({ foo: 'bar' })
  })

  it('handles query parameters', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.query!.get({ value: 'bar' })
    expect(response).toEqual({ value: 'bar' })
  })

  it('handles default options', async () => {
    const client = _client.with(apiRouterBuilder())
    const { headers } = await client.echo!.request!.post(undefined, {
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
    const { headers } = await client.echo!.request!.post(undefined, {
      headers: { 'X-Foo': 'baz' },
    })
    expect(headers).to.include({ 'x-foo': 'baz' })
  })

  it('supports bracket syntax for path segment', async () => {
    const client = _client.with(apiRouterBuilder())
    // eslint-disable-next-line dot-notation
    const response = await client.echo!.static!['constant']!.get<FooResponse>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ foo: string }>(response)
  })

  it('supports chain syntax for path segment', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client.echo!.static!('constant').get<FooResponse>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ foo: string }>(response)
  })

  it('supports multiple path segments', async () => {
    const client = _client.with(apiRouterBuilder())
    const response = await client('echo', 'static', 'constant').get<FooResponse>()
    expect(response).toEqual({ value: 'foo' })
    assertType<{ foo: string }>(response)
  })

  it('handles error responses', async () => {
    const client = _client.with(apiRouterBuilder())
    expect(async () => {
      await client.baz!.get<FooResponse>()
    }).rejects.toThrow(/404/)
  })
})