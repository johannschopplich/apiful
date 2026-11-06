---
outline: deep
---

# Migration

What each breaking change asks of you, grouped by how it reaches you: code that no longer does what it did, behavior that changed underneath it, and types that now catch what they let through before.

## From v5 to v6

### Code You Have to Change

#### Node 24 and TypeScript 5.9 Are Required

APIful now requires Node 24 or later, and its types require TypeScript 5.9 or later.

#### Regenerate Your Types

APIful generates the types itself now, without openapi-typescript, and the output differs from what v5 wrote. Run [`apiful generate`](/guide/cli) once you have upgraded and commit the result – until you do, `--check` reports the file as out of date.

Remove `openapi-typescript` and `json-schema-to-typescript-lite` from your dependencies afterwards. APIful loads neither.

#### `OpenAPIBuilder` Is Now `openAPIBuilder`

The builder is now spelled like `ofetchBuilder` and `apiRouterBuilder`:

```ts
// Before
import { createClient, OpenAPIBuilder } from 'apiful'

const petStore = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(OpenAPIBuilder<'petStore'>())
```

```ts
// After
import { createClient, openAPIBuilder } from 'apiful'

const petStore = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(openAPIBuilder<'petStore'>())
```

#### The Configuration Is an ES Module

The CLI imports `apiful.config.{ts,mts,js,mjs}` with Node's native `import()` instead of loading it through c12. What c12 added on top goes with it:

- `.cjs`, `.json` and `.json5` files are no longer read. Move the configuration into an `apiful.config.ts` with a default export.
- There is no environment variable substitution. Read `process.env` in the module instead.
- A TypeScript configuration may only use erasable syntax – no `enum`s, no parameter properties – and a relative import names its file extension, such as `./services.ts`.

#### The `openAPITS` Option Is Gone

The service option that passed settings on to openapi-typescript is removed, and so is the `OpenAPITSOptions` type. The generator takes no options, so delete the key. If you set `rootTypes`, the next section replaces it.

#### Name Your Schema Types Yourself

Each `apiful/schema/<id>` module exports `paths` and `components`, and nothing else. The named schema types `rootTypes` generated are gone, and so are the `operations`, `webhooks` and `$defs` types. Declare an alias for each type you use, through the helpers `apiful/schema` exports for the service:

```ts
import type { PetStore, PetStoreModel } from 'apiful/schema'

// Before: `SchemaPet` from 'apiful/schema/petStore'
export type Pet = PetStoreModel<'Pet'>

// Before: `operations['getPetById']` from 'apiful/schema/petStore'
export type GetPetById = PetStore<'/pet/{petId}', 'get'>['operation']
```

#### Pass JSON Query Parameters as Objects

A query parameter declared with `application/json` content and an object schema used to be typed as `string`, so you serialized it yourself. It is now typed as its schema, and ofetch serializes the object to JSON when it builds the URL. A `JSON.stringify` left in place no longer compiles:

```ts
// Before
await catalog('/items', { query: { filter: JSON.stringify({ name: 'lamp' }) } })

// After
await catalog('/items', { query: { filter: { name: 'lamp' } } })
```

A JSON parameter with an array or primitive schema stays `string`. An object schema with an empty `properties` admits no keys, as it does anywhere else, so its parameter is `Record<string, never>`. Where a type of your own mirrors a parameter with an object schema as `string`, type it as the object, too.

#### Import From the Remaining Entry Points

Three subpaths are gone, and the type generator moved to a subpath of its own, since it runs on Node.js only:

| v5 | v6 |
| --- | --- |
| `apiful/extensions` | `apiful` |
| `apiful/openapi/client` | `apiful/openapi` |
| `apiful/openapi/types` | `apiful/openapi` |
| Generator exports of `apiful/openapi` | `apiful/openapi/generate` |

