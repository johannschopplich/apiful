# `MethodsExtensionBuilder`

The type of an extension builder that takes the client and returns a [methods extension](/guide/custom-extensions#write-a-methods-extension): an object, whose entries become methods on the client.

Apply it with `satisfies` rather than as an annotation – [Custom Extensions](/guide/custom-extensions) explains why.

## Type Definition

```ts
type MethodsExtension = Record<string, unknown>
type MethodsExtensionBuilder = (client: ApiClient) => MethodsExtension
```

## Example

```ts
import type { MethodsExtensionBuilder } from 'apiful'
import { createClient, ofetchBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  },
})) satisfies MethodsExtensionBuilder

const client = createClient()
  .with(ofetchBuilder())
  .with(logExtension)
```
