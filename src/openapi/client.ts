import type { FetchContext, FetchOptions } from 'ofetch'
import type { OpenAPIClient } from './types'
import { ofetch } from 'ofetch'

export function fetchRequestInterceptor(ctx: FetchContext) {
  ctx.request = resolvePathParams(
    ctx.request as string,
    (ctx.options as any).path,
  )
}

export function createOpenAPIClient<Paths>(
  defaultOptions: FetchOptions | (() => FetchOptions),
): OpenAPIClient<Paths> {
  const client = ofetch.create(typeof defaultOptions === 'function' ? defaultOptions() : defaultOptions)

  return (url, options) => client(
    resolvePathParams(url, (options as any)?.path),
    options as any,
  )
}

export function resolvePathParams(path: string, params?: Record<string, string>) {
  if (params) {
    for (const [key, value] of Object.entries(params))
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
  }

  return path
}
