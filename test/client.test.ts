import type { Listener } from 'listhen'
import type { ApiClient, HandlerExtensionBuilder, MethodsExtensionBuilder } from '../src'
import { afterAll, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient } from '../src'
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

  it('can call the client without any adapter', () => {
    const response = client()
    expect(response).toBe(undefined)
  })

  it('creates a client with default options', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    expect(client.defaultOptions).toEqual(options)
  })

  it('allows extensions using the "with" method', () => {
    const client = createClient()
    const mockedExtension = vi.fn(extension)
    const extendedClient = client.with(mockedExtension)
    expect(mockedExtension).toHaveBeenCalledWith(client)
    expect(extendedClient()).toBeInstanceOf(Response)
  })

  it('includes extension methods in the returned client', () => {
    const client = createClient()
    const extendedClient = client.with(extension)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.foo).toBe('bar')
  })

  it('allows chaining of extension methods', () => {
    const client = createClient()
    const extendedClient = client.with(() => ({
      methodA: () => ({
        methodB: () => 'chained result',
      }),
    }))
    expect(extendedClient.methodA().methodB()).toBe('chained result')
  })

  it('allows more than one extension', () => {
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

  it('allows more than one extension with callable extension last', () => {
    const client = createClient()
    const extendedClient = client
      .with(extensionWithRequestMethod)
      .with(extensionWithResponseMethod)
      .with(extension)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.request()).toBeInstanceOf(Response)
    expect(extendedClient.response()).toEqual({ foo: 'bar' })
  })

  it('prioritizes later extensions when method names conflict', () => {
    const client = createClient()
    const extendedClient = client
      .with(() => ({ method: () => 'first' }))
      .with(() => ({ method: () => 'second' }))
    expect(extendedClient.method()).toBe('second')
  })

  it('maintains type safety with extensions', () => {
    const client = createClient()
    const extendedClient = client.with(() => ({
      typedMethod: (arg: number) => arg.toString(),
    }))
    expectTypeOf(extendedClient.typedMethod).toEqualTypeOf<(arg: number) => string>()
  })

  it('keeps the default options after extending', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    const extendedClient = client.with(extension)
    expect(extendedClient.defaultOptions).toEqual(options)
  })
})
