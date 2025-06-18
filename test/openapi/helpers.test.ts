import type { OpenAPISchemaRepository, PetStore } from 'apiful/schema'
import type { components } from 'apiful/schema/petStore'
import type { SchemaPaths } from '../../src/openapi/client'
import { describe, expectTypeOf, it } from 'vitest'

// eslint-disable-next-line test/prefer-lowercase-title
describe('SchemaPaths type helper', () => {
  it('resolves existing schema keys to their types', () => {
    expectTypeOf<SchemaPaths<'petStore'>>().toEqualTypeOf<OpenAPISchemaRepository['petStore']>()
    expectTypeOf<SchemaPaths<'testEcho'>>().toEqualTypeOf<OpenAPISchemaRepository['testEcho']>()
  })

  it('returns empty object for non-existent schema keys', () => {
    expectTypeOf<SchemaPaths<'nonExistent'>>().toEqualTypeOf<Record<string, never>>()
  })
})

// eslint-disable-next-line test/prefer-lowercase-title
describe('PetStore type helper', () => {
  it('extracts correct path parameter types', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['path']>().toEqualTypeOf<{ username: string }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['path']>().toEqualTypeOf<{ orderId: number }>()
  })

  it('extracts correct query parameter types', () => {
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['query']>().toEqualTypeOf<{ status?: 'available' | 'pending' | 'sold' }>()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['query']>().toEqualTypeOf<{ tags?: string[] }>()
    expectTypeOf<PetStore<'/user/login', 'get'>['query']>().toEqualTypeOf<{ username?: string, password?: string }>()
  })

  it('extracts correct request body types using generated schemas', () => {
    expectTypeOf<PetStore<'/pet', 'put'>['request']>().toEqualTypeOf<components['schemas']['Pet']>()
    expectTypeOf<PetStore<'/pet', 'post'>['request']>().toEqualTypeOf<components['schemas']['Pet']>()
    expectTypeOf<PetStore<'/store/order', 'post'>['request']>().toEqualTypeOf<components['schemas']['Order']>()
    expectTypeOf<PetStore<'/user', 'post'>['request']>().toEqualTypeOf<components['schemas']['User']>()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['request']>().toEqualTypeOf<components['schemas']['User'][]>()
  })

  it('extracts correct response types using generated schemas', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['response']>().toEqualTypeOf<components['schemas']['Pet']>()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['response']>().toEqualTypeOf<components['schemas']['Pet'][]>()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['response']>().toEqualTypeOf<{ [key: string]: number }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['response']>().toEqualTypeOf<components['schemas']['Order']>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['response']>().toEqualTypeOf<components['schemas']['User']>()
  })

  it('provides access to all response status codes', () => {
    type PetGetResponses = PetStore<'/pet/{petId}', 'get'>['responses']

    expectTypeOf<PetGetResponses>().toHaveProperty(200)
    expectTypeOf<PetGetResponses>().toHaveProperty(400)
    expectTypeOf<PetGetResponses>().toHaveProperty(404)

    type PetCreateResponses = PetStore<'/pet', 'post'>['responses']

    expectTypeOf<PetCreateResponses>().toHaveProperty(200)
    expectTypeOf<PetCreateResponses>().toHaveProperty(405)
  })

  it('preserves path and method metadata', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['fullPath']>().toEqualTypeOf<'/pet/{petId}'>()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['method']>().toEqualTypeOf<'get'>()
  })

  it('provides access to full OpenAPI operation object', () => {
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('parameters')
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('responses')
  })

  it('handles complex type scenarios', () => {
    type AllPetEndpoints = PetStore<'/pet/{petId}', 'get'> | PetStore<'/pet/{petId}', 'delete'>

    expectTypeOf<AllPetEndpoints['fullPath']>().toEqualTypeOf<'/pet/{petId}'>()
    expectTypeOf<AllPetEndpoints['method']>().toEqualTypeOf<'get' | 'delete'>()

    type PetCreateRequest = PetStore<'/pet', 'post'>['request']

    expectTypeOf<PetCreateRequest['name']>().toBeString()
    expectTypeOf<PetCreateRequest['photoUrls']>().toEqualTypeOf<string[]>()
    expectTypeOf<PetCreateRequest['status']>().toEqualTypeOf<'available' | 'pending' | 'sold' | undefined>()
  })
})