The generator exports were renamed on the way – see [Renamed and Removed Exports](#renamed-and-removed-exports).

#### The Validation Utilities Are Gone

`apiful/utils` no longer exports `jsonSchema`, `validator`, `validateTypes`, `safeValidateTypes`, `isSchema`, `isValidator` or `TypeValidationError`. No part of the client used them. Validate with a dedicated library instead, such as [Ajv](https://ajv.js.org) for JSON Schema.

#### `jsonToTypeDefinition` Returns a String

[`jsonToTypeDefinition`](/utilities/json-to-type-definition) is synchronous now and returns the definition itself rather than a promise. A `.then()` on the result no longer compiles, and an `await` can go. The output changed with it: members end in semicolons, and the `/* eslint-disable */` header is gone.

#### HTTP Status Constants Follow RFC 9110

The [status codes](/utilities/http-status-codes) and [phrases](/utilities/http-status-phrases) are generated from the IANA registry now, so five constants take the name RFC 9110 gives their code:

| v5 | v6 |
| --- | --- |
| `MOVED_TEMPORARILY` | `FOUND` |
| `REQUEST_TOO_LONG` | `CONTENT_TOO_LARGE` |
| `REQUEST_URI_TOO_LONG` | `URI_TOO_LONG` |
| `REQUESTED_RANGE_NOT_SATISFIABLE` | `RANGE_NOT_SATISFIABLE` |
| `UNPROCESSABLE_ENTITY` | `UNPROCESSABLE_CONTENT` |

The phrases of these five follow their names, and `NON_AUTHORITATIVE_INFORMATION` reads `'Non-Authoritative Information'`. `IM_A_TEAPOT` (`418`), `INSUFFICIENT_SPACE_ON_RESOURCE` (`419`) and `METHOD_FAILURE` (`420`) are gone, since the registry marks `418` unused and assigns neither `419` nor `420`. `ALREADY_REPORTED`, `IM_USED`, `TOO_EARLY`, `VARIANT_ALSO_NEGOTIATES`, `LOOP_DETECTED` and `NOT_EXTENDED` are new.

### Behavior That Changed

#### The Generated Types Follow More of the Schema

The new generator types three things differently from v5 – the [openapi-typescript migration guide](/guide/migrating-from-openapi-typescript) compares its output with openapi-typescript's in full:

- A `format: binary` string, or one with a non-JSON `contentMediaType`, is `Blob | File`, and a `multipart/form-data` body also accepts a `FormData`.
- A required query, header, or cookie parameter whose schema declares a `default` is optional, since the server falls back to it. A path parameter stays required.
- OpenAPI 3.2 operations are typed: the `query` method, custom methods from `additionalOperations` under their lowercased name, and a `querystring` parameter as the type of the whole `query` object.

#### Every 2xx Status Counts as Success

`response` is the body of any 2xx status the operation declares, `205`, `208` and `226` included. The `error` type, and the `data` a thrown error carries, cover every 4xx and 5xx status the operation declares and `default`, where v5 left out codes missing from its fixed list, such as `419` and `509`.

#### An Object Body Is Sent as JSON for Every Method

ofetch serializes an object `body` only for `PATCH`, `POST`, `PUT` and `DELETE`, so v5 sent one on any other method – `QUERY`, `SEARCH`, or a custom method – as `[object Object]`. The OpenAPI client now serializes it as JSON for every method and sets `content-type` and `accept` to `application/json` where you have not set them. A `JSON.stringify` with a hand-set `content-type` can go:

```ts
// Before
await catalog('/items', {
  method: 'QUERY',
  body: JSON.stringify({ name: 'lamp' }),
  headers: { 'content-type': 'application/json' },
})

// After
await catalog('/items', { method: 'QUERY', body: { name: 'lamp' } })
```

### Types That Are Now Stricter

#### An Unknown Service Name Fails to Compile

A service name that is not in your configuration used to give a client typed against an empty schema. It is now a compile error:

```ts
createOpenAPIClient<'petStroe'>()
//                  ^^^^^^^^^^ v6: does not compile, no service is named `petStroe`
```

#### A Handler Extension Replaces the Previous One

Adding a second handler extension replaced the first at runtime, but the type kept both call signatures – so after `.with(ofetchBuilder()).with(openAPIBuilder<'petStore'>())`, a path the schema does not declare still compiled. The type now carries the latest handler only, as the runtime does.

#### Path Items Hold Only Their Methods

A generated path item used to list all eight HTTP verbs, setting the undeclared ones to `never`, plus a path-level `parameters` key. It now holds the methods the path declares and nothing else, so indexing a missing one fails:

```ts
import type { paths } from 'apiful/schema/petStore'

type PetMethods = keyof paths['/pet']
//   ^? v5: 'parameters' | 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'
//   ^? v6: 'put' | 'post'
```

Path-level parameters are merged into every operation of the path, as before.

#### The Response Follows `responseType`

A call with a `responseType` other than `json` used to be typed as the schema's JSON body. It is now typed as what ofetch returns – `Blob` for `blob`, `string` for `text`, `ArrayBuffer` for `arrayBuffer`, and `ReadableStream<Uint8Array>` for `stream`.

### Renamed and Removed Exports

Only relevant if you call the generator from your own code or build on the client types. The generator exports now come from `apiful/openapi/generate`, which the [Type Generator](/reference/type-generator) reference covers:

| v5 | v6 |
| --- | --- |
| `generateDTSFragments` | `generateDeclarations` |
| `DTSFragmentOutput` | `GeneratedDeclarations` |
| `GenerateOptions` | `GenerateDeclarationsOptions` |
| `generateDTS`, `joinDTSFragments` | Removed – write `entry` and `fragments` yourself |
| `generateSchemaTypes({ id, service, rootDir })` | `generateSchemaTypes(await loadOpenAPIDocument(schema, { rootDir }))`, synchronous |
| `generateTypeHelpers(id)` | `generateTypeHelpers(id, { paths, components })` |
| `OpenAPI3` | `OpenAPIDocument` |
| `createOpenAPIHandler(fetch)` | `createOpenAPIClient(defaultOptions, { fetch })` |
| `ClientOptions` | `FetchOptions` from ofetch |
| `createClient<BaseURL>()` | `createClient()` |
| `ApiClient<BaseURL>` | `ApiClient<Handler, Methods>`, without `_handler` and `_extensions` |
| `OpenAPIFetchOptions`, `FilterMethods` | Removed |

## From v4 to v5

### Code You Have to Change

#### Extending a Client Returns a New One

`with` used to write the extension into the client you called it on, so throwing its return value away still worked. Each call now leaves its receiver as it was and hands you the extended client, which is the one you have to keep:

```ts
import { createClient, ofetchBuilder } from 'apiful'

// Before – the extension landed on `client`, the return value was optional
const client = createClient({ baseURL: 'https://api.example.com' })
client.with(ofetchBuilder())

// After – the client that can make requests is the one `with` returns
const client = createClient({ baseURL: 'https://api.example.com' })
  .with(ofetchBuilder())
```

Written as one chain, which is how the documentation has always shown it, nothing changes. Written as separate statements, the client you kept has no handler, and calling it throws.

#### Every Service Needs a `schema`

`schema` is now required. A service without one has nothing to generate from, so it was never more than a placeholder:

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

Give every service a schema, or drop it from the configuration. In a TypeScript configuration file this is a type error. In a JavaScript or JSON one it surfaces when you run [`apiful generate`](/guide/cli), which names the services it skips and generates the rest.

The `url` option is gone from the same type. Nothing ever read it, so delete the key if you have one.

### Behavior That Changed

#### A Client Without a Handler Throws

Calling a client that has no handler extension used to return `undefined`, which looked like a request that came back empty. It now throws:

```
TypeError: This client cannot make requests. Add a handler extension, such as `createClient().with(ofetchBuilder())`.
```

Add one of the [built-in extensions](/extensions/), or [write your own](/guide/custom-extensions).

#### An Unreadable Schema Fails the Run

A schema the generator could not read or parse used to be logged, after which the run carried on and emitted an empty stub for that service – leaving you with a client that compiled and was silently untyped. The run now stops:

```
Failed to generate types for service `petStore` – …
```

[`apiful generate`](/guide/cli) exits with code `1` and writes no types. Calling the generator from your own code, the same failure arrives as a `SchemaGenerationError`.

### Types That Are Now Stricter

These changes touch no runtime behavior. They reach you as compile errors in code that was already asking for something the schema does not offer, and as narrower types where the old ones guessed.

#### Only the Methods a Path Declares

A path used to offer all eight HTTP verbs. Only the ones it declares are listed now:

```ts
import type { PetStore, PetStoreApiMethods } from 'apiful/schema'

type PetMethods = PetStoreApiMethods<'/pet'>
//   ^? v4: 'get' | 'post' | 'put'
//   ^? v5: 'post' | 'put'

type Endpoint = PetStore<'/pet', 'get'>
//              ^^^^^^^^^^^^^^^^^^^^^^ v5: does not compile, the Petstore declares no `get` on `/pet`
```

Where this bites, the schema is the place to look: the method you were reaching for is not in it.

#### Request and Response Resolve the Way the Client Does

`request` and `response` used to be hardcoded to `application/json` and to status `200`. They now resolve through the same helpers a call resolves through, so what the type says and what a request hands back cannot drift apart. Three things follow from that:

**A status with no body is `undefined`, not an empty object.**

```ts
type PetNotFound = PetStore<'/pet/{petId}', 'get'>['responses'][404]
//   ^? v4: Record<string, never>
//   ^? v5: undefined
```

**`response` is whichever 2xx status and media type the operation declares**, rather than always `200` and always JSON. An operation whose success carries no body resolves to `never`.

**An optional request body comes back widened with `undefined`**, matching what the client accepts:

```ts
type PlaceOrderBody = PetStore<'/store/order', 'post'>['request']
//   ^? v4: Order
//   ^? v5: Order | undefined
```

Parameters follow the same rule: `path` and `query` are `never` for an operation that declares none, where v4 offered an empty object you could pass around. See [OpenAPI Type Helpers](/reference/openapi-type-helpers) for the full set.

### Renamed Exports

Only relevant if you call the generator from your own code instead of through the CLI:

| v4 | v5 |
| --- | --- |
| `generateDTSModules` | `generateDTSFragments` |
| `joinDTSModules` | `joinDTSFragments` |
| `DTSModuleOutput` | `DTSFragmentOutput` |
| `DTSModuleOutput['modules']` | `DTSFragmentOutput['fragments']` |
