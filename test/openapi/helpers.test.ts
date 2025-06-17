import type { OpenAPISchemaRepository, PetStore } from 'apiful/schema'
import type { SchemaPaths } from '../../src/openapi/client'
import { describe, expectTypeOf, it } from 'vitest'

// eslint-disable-next-line test/prefer-lowercase-title
describe('SchemaPaths type helper', () => {
  it('schema repository interface', () => {
    // Test with existing schema keys
    expectTypeOf<SchemaPaths<'petStore'>>().toEqualTypeOf<OpenAPISchemaRepository['petStore']>()
    expectTypeOf<SchemaPaths<'testEcho'>>().toEqualTypeOf<OpenAPISchemaRepository['testEcho']>()

    // Test with non-existing schema keys
    expectTypeOf<SchemaPaths<'nonExistent'>>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<SchemaPaths<'randomString'>>().toEqualTypeOf<Record<string, never>>()
  })
})

// eslint-disable-next-line test/prefer-lowercase-title
describe('PetStore type helper', () => {
  it('should have correct path parameter types', () => {
    // Test endpoint with path parameters
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/pet/{petId}', 'post'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/pet/{petId}/uploadImage', 'post'>['path']>().toEqualTypeOf<{ petId: number }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['path']>().toEqualTypeOf<{ orderId: number }>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'delete'>['path']>().toEqualTypeOf<{ orderId: number }>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['path']>().toEqualTypeOf<{ username: string }>()
    expectTypeOf<PetStore<'/user/{username}', 'put'>['path']>().toEqualTypeOf<{ username: string }>()
    expectTypeOf<PetStore<'/user/{username}', 'delete'>['path']>().toEqualTypeOf<{ username: string }>()

    // Test endpoints without path parameters - they return undefined, not Record<string, never>
    expectTypeOf<PetStore<'/pet', 'put'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/pet', 'post'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/store/order', 'post'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/user', 'post'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/login', 'get'>['path']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/logout', 'get'>['path']>().toBeUndefined()
  })

  it('should have correct query parameter types', () => {
    // Test endpoints with query parameters
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['query']>().toEqualTypeOf<{ status?: 'available' | 'pending' | 'sold' }>()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['query']>().toEqualTypeOf<{ tags?: string[] }>()
    expectTypeOf<PetStore<'/pet/{petId}', 'post'>['query']>().toEqualTypeOf<{ name?: string, status?: string }>()
    expectTypeOf<PetStore<'/pet/{petId}/uploadImage', 'post'>['query']>().toEqualTypeOf<{ additionalMetadata?: string }>()
    expectTypeOf<PetStore<'/user/login', 'get'>['query']>().toEqualTypeOf<{ username?: string, password?: string }>()

    // Test endpoints without query parameters - they return undefined
    expectTypeOf<PetStore<'/pet', 'put'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/pet', 'post'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/store/order', 'post'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'delete'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/user', 'post'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/logout', 'get'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/{username}', 'put'>['query']>().toBeUndefined()
    expectTypeOf<PetStore<'/user/{username}', 'delete'>['query']>().toBeUndefined()
  })

  it('should have correct request body types', () => {
    // Import component schemas for type checking
    interface Pet {
      id?: number
      name: string
      category?: { id?: number, name?: string }
      photoUrls: string[]
      tags?: { id?: number, name?: string }[]
      status?: 'available' | 'pending' | 'sold'
    }

    interface User {
      id?: number
      username?: string
      firstName?: string
      lastName?: string
      email?: string
      password?: string
      phone?: string
      userStatus?: number
    }

    interface Order {
      id?: number
      petId?: number
      quantity?: number
      shipDate?: string
      status?: 'placed' | 'approved' | 'delivered'
      complete?: boolean
    }

    // Test endpoints with request bodies
    expectTypeOf<PetStore<'/pet', 'put'>['request']>().toEqualTypeOf<Pet>()
    expectTypeOf<PetStore<'/pet', 'post'>['request']>().toEqualTypeOf<Pet>()
    expectTypeOf<PetStore<'/store/order', 'post'>['request']>().toEqualTypeOf<Order>()
    expectTypeOf<PetStore<'/user', 'post'>['request']>().toEqualTypeOf<User>()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['request']>().toEqualTypeOf<User[]>()
    expectTypeOf<PetStore<'/user/{username}', 'put'>['request']>().toEqualTypeOf<User>()
    expectTypeOf<PetStore<'/pet/{petId}/uploadImage', 'post'>['request']>().toEqualTypeOf<Record<string, never>>()

    // Test endpoints without request bodies - they return unknown
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/pet/{petId}', 'post'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'delete'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/user/login', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/user/logout', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['request']>().toBeUnknown()
    expectTypeOf<PetStore<'/user/{username}', 'delete'>['request']>().toBeUnknown()
  })

  it('should have correct response types for 200 status codes', () => {
    interface Pet {
      id?: number
      name: string
      category?: { id?: number, name?: string }
      photoUrls: string[]
      tags?: { id?: number, name?: string }[]
      status?: 'available' | 'pending' | 'sold'
    }

    interface User {
      id?: number
      username?: string
      firstName?: string
      lastName?: string
      email?: string
      password?: string
      phone?: string
      userStatus?: number
    }

    interface Order {
      id?: number
      petId?: number
      quantity?: number
      shipDate?: string
      status?: 'placed' | 'approved' | 'delivered'
      complete?: boolean
    }

    interface ApiResponse {
      code?: number
      type?: string
      message?: string
    }

    // Test successful response types
    expectTypeOf<PetStore<'/pet', 'put'>['response']>().toEqualTypeOf<Pet>()
    expectTypeOf<PetStore<'/pet', 'post'>['response']>().toEqualTypeOf<Pet>()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['response']>().toEqualTypeOf<Pet[]>()
    expectTypeOf<PetStore<'/pet/findByTags', 'get'>['response']>().toEqualTypeOf<Pet[]>()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['response']>().toEqualTypeOf<Pet>()
    expectTypeOf<PetStore<'/pet/{petId}/uploadImage', 'post'>['response']>().toEqualTypeOf<ApiResponse>()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['response']>().toEqualTypeOf<{ [key: string]: number }>()
    expectTypeOf<PetStore<'/store/order', 'post'>['response']>().toEqualTypeOf<Order>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['response']>().toEqualTypeOf<Order>()
    expectTypeOf<PetStore<'/user/createWithList', 'post'>['response']>().toEqualTypeOf<User>()
    expectTypeOf<PetStore<'/user/login', 'get'>['response']>().toEqualTypeOf<string>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['response']>().toEqualTypeOf<User>()

    // Test endpoints without 200 responses (should return never)
    expectTypeOf<PetStore<'/pet/{petId}', 'post'>['response']>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['response']>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'delete'>['response']>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PetStore<'/user', 'post'>['response']>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PetStore<'/user/logout', 'get'>['response']>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PetStore<'/user/{username}', 'put'>['response']>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<PetStore<'/user/{username}', 'delete'>['response']>().toEqualTypeOf<Record<string, never>>()
  })

  it('should have correct responses object with all status codes', () => {
    // Test that responses object contains all status codes for each endpoint
    expectTypeOf<PetStore<'/pet', 'put'>['responses']>().toHaveProperty(200)
    expectTypeOf<PetStore<'/pet', 'put'>['responses']>().toHaveProperty(400)
    expectTypeOf<PetStore<'/pet', 'put'>['responses']>().toHaveProperty(404)
    expectTypeOf<PetStore<'/pet', 'put'>['responses']>().toHaveProperty(405)

    expectTypeOf<PetStore<'/pet', 'post'>['responses']>().toHaveProperty(200)
    expectTypeOf<PetStore<'/pet', 'post'>['responses']>().toHaveProperty(405)

    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['responses']>().toHaveProperty(200)
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['responses']>().toHaveProperty(400)

    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['responses']>().toHaveProperty(200)
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['responses']>().toHaveProperty(400)
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['responses']>().toHaveProperty(404)

    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['responses']>().toHaveProperty(400)

    expectTypeOf<PetStore<'/user/login', 'get'>['responses']>().toHaveProperty(200)
    expectTypeOf<PetStore<'/user/login', 'get'>['responses']>().toHaveProperty(400)
  })

  it('should have correct fullPath property', () => {
    // Test that fullPath returns the exact path string
    expectTypeOf<PetStore<'/pet', 'put'>['fullPath']>().toEqualTypeOf<'/pet'>()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['fullPath']>().toEqualTypeOf<'/pet/{petId}'>()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['fullPath']>().toEqualTypeOf<'/pet/findByStatus'>()
    expectTypeOf<PetStore<'/store/inventory', 'get'>['fullPath']>().toEqualTypeOf<'/store/inventory'>()
    expectTypeOf<PetStore<'/store/order/{orderId}', 'get'>['fullPath']>().toEqualTypeOf<'/store/order/{orderId}'>()
    expectTypeOf<PetStore<'/user/{username}', 'get'>['fullPath']>().toEqualTypeOf<'/user/{username}'>()
    expectTypeOf<PetStore<'/user/login', 'get'>['fullPath']>().toEqualTypeOf<'/user/login'>()
  })

  it('should have correct method property', () => {
    // Test that method returns the exact HTTP method
    expectTypeOf<PetStore<'/pet', 'put'>['method']>().toEqualTypeOf<'put'>()
    expectTypeOf<PetStore<'/pet', 'post'>['method']>().toEqualTypeOf<'post'>()
    expectTypeOf<PetStore<'/pet/findByStatus', 'get'>['method']>().toEqualTypeOf<'get'>()
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['method']>().toEqualTypeOf<'get'>()
    expectTypeOf<PetStore<'/pet/{petId}', 'delete'>['method']>().toEqualTypeOf<'delete'>()
    expectTypeOf<PetStore<'/store/order', 'post'>['method']>().toEqualTypeOf<'post'>()
    expectTypeOf<PetStore<'/user/{username}', 'put'>['method']>().toEqualTypeOf<'put'>()
  })

  it('should have correct operation property', () => {
    // Test that operation contains the full OpenAPI operation object
    expectTypeOf<PetStore<'/pet', 'put'>['operation']>().toHaveProperty('parameters')
    expectTypeOf<PetStore<'/pet', 'put'>['operation']>().toHaveProperty('requestBody')
    expectTypeOf<PetStore<'/pet', 'put'>['operation']>().toHaveProperty('responses')

    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('parameters')
    expectTypeOf<PetStore<'/pet/{petId}', 'get'>['operation']>().toHaveProperty('responses')

    expectTypeOf<PetStore<'/user/login', 'get'>['operation']>().toHaveProperty('parameters')
    expectTypeOf<PetStore<'/user/login', 'get'>['operation']>().toHaveProperty('responses')
  })

  it('should handle method parameter defaults correctly', () => {
    // Test that when method is not specified, it defaults to never (not union of methods)
    type PetEndpointMethods = PetStore<'/pet'>['method']
    expectTypeOf<PetEndpointMethods>().toBeNever()

    type PetByIdMethods = PetStore<'/pet/{petId}'>['method']
    expectTypeOf<PetByIdMethods>().toBeNever()

    type UserByNameMethods = PetStore<'/user/{username}'>['method']
    expectTypeOf<UserByNameMethods>().toBeNever()

    // Test single method endpoints
    type InventoryMethods = PetStore<'/store/inventory'>['method']
    expectTypeOf<InventoryMethods>().toBeNever()

    type FindByStatusMethods = PetStore<'/pet/findByStatus'>['method']
    expectTypeOf<FindByStatusMethods>().toBeNever()
  })

  it('should work with literal path and method combinations', () => {
    // Test that specific path/method combinations work correctly
    const petGetEndpoint: PetStore<'/pet/{petId}', 'get'> = {} as any
    expectTypeOf(petGetEndpoint.path).toEqualTypeOf<{ petId: number }>()
    expectTypeOf(petGetEndpoint.method).toEqualTypeOf<'get'>()
    expectTypeOf(petGetEndpoint.fullPath).toEqualTypeOf<'/pet/{petId}'>()

    const userUpdateEndpoint: PetStore<'/user/{username}', 'put'> = {} as any
    expectTypeOf(userUpdateEndpoint.path).toEqualTypeOf<{ username: string }>()
    expectTypeOf(userUpdateEndpoint.method).toEqualTypeOf<'put'>()
    expectTypeOf(userUpdateEndpoint.fullPath).toEqualTypeOf<'/user/{username}'>()

    const orderCreateEndpoint: PetStore<'/store/order', 'post'> = {} as any
    expectTypeOf(orderCreateEndpoint.path).toBeUndefined()
    expectTypeOf(orderCreateEndpoint.method).toEqualTypeOf<'post'>()
    expectTypeOf(orderCreateEndpoint.fullPath).toEqualTypeOf<'/store/order'>()
  })

  it('should provide type-safe access to specific response status codes', () => {
    // Test accessing specific status code responses
    type PetGetResponses = PetStore<'/pet/{petId}', 'get'>['responses']
    expectTypeOf<PetGetResponses[200]>().not.toBeNever()
    expectTypeOf<PetGetResponses[400]>().not.toBeNever()
    expectTypeOf<PetGetResponses[404]>().not.toBeNever()

    type UserLoginResponses = PetStore<'/user/login', 'get'>['responses']
    expectTypeOf<UserLoginResponses[200]>().not.toBeNever()
    expectTypeOf<UserLoginResponses[400]>().not.toBeNever()
  })

  it('should handle complex parameter types correctly', () => {
    // Test complex query parameter types
    type FindByStatusQuery = PetStore<'/pet/findByStatus', 'get'>['query']
    expectTypeOf<FindByStatusQuery>().toEqualTypeOf<{ status?: 'available' | 'pending' | 'sold' }>()

    type FindByTagsQuery = PetStore<'/pet/findByTags', 'get'>['query']
    expectTypeOf<FindByTagsQuery>().toEqualTypeOf<{ tags?: string[] }>()

    // Test that we can access the status property safely
    type StatusValues = NonNullable<FindByStatusQuery['status']>
    expectTypeOf<StatusValues>().toEqualTypeOf<'available' | 'pending' | 'sold'>()
  })

  it('should work with conditional types and utility types', () => {
    // Test that we can use the PetStore type with utility types
    type AllPetEndpoints = PetStore<'/pet/{petId}', 'get'> | PetStore<'/pet/{petId}', 'post'> | PetStore<'/pet/{petId}', 'delete'>

    expectTypeOf<AllPetEndpoints['fullPath']>().toEqualTypeOf<'/pet/{petId}'>()
    expectTypeOf<AllPetEndpoints['method']>().toEqualTypeOf<'get' | 'post' | 'delete'>()

    // Test Pick utility type
    type PathAndMethod = Pick<PetStore<'/pet/{petId}', 'get'>, 'fullPath' | 'method'>
    expectTypeOf<PathAndMethod>().toEqualTypeOf<{ fullPath: '/pet/{petId}', method: 'get' }>()
  })

  it('should provide proper intellisense support for nested properties', () => {
    // Test that deeply nested properties maintain type safety
    type PetCreateRequest = PetStore<'/pet', 'post'>['request']
    type PetName = PetCreateRequest['name']
    expectTypeOf<PetName>().toBeString()

    type PetPhotoUrls = PetCreateRequest['photoUrls']
    expectTypeOf<PetPhotoUrls>().toEqualTypeOf<string[]>()

    type PetStatus = PetCreateRequest['status']
    expectTypeOf<PetStatus>().toEqualTypeOf<'available' | 'pending' | 'sold' | undefined>()
  })
})
