import type { FetchOptions } from 'ofetch'
import type { ApiClient } from '../client.ts'
import type { SchemaPaths } from '../openapi/index.ts'
import type { OpenAPIClient } from '../openapi/types.ts'
import { ofetch } from 'ofetch'
import { resolvePathParams } from '../openapi/index.ts'

export type * from '../openapi/types.ts'

interface OpenAPIRequestOptions extends FetchOptions {
  path?: Record<string, string>
}

export function OpenAPIBuilder<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIClient<Paths> {
    const fetchFn = ofetch.create(client.defaultOptions)

    return ((path, options) => {
      const { path: pathParams, ...fetchOpts } = (options ?? {}) as OpenAPIRequestOptions
      return fetchFn(
        resolvePathParams(path as string, pathParams),
        fetchOpts,
      )
    }) as OpenAPIClient<Paths>
  }
}
