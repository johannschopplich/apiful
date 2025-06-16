# Extension Types

APIful supports two kinds of extensions:

- **Handler Extensions**: Used to provide the client's callable signature. At least one is required to allow the client to make requests.
- **Methods Extensions**: Used to add additional methods to the client.

## Extension Builder

An `ApiClient` instance instantiated by `createClient` can be extended with custom extensions by using the `with` method on the client instance.

```ts
const extendedClient = client
  .with(handlerExtensionBuilder)
  .with(methodsExtensionBuilder)
```

To create a custom extension, you need to define an extension builder. An extension builder is a function that takes an `ApiClient` instance and returns either a handler extension or a methods extension.

> [!TIP]
> Make sure that the extension builder satisfies either `HandlerExtensionBuilder` or `MethodsExtensionBuilder`. Do not declare extension variables directly to one of the types.

**Type Definitions**

```ts
// Only used internally
type HandlerExtension = Fn
type MethodsExtension = Record<string, unknown>

// Used to create extensions
type HandlerExtensionBuilder = (client: ApiClient) => HandlerExtension
type MethodsExtensionBuilder = (client: ApiClient) => MethodsExtension
```

### `HandlerExtensionBuilder`

Handler extensions are the foundation of any `ApiClient`, as they provide the call signature. Although you can add multiple handler extensions, only one is required and it is recommended to have only one.

Let's write a simple handler extension that uses [ofetch](https://github.com/unjs/ofetch) to make requests. This is basically the same code as the `ofetchBuilder` provided by APIful.

```ts
import { createClient } from 'apiful'
import { ofetch } from 'ofetch'

const ofetchBuilder = ((client: ApiClient) => {
  return ofetch.create(client.defaultOptions)
}) satisfies HandlerExtensionBuilder

const extendedClient = createClient()
  .with(ofetchBuilder)
```

### `MethodsExtensionBuilder`

Methods extensions are used to add additional methods to the client. You can add as many methods as you like.

```ts
const logExtension = (client => ({
  myMethod() {
    // Do something with `client`
  }
})) satisfies MethodsExtensionBuilder

const extendedClient = client
  .with(logExtension)
```
