import type { Listener } from 'listhen'
import type { ApiClient } from '../../src'
import { afterAll, assertType, beforeAll, describe, expect, it } from 'vitest'
import { createClient, ofetchBuilder } from '../../src'
import { createListener } from '../utils'

interface FooResponse {
  foo: string
}

describe('ofetch adapter', () => {
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

  it('extends client with "ofetch" adapter', async () => {
    const rest = client.with(ofetchBuilder())
    const response = await rest<FooResponse>('foo')
    expect(response).toEqual({ foo: 'bar' })
    assertType<{ foo: string }>(response)
  })

  it('allows fetch options for ofetch method', async () => {
    const rest = client.with(ofetchBuilder())
    const response = await rest('bar', { method: 'POST' })
    expect(response.method).toBe('POST')
  })
})
