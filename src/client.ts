import type { FetchOptions } from 'ofetch'

export interface ApiClient<BaseURL extends string = string> {
  _extensions: MethodApiExtension
  defaultOptions: FetchOptions
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) => this & Extension
}

type CallableApiExtension = (...args: any[]) => any
type MethodApiExtension = Record<string, (...args: any[]) => any>

export type ApiExtension = CallableApiExtension | MethodApiExtension

export function createClient<const BaseURL extends string = '/'>(
  defaultOptions: Omit<FetchOptions, 'baseURL'> & { baseURL?: BaseURL } = {},
): ApiClient<BaseURL> {
  const client = (() => {}) as unknown as ApiClient<BaseURL>

  client.defaultOptions = defaultOptions

  client._extensions = {}

  client.with = function <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<BaseURL>) => Extension,
  ) {
    const extension = createExtension(this)

    // Accumulate all non-callable extensions
    if (typeof extension !== 'function')
      Object.assign(this._extensions, extension)

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target._extensions)
          return Reflect.get(target._extensions, prop, receiver)

        if (prop in target)
          return Reflect.get(target, prop, receiver)

        // Pass all property lookups to the extension
        return Reflect.get(extension, prop, receiver)
      },
      set(target, prop, value, receiver) {
        if (prop in target._extensions)
          return Reflect.set(target._extensions, prop, value, receiver)

        return Reflect.set(extension, prop, value, receiver)
      },
      apply(target, thisArg, args) {
        if (typeof extension === 'function')
          return extension(...args)

        // @ts-expect-error: Adapter will provide call signature
        return Reflect.apply(target, thisArg, args)
      },
    }) as ApiClient<BaseURL> & Extension
  }

  return client
}
