# `createOpenAPIClient`

Creates a type-safe OpenAPI client from the types [`apiful generate`](/guide/cli) writes. This is the direct way to call an OpenAPI service, and the one to reach for by default.

Use [`createClient`](/reference/create-client) with [`openAPIBuilder`](/extensions/openapi) instead when the same client also has to carry other extensions. Both give you the same types from the same schema – the builder adds the `.with()` chain on top.

## Example

```ts
import { createOpenAPIClient } from 'apiful/openapi'

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

For a value that changes per request, such as a rotating token, see [Authenticating Requests](/cookbook/authentication).

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

## Supplying Your Own Fetch

`createOpenAPIClient` builds its fetch function from `defaultOptions` with `ofetch.create`. To supply one yourself – an instance you already configured, or a stub in a test – pass it as `fetch`:

```ts
import { createOpenAPIClient } from 'apiful/openapi'

const petStore = createOpenAPIClient<'petStore'>({}, { fetch: myFetch })
```

The client resolves the `path` parameters and passes every other option to your fetch unchanged – `defaultOptions` don't reach it, [as with `createClient`](/reference/create-client#supplying-your-own-fetch). A stub that receives an object body on a method other than `PATCH`, `POST`, `PUT`, and `DELETE`, such as OpenAPI 3.2's `QUERY`, also needs `create` and `native`: the client derives a body-serializing instance from it.
