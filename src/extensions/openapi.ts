import type { ApiClient } from '../client'
import type { SchemaPaths } from '../openapi/index'
import type { OpenAPIClient } from '../openapi/types'
import { ofetch } from 'ofetch'
import { resolvePathParams } from '../openapi/index'

export type * from '../openapi/types'

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
