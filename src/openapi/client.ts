import type { OpenAPIServiceRepository } from 'apiful/schema'
import type { $Fetch, FetchOptions } from 'ofetch'
import type { ClientFactoryOptions } from '../client.ts'
import type { OpenAPIClient } from './types.ts'
import { ofetch } from 'ofetch'

export type ServicePaths<Service extends keyof OpenAPIServiceRepository> = OpenAPIServiceRepository[Service]

interface OpenAPIRequestOptions extends FetchOptions {
  path?: Record<string, string>
}

/** Methods ofetch serializes a body for. */
const PAYLOAD_METHODS = new Set(['PATCH', 'POST', 'PUT', 'DELETE'])

/**
 * Creates an OpenAPI client on its own, without `createClient`. The `path` parameters are
 * interpolated into the URL rather than passed on as fetch options.
 */
export function createOpenAPIClient<
  Service extends keyof OpenAPIServiceRepository,
  Paths = ServicePaths<Service>,
>(
  defaultOptions: FetchOptions = {},
  { fetch = ofetch.create(defaultOptions) }: ClientFactoryOptions = {},
): OpenAPIClient<Paths> {
  let bodySerializingFetch: $Fetch | undefined

  return (async (url: string, options?: OpenAPIRequestOptions) => {
    const { path: pathParams, ...fetchOptions } = options ?? {}
    const request = resolvePathParams(url, pathParams)
    if (PAYLOAD_METHODS.has(fetchOptions.method?.toUpperCase() ?? 'GET') || !isJSONSerializable(fetchOptions.body))
      return fetch(request, fetchOptions)

    // ofetch sends the body of any other method, such as OpenAPI 3.2's `QUERY`, as is. A derived
    // instance serializes it at the last step, once the defaults are merged and the hooks have run.
    bodySerializingFetch ??= fetch.create({}, {
      fetch: (input, init) => fetch.native(input, init && serializeBody(init)),
    })
    return bodySerializingFetch(request, fetchOptions)
  }) as OpenAPIClient<Paths>
}

export function resolvePathParams(path: string, params?: Record<string, string>): string {
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      const segment = encodeURIComponent(String(value))
      // `encodeURIComponent` leaves dots as they are, so a `.` or `..` value that fills a whole
      // segment survives encoding as a dot segment.
      if ((segment === '.' || segment === '..') && path.split('/').includes(`{${key}}`))
        throw new Error(`Path parameter \`${key}\` is \`${segment}\`, which would resolve the URL to another path`)
      path = path.replaceAll(`{${key}}`, segment)
    }
  }

  return path
}

/** Serializes a body the way ofetch does for `PAYLOAD_METHODS`, keeping a content-type already set. */
function serializeBody(init: RequestInit): RequestInit {
  const body: unknown = init.body
  if (!isJSONSerializable(body))
    return init

  const headers = new Headers(init.headers)
  const contentType = headers.get('content-type')
  if (!contentType)
    headers.set('content-type', 'application/json')
  if (!headers.has('accept'))
    headers.set('accept', 'application/json')
  return {
    ...init,
    body: contentType === 'application/x-www-form-urlencoded'
      ? new URLSearchParams(body as Record<string, string>).toString()
      : JSON.stringify(body),
    headers,
  }
}

/** Whether ofetch would serialize a body as JSON: an array, a plain object, or an object with `toJSON`. Mirrors `isJSONSerializable` in ofetch (MIT). */
function isJSONSerializable(body: unknown): body is object {
  if (typeof body !== 'object' || body === null || 'buffer' in body)
    return false
  return Array.isArray(body) || body.constructor?.name === 'Object' || typeof (body as { toJSON?: unknown }).toJSON === 'function'
}
