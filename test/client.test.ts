import type { Listener } from 'listhen'
import type { ApiClient, HandlerExtensionBuilder, MethodsExtensionBuilder } from '../src/index'
import { afterAll, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient } from '../src/index'
import { createListener } from './utils'

describe('createClient', () => {
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

  const extension = ((_client) => {
    const target = () => new Response()
    target.foo = 'bar'
    return target
  }) satisfies HandlerExtensionBuilder

  const extensionWithRequestMethod = ((_client) => {
    return {
      request: () => new Response(),
    }
  }) satisfies MethodsExtensionBuilder

  const extensionWithResponseMethod = ((_client) => {
    return {
      response: () => ({ foo: 'bar' }),
    }
  }) satisfies MethodsExtensionBuilder

  it('returns undefined when called without extensions', () => {
    const response = client()
    expect(response).toBe(undefined)
  })

  it('stores default options in client instance', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    expect(client.defaultOptions).toEqual(options)
  })

  it('extends client functionality with extension methods', () => {
    const client = createClient()
    const mockedExtension = vi.fn(extension)
    const extendedClient = client.with(mockedExtension)
    expect(mockedExtension).toHaveBeenCalledWith(client)
    expect(extendedClient()).toBeInstanceOf(Response)
  })

  it('adds extension properties to extended client', () => {
    const client = createClient()
    const extendedClient = client.with(extension)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.foo).toBe('bar')
  })

  it('preserves default options after extension', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    const extendedClient = client.with(extension)
    expect(extendedClient.defaultOptions).toEqual(options)
  })

  it('supports multiple extensions with callable extension first', () => {
    const client = createClient()
    const mockedExtension = vi.fn(extension)
    const extendedClient = client
      .with(mockedExtension)
      .with(extensionWithRequestMethod)
      .with(extensionWithResponseMethod)
    expect(mockedExtension).toHaveBeenCalledWith(client)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.request()).toBeInstanceOf(Response)
    expect(extendedClient.response()).toEqual({ foo: 'bar' })
  })

  it('supports multiple extensions with callable extension last', () => {
    const client = createClient()
    const extendedClient = client
      .with(extensionWithRequestMethod)
      .with(extensionWithResponseMethod)
      .with(extension)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.request()).toBeInstanceOf(Response)
    expect(extendedClient.response()).toEqual({ foo: 'bar' })
  })

  it('resolves method name conflicts by prioritizing later extensions', () => {
    const client = createClient()
    const extendedClient = client
      .with(() => ({ method: () => 'first' }))
      .with(() => ({ method: () => 'second' }))
    expect(extendedClient.method()).toBe('second')
  })

  it('preserves TypeScript type safety with extensions', () => {
    const client = createClient()
    const extendedClient = client.with(() => ({
      typedMethod: (arg: number) => arg.toString(),
    }))
    expectTypeOf(extendedClient.typedMethod).toEqualTypeOf<(arg: number) => string>()
  })
})
