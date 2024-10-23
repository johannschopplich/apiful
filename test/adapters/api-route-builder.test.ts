import type { Listener } from 'listhen'
import type { ApiClient } from '../../src'
/* eslint-disable test/prefer-lowercase-title */
import { afterAll, assertType, beforeAll, describe, expect, it } from 'vitest'
import { apiRouteBuilder, createClient } from '../../src'
import { createListener } from '../utils'

interface FooResponse {
  foo: string
}

describe('apiRouteBuilder adapter', () => {
  let listener: Listener
  let client: ApiClient

  beforeAll(async () => {
    listener = await createListener()
    client = createClient({
      baseURL: listener.url,
      headers: {
        'X-Foo': 'bar',
      },
    })
  })

  afterAll(async () => {
    await listener.close()
  })

  it('GET request', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.foo!.get<FooResponse>()
    expect(response).toEqual({ foo: 'bar' })
  })

  it('POST request', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.bar!.post({ foo: 'bar' })
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.method).toEqual('POST')
  })

  it('PUT request', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.bar!.put({ foo: 'bar' })
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.method).toEqual('PUT')
  })

  it('DELETE request', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.bar!.delete()
    expect(response.method).toEqual('DELETE')
  })

  it('PATCH request', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.bar!.patch({ foo: 'bar' })
    expect(response.body).toEqual({ foo: 'bar' })
    expect(response.method).toEqual('PATCH')
  })

  it('query parameter', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.params!.get({ test: 'true' })
    expect(response).toEqual({ test: 'true' })
  })

  it('default options', async () => {
    const rest = client.with(apiRouteBuilder())
    const { headers } = await rest.bar!.post(undefined, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(headers).to.include({
      'x-foo': 'bar',
      'content-type': 'application/json',
    })
  })

  it('override default options', async () => {
    const rest = client.with(apiRouteBuilder())
    const { headers } = await rest.bar!.post(undefined, {
      headers: { 'X-Foo': 'baz' },
    })
    expect(headers).to.include({ 'x-foo': 'baz' })
  })

  it('bracket syntax for path segment', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.foo!['1']!.get<FooResponse>()
    expect(response).toEqual({ foo: '1' })
    assertType<{ foo: string }>(response)
  })

  it('chain syntax for path segment', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest.foo!(1).get<FooResponse>()
    expect(response).toEqual({ foo: '1' })
    assertType<{ foo: string }>(response)
  })

  it('multiple path segments', async () => {
    const rest = client.with(apiRouteBuilder())
    const response = await rest('foo', '1').get<FooResponse>()
    expect(response).toEqual({ foo: '1' })
    assertType<{ foo: string }>(response)
  })

  it('invalid api endpoint', () => {
    const rest = client.with(apiRouteBuilder())
    expect(async () => {
      await rest.baz!.get<FooResponse>()
    }).rejects.toThrow(/404/)
  })
})
