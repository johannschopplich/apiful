import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Listener } from 'listhen'
import { createClient } from '../src'
import type { ApiClient } from '../src'
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

  // eslint-disable-next-line unused-imports/no-unused-vars
  const extension = (client: ApiClient) => {
    const target = () => new Response()
    target.foo = 'bar'
    return target
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  const extensionWithRequestMethod = (client: ApiClient) => {
    return {
      request: () => new Response(),
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  const extensionWithResponseMethod = (client: ApiClient) => {
    return {
      response: () => ({ foo: 'bar' }),
    }
  }

  it('can call the client without any adapter', () => {
    // @ts-expect-error: Without an adapter client has no call signature
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

  it('keeps the default options after extending', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    const extendedClient = client.with(extension)
    expect(extendedClient.defaultOptions).toEqual(options)
  })
})
