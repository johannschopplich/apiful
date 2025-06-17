/* eslint-disable test/prefer-lowercase-title */
import type { components } from 'apiful/__petStore__'
import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { PetStore } from 'apiful/schema'
import type { ApiClient } from '../../src/client'
import type { OpenAPIClient } from '../../src/extensions/openapi'
import type { SchemaPaths } from '../../src/openapi/client'
import { ofetch } from 'ofetch'
import { afterEach, assertType, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient, OpenAPIBuilder } from '../../src/index'

vi.mock('ofetch', () => ({
  ofetch: {
    create: vi.fn(),
  },
}))

describe('OpenAPIBuilder adapter', () => {
  const mockFetch = vi.fn()
  const mockCreate = vi.fn()

  beforeEach(() => {
    vi.mocked(ofetch.create).mockImplementation(mockCreate)
    mockCreate.mockReturnValue(mockFetch)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns function that extends ApiClient with OpenAPI types', () => {
    const builder = OpenAPIBuilder<'petStore'>()
    expectTypeOf(builder).toBeFunction()
    expectTypeOf(builder).parameter(0).toEqualTypeOf<ApiClient>()

    const client = {} as ApiClient
    const openApiClient = builder(client)
    expectTypeOf(openApiClient).toEqualTypeOf<OpenAPIClient<SchemaPaths<'petStore'>>>()
  })

  it('creates typed client for existing schemas', () => {
    const petStoreBuilder = OpenAPIBuilder<'petStore'>()
    const client = {} as ApiClient
    const petStoreClient = petStoreBuilder(client)

    expectTypeOf(petStoreClient).toEqualTypeOf<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()

    const secondPetStoreBuilder = OpenAPIBuilder<'petStore'>()
    const secondPetStoreClient = secondPetStoreBuilder(client)

    expectTypeOf(secondPetStoreClient).toEqualTypeOf<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()
  })

  it('handles non-existing schema with empty type', () => {
    const nonExistentBuilder = OpenAPIBuilder<'nonExistent'>()
    const client = {} as ApiClient
    const nonExistentClient = nonExistentBuilder(client)

    expectTypeOf(nonExistentClient).toEqualTypeOf<OpenAPIClient<Record<string, never>>>()
  })

  it('provides typed methods for API operations', () => {
    const client = {} as ApiClient
    const petStoreClient = OpenAPIBuilder<'petStore'>()(client)

    const getResponse = petStoreClient('/pet/{petId}', {
      method: 'GET',
      path: { petId: 1 },
    })

    expectTypeOf(getResponse).toEqualTypeOf<Promise<PetStore<'/pet/{petId}', 'get'>['response']>>()

    const deleteResponse = petStoreClient('/pet/{petId}', {
      method: 'DELETE',
      path: { petId: 1 },
      headers: {
        api_key: 'test',
      },
    })

    expectTypeOf(deleteResponse).toEqualTypeOf<Promise<never>>()
  })

  it('handles GET inventory response', async () => {
    const mockInventory = { available: 5, pending: 2, sold: 10 }

    mockFetch.mockResolvedValue(mockInventory)

    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    const response = await client('/store/inventory')
    expect(response).toEqual(mockInventory)
    assertType<{ [key: string]: number }>(response)
  })

  it('handles GET pet by status with query parameters', async () => {
    const mockPets: components['schemas']['Pet'][] = [{
      id: 1,
      name: 'Fluffy',
      status: 'available',
      photoUrls: [],
    }]

    mockFetch.mockResolvedValue(mockPets)

    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    const response = await client('/pet/findByStatus', {
      query: { status: 'available' },
    })

    expect(response).toEqual(mockPets)
    expect(mockFetch).toHaveBeenCalledWith('/pet/findByStatus', {
      query: { status: 'available' },
    })
    assertType<components['schemas']['Pet'][]>(response)
  })

  it('handles GET pet by ID with path parameters', async () => {
    const mockPet: components['schemas']['Pet'] = {
      id: 123,
      name: 'Max',
      status: 'available',
      photoUrls: [],
    }

    mockFetch.mockResolvedValue(mockPet)

    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    const response = await client('/pet/{petId}', {
      path: { petId: 123 },
    })

    expect(response).toEqual(mockPet)
    expect(mockFetch).toHaveBeenCalledWith('/pet/123', {
      path: { petId: 123 },
    })
    assertType<components['schemas']['Pet']>(response)
  })

  it('handles POST request for creating pets', async () => {
    const newPet: components['schemas']['Pet'] = {
      name: 'Buddy',
      status: 'available',
      photoUrls: ['photo1.jpg'],
    }
    const createdPet: components['schemas']['Pet'] = {
      ...newPet,
      id: 456,
    }

    mockFetch.mockResolvedValue(createdPet)

    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    const response = await client('/pet', {
      method: 'POST',
      body: newPet,
    })

    expect(response).toEqual(createdPet)
    expect(mockFetch).toHaveBeenCalledWith('/pet', {
      method: 'POST',
      body: newPet,
    })
    assertType<components['schemas']['Pet']>(response)
  })

  it('handles error responses', async () => {
    mockFetch.mockRejectedValue(new Error('404 Not Found'))

    const client = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
      .with(OpenAPIBuilder<'petStore'>())

    await expect(() => {
      return client(
        // @ts-expect-error: Path not defined in OpenAPI schema
        '/invalid/endpoint',
      )
    }).rejects.toThrow()
  })
})
