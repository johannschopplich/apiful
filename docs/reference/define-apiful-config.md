# `defineApifulConfig`

Defines the configuration for all services in the APIful application.

> [!NOTE]
> For now, this only makes sense with the [`npx apiful generate`](/guide/cli) command to generate TypeScript definitions from OpenAPI schemas and the [OpenAPI](/extensions/openapi) extension to build the type-safe API client.

## Example

Import the `defineApifulConfig` function from `apiful/config` and define a `petStore` service using the OpenAPI schema from the [Swagger Petstore](https://petstore3.swagger.io) API:

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
> `schema` takes a file path relative to the project root, a `file:` or `http(s):` URL, an OpenAPI 3.x document object, or a function resolving to one.
