# `HandlerExtensionBuilder`

The type of an extension builder that takes the client and returns a [handler extension](/guide/custom-extensions#write-a-handler-extension): a function, which becomes the client's call signature.

Apply it with `satisfies` rather than as an annotation – [Custom Extensions](/guide/custom-extensions) explains why.

## Type Definition

```ts
type Fn<T = any> = (...args: any[]) => T

type HandlerExtension = Fn
type HandlerExtensionBuilder = (client: ApiClient) => HandlerExtension
```

## Example

```ts
import type { HandlerExtensionBuilder } from 'apiful'
import { createClient } from 'apiful'
import { ofetch } from 'ofetch'

const callableExtension = (
  client => ofetch.create(client.defaultOptions)
) satisfies HandlerExtensionBuilder

const client = createClient()
  .with(callableExtension)
```
