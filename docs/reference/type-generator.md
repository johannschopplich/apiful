# Type Generator

The [`generate`](/guide/cli) command is the type generator most projects need. Its building blocks are exported from `apiful/openapi/generate` for tools that write the types themselves – a framework module generating them on startup, for example. The subpath is Node.js only; the runtime client stays in `apiful/openapi`, which runs anywhere.

## `generateTypes`

Loads the OpenAPI document of every service and returns the generated types the `generate` command writes: the `apiful/schema` entry with the type helpers, and one `apiful/schema/<service>` fragment per service.

```ts
import { generateTypes } from 'apiful/openapi/generate'

const { entry, fragments } = await generateTypes({
  petStore: { schema: 'openapi/pet-store.yaml' },
})
```

It rejects with a `GenerationError` naming the service where:

- The service name holds anything but letters, digits, `_`, `$`, `.`, and `-`.
- The service name makes no valid identifier, such as `1password`.
- The type names of the service collide with another service's, such as `foo` and `fooModel`, or with the module's own, such as `openAPIEndpoint`.
- The OpenAPI document of the service cannot be loaded, or its types cannot be generated.

```ts
interface GeneratedTypes {
  entry: string
  fragments: Record<string, string>
}

interface GenerateTypesOptions {
  /** Directory a relative schema path resolves against. Defaults to the current working directory. */
  rootDir?: string
}

declare class GenerationError extends Error {}

declare function generateTypes(
  services: Record<string, ServiceOptions>,
  options?: GenerateTypesOptions
): Promise<GeneratedTypes>
```

## Generating One Document

To place the types of an OpenAPI document under a module name of your own, take the steps `generateTypes` takes one at a time: load the document, generate its types, and wrap them in a module declaration.

```ts
import {
  declareModule,
  EMPTY_DOCUMENT_TYPES,
  generateDocumentTypes,
  loadOpenAPIDocument,
} from 'apiful/openapi/generate'

let types: string
try {
  const document = await loadOpenAPIDocument('openapi/pet-store.yaml')
  types = generateDocumentTypes(document)
}
catch (error) {
  console.error('Failed to generate the Petstore types', error)
  types = EMPTY_DOCUMENT_TYPES
}

const declaration = declareModule('#api/pet-store', types)
```

- `loadOpenAPIDocument` accepts everything a service's [`schema`](/reference/define-apiful-config) does and bundles external `$ref`s into the document.
- `generateDocumentTypes` returns the `paths` and `components` types of a document – plus a `WithRequired` helper where a schema needs one – unindented. It is synchronous and reads nothing but the document.
- `EMPTY_DOCUMENT_TYPES` declares `paths` and `components` without members – a stand-in that keeps the code typed against a document compiling while that document fails to load.
- `declareModule` wraps the types in `declare module '<specifier>' { … }` and indents them.

```ts
type OpenAPIDocumentSource = string | URL | object | (() => Promise<object>)

interface LoadOpenAPIDocumentOptions {
  /** Directory a relative path, and the relative refs of an in-memory document, resolve against. Defaults to the current working directory. */
  rootDir?: string
}

declare function loadOpenAPIDocument(
  source: OpenAPIDocumentSource,
  options?: LoadOpenAPIDocumentOptions
): Promise<OpenAPIDocument>

declare function generateDocumentTypes(document: OpenAPIDocument): string

declare const EMPTY_DOCUMENT_TYPES: string

declare function declareModule(specifier: string, body: string): string
```

## `generateTypeHelpers`

Returns the [type helpers](/reference/openapi-type-helpers) of one service – `PetStore`, `PetStoreApiPaths`, `PetStoreApiMethods`, and `PetStoreModel` for the service `petStore` – built on the `paths` and `components` types you name. The helpers reference these two along with `OpenAPIEndpoint` and `OpenAPIPathMethods` without importing any of them, so the surrounding code brings all four into scope:

```ts
import { generateTypeHelpers } from 'apiful/openapi/generate'

const helpers = `
import type { OpenAPIEndpoint, OpenAPIPathMethods } from 'apiful/openapi'
import type { components as PetStoreComponents, paths as PetStorePaths } from '#api/pet-store'

${generateTypeHelpers('petStore', { paths: 'PetStorePaths', components: 'PetStoreComponents' })}
`
```

Helpers placed this way type `PetStore<…>` and the rest, but `createOpenAPIClient<'petStore'>` and `openAPIBuilder<'petStore'>` only accept a service the `OpenAPIServiceRepository` interface of `apiful/schema` lists – and only the entry from `generateTypes` adds to it. To type a client from `paths` you placed yourself, pass them as the second type argument:

```ts
import type { paths } from '#api/pet-store'
import { createOpenAPIClient } from 'apiful/openapi'

const petStore = createOpenAPIClient<never, paths>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
})
```

`openAPIBuilder<never, paths>()` types an extended client the same way.

```ts
interface TypeHelperIdentifiers {
  paths: string
  components: string
}

declare function generateTypeHelpers(
  serviceName: string,
  identifiers: TypeHelperIdentifiers
): string
```
