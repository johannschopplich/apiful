import type { Listener } from 'listhen'
import type { ApiClient } from '../../src/client'
import { afterAll, assertType, beforeAll, describe, expect, it } from 'vitest'
import { createClient, ofetchBuilder } from '../../src/index'
import { createListener } from '../utils'

describe('ofetchBuilder adapter', () => {
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

  it('handles GET request with ofetch adapter', async () => {
    const client = _client.with(ofetchBuilder())
    const response = await client<{ foo: string }>('echo/static/constant')
    expect(response).toEqual({ value: 'foo' })
    assertType<{ foo: string }>(response)
  })

  it('handles POST request with fetch options', async () => {
    const client = _client.with(ofetchBuilder())
    const response = await client('echo/request', {
      method: 'POST',
      body: { foo: 'bar' },
    })
    expect(response.method).toBe('POST')
    expect(response.body).toEqual({ foo: 'bar' })
  })
})
