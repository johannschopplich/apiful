import type { PetStore, PetStoreApiMethods, PetStoreApiPaths, PetStoreModel, TestEcho } from 'apiful/schema'
import type { components as Components } from 'apiful/schema/petStore'
import type { components as TestEchoComponents } from 'apiful/schema/testEcho'
import type { FetchContext } from 'ofetch'
import type { ServicePaths } from '../../src/openapi/client'
import type { FetchResponseData, FetchResponseError } from '../../src/openapi/types'
import { describe, expectTypeOf, it } from 'vitest'
import { createOpenAPIClient } from '../../src/openapi/client'

declare const petStoreClient: ReturnType<typeof createOpenAPIClient<'petStore'>>

describe('FetchResponseError', () => {
  it('types the thrown data from the error responses the schema declares', () => {
    expectTypeOf<FetchResponseError<TestEcho<'/echo/request', 'post'>['operation']>['data']>()
      .toEqualTypeOf<TestEchoComponents['schemas']['Error'] | undefined>()
  })

  it('types the thrown data as undefined for error responses that carry no content', () => {
    expectTypeOf<FetchResponseError<PetStore<'/pet/{petId}', 'get'>['operation']>['data']>()
      .toEqualTypeOf<undefined>()
  })

  it('leaves the body of a 300 response out of the thrown data, since ofetch throws only for 4xx and 5xx', () => {
    interface Operation {
      responses: {
        '200': { content: { 'application/json': string } }
        '300': { content: { 'application/json': string[] } }
        '404': { content: { 'application/json': { message: string } } }
        '500': { content: { 'application/json': { trace: string } } }
        '5XX': { content: { 'application/json': { retryAfter: number } } }
      }
    }

    expectTypeOf<FetchResponseError<Operation>['data']>()
      .toEqualTypeOf<{ message: string } | { trace: string } | { retryAfter: number } | undefined>()
  })

  it('types the thrown data from a lowercase 4xx range', () => {
    interface Operation {
      responses: {
        '4xx': { content: { 'application/json': { message: string } } }
      }
    }

    expectTypeOf<FetchResponseError<Operation>['data']>().toEqualTypeOf<{ message: string } | undefined>()
  })
})

describe('FetchResponseData', () => {
  it('types the data from a lowercase 2xx range', () => {
    interface Operation {
      responses: {
        '2xx': { content: { 'application/json': { id: string } } }
      }
    }

    expectTypeOf<FetchResponseData<Operation>>().toEqualTypeOf<{ id: string }>()
  })
})

describe('ServicePaths', () => {
  it('rejects an unknown service name', () => {
    // @ts-expect-error: No service is named `petStroe`.
    type _UnknownServicePaths = ServicePaths<'petStroe'>
  })
})

describe('createOpenAPIClient', () => {
  it('rejects an unknown service name', () => {
    // @ts-expect-error: No service is named `petStroe`.
    expectTypeOf(createOpenAPIClient<'petStroe'>).toBeFunction()
  })

  it('types the response after the responseType option', () => {
    expectTypeOf(() => petStoreClient('/pet/{petId}', {
      path: { petId: 1 },
      responseType: 'blob',
    }))
      .returns
      .resolves
      .toEqualTypeOf<Blob>()
    expectTypeOf(() => petStoreClient('/pet/{petId}', {
      path: { petId: 1 },
      responseType: 'json',
    }))
      .returns
      .resolves
      .toEqualTypeOf<Components['schemas']['Pet']>()
  })

  it('requires the options argument where the operation has a required option', () => {
    // @ts-expect-error: `/pet/{petId}` requires the `petId` path parameter.
    expectTypeOf(() => petStoreClient('/pet/{petId}')).toBeFunction()
    // @ts-expect-error: `/pet` declares no `get`, so it requires a `method`.
    expectTypeOf(() => petStoreClient('/pet')).toBeFunction()
  })

  it('rejects a call that leaves out a required request body', () => {
    // @ts-expect-error: `post` on `/pet` requires a body.
    expectTypeOf(() => petStoreClient('/pet', { method: 'post' })).toBeFunction()
  })

  it('types the response of a path cast to any as any', () => {
    expectTypeOf(() => petStoreClient('/pet/1' as any, {
      method: 'SEARCH',
      body: JSON.stringify({ name: 'Rex' }),
    }))
      .returns
      .resolves
      .toBeAny()
  })

  it('keeps the JSON response with a retryDelay typed for any response format', () => {
    const retryDelay = (_context: FetchContext) => 100
    expectTypeOf(() => petStoreClient('/pet/{petId}', {
      path: { petId: 1 },
      retryDelay,
    }))
      .returns
      .resolves
      .toEqualTypeOf<Components['schemas']['Pet']>()
  })
})

