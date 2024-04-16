import { ofetch } from 'ofetch'
import type { FetchContext } from 'ofetch'
import type { OpenAPISchemaRepository } from 'apiverse'
import type { ApiClient } from '../../client'
import type { OpenAPIAdapter } from './types'

type OpenAPIPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]
  : Record<string, never>

export function OpenAPI<
  const Schema extends string,
  Paths = OpenAPIPaths<Schema>,
>() {
  return function (client: ApiClient): OpenAPIAdapter<Paths> {
    const fetcher = ofetch.create(client.defaultOptions)

    return (path: string, options?: Record<string, any>) =>
      fetcher(
        resolvePath(path, options?.path),
        options,
      )
  }
}

export function fetchRequestInterceptor(ctx: FetchContext) {
  ctx.request = resolvePath(ctx.request as string, (ctx.options as { path: Record<string, string> }).path)
}

function resolvePath(path: string, params?: Record<string, unknown>) {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}
