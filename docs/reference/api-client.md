# `ApiClient`

The client returned by [`createClient`](/reference/create-client): a callable object that carries the default fetch options and the extensions added to it.

## Type Definition

```ts
type ClientOptions = FetchOptions

type ApiClient<Handler = unknown, Methods = unknown> = ApiClientBase<Handler, Methods> & Handler & Methods

interface ApiClientBase<Handler, Methods> extends Function {
  defaultOptions: ClientOptions
  fetch: $Fetch
  with: <Extension extends ApiExtension>(
    createExtension: (client: ApiClient<Handler, Methods>) => Extension,
  ) => [Extension] extends [HandlerExtension]
    ? ApiClient<Extension, Methods>
    : ApiClient<Handler, Methods & Extension>
}
```

`Handler` is the latest handler extension and `Methods` collects every methods extension. A handler extension added with `with` takes the place of the previous one in the type, as it does at runtime, so the call signature and properties of the replaced handler are gone from the client. A bare `ApiClient` carries neither – every extended client is assignable to it.

`createExtension` receives the client as it stands, carrying every extension added before it – see [reaching the client](/guide/custom-extensions#reaching-the-client).

`ApiExtension` is either a [`HandlerExtension`](/reference/handler-extension-builder), which becomes the client's call signature, or a [`MethodsExtension`](/reference/methods-extension-builder), whose entries become methods on the client. `FetchOptions` and `$Fetch` come from [ofetch](https://github.com/unjs/ofetch).

`fetch` is what every extension makes its requests through. It defaults to an ofetch instance built from `defaultOptions`, and [`createClient`](/reference/create-client#supplying-your-own-fetch) takes one of your own.

Calling a client that has no handler extension throws a `TypeError` – add one with `with`, such as [`ofetchBuilder()`](/extensions/ofetch).
