# `openAPIBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) that wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

This extension types your requests from an OpenAPI schema: the paths your API declares, the methods each one allows, request bodies, query parameters, headers, and the response you get back. The checking is entirely compile time – the generated types add nothing to your bundle, and nothing validates a request once it leaves your code.

> [!TIP]
> Reach for this extension when the client also carries other extensions. For a client that only talks to one OpenAPI service, [`createOpenAPIClient`](/reference/create-openapi-client) is the shorter road to the same types.

## Generating the Types

Declare your services in an `apiful.config.ts` and run [`apiful generate`](/guide/cli). This one declares the [Swagger Petstore](https://petstore3.swagger.io) as the `petStore` service:

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

```sh
npx apiful generate
```

The command writes `apiful.d.ts`, which adds the `petStore` service to the `apiful/schema` module.

> [!IMPORTANT]
> Your `tsconfig.json` has to include `apiful.d.ts`. Without it, TypeScript knows no service, and `openAPIBuilder<'petStore'>()` fails to compile.

> [!TIP]
> Run `apiful generate --check` in CI so a schema change cannot land without its types – see [Keeping Generated Types Current](/guide/cli#keeping-generated-types-current).

## Creating the Client

Pass the service name to `openAPIBuilder`:

```ts
import { createClient, openAPIBuilder } from 'apiful'

const petStore = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(openAPIBuilder<'petStore'>())
```

## Calling an Endpoint

The path comes first, and the options carry the method and the parameters. This call fetches a user by username:

```ts
const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

The response is typed from the schema:

```ts
declare const userResponse: {
  id?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phone?: string
  userStatus?: number
}
```

`method` is optional where the path declares `get`, and leaving it out types the call as a `GET`. It takes the verb in either case, `'POST'` or `'post'`. Where the operation requires an option – a path parameter, a required query parameter, a request body, or the `method` of a path without `get` – the options argument is required, too.

## Sending a Request Body

The body is typed from the operation:

```ts
const pet = await petStore('/pet', {
  method: 'POST',
  body: { name: 'Rex', photoUrls: [] },
})
```

ofetch serializes an object body to JSON for `PATCH`, `POST`, `PUT`, and `DELETE`, and the client does the same for every other method, such as OpenAPI 3.2's `QUERY`. Two media types take other values:

- A `multipart/form-data` body is typed as `FormData`, since a plain object would be sent as JSON.
- An `application/x-www-form-urlencoded` body takes its schema's object or a `URLSearchParams`. ofetch form-encodes the object once the request sets that content type in `headers`.

## Path Parameters

Pass the declared path, `/pet/{petId}`, and its parameters as `path` – the client interpolates them. A literal `/pet/10` is not a declared path and fails to compile.

```ts
const pet = await petStore('/pet/{petId}', {
  path: { petId: 10 },
})
```

Each value is URL-encoded, and a value of `.` or `..` for a parameter that fills a whole path segment makes the call reject, since it would resolve the URL to another path. Nothing else is checked at runtime – a parameter missing from `path` leaves its placeholder in the URL.

## Serializing Query Parameters

ofetch writes `query` into the URL itself: an array repeats its key, as in `?tags=tag1&tags=tag2` – OpenAPI's default `style: form` with `explode: true` – and an object is serialized to JSON. For any other style, rewrite `options.query` in an `onRequest` hook, which runs before ofetch builds the URL. This hook sends `tags` comma-separated, as a parameter declared with `explode: false` expects:

```ts
import { createClient, openAPIBuilder } from 'apiful'

const petStore = createClient({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  onRequest({ options }) {
    const { tags } = options.query ?? {}
    if (Array.isArray(tags)) {
      options.query = {
        ...options.query,
        tags: tags.join(',')
      }
    }
  },
})
  .with(openAPIBuilder<'petStore'>())

// GET https://petstore3.swagger.io/api/v3/pet/findByTags?tags=tag1,tag2
const pets = await petStore('/pet/findByTags', {
  query: {
    tags: ['tag1', 'tag2']
  },
})
```

The call keeps its type – `tags` is still the `string[]` the schema declares.

## Request Headers

`headers` takes the header parameters the operation declares, typed from the schema, or any other `HeadersInit`. It is always optional, even where the schema marks a header parameter as required:

```ts
await petStore('/pet/{petId}', {
  method: 'DELETE',
  path: { petId: 1 },
  headers: { api_key: '<key>' },
})
```

## Typing Non-JSON Responses

A `responseType` other than `json` swaps the schema type for the one ofetch hands back – `Blob` for `blob`, `string` for `text`, `ArrayBuffer` for `arrayBuffer`, and `ReadableStream<Uint8Array>` for `stream`:

```ts
const rawUser = await petStore('/user/{username}', {
  path: { username: 'user1' },
  responseType: 'blob',
})
// ^? Blob
```

## Error Responses

A 4xx or 5xx response throws, the same as with any ofetch client. The thrown error carries the parsed body on `data`, and `FetchResponseError` types that body from the schema the request was typed against:

```ts
import type { FetchResponseError } from 'apiful/openapi'
import type { PetStore } from 'apiful/schema'

type PetError = FetchResponseError<PetStore<'/pet/{petId}', 'get'>['operation']>

try {
  const pet = await petStore('/pet/{petId}', {
    path: { petId: 1 }
  })
}
catch (caught) {
  const { status, data } = caught as PetError
}
```

The cast is unavoidable: TypeScript types a `catch` binding as `unknown`, and no schema can promise what a network failure throws.

`data` comes from the response bodies the schema declares for the operation's error statuses. Where a schema names a status but gives it no content – as the Petstore does throughout – `data` is `undefined`, and the status code is all you get. For the error body on its own, use `PetStore<'/pet/{petId}', 'get'>['error']` – the union of the bodies of every 4xx, 5xx, and `default` response the operation declares.
