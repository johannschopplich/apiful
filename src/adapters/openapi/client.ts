import { ofetch } from 'ofetch'
import type { FetchContext, FetchOptions } from 'ofetch'
import type { OpenAPISchemaRepository } from 'apiverse'
import type { ApiClient } from '../../client'
import type { OpenAPIClient } from './types'

type ExtractPaths<K> = K extends keyof OpenAPISchemaRepository
  ? OpenAPISchemaRepository[K]
  : Record<string, never>

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

export function fetchRequestInterceptor(ctx: FetchContext) {
  ctx.request = resolvePathParams(ctx.request as string, (ctx.options as { path: Record<string, string> }).path)
}

export function createOpenAPIClient<Paths>(
  defaultOptions: FetchOptions | ((defaultOptions: FetchOptions) => FetchOptions),
): OpenAPIClient<Paths> {
  return (url: string, options: any) => ofetch(
    resolvePathParams(url, options?.path),
    typeof defaultOptions === 'function'
      ? defaultOptions(options)
      : mergeFetchOptions(options, defaultOptions) as any,
  )
}

function resolvePathParams(path: string, params?: Record<string, unknown>) {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}

function mergeFetchOptions(
  input?: FetchOptions,
  defaults?: FetchOptions,
): FetchOptions {
  const merged: FetchOptions = {
    ...defaults,
    ...input,
  }

  if (defaults?.params && input?.params) {
    merged.params = {
      ...defaults.params,
      ...input.params,
    }
  }

  if (defaults?.query && input?.query) {
    merged.query = {
      ...defaults.query,
      ...input.query,
    }
  }

  if (defaults?.headers && input?.headers) {
    merged.headers = new Headers(defaults.headers)
    for (const [key, value] of new Headers(input.headers))
      merged.headers.set(key, value)
  }

  return merged
}
