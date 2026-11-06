# `defineApifulConfig`

Declares the services [`apiful generate`](/guide/cli) generates types for.

## Example

Each key of `services` names a service, and its `schema` points at the service's OpenAPI document – here the one the [Swagger Petstore](https://petstore3.swagger.io) publishes:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    petStore: {
      schema: 'https://petstore3.swagger.io/api/v3/openapi.json',
    },
  },
})
```

The name keys everything generated for the service – `petStore` yields the `PetStore` type helpers and the `apiful/schema/petStore` fragment – and the [type generator](/reference/type-generator#generatetypes) lists the names it rejects.

## Type Definition

```ts
interface ServiceOptions {
  schema: string | URL | OpenAPIDocument | (() => Promise<OpenAPIDocument>)
}

interface ApifulConfig {
  services: Record<string, ServiceOptions>
}

declare function defineApifulConfig(config: ApifulConfig): ApifulConfig
```

> [!NOTE]
> `schema` takes a file path relative to the project root, a `file:` or `http(s):` URL, an OpenAPI 3.x document object, or a function resolving to one. Swagger 2.0 is not supported – convert it to OpenAPI 3.x first.
