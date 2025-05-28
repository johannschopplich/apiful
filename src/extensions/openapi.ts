import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { ApiClient } from '../client'
import type { OpenAPIClient } from '../openapi/types'
import { ofetch } from 'ofetch'
import { resolvePathParams } from '../openapi/index'

export type * from '../openapi/types'

export type SchemaPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]
  : Record<string, never>

export function OpenAPIBuilder<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIClient<Paths> {
    const fetcher = ofetch.create(client.defaultOptions)

    return (path, options) => fetcher(
      // @ts-expect-error: Path parameter provided by OpenAPI types
      resolvePathParams(path, options?.path),
      options as Record<string, any>,
    )
  }
}
