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

APIful requires Node 24 or later, and its types require TypeScript 5.9 or later – see [Install APIful](/guide/getting-started#install-apiful).

APIful reads each OpenAPI document from an `apiful.config.ts` rather than the command line. Each document belongs to a service with a name, and your imports and clients refer to it by that name:

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

`apiful generate` then replaces the openapi-typescript call:

::: code-group
  ```sh [openapi-typescript]
  npx openapi-typescript ./openapi/pet-store.yaml -o ./src/types/pet-store.d.ts
  ```
  ```sh [APIful]
  npx apiful generate
  ```
:::

`schema` takes a file path, a URL, a document object, or a function resolving to one. The command writes `apiful.d.ts` next to the configuration – commit it, and [run `--check` in CI](/guide/cli#keep-generated-types-current) to catch it going stale. `--outdir` [writes the entry and each fragment to a file of its own](/guide/cli#split-the-output-into-files).

The generator takes no options. Flags such as `--enum`, `--immutable`, or `--root-types` have no counterpart, and the output follows openapi-typescript's defaults, apart from the [differences](#where-the-generated-types-differ) listed at the end of this page.

## Import `paths` and `components` From `apiful/schema/<service>`

The fragment of each service is a module named after it, so an import changes its source and nothing else:

<!-- eslint-skip -->

```ts
import type { components, paths } from './types/pet-store' // [!code --]
import type { components, paths } from 'apiful/schema/petStore' // [!code ++]
```

`paths` keeps openapi-typescript's shape – `paths['/pet/{petId}']['get']['parameters']['path']` resolves as it did. The fragment exports no `operations`, `webhooks`, or `$defs` types.

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

`response` and `request` take no status code or media type – `request` unites the bodies of every media type the operation accepts, so the table indexes `operation` for the JSON body of `/pet` alone. [OpenAPI Type Helpers](/reference/openapi-type-helpers#core-type-properties) covers what each property resolves to, and the other helpers, such as `PetStoreApiPaths` for the union of every path.

## Declare Your Own Aliases Instead of `--root-types`

`--root-types` exported each component as a named type, such as `SchemaPet`. APIful has no counterpart – declare an alias for each one you use, in one module your code imports from:

```ts
import type { PetStoreModel } from 'apiful/schema'

export type Pet = PetStoreModel<'Pet'>
export type Category = PetStoreModel<'Category'>
```

## Create the Client

[`createOpenAPIClient`](/reference/create-openapi-client) takes the service name where openapi-fetch took the `paths` type:

::: code-group
  ```ts [openapi-fetch]
  import type { paths } from './types/pet-store'
  import createClient from 'openapi-fetch'

  const client = createClient<paths>({ baseUrl: 'https://petstore3.swagger.io/api/v3' })
  ```
  ```ts [APIful]
  import { createOpenAPIClient } from 'apiful/openapi'

  const petStore = createOpenAPIClient<'petStore'>({
    baseURL: 'https://petstore3.swagger.io/api/v3',
  })
  ```
:::

The options are ofetch's, so `baseUrl` becomes `baseURL`. A name that is not in your configuration fails to compile. For a client that also carries other extensions, chain the [OpenAPI extension](/extensions/openapi) onto `createClient` with `openAPIBuilder<'petStore'>()` instead – the types are the same.

## Call an Endpoint

The client is a function. The path comes first, the method moves into the options, and the parameters move up a level:

::: code-group
  ```ts [openapi-fetch]
  const { data } = await client.GET('/pet/{petId}', {
    params: {
      path: { petId: 1 }
    },
  })
  ```
  ```ts [APIful]
  const pet = await petStore('/pet/{petId}', {
    method: 'GET',
    path: { petId: 1 },
  })
  ```
:::

| openapi-fetch | APIful |
| --- | --- |
| `client.GET(path, …)` | `petStore(path, { method: 'GET', … })` |
| `params.path` | `path` |
| `params.query` | `query` |
| `params.header` | `headers` |
| `params.cookie` | No counterpart – set a `Cookie` header |
| `body` | `body` |
| `parseAs` | [`responseType`](#read-other-formats-with-responsetype) |
| `querySerializer` | [`onRequest` hook](/extensions/openapi#serialize-query-parameters) |
| `client.use(middleware)` | [ofetch hooks](#move-middleware-to-ofetch-hooks) |

`method` can be left out where the path declares `get`, and a body is typed from the operation – the OpenAPI extension covers [which options a call needs](/extensions/openapi#call-an-endpoint) and [how a body is sent](/extensions/openapi#send-a-request-body):

```ts
const pets = await petStore('/pet/findByStatus', {
  query: { status: 'available' },
})

const pet = await petStore('/pet', {
  method: 'POST',
  body: { name: 'Rex', photoUrls: [] },
})
```

## Catch Errors Instead of Reading `error`

openapi-fetch resolves a request to `{ data, error, response }`. An APIful client resolves to the body of the success response, and a 4xx or 5xx response throws a `FetchError` from ofetch, with the parsed body on `data`. `FetchResponseError` types that body from the OpenAPI document:

::: code-group
  ```ts [openapi-fetch]
  const { data, error } = await client.GET('/pet/{petId}', {
    params: {
      path: { petId: 1 }
    },
  })
  if (error) {
    // …
  }
  ```
  ```ts [APIful]
  import type { FetchResponseError } from 'apiful/openapi'
  import type { PetStore } from 'apiful/schema'

  try {
    const pet = await petStore('/pet/{petId}', {
      path: { petId: 1 }
    })
  }
  catch (caught) {
    const { status, data } = caught as FetchResponseError<PetStore<'/pet/{petId}', 'get'>['operation']>
  }
  ```
:::

For the error body on its own – what openapi-fetch typed as `error` – use `PetStore<'/pet/{petId}', 'get'>['error']`. The OpenAPI extension explains [the cast and the error types](/extensions/openapi#catch-error-responses).

## Move Middleware to ofetch Hooks

Hooks go into the client options rather than through `client.use()`, and run on every request. A hook mutates the request options in place rather than returning a new `Request`:

::: code-group
  ```ts [openapi-fetch]
  client.use({
    onRequest({ request }) {
      request.headers.set('Authorization', `Bearer ${getAuthToken()}`)
      return request
    },
  })
  ```
  ```ts [APIful]
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
:::

ofetch has four hooks: `onRequest`, `onRequestError`, `onResponse`, and `onResponseError`. A hook passed to a single call replaces the client's hook of the same name rather than running after it. [Authenticating Requests](/cookbook/authentication) builds a token refresh on them.

## Read Other Formats With `responseType`

`parseAs` becomes ofetch's `responseType`, and the return type [follows it](/extensions/openapi#type-non-json-responses):

```ts
const rawPet = await petStore('/pet/{petId}', {
//    ^? Blob
  path: { petId: 1 },
  responseType: 'blob',
})
```

## Where the Generated Types Differ

APIful starts from openapi-typescript's default output and changes the parts below. These three break code that compiled against openapi-typescript most often:

- A path item holds only the methods the path declares, without the other verbs set to `never` or a path-level `parameters` key. Path-level parameters are merged into each operation.
- A `format: binary` string, or one with a non-JSON `contentMediaType`, is `Blob | File`.
- A property with a `default` is optional unless the schema lists it as `required`, where openapi-typescript makes it required outside request bodies and parameters.

The other changes:

- An operation sits in `paths` itself rather than in a separate `operations` interface.
- A `multipart/form-data` request body is `FormData`, and an `application/x-www-form-urlencoded` one also accepts a `URLSearchParams` – [Send a Request Body](/extensions/openapi#send-a-request-body) explains why.
- A required query, header, or cookie parameter whose schema declares a `default` is optional. A path parameter stays required.
- A query parameter with `application/json` content and an object schema is typed as that schema – pass the object, and ofetch serializes it.
- OpenAPI 3.2 operations are typed: the `query` method, custom methods from `additionalOperations` under their lowercased name, and a `querystring` parameter as the type of the `query` object.
- `components` of an OpenAPI 3.2 document has a `mediaTypes` group, `never` where the document declares none.
- A discriminator child inlines the parent's members into its `Omit<…>` rather than referencing the parent.
- A `$ref` into a member of a schema that may be absent indexes through `NonNullable<…>`, and one to an optional property excludes `undefined`.
- An `anyOf` beside `properties` is intersected with them, as `oneOf` is, and a branch that only lists `required` keys makes those properties required.
- A schema of `type: null` beside a `oneOf` or `anyOf` is a union with `null`.
- A schema that contains itself as an array item without an object in between, such as a JSON value, types that array as `unknown[]` – openapi-typescript's output fails to compile there.
- A `prefixItems` tuple takes further elements of the `items` schema, or `unknown` without one, unless `items: false` or `maxItems` closes it.
- A schema's own `$defs` is optional.
