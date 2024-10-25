# Custom Extensions

Each client can have more than one extension. This means that you can chain `with` methods to add multiple extensions to your client.

## Extension Types

Before writing your first extension, you need to understand the different types of extensions that you can create.

APIful provides two types of extensions:

- **Handler Extension**: This type of extension adds the callable signature to a client instance. This should be the first extension you extend your client with. It is recommended not to use more than one handler extension.
- **Methods Extension**: This type of extension adds methods to the client instance. You can chain multiple method extensions to add as much functionality as you need.

Both extension types are created using a builder function that receives the client instance and returns the extension function (handler) or object (methods).

> [!TIP]
> Make sure that the extension builder satisfies either `HandlerExtensionBuilder` or `MethodsExtensionBuilder`. Do no declare extension variables directly to one of the types.

## Handler Extension

Handler extensions are the foundation of any [`ApiClient`](/reference/api-client), as they provide the call signature. Although you can add multiple handler extensions, only one is required and it is recommended to have only one.

[ofetch](https://github.com/unjs/ofetch) is a fetch wrapper suits well as a handler extension. Actually, the [`ofetchBuilder`](/extensions/ofetch) included by APIful just creates an ofetch instance with the default options of the client. It is a good example for the most basic handler extension:

```ts
import type { HandlerExtensionBuilder } from 'apiful'
import { ofetch } from 'ofetch'

const callableExtension = (
  client => ofetch.create(client.defaultOptions)
) satisfies HandlerExtensionBuilder
```

Now, you can extend your client with your custom handler extension:

```ts
import { createClient } from 'apiful'

const client = createClient()
  .with(callableExtension)
```

> [!TIP]
> Use the [`HandlerExtensionBuilder`](/reference/handler-extension-builder) type.

## Methods Extension

While handler extensions are recommended to be used only once, you can add as many method extensions as you need. hey allow you to add your own methods to the client and provide full type safety to the client.

For example, let's add a `logDefaults` function to the client that logs the default fetch options:

```ts
import type { MethodsExtensionBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  }
})) satisfies MethodsExtensionBuilder

const extendedClient = client
  .with(logExtension)

extendedClient.logDefaults() // { baseURL: '<your-base-url>', headers: { Authorization: 'Bearer <your-bearer-token>' } }
```

> [!TIP]
> Use the [`MethodsExtensionBuilder`](/reference/methods-extension-builder) type.
