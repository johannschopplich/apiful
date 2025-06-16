# `MethodsExtensionBuilder`

Extensions that add additional methods to the client.

> [!IMPORTANT]
> Always use the `satisfies` operator to validate your extension, which preserves the resulting extension type.

## Type Definition

```ts
// Internal use only
type Fn<T = any> = (...args: any[]) => T
type MethodsExtension = Record<string, unknown>

// Use this type to create extensions
type MethodsExtensionBuilder = (client: ApiClient) => MethodsExtension
```

## Example

```ts
import type { MethodsExtensionBuilder } from 'apiful'
import { createClient, ofetchBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  }
})) satisfies MethodsExtensionBuilder

const client = createClient()
  .with(ofetchBuilder())
  .with(logExtension)
```
