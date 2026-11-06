import type { components } from 'apiful/schema/petStore'
import type { $Fetch, FetchOptions } from 'ofetch'
import { ofetch } from 'ofetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpenAPIClient, resolvePathParams } from '../../src/openapi/client'

vi.mock('ofetch', () => ({
  ofetch: {
    create: vi.fn(),
  },
}))

describe('resolvePathParams', () => {
  it.each<{ path: string, params?: Record<string, string>, out?: string }>([
    // Nothing to replace
    { path: '/users', params: undefined },
    { path: '/users/{id}', params: undefined },
    { path: '/users/{id}', params: {} },
    // Replacement
    { path: '/users/{id}', params: { id: '123' }, out: '/users/123' },
    { path: '/users/{userId}/posts/{postId}', params: { userId: '123', postId: '456' }, out: '/users/123/posts/456' },
    { path: '/api/{version}/users/{version}', params: { version: 'v1' }, out: '/api/v1/users/v1' },
    { path: '/users/{id}', params: { id: '123', extra: 'ignored' }, out: '/users/123' },
    { path: '/users/{id}', params: { id: '' }, out: '/users/' },
    // Percent-encoding
    { path: '/users/{id}', params: { id: 'user@example.com' }, out: '/users/user%40example.com' },
    { path: '/search/{query}', params: { query: 'hello world' }, out: '/search/hello%20world' },
    { path: '/files/{path}', params: { path: 'folder/file.txt' }, out: '/files/folder%2Ffile.txt' },
    { path: '/items/{id}', params: { id: '!@#$%^&*()' }, out: '/items/!%40%23%24%25%5E%26*()' },
    // A dot value that shares its segment
    { path: '/files/{name}.json', params: { name: '..' }, out: '/files/...json' },
    // Coercion of a value the OpenAPI types allow but the URL cannot carry
    { path: '/users/{id}', params: { id: 123 as unknown as string }, out: '/users/123' },
    { path: '/items/{active}', params: { active: true as unknown as string }, out: '/items/true' },
    { path: '/data/{value}', params: { value: null as unknown as string }, out: '/data/null' },
  ])('resolves $path with $params', ({ path, params, out = path }) => {
    expect(resolvePathParams(path, params)).toBe(out)
  })

  it.each(['.', '..'])('throws for the path parameter %s, which would resolve to another path', (value) => {
    expect(() => resolvePathParams('/users/{id}/posts', { id: value }))
      .toThrow(`Path parameter \`id\` is \`${value}\`, which would resolve the URL to another path`)
  })
})

describe('createOpenAPIClient', () => {
  const mockFetch = vi.fn()
  const mockCreate = vi.fn()

  beforeEach(() => {
    vi.mocked(ofetch.create).mockImplementation(mockCreate)
    mockCreate.mockReturnValue(mockFetch)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates the ofetch instance with the default options', () => {
    const options = { baseURL: 'https://petstore3.swagger.io/api/v3' }
    createOpenAPIClient<'petStore'>(options)
    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('creates the ofetch instance once, not per request', () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://api.example.com' })

    void client('/store/inventory')
    void client('/store/inventory')

    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('issues requests through the fetch it was given instead of creating one', async () => {
    const fetch = vi.fn().mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({}, { fetch: fetch as unknown as $Fetch })
    await client('/pet/{petId}', { path: { petId: 1 } })

    expect(fetch).toHaveBeenCalledWith('/pet/1', {})
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('resolves path parameters and forwards options to the underlying fetch', async () => {
    const mockPet: components['schemas']['Pet'] = {
      id: 123,
      name: 'Fluffy',
      status: 'available',
      photoUrls: [],
    }
    mockFetch.mockResolvedValue(mockPet)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/pet/{petId}', { path: { petId: 123 }, method: 'GET' })

    expect(mockFetch).toHaveBeenCalledWith('/pet/123', { method: 'GET' })
  })

  it('forwards body and query options unchanged', async () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })

    const newPet = { name: 'Buddy', photoUrls: [] }
    await client('/pet', { method: 'POST', body: newPet })
    expect(mockFetch).toHaveBeenCalledWith('/pet', { method: 'POST', body: newPet })

    await client('/pet/findByStatus', { query: { status: 'available' } })
    expect(mockFetch).toHaveBeenCalledWith('/pet/findByStatus', { query: { status: 'available' } })
  })

  it('serializes an object body as JSON for a QUERY request', async () => {
    const { fetch, rawFetch } = await createRecordingFetch()
    const client = createOpenAPIClient<'catalog'>({}, { fetch })
    await client('/items', { method: 'QUERY', body: { name: 'lamp' } })

    const [, init] = rawFetch.mock.lastCall!
    expect(init.body).toBe('{"name":"lamp"}')
    expect(init.headers.get('content-type')).toBe('application/json')
    expect(init.headers.get('accept')).toBe('application/json')
  })

  it('keeps the default content-type of the fetch for a QUERY body', async () => {
    const { fetch, rawFetch } = await createRecordingFetch({ headers: { 'content-type': 'application/vnd.api+json' } })
    const client = createOpenAPIClient<'catalog'>({}, { fetch })
    await client('/items', { method: 'QUERY', body: { name: 'lamp' } })

    expect(rawFetch.mock.lastCall![1].headers.get('content-type')).toBe('application/vnd.api+json')
  })

  it('form-encodes a QUERY body under an application/x-www-form-urlencoded content-type', async () => {
    const { fetch, rawFetch } = await createRecordingFetch()
    const client = createOpenAPIClient<'catalog'>({}, { fetch })
    await client('/items', {
      method: 'QUERY',
      body: { name: 'lamp' },
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })

    expect(rawFetch.mock.lastCall![1].body).toBe('name=lamp')
  })

  it('passes a QUERY body to the onRequest hook as an object', async () => {
    const { fetch } = await createRecordingFetch()
    const client = createOpenAPIClient<'catalog'>({}, { fetch })
    const onRequest = vi.fn()
    await client('/items', { method: 'QUERY', body: { name: 'lamp' }, onRequest })

    expect(onRequest.mock.lastCall![0].options.body).toEqual({ name: 'lamp' })
  })

  it('invokes fetch without options when the caller provides none', async () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/store/inventory')
    expect(mockFetch).toHaveBeenCalledWith('/store/inventory', {})
  })

  it('rejects for the path parameter .. rather than throwing', async () => {
    const client = createOpenAPIClient<'petStore'>()

    await expect(client('/pet/{petId}', { path: { petId: '..' as unknown as number } }))
      .rejects
      .toThrow('Path parameter `petId` is `..`')
  })

  it('returns the fetch result unchanged', async () => {
    const expected: components['schemas']['Pet'] = {
      id: 456,
      name: 'Max',
      status: 'sold',
      photoUrls: [],
    }
    mockFetch.mockResolvedValue(expected)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    const result = await client('/pet/{petId}', { path: { petId: 456 } })

    expect(result).toBe(expected)
  })
})

/** Creates an actual ofetch instance whose underlying fetch records each request. */
async function createRecordingFetch(defaultOptions: FetchOptions = {}) {
  const { ofetch: actualOfetch } = await vi.importActual<typeof import('ofetch')>('ofetch')
  const rawFetch = vi.fn<(input: RequestInfo | URL, init: RequestInit & { headers: Headers }) => Promise<Response>>()
    .mockResolvedValue(Response.json([]))
  const fetch = actualOfetch.create(defaultOptions, { fetch: rawFetch as typeof globalThis.fetch })
  return { fetch, rawFetch }
}
