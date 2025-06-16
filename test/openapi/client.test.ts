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
  it('returns path unchanged when no params provided', () => {
    expect(resolvePathParams('/users')).toBe('/users')
    expect(resolvePathParams('/users/{id}', undefined)).toBe('/users/{id}')
    expect(resolvePathParams('/users/{id}', {})).toBe('/users/{id}')
  })

  it('replaces single path parameter', () => {
    expect(resolvePathParams('/users/{id}', { id: '123' })).toBe('/users/123')
  })

  it('replaces multiple path parameters', () => {
    expect(resolvePathParams('/users/{userId}/posts/{postId}', {
      userId: '123',
      postId: '456',
    })).toBe('/users/123/posts/456')
  })

  it('encodes URI components properly', () => {
    expect(resolvePathParams('/users/{id}', { id: 'user@example.com' }))
      .toBe('/users/user%40example.com')
    expect(resolvePathParams('/search/{query}', { query: 'hello world' }))
      .toBe('/search/hello%20world')
    expect(resolvePathParams('/files/{path}', { path: 'folder/file.txt' }))
      .toBe('/files/folder%2Ffile.txt')
  })

  it('handles special characters in parameters', () => {
    expect(resolvePathParams('/items/{id}', { id: '!@#$%^&*()' }))
      .toBe('/items/!%40%23%24%25%5E%26*()')
  })

  it('converts non-string values to strings', () => {
    expect(resolvePathParams('/users/{id}', { id: 123 as unknown as string })).toBe('/users/123')
    expect(resolvePathParams('/items/{active}', { active: true as unknown as string })).toBe('/items/true')
    expect(resolvePathParams('/data/{value}', { value: null as unknown as string })).toBe('/data/null')
  })

  it('ignores parameters not present in path', () => {
    expect(resolvePathParams('/users/{id}', {
      id: '123',
      extra: 'ignored',
    })).toBe('/users/123')
  })

  it('handles repeated parameter names', () => {
    expect(resolvePathParams('/api/{version}/users/{version}', {
      version: 'v1',
    })).toBe('/api/v1/users/v1')
  })

  it('handles empty string parameters', () => {
    expect(resolvePathParams('/users/{id}', { id: '' })).toBe('/users/')
  })
})

describe('fetchRequestInterceptor', () => {
  it('modifies context request with resolved path params', () => {
    const ctx = {
      request: '/users/{id}',
      options: {
        path: { id: '123' },
      },
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users/123')
  })

  it('handles context without path params', () => {
    const ctx = {
      request: '/users',
      options: {},
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users')
  })

  it('handles context with empty path params', () => {
    const ctx = {
      request: '/users/{id}',
      options: {
        path: {},
      },
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users/{id}')
  })

  it('encodes path parameters in context', () => {
    const ctx = {
      request: '/users/{email}',
      options: {
        path: { email: 'user@example.com' },
      },
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users/user%40example.com')
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

  it('calls ofetch.create with default options object', () => {
    const options = { baseURL: 'https://api.example.com' }
    createOpenAPIClient<'testEcho'>(options)

    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('calls ofetch.create with options from function', () => {
    const options = { baseURL: 'https://api.example.com' }
    const optionsFn = vi.fn().mockReturnValue(options)
    createOpenAPIClient<'testEcho'>(optionsFn)

    expect(optionsFn).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('resolves path parameters when making requests', async () => {
    mockFetch.mockResolvedValue({ value: 'test' })
    const client = createOpenAPIClient<'testEcho'>({ baseURL: 'https://api.example.com' })
    await client('/echo/query', { query: { value: 'test' } })

    expect(mockFetch).toHaveBeenCalledWith('/echo/query', {
      query: { value: 'test' },
    })
  })

  it('passes through options without path parameters', async () => {
    mockFetch.mockResolvedValue({ method: 'POST', body: { name: 'test' } })

    const client = createOpenAPIClient<'testEcho'>({ baseURL: 'https://api.example.com' })

    await client('/echo/request', {
      method: 'POST',
      body: { name: 'test' },
    })

    expect(mockFetch).toHaveBeenCalledWith('/echo/request', {
      method: 'POST',
      body: { name: 'test' },
    })
  })

  it('handles requests without options', async () => {
    mockFetch.mockResolvedValue({ value: 'foo' })
    const client = createOpenAPIClient<'testEcho'>({ baseURL: 'https://api.example.com' })
    await client('/echo/static/constant')

    expect(mockFetch).toHaveBeenCalledWith('/echo/static/constant', undefined)
  })

  it('returns the result from ofetch', async () => {
    const expectedResult = { value: 'test' }
    mockFetch.mockResolvedValue(expectedResult)

    const client = createOpenAPIClient<'testEcho'>({ baseURL: 'https://api.example.com' })
    const result = await client('/echo/static/constant')
    expect(result).toBe(expectedResult)
  })

  it('resolves path parameters in URLs', async () => {
    mockFetch.mockResolvedValue({ data: 'test' })
    const client = createOpenAPIClient({ baseURL: 'https://api.example.com' })

    // @ts-expect-error: Path parameters for test purposes
    await client('/users/{id}/posts/{postId}', {
      path: { id: '123', postId: '456' },
      method: 'GET',
    })

    expect(mockFetch).toHaveBeenCalledWith('/users/123/posts/456', {
      path: { id: '123', postId: '456' },
      method: 'GET',
    })
  })
})
