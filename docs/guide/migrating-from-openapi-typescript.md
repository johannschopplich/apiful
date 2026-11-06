---
title: Migrating From openapi-typescript and openapi-fetch
description: Move from openapi-typescript and openapi-fetch to APIful – generate paths and components with apiful generate, call endpoints through ofetch, and catch typed errors.
outline: deep
---

# Migrating From openapi-typescript and openapi-fetch

APIful replaces both packages: [`apiful generate`](/guide/cli) writes `paths` and `components` interfaces in openapi-typescript's shape, and a client typed from them calls your API through [ofetch](https://github.com/unjs/ofetch). Type code built on `paths` carries over. The calls change shape, and a failed request throws instead of returning an `error`.

## Generate the Types With `apiful generate`

Install APIful, and remove `openapi-typescript` and `openapi-fetch` once nothing imports them anymore:

::: code-group
  ```bash [pnpm]
  pnpm add apiful
  pnpm remove openapi-typescript openapi-fetch
  ```
  ```bash [yarn]
  yarn add apiful
  yarn remove openapi-typescript openapi-fetch
  ```
  ```bash [npm]
  npm install apiful
  npm uninstall openapi-typescript openapi-fetch
  ```
:::

APIful supports Node 24 or later, and its types require TypeScript 5.9 or later.

APIful reads its schemas from an `apiful.config.ts` rather than the command line. Each one is a service with a name, and your imports and clients refer to it by that name:

```sh
# Before
npx openapi-typescript ./openapi/pet-store.yaml -o ./src/types/pet-store.d.ts
```

```ts
// apiful.config.ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    petStore: {
      schema: './openapi/pet-store.yaml',
    },
  },
})
```

```sh
# After
npx apiful generate
```

`schema` takes a file path, a URL, a document object, or a function resolving to one. The command writes `apiful.d.ts` next to the configuration – commit it, and run `apiful generate --check` in CI to catch a schema change that landed without it. The [CLI guide](/guide/cli) covers both, and how to split the output into one file per service.

The generator takes no options. Flags such as `--enum`, `--immutable` or `--root-types` have no counterpart, and the output follows openapi-typescript's defaults, apart from the [differences](#where-the-generated-types-differ) listed at the end of this page.

### Generate With TypeScript 7 Installed

openapi-typescript builds its output through the compiler API of the `typescript` package. `apiful generate` writes its output as text and never loads `typescript`, so it runs the same whether TypeScript 5.9, 6.0 or 7.0 is installed. The generated types, and the ones APIful ships, type-check with all three.

## Import `paths` and `components` From `apiful/schema/<id>`

Each service's types live in a module named after it, so imports change their source and nothing else:

```ts
// Before
import type { components, paths } from './types/pet-store'
```

```ts
// After
import type { components, paths } from 'apiful/schema/petStore'
```

`paths` keeps openapi-typescript's shape – `paths['/pet/{petId}']['get']['parameters']['path']` resolves as it did. The generated module exports no `operations`, `webhooks` or `$defs` types.

## Reach for the Type Helpers

`apiful/schema` exports a set of helpers per service, named after it, that shorten the lookups you wrote against `paths`:

| openapi-typescript | APIful |
| --- | --- |
| `components['schemas']['Pet']` | `PetStoreModel<'Pet'>` |
| `paths['/pet/{petId}']['get']['parameters']['path']` | `PetStore<'/pet/{petId}', 'get'>['path']` |
| `paths['/pet/findByStatus']['get']['parameters']['query']` | `PetStore<'/pet/findByStatus', 'get'>['query']` |
| `paths['/pet']['post']['requestBody']['content']['application/json']` | `PetStore<'/pet', 'post'>['operation']['requestBody']['content']['application/json']` |
| `paths['/pet/{petId}']['get']['responses'][200]['content']['application/json']` | `PetStore<'/pet/{petId}', 'get'>['response']` |
| `operations['getPetById']` | `PetStore<'/pet/{petId}', 'get'>['operation']` |

`response` is the body of whichever media type and 2xx status the operation declares, so it needs no status code or content type. `request` is likewise the union of the bodies of every media type the operation accepts – index `operation` by its media type for one alone, as the table does for `/pet`. [OpenAPI Type Helpers](/reference/openapi-type-helpers) covers the rest, such as `PetStoreApiPaths` for the union of every path.

## Declare Your Own Aliases Instead of `--root-types`

`--root-types` exported each component as a named type, such as `SchemaPet`. APIful has no counterpart – declare an alias for each one you use, in one module your code imports from:

```ts
import type { PetStoreModel } from 'apiful/schema'

export type Pet = PetStoreModel<'Pet'>
export type Category = PetStoreModel<'Category'>
```

## Create the Client

[`createOpenAPIClient`](/reference/create-openapi-client) takes the service name where openapi-fetch took the `paths` type:

```ts
// Before
import type { paths } from './types/pet-store'
import createClient from 'openapi-fetch'

const client = createClient<paths>({ baseUrl: 'https://petstore3.swagger.io/api/v3' })
```

```ts
// After
import { createOpenAPIClient } from 'apiful/openapi'

const petStore = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
})
```

The options are ofetch's, so `baseUrl` becomes `baseURL`. A name that is not in your configuration fails to compile. For a client that also carries other extensions, add [`openAPIBuilder`](/extensions/openapi) to `createClient` instead – the types are the same.

## Call an Endpoint

The client is a function. The path comes first, the method moves into the options, and the parameters move up a level:

```ts
// Before
const { data } = await client.GET('/pet/{petId}', {
  params: { path: { petId: 1 } },
})
```

