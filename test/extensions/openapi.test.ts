import type { OpenAPIServiceRepository, PetStore } from 'apiful/schema'
import type { components } from 'apiful/schema/petStore'
import type { $Fetch } from 'ofetch'
import type { ApiClient } from '../../src/client'
import type { OpenAPIClient } from '../../src/extensions/openapi'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient, openAPIBuilder } from '../../src/index'

function createRecordedClient() {
  const fetch = vi.fn()
  const client = createClient(
    { baseURL: 'https://petstore3.swagger.io/api/v3' },
    { fetch: fetch as unknown as $Fetch },
  )

  return { client, fetch }
}

describe('openAPIBuilder', () => {
  it('takes an ApiClient and returns an OpenAPIClient', () => {
    const builder = openAPIBuilder<'petStore'>()
    expectTypeOf(builder).toBeFunction()
    expectTypeOf(builder).parameter(0).toEqualTypeOf<ApiClient>()

    const client = {} as ApiClient
    const openApiClient = builder(client)
    expectTypeOf(openApiClient).toEqualTypeOf<OpenAPIClient<OpenAPIServiceRepository['petStore']>>()
  })

  it('rejects an unknown service name', () => {
    // @ts-expect-error: No service is named `petStroe`.
    expectTypeOf(openAPIBuilder<'petStroe'>).toBeFunction()
  })

  it('types the response by path and method', () => {
    const petStoreClient = openAPIBuilder<'petStore'>()(createRecordedClient().client)

    const getResponse = petStoreClient('/pet/{petId}', {
      method: 'GET',
      path: { petId: 1 },
    })

    expectTypeOf(getResponse).toEqualTypeOf<Promise<PetStore<'/pet/{petId}', 'get'>['response']>>()

    const deleteResponse = petStoreClient('/pet/{petId}', {
      method: 'DELETE',
      path: { petId: 1 },
    })

    expectTypeOf(deleteResponse).toEqualTypeOf<Promise<never>>()
  })

  it('accepts an undeclared header beside a declared one', () => {
    const petStoreClient = openAPIBuilder<'petStore'>()(createRecordedClient().client)

    petStoreClient('/pet/{petId}', {
      method: 'DELETE',
      path: { petId: 1 },
      headers: {
        'api_key': 'test',
        'x-foo': 'bar',
      },
    })
  })

  it('passes the typed call signature to the next extension builder', () => {
    const client = createRecordedClient().client.with(openAPIBuilder<'petStore'>()).with(openAPIClient => ({
      pet: (petId: number) => openAPIClient('/pet/{petId}', {
        method: 'GET',
        path: { petId },
      }),
    }))

    expectTypeOf(client.pet).toEqualTypeOf<(petId: number) => Promise<PetStore<'/pet/{petId}', 'get'>['response']>>()
  })

  const samplePet: components['schemas']['Pet'] = {
    id: 1,
    name: 'Fluffy',
    status: 'available',
    photoUrls: [],
  }

  it.each([
    {
      name: 'a request without options',
      path: '/store/inventory',
      options: undefined,
      expectedUrl: '/store/inventory',
      expectedOptions: {},
      mockResponse: { available: 5, pending: 2, sold: 10 },
    },
    {
      name: 'query parameters',
      path: '/pet/findByStatus',
      options: {
        query: { status: 'available' },
      },
      expectedUrl: '/pet/findByStatus',
      expectedOptions: {
        query: { status: 'available' },
      },
      mockResponse: [samplePet],
    },
    {
      name: 'path parameters as a resolved template',
      path: '/pet/{petId}',
      options: {
        path: { petId: 123 },
      },
      expectedUrl: '/pet/123',
      expectedOptions: {},
      mockResponse: { ...samplePet, id: 123 },
    },
    {
      name: 'a method and body',
      path: '/pet',
      options: { method: 'POST' as const, body: samplePet },
      expectedUrl: '/pet',
      expectedOptions: { method: 'POST', body: samplePet },
      mockResponse: { ...samplePet, id: 456 },
    },
  ])('forwards $name to the underlying fetch and returns the response', async ({ path, options, expectedUrl, expectedOptions, mockResponse }) => {
    const { client: baseClient, fetch } = createRecordedClient()
    fetch.mockResolvedValue(mockResponse)
    const client = baseClient.with(openAPIBuilder<'petStore'>())

    const call = client as unknown as (path: string, options?: Record<string, unknown>) => Promise<unknown>
    const response = await call(path, options)

    expect(response).toEqual(mockResponse)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedOptions)
  })

  it('rejects when the underlying fetch rejects', async () => {
    const { client: baseClient, fetch } = createRecordedClient()
    fetch.mockRejectedValue(new Error('404 Not Found'))
    const client = baseClient.with(openAPIBuilder<'petStore'>())

    await expect(() => {
      return client(
        // @ts-expect-error: Path not defined in the OpenAPI document.
        '/invalid/endpoint',
      )
    }).rejects.toThrow()
  })
})
