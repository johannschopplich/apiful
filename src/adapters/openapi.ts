import type { OpenAPISchemaRepository } from 'apiful/schema'
import type { ApiClient } from '../client'
import type { OpenAPIClient } from '../openapi/types'
import { ofetch } from 'ofetch'
import { resolvePathParams } from '../openapi'

type ExtractPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]
  : Record<string, never>

export type * from '../openapi/types'

export function OpenAPI<
  const Schema extends string,
  Paths = ExtractPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIClient<Paths> {
    const fetcher = ofetch.create(client.defaultOptions)

    return (path: string, options?: Record<string, any>) =>
      fetcher(
        resolvePathParams(path, options?.path),
        options,
      )
  }
}
