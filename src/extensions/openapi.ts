import type { OpenAPIServiceRepository } from 'apiful/schema'
import type { ApiClient } from '../client.ts'
import type { ServicePaths } from '../openapi/client.ts'
import type { OpenAPIClient } from '../openapi/types.ts'
import { createOpenAPIClient } from '../openapi/client.ts'

export type * from '../openapi/types.ts'

export function openAPIBuilder<
  Service extends keyof OpenAPIServiceRepository,
  Paths = ServicePaths<Service>,
>() {
  return function (client: ApiClient): OpenAPIClient<Paths> {
    return createOpenAPIClient<Service, Paths>({}, { fetch: client.fetch })
  }
}