describe('PetStore', () => {
  it('extracts the path parameter types of a templated path', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['path']>().toEqualTypeOf<{ username: string }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['path']>().toEqualTypeOf<{ orderId: number }>()
  })

  it('extracts the query parameter types', () => {
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['query']>().toEqualTypeOf<{ status?: 'available' | 'pending' | 'sold' }>()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['query']>().toEqualTypeOf<{ tags?: string[] }>()
    expectTypeOf<PetStore<'/user/login', 'get'>['query']>().toEqualTypeOf<{ username?: string, password?: string }>()
  })

  it('types the parameters as never for an operation that declares none', () => {
    expectTypeOf<PetStore<'/pet', 'post'>['path']>().toBeNever()
    expectTypeOf<PetStore<'/pet', 'post'>['query']>().toBeNever()
  })

  it('types a request body as the union of its media types', () => {
    expectTypeOf<PetStore<'/pet', 'put'>['request']>().toEqualTypeOf<Components['schemas']['Pet'] | URLSearchParams>()
    expectTypeOf<PetStore<'/pet', 'post'>['request']>().toEqualTypeOf<Components['schemas']['Pet'] | URLSearchParams>()
  })

  it('widens an optional request body with undefined', () => {
    expectTypeOf<PetStore<'/store/order', 'post'>['request']>().toEqualTypeOf<Components['schemas']['Order'] | URLSearchParams | undefined>()
    expectTypeOf<PetStore<'/user', 'post'>['request']>().toEqualTypeOf<Components['schemas']['User'] | URLSearchParams | undefined>()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['request']>().toEqualTypeOf<Components['schemas']['User'][] | undefined>()
  })

  it('extracts a request body sent as a media type other than JSON', () => {
    expectTypeOf<PetStore<'/pet/{petId}/uploadImage', 'post'>['request']>().toEqualTypeOf<Blob | File | undefined>()
  })

  it('types the request body as undefined for an operation that declares none', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['request']>().toEqualTypeOf<undefined>()
  })

  it('extracts the 200 response types from the generated components', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['response']>().toEqualTypeOf<Components['schemas']['Pet']>()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['response']>().toEqualTypeOf<Components['schemas']['Pet'][]>()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['response']>().toEqualTypeOf<{ [key: string]: number }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['response']>().toEqualTypeOf<Components['schemas']['Order']>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['response']>().toEqualTypeOf<Components['schemas']['User']>()
  })

  it('extracts a success response returned as a media type other than JSON', () => {
    expectTypeOf<PetStore<'/user/login', 'get'>['response']>().toEqualTypeOf<string>()
  })

  it('types the success response as never for an operation that declares no 2xx body', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['response']>().toBeNever()
  })

  it('resolves the response the same way a request through the client does', () => {
    expectTypeOf(() => petStoreClient('/pet/{petId}', {
      method: 'get',
      path: { petId: 1 },
    }))
      .returns
      .resolves
      .toEqualTypeOf<PetStore<'/pet/{petId}', 'get'>['response']>()
    expectTypeOf(() => petStoreClient('/pet/{petId}', {
      method: 'delete',
      path: { petId: 1 },
    }))
      .returns
      .resolves
      .toEqualTypeOf<PetStore<'/pet/{petId}', 'delete'>['response']>()
  })

  it('keys the responses by status code', () => {
    expectTypeOf<TestEcho<'/echo/request', 'post'>['responses']>().toEqualTypeOf<{
      200: TestEchoComponents['schemas']['EchoResponse']
      400: TestEchoComponents['schemas']['Error']
    }>()
  })

  it('types the body of a default response as the error rather than the response', () => {
    expectTypeOf<PetStore<'/user', 'post'>['error']>().toEqualTypeOf<Components['schemas']['User']>()
    expectTypeOf<PetStore<'/user', 'post'>['response']>().toBeNever()
  })

  it('types a status that carries no content as undefined', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['responses'][404]>().toEqualTypeOf<undefined>()
  })

  it('preserves the path and the method as literals', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['fullPath']>().toEqualTypeOf<'/pet/{petId}'>()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['method']>().toEqualTypeOf<'get'>()
  })

  it('exposes the raw operation object', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('parameters')
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('responses')
  })

  it('rejects a method the path leaves undeclared', () => {
    // @ts-expect-error: `/pet` declares `post` and `put`, and no `get`.
    expectTypeOf<PetStore<'/pet', 'get'>>().not.toBeNever()
  })
})

describe('PetStoreApiPaths', () => {
  it('lists the paths the schema declares', () => {
    expectTypeOf<'/pet'>().toExtend<PetStoreApiPaths>()
    expectTypeOf<'/pet/{petId}'>().toExtend<PetStoreApiPaths>()
    expectTypeOf<'/store/inventory'>().toExtend<PetStoreApiPaths>()
  })

  it('leaves out a path the schema does not declare', () => {
    expectTypeOf<'/pet/{petId}/owner'>().not.toExtend<PetStoreApiPaths>()
  })
})

describe('PetStoreApiMethods', () => {
  it('lists only the methods a path declares', () => {
    expectTypeOf<PetStoreApiMethods<'/pet'>>().toEqualTypeOf<'post' | 'put'>()
    expectTypeOf<PetStoreApiMethods<'/pet/{petId}'>>().toEqualTypeOf<'get' | 'post' | 'delete'>()
    expectTypeOf<PetStoreApiMethods<'/pet/findByStatus'>>().toEqualTypeOf<'get'>()
  })
})

describe('PetStoreModel', () => {
  it('extracts a schema model by name', () => {
    expectTypeOf<PetStoreModel<'Pet'>>().toEqualTypeOf<Components['schemas']['Pet']>()
    expectTypeOf<PetStoreModel<'Tag'>>().toEqualTypeOf<Components['schemas']['Tag']>()
    expectTypeOf<PetStoreModel<'Order'>>().toEqualTypeOf<Components['schemas']['Order']>()
    expectTypeOf<PetStoreModel<'User'>>().toEqualTypeOf<Components['schemas']['User']>()
  })
})
