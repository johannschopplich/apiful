import type { FetchContext, FetchOptions, ResponseType } from 'ofetch'
import type { OpenAPIClient } from './types'
import { ofetch } from 'ofetch'

export interface ResolvedFetchOptions<
  R extends ResponseType = ResponseType,
  T = any,
> extends FetchOptions<R, T> {
  headers: Headers
}

export function fetchRequestInterceptor(ctx: FetchContext) {
  ctx.request = resolvePathParams(
    ctx.request as string,
    (ctx.options as any).path,
  )
}

export function createOpenAPIClient<Paths>(
  defaultOptions: FetchOptions | ((defaultOptions: FetchOptions) => FetchOptions),
): OpenAPIClient<Paths> {
  return (url: string, options: any) => ofetch(
    resolvePathParams(url, options?.path),
    resolveFetchOptions(
      options,
      typeof defaultOptions === 'function' ? defaultOptions(options) : defaultOptions,
    ) as any,
  )
}

export function resolvePathParams(path: string, params?: Record<string, unknown>) {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}

function resolveFetchOptions<
  R extends ResponseType = ResponseType,
  T = any,
>(
  input: FetchOptions<R, T> | undefined,
  defaults: FetchOptions<R, T> | undefined,
): ResolvedFetchOptions<R, T> {
  const headers = mergeHeaders(input?.headers, defaults?.headers)

  let query: Record<string, any> | undefined
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query,
    }
  }

  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers,
  }
}

function mergeHeaders(
  input?: HeadersInit,
  defaults?: HeadersInit,
): Headers {
  if (!defaults) {
    return new Headers(input)
  }

  const headers = new Headers(defaults)
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input)
      ? input
      : new Headers(input)) {
      headers.set(key, value)
    }
  }

  return headers
}
