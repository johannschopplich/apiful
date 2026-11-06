# `createOpenAPIClient`

Creates a type-safe OpenAPI client from a generated schema. This is the direct way to call an OpenAPI service, and the one to reach for by default.

Use [`createClient`](/reference/create-client) with [`openAPIBuilder`](/extensions/openapi) instead when the same client also has to carry other extensions. Both give you the same types from the same schema – the builder adds the `.with()` chain on top.

## Prerequisites

Same as the [`openAPIBuilder`](/extensions/openapi) extension – you need TypeScript definitions generated using the [`generate`](/guide/cli) command.

## Example

```ts
import { createOpenAPIClient } from 'apiful/openapi/client'

const petStore = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  headers: {
    Authorization: 'Bearer <token>',
  },
})

const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

## Type Definition

```ts
declare function createOpenAPIClient<
  Schema extends keyof OpenAPISchemaRepository,
  Paths = SchemaPaths<Schema>,
>(
  defaultOptions?: FetchOptions,
  factoryOptions?: ClientFactoryOptions
): OpenAPIClient<Paths>
```

`ClientFactoryOptions` is the same as for [`createClient`](/reference/create-client#type-definition).

> [!NOTE]
> `Schema` is the service name from your `apiful.config.ts` file, same as with `openAPIBuilder`. A name no service carries fails to compile. `Paths` is derived from it and is not meant to be passed.

## Error Responses

A 4xx or 5xx response throws, and [`FetchResponseError`](/extensions/openapi#error-responses) types the body the error carries – from the same schema, in the same way it works with `openAPIBuilder`.

## Options Resolved per Request

The default options are read once, when the client is created. For a value that changes between requests – a rotating token, for example – use ofetch's `onRequest` hook, which runs on every call. [Authenticating Requests](/cookbook/authentication) works this through, including refreshing after a `401`:

```ts
const client = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  onRequest({ options }) {
    options.headers.set('Authorization', `Bearer ${getAuthToken()}`)
  },
})
```

## Bringing Your Own Fetch

`createOpenAPIClient` builds its fetch function from `defaultOptions` with `ofetch.create`. To supply one yourself – an instance you already configured, or a stub in a test – pass it as `fetch`, the same option [`createClient`](/reference/create-client#supplying-your-own-fetch) takes:

```ts
import { createOpenAPIClient } from 'apiful/openapi/client'

const petStore = createOpenAPIClient<'petStore'>({}, { fetch: myFetch })
```

The client resolves the `path` parameters into the URL and passes every other option on to the fetch function unchanged. A fetch you supply owns its own options, so `defaultOptions` no longer reaches it.
