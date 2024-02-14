import { ofetch } from 'ofetch'
import { joinURL } from 'ufo'
import type { FetchOptions } from 'ofetch'
import type { MappedResponseType, ResponseType } from '../types'
import type { ApiClient } from '../client'

const payloadMethods = ['POST', 'PUT', 'DELETE', 'PATCH']

type RequestHandler<Data = unknown> = <
  T = any,
  R extends ResponseType = 'json',
>(
  data?: Data,
  opts?: Omit<FetchOptions<R>, 'baseURL' | 'method'>,
) => Promise<MappedResponseType<R, T>>

type RouteBuilder = {
  (...args: (string | number)[]): RouteBuilder
  [key: string]: RouteBuilder
} & {
  get: RequestHandler<FetchOptions['query']>
  post: RequestHandler<FetchOptions['body']>
  put: RequestHandler<FetchOptions['body']>
  delete: RequestHandler<FetchOptions['body']>
  patch: RequestHandler<FetchOptions['body']>
}

export type BuilderAdapter = RouteBuilder

export function routeBuilder() {
  return function (client: ApiClient): BuilderAdapter {
    // Callable internal target required to use `apply` on it
    const internalTarget = (() => {}) as RouteBuilder

    function p(url: string): RouteBuilder {
      return new Proxy(internalTarget, {
        get(_target, key: string) {
          const method = key.toUpperCase()

          if (!['GET', ...payloadMethods].includes(method))
            return p(joinURL(url, key))

          const handler: RequestHandler = <
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
