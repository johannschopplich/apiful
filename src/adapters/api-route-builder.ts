import { ofetch } from 'ofetch'
import { joinURL } from 'ufo'
import type { FetchOptions, MappedResponseType, ResponseType } from 'ofetch'
import type { ApiClient } from '../client'

const payloadMethods: ReadonlyArray<string> = ['POST', 'PUT', 'DELETE', 'PATCH']

type ApiMethodHandler<Data = unknown> = <
  T = any,
  R extends ResponseType = 'json',
>(
  data?: Data,
  opts?: Omit<FetchOptions<R>, 'baseURL' | 'method'>,
) => Promise<MappedResponseType<R, T>>

export type ApiRouteBuilder = {
  (...args: (string | number)[]): ApiRouteBuilder
  [key: string]: ApiRouteBuilder
} & {
  get: ApiMethodHandler<FetchOptions['query']>
  post: ApiMethodHandler<FetchOptions['body']>
  put: ApiMethodHandler<FetchOptions['body']>
  delete: ApiMethodHandler<FetchOptions['body']>
  patch: ApiMethodHandler<FetchOptions['body']>
}

export type ApiRouteBuilderAdapter = ApiRouteBuilder

export function apiRouteBuilder() {
  return function (client: ApiClient): ApiRouteBuilderAdapter {
    // Callable internal target required to use `apply` on it
    const internalTarget = (() => {}) as ApiRouteBuilder

    function p(url: string): ApiRouteBuilder {
      return new Proxy(internalTarget, {
        get(_target, key: string) {
          const method = key.toUpperCase()

          if (!['GET', ...payloadMethods].includes(method))
            return p(joinURL(url, key))

          const handler: ApiMethodHandler = <
            T = any,
            R extends ResponseType = 'json',
          >(
              data?: any,
              opts: FetchOptions<R> = {},
            ) => {
            if (method === 'GET' && data)
              opts.query = data
            else if (payloadMethods.includes(method) && data)
              opts.body = data

            opts.method = method

            const fetcher = ofetch.create(client.defaultOptions)
            return fetcher<T, R>(url, opts)
          }

          return handler
        },
        apply(_target, _thisArg, args: (string | number)[] = []) {
          return p(joinURL(url, ...args.map(String)))
        },
      })
    }

    return p(client.defaultOptions.baseURL ?? '/')
  }
}
