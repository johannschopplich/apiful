import type { FetchContext, FetchOptions } from 'ofetch'
import type { OpenAPIClient } from './types'
import { ofetch } from 'ofetch'

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

export function resolvePathParams(path: string, params?: Record<string, unknown>) {
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
