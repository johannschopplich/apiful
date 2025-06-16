import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { ApiClient } from '../../src/client'
import type { OpenAPIClient, SchemaPaths } from '../../src/extensions/openapi'
import { describe, expectTypeOf, it } from 'vitest'
import { OpenAPIBuilder } from '../../src/extensions/openapi'

describe('OpenAPI adapter types', () => {
  it('schema repository interface', () => {
    // Test with existing schema keys
    expectTypeOf<SchemaPaths<'petStore'>>().toEqualTypeOf<OpenAPISchemaRepository['petStore']>()
    expectTypeOf<SchemaPaths<'testEcho'>>().toEqualTypeOf<OpenAPISchemaRepository['testEcho']>()

    // Test with non-existing schema keys
    expectTypeOf<SchemaPaths<'nonExistent'>>().toEqualTypeOf<Record<string, never>>()
    expectTypeOf<SchemaPaths<'randomString'>>().toEqualTypeOf<Record<string, never>>()
  })

  it('OpenAPIBuilder function type', () => {
    const builder = OpenAPIBuilder<'petStore'>()
    expectTypeOf(builder).toBeFunction()
    expectTypeOf(builder).parameter(0).toExtend<ApiClient>()

    const client = {} as ApiClient
    const openApiClient = builder(client)
    expectTypeOf(openApiClient).toExtend<OpenAPIClient<SchemaPaths<'petStore'>>>()
  })

  it('OpenAPIBuilder with existing schema', () => {
    const petStoreBuilder = OpenAPIBuilder<'petStore'>()
    const client = {} as ApiClient
    const petStoreClient = petStoreBuilder(client)

    expectTypeOf(petStoreClient).toExtend<OpenAPIClient<OpenAPISchemaRepository['petStore']>>()

    const testEchoBuilder = OpenAPIBuilder<'testEcho'>()
    const testEchoClient = testEchoBuilder(client)

    expectTypeOf(testEchoClient).toExtend<OpenAPIClient<OpenAPISchemaRepository['testEcho']>>()
  })

  it('OpenAPIBuilder with non-existing schema', () => {
    const nonExistentBuilder = OpenAPIBuilder<'nonExistent'>()
    const client = {} as ApiClient
    const nonExistentClient = nonExistentBuilder(client)

    expectTypeOf(nonExistentClient).toExtend<OpenAPIClient<Record<string, never>>>()
  })

  it('OpenAPIClient usage patterns', () => {
    const client = {} as ApiClient
    const petStoreClient = OpenAPIBuilder<'petStore'>()(client)

    const getResponse = petStoreClient('/pet/{petId}', {
      method: 'GET',
      path: { petId: 1 },
    })
    expectTypeOf(getResponse).toExtend<Promise<any>>()

    const deleteResponse = petStoreClient('/pet/{petId}', {
      method: 'DELETE',
      path: { petId: 1 },
      headers: {
        api_key: 'test',
      },
    })
    expectTypeOf(deleteResponse).toExtend<Promise<any>>()
  })
})
