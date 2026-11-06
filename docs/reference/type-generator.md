# Type Generator

The [`generate`](/guide/cli) command is the type generator most projects need. Its building blocks are exported from `apiful/openapi/generate` for tools that write the types themselves – a framework module generating them on startup, for example. The subpath is Node.js only; the runtime client stays in `apiful/openapi`, which runs anywhere.

## `generateDeclarations`

Loads the schema of every service and returns the declarations the `generate` command writes: the `apiful/schema` entry with the type helpers, and one `apiful/schema/<id>` fragment per service.

```ts
import { generateDeclarations } from 'apiful/openapi/generate'

const { entry, fragments } = await generateDeclarations({
  petStore: { schema: 'openapi/pet-store.yaml' },
}, { rootDir: process.cwd() })
```

A schema that cannot be loaded rejects with a `SchemaGenerationError` naming the service, and so does a service whose name makes no valid identifier, such as `1password`, or whose type names collide with another service's, such as `foo` and `fooModel`, or with the module's own, such as `openAPIEndpoint`.

```ts
interface GeneratedDeclarations {
  entry: string
  fragments: Record<string, string>
}

declare function generateDeclarations(
  services: Record<string, ServiceOptions>,
  options?: { rootDir?: string }
): Promise<GeneratedDeclarations>
```

## Generating One Schema

To place the types of a schema under a module name of your own, take the steps `generateDeclarations` takes one at a time: load the document, generate its types, and wrap them in a module declaration.

```ts
import {
  declareModule,
  EMPTY_SCHEMA_TYPES,
  generateSchemaTypes,
  loadOpenAPIDocument,
} from 'apiful/openapi/generate'

let types: string
try {
  const document = await loadOpenAPIDocument('openapi/pet-store.yaml', { rootDir })
  types = generateSchemaTypes(document)
}
catch (error) {
  console.error('Failed to generate the Pet Store types', error)
  types = EMPTY_SCHEMA_TYPES
}

const declaration = declareModule('#api/pet-store', types)
```

- `loadOpenAPIDocument` accepts everything a service's [`schema`](/reference/define-apiful-config) does and bundles external `$ref`s into the document.
- `generateSchemaTypes` returns the `paths` and `components` types of a document, unindented. It is synchronous and reads nothing but the document.
- `EMPTY_SCHEMA_TYPES` declares `paths` and `components` without members – a stand-in that keeps the code typed against a schema compiling while that schema fails to load.
- `declareModule` wraps the types in `declare module '<specifier>' { … }` and indents them.

```ts
declare function loadOpenAPIDocument(
  source: string | URL | object | (() => Promise<object>),
  options?: { rootDir?: string }
): Promise<OpenAPIDocument>

declare function generateSchemaTypes(document: OpenAPIDocument): string

declare const EMPTY_SCHEMA_TYPES: string

declare function declareModule(specifier: string, body: string): string
```

## `generateTypeHelpers`

Returns the [type helpers](/reference/openapi-type-helpers) of one service – `PetStore`, `PetStoreApiPaths`, `PetStoreApiMethods` and `PetStoreModel` for the id `petStore` – built on the `paths` and `components` types you name. The helpers reference these two along with `OpenAPIEndpoint` and `OpenAPIPathMethods` without importing any of them, so the surrounding code brings all four into scope:

```ts
import { generateTypeHelpers } from 'apiful/openapi/generate'

const helpers = `
import type { OpenAPIEndpoint, OpenAPIPathMethods } from 'apiful/openapi'
import type { components as PetStoreComponents, paths as PetStorePaths } from '#api/pet-store'

${generateTypeHelpers('petStore', { paths: 'PetStorePaths', components: 'PetStoreComponents' })}
`
```

```ts
declare function generateTypeHelpers(
  id: string,
  identifiers: { paths: string, components: string }
): string
```
