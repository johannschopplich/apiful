import type { components } from 'apiful/schema/petStore'
import type { FetchContext } from 'ofetch'
import { ofetch } from 'ofetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpenAPIClient, fetchRequestInterceptor, resolvePathParams } from '../../src/openapi/client'

vi.mock('ofetch', () => ({
  ofetch: {
    create: vi.fn(),
  },
}))

describe('resolvePathParams', () => {
  it.each([
    ['no params', '/users', undefined, '/users'],
    ['undefined params on templated path', '/users/{id}', undefined, '/users/{id}'],
    ['empty params object', '/users/{id}', {}, '/users/{id}'],
    ['single parameter', '/users/{id}', { id: '123' }, '/users/123'],
    ['multiple parameters', '/users/{userId}/posts/{postId}', { userId: '123', postId: '456' }, '/users/123/posts/456'],
    ['encodes @ character', '/users/{id}', { id: 'user@example.com' }, '/users/user%40example.com'],
    ['encodes space', '/search/{query}', { query: 'hello world' }, '/search/hello%20world'],
    ['encodes slash', '/files/{path}', { path: 'folder/file.txt' }, '/files/folder%2Ffile.txt'],
    ['encodes complex punctuation', '/items/{id}', { id: '!@#$%^&*()' }, '/items/!%40%23%24%25%5E%26*()'],
    ['coerces number to string', '/users/{id}', { id: 123 as unknown as string }, '/users/123'],
    ['coerces boolean to string', '/items/{active}', { active: true as unknown as string }, '/items/true'],
    ['coerces null to string', '/data/{value}', { value: null as unknown as string }, '/data/null'],
    ['ignores extra parameters', '/users/{id}', { id: '123', extra: 'ignored' }, '/users/123'],
    ['replaces repeated parameter names', '/api/{version}/users/{version}', { version: 'v1' }, '/api/v1/users/v1'],
    ['empty string parameter value', '/users/{id}', { id: '' }, '/users/'],
  ])('%s', (_name, path, params, expected) => {
    expect(resolvePathParams(path, params as Record<string, string> | undefined)).toBe(expected)
  })
})

describe('fetchRequestInterceptor', () => {
  it('resolves path parameters from options.path into ctx.request', () => {
    const ctx = {
      request: '/users/{id}',
      options: { path: { id: '123' } },
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users/123')
  })

  it('leaves request unchanged when path options are absent or empty', () => {
    const cases = [
      { request: '/users', options: {} },
      { request: '/users/{id}', options: { path: {} } },
    ]
    for (const raw of cases) {
      const ctx = raw as unknown as FetchContext
      const original = ctx.request
      fetchRequestInterceptor(ctx)
      expect(ctx.request).toBe(original)
    }
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

  it('creates ofetch instance with default options object', () => {
    const options = { baseURL: 'https://petstore3.swagger.io/api/v3' }
    createOpenAPIClient<'petStore'>(options)
    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('resolves options from a factory function and memoizes the result', () => {
    const options = { baseURL: 'https://api.example.com' }
    const optionsFn = vi.fn().mockReturnValue(options)
    const client = createOpenAPIClient<'petStore'>(optionsFn)

    mockFetch.mockResolvedValue({})
    void client('/store/inventory')
    void client('/store/inventory')
    void client('/store/inventory')

    expect(optionsFn).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(options)
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

    expect(mockFetch).toHaveBeenCalledWith('/pet/123', {
      path: { petId: 123 },
      method: 'GET',
    })
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

  it('invokes fetch without options when the caller provides none', async () => {
    mockFetch.mockResolvedValue({})
    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/store/inventory')
    expect(mockFetch).toHaveBeenCalledWith('/store/inventory', undefined)
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
