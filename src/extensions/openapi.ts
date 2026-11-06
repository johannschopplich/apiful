import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { ApiClient } from '../client.ts'
import type { SchemaPaths } from '../openapi/client.ts'
import type { OpenAPIClient } from '../openapi/types.ts'
import { createOpenAPIClient } from '../openapi/client.ts'

export type * from '../openapi/types.ts'

export function openAPIBuilder<
  Schema extends keyof OpenAPISchemaRepository,
  Paths = SchemaPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIClient<Paths> {
    return createOpenAPIClient<Schema, Paths>({}, { fetch: client.fetch })
  }
}
