import type { $Fetch, FetchOptions } from 'ofetch'
import { ofetch } from 'ofetch'

type Fn<T = any> = (...args: any[]) => T

export type HandlerExtension = Fn
export type MethodsExtension = Record<string, unknown>
export type ApiExtension = HandlerExtension | MethodsExtension

export type HandlerExtensionBuilder = (client: ApiClient) => HandlerExtension
export type MethodsExtensionBuilder = (client: ApiClient) => MethodsExtension

export interface ClientFactoryOptions {
  /**
   * Fetch every extension of the client issues its requests through. Defaults to an
   * `ofetch` instance built from `defaultOptions`, which is also what applies them – a
   * fetch given here is asked for the request as it stands and owns its own options.
   */
  fetch?: $Fetch
}

/**
 * A client typed after the extensions `with` added to it: the call signature and properties of
 * its latest handler extension, and the methods of every methods extension.
 */
export type ApiClient<Handler = unknown, Methods = unknown> = ApiClientBase<Handler, Methods> & Handler & Methods

interface ApiClientBase<Handler, Methods> extends Function {
  defaultOptions: FetchOptions
  fetch: $Fetch
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<Handler, Methods>) => Extension,
  ) => [Extension] extends [HandlerExtension]
    // A handler extension takes the place of the previous one, as it does at runtime.
    ? ApiClient<Extension, Methods>
    : ApiClient<Handler, Methods & Extension>
}

export function createClient(
  defaultOptions: FetchOptions = {},
  { fetch = ofetch.create(defaultOptions) }: ClientFactoryOptions = {},
): ApiClient {
  const client = (() => {
    throw new TypeError('This client cannot make requests. Add a handler extension, such as `createClient().with(ofetchBuilder())`.')
  }) as unknown as ApiClient

  client.defaultOptions = defaultOptions
  client.fetch = fetch

  client.with = (createExtension => addExtension(client, Object.create(null), undefined, createExtension(client))) as ApiClient['with']

  return client
}

/**
 * Derives a client carrying one more extension. The extension record is copied rather than
 * written to, so the client `with` was called on keeps the extensions it already had.
 */
function addExtension(
  base: ApiClient,
  extensions: Record<PropertyKey, unknown>,
  handler: Fn | undefined,
  extension: ApiExtension,
): ApiClient {
  const nextExtensions: Record<PropertyKey, unknown> = Object.assign(Object.create(null), extensions)

  if (typeof extension === 'function')
    return createExtendedClient(base, nextExtensions, extension)

  for (const key of Object.keys(extension)) {
    nextExtensions[key] = extension[key]
  }

  return createExtendedClient(base, nextExtensions, handler)
}

/**
 * Wraps the client `createClient` returned, never another proxy, so a property resolves in
 * one hop however many extensions the client carries.
 */
function createExtendedClient(
  base: ApiClient,
  extensions: Record<PropertyKey, unknown>,
  handler: Fn | undefined,
): ApiClient {
  let client: ApiClient

  function withExtension(createExtension: (client: ApiClient) => ApiExtension) {
    return addExtension(base, extensions, handler, createExtension(client))
  }

  client = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'with')
        return withExtension

      if (prop in extensions)
        return extensions[prop]

      if (prop in target)
        return Reflect.get(target, prop, receiver)

      // Whatever the base client cannot answer is asked of the handler extension, which may
      // carry properties of its own or, as `apiRouterBuilder` does, answer a name it holds
      // no property for.
      return handler === undefined ? undefined : Reflect.get(handler, prop)
    },
    set(target, prop, value, receiver) {
      // A name the base client does not answer to belongs to this client alone, not to the
      // one it was extended from.
      if (prop in extensions || !(prop in target)) {
        extensions[prop] = value
        return true
      }

      return Reflect.set(target, prop, value, receiver)
    },
    apply(target, thisArg, args) {
      if (handler !== undefined)
        return handler(...args)

      return Reflect.apply(target, thisArg, args)
    },
  })

  return client
}