```ts
// After
const pet = await petStore('/pet/{petId}', {
  method: 'GET',
  path: { petId: 1 },
})
```

| openapi-fetch | APIful |
| --- | --- |
| `client.GET(path, …)` | `petStore(path, { method: 'GET', … })` |
| `params.path` | `path` |
| `params.query` | `query` |
| `params.header` | `headers` |
| `params.cookie` | No counterpart – set a `Cookie` header |
| `body` | `body` |
| `parseAs` | [`responseType`](#read-other-formats-with-responsetype) |
| `querySerializer` | [`onRequest` hook](#serialize-query-parameters-in-onrequest) |
| `client.use(middleware)` | [ofetch hooks](#move-middleware-to-ofetch-hooks) |

`method` is optional where the path declares `get`, and leaving it out types the call as a `GET`. It takes the verb in either case, `'POST'` or `'post'`. A request body is typed from the operation and serialized to JSON by ofetch:

```ts
const pets = await petStore('/pet/findByStatus', {
  query: { status: 'available' },
})

const pet = await petStore('/pet', {
  method: 'POST',
  body: { name: 'Rex', photoUrls: [] },
})
```

A `multipart/form-data` body also accepts a `FormData`, which ofetch sends as is.

## Catch Errors Instead of Reading `error`

openapi-fetch resolves a request to `{ data, error, response }`. An APIful client resolves to the body of the success response, and a 4xx or 5xx response throws a `FetchError` from ofetch, with the parsed body on `data`. `FetchResponseError` types that body from the schema:

```ts
// Before
const { data, error } = await client.GET('/pet/{petId}', {
  params: { path: { petId: 1 } },
})
if (error) {
  // …
}
```

```ts
// After
import type { FetchResponseError } from 'apiful/openapi'
import type { PetStore } from 'apiful/schema'

try {
  const pet = await petStore('/pet/{petId}', { path: { petId: 1 } })
}
catch (caught) {
  const { status, data } = caught as FetchResponseError<PetStore<'/pet/{petId}', 'get'>['operation']>
}
```

The cast is unavoidable: TypeScript types a `catch` binding as `unknown`, and a network failure throws without a response. For the error body on its own – what openapi-fetch typed as `error` – use `PetStore<'/pet/{petId}', 'get'>['error']`, the union of the bodies of every 4xx, 5xx, and `default` response the operation declares.

## Move Middleware to ofetch Hooks

openapi-fetch middleware becomes ofetch hooks in the client options, which run on every request. A hook mutates the request options in place rather than returning a new `Request`:

```ts
// Before
client.use({
  onRequest({ request }) {
    request.headers.set('Authorization', `Bearer ${getAuthToken()}`)
    return request
  },
})
```

```ts
// After
const petStore = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  onRequest({ options }) {
    options.headers.set('Authorization', `Bearer ${getAuthToken()}`)
  },
  onResponseError({ response }) {
    console.error(response.status, response._data)
  },
})
```

ofetch has four hooks: `onRequest`, `onRequestError`, `onResponse` and `onResponseError`. A hook passed to a single call replaces the client's hook of the same name rather than running after it. [Authenticating Requests](/cookbook/authentication) builds a token refresh on them.

## Serialize Query Parameters in `onRequest`

ofetch writes `query` into the URL itself: an array repeats its key, as in `?tags=tag1&tags=tag2` – OpenAPI's default `style: form` with `explode: true` – and an object is serialized to JSON. For any other style, which openapi-fetch configured through `querySerializer`, rewrite `options.query` in an `onRequest` hook, which runs before ofetch builds the URL. This hook sends `tags` comma-separated, as a parameter declared with `explode: false` expects:

```ts
const petStore = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  onRequest({ options }) {
    const { tags } = options.query ?? {}
    if (Array.isArray(tags))
      options.query = { ...options.query, tags: tags.join(',') }
  },
})

// GET https://petstore3.swagger.io/api/v3/pet/findByTags?tags=tag1,tag2
const pets = await petStore('/pet/findByTags', {
  query: { tags: ['tag1', 'tag2'] },
})
```

The call keeps its type – `tags` is still the `string[]` the schema declares.

## Read Other Formats With `responseType`

`parseAs` becomes ofetch's `responseType`, and the return type follows it – `Blob` for `blob`, `string` for `text`, `ArrayBuffer` for `arrayBuffer`, and `ReadableStream<Uint8Array>` for `stream`:

```ts
const rawPet = await petStore('/pet/{petId}', {
  path: { petId: 1 },
  responseType: 'blob',
})
// ^? Blob
```

## Where the Generated Types Differ

APIful starts from openapi-typescript's default output and changes the parts below:

- A path item holds only the methods the path declares, without the other verbs set to `never` or a path-level `parameters` key. Path-level parameters are merged into each operation.
- An operation sits in `paths` itself rather than in a separate `operations` interface.
- A `format: binary` string, or one with a non-JSON `contentMediaType`, is `Blob | File`, and a `multipart/form-data` body also accepts a `FormData`.
- A required query, header, or cookie parameter whose schema declares a `default` is optional. A path parameter stays required.
- A property with a `default` is optional unless the schema lists it as `required`, where openapi-typescript makes it required outside request bodies and parameters.
- A query parameter with `application/json` content and an object schema is typed as that schema – pass the object, and ofetch serializes it.
- OpenAPI 3.2 operations are typed: the `query` method, custom methods from `additionalOperations` under their lowercased name, and a `querystring` parameter as the type of the `query` object.
