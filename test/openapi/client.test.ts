import type { components } from 'apiful/__petStore__'
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
  it('returns unchanged path when no parameters provided', () => {
    expect(resolvePathParams('/users')).toBe('/users')
    expect(resolvePathParams('/users/{id}', undefined)).toBe('/users/{id}')
    expect(resolvePathParams('/users/{id}', {})).toBe('/users/{id}')
  })

  it('replaces single path parameter with provided value', () => {
    expect(resolvePathParams('/users/{id}', { id: '123' })).toBe('/users/123')
  })

  it('replaces multiple path parameters with provided values', () => {
    expect(resolvePathParams('/users/{userId}/posts/{postId}', {
      userId: '123',
      postId: '456',
    })).toBe('/users/123/posts/456')
  })

  it('encodes special characters in path parameters', () => {
    expect(resolvePathParams('/users/{id}', { id: 'user@example.com' }))
      .toBe('/users/user%40example.com')
    expect(resolvePathParams('/search/{query}', { query: 'hello world' }))
      .toBe('/search/hello%20world')
    expect(resolvePathParams('/files/{path}', { path: 'folder/file.txt' }))
      .toBe('/files/folder%2Ffile.txt')
  })

  it('encodes complex special characters in parameters', () => {
    expect(resolvePathParams('/items/{id}', { id: '!@#$%^&*()' }))
      .toBe('/items/!%40%23%24%25%5E%26*()')
  })

  it('converts non-string parameter values to strings', () => {
    expect(resolvePathParams('/users/{id}', { id: 123 as unknown as string })).toBe('/users/123')
    expect(resolvePathParams('/items/{active}', { active: true as unknown as string })).toBe('/items/true')
    expect(resolvePathParams('/data/{value}', { value: null as unknown as string })).toBe('/data/null')
  })

  it('ignores extra parameters not used in path template', () => {
    expect(resolvePathParams('/users/{id}', {
      id: '123',
      extra: 'ignored',
    })).toBe('/users/123')
  })

  it('replaces repeated parameter names in path template', () => {
    expect(resolvePathParams('/api/{version}/users/{version}', {
      version: 'v1',
    })).toBe('/api/v1/users/v1')
  })

  it('handles empty string parameter values', () => {
    expect(resolvePathParams('/users/{id}', { id: '' })).toBe('/users/')
  })
})

describe('fetchRequestInterceptor', () => {
  it('resolves path parameters in request context', () => {
    const ctx = {
      request: '/users/{id}',
      options: {
        path: { id: '123' },
      },
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users/123')
  })

  it('handles request context without path parameters', () => {
    const ctx = {
      request: '/users',
      options: {},
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users')
  })

  it('handles request context with empty path parameters', () => {
    const ctx = {
      request: '/users/{id}',
      options: {
        path: {},
      },
    } as unknown as FetchContext

    fetchRequestInterceptor(ctx)
    expect(ctx.request).toBe('/users/{id}')
  })

  it('encodes path parameters in request context', () => {
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

  it('creates ofetch instance with default options object', () => {
    const options = { baseURL: 'https://petstore3.swagger.io/api/v3' }
    createOpenAPIClient<'petStore'>(options)

    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('creates ofetch instance with options from function', () => {
    const options = { baseURL: 'https://petstore3.swagger.io/api/v3' }
    const optionsFn = vi.fn().mockReturnValue(options)
    createOpenAPIClient<'petStore'>(optionsFn)

    expect(optionsFn).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(options)
  })

  it('resolves path parameters in pet lookup requests', async () => {
    const mockPet: components['schemas']['Pet'] = {
      id: 123,
      name: 'Fluffy',
      status: 'available',
      photoUrls: [],
    }
    mockFetch.mockResolvedValue(mockPet)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/pet/{petId}', { path: { petId: 123 } })

    expect(mockFetch).toHaveBeenCalledWith('/pet/123', {
      path: { petId: 123 },
    })
  })

  it('passes request options for pet creation', async () => {
    const newPet: components['schemas']['Pet'] = {
      name: 'Buddy',
      status: 'available',
      photoUrls: ['photo1.jpg'],
    }
    mockFetch.mockResolvedValue(newPet)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/pet', {
      method: 'POST',
      body: newPet,
    })

    expect(mockFetch).toHaveBeenCalledWith('/pet', {
      method: 'POST',
      body: newPet,
    })
  })

  it('handles requests without options for inventory lookup', async () => {
    const inventory: Record<string, number> = { available: 5, pending: 2, sold: 10 }
    mockFetch.mockResolvedValue(inventory)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/store/inventory')

    expect(mockFetch).toHaveBeenCalledWith('/store/inventory', undefined)
  })

  it('returns ofetch result for pet lookup requests', async () => {
    const expectedPet: components['schemas']['Pet'] = {
      id: 456,
      name: 'Max',
      status: 'sold',
      photoUrls: [],
    }
    mockFetch.mockResolvedValue(expectedPet)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    const result = await client('/pet/{petId}', { path: { petId: 456 } })

    expect(result).toBe(expectedPet)
  })

  it('resolves path parameters in user operations', async () => {
    const userData: components['schemas']['User'] = {
      id: 1,
      username: 'johndoe',
      email: 'john@example.com',
    }
    mockFetch.mockResolvedValue(userData)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/user/{username}', {
      path: { username: 'johndoe' },
      method: 'GET',
    })

    expect(mockFetch).toHaveBeenCalledWith('/user/johndoe', {
      path: { username: 'johndoe' },
      method: 'GET',
    })
  })

  it('handles query parameters in pet status lookup', async () => {
    const pets: components['schemas']['Pet'][] = [{
      id: 1,
      name: 'Fluffy',
      status: 'available',
      photoUrls: [],
    }]
    mockFetch.mockResolvedValue(pets)

    const client = createOpenAPIClient<'petStore'>({ baseURL: 'https://petstore3.swagger.io/api/v3' })
    await client('/pet/findByStatus', {
      query: { status: 'available' },
    })

    expect(mockFetch).toHaveBeenCalledWith('/pet/findByStatus', {
      query: { status: 'available' },
    })
  })
})
