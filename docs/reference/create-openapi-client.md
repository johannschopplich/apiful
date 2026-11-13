# `createOpenAPIClient`

Creates a client for one service from the generated types [`apiful generate`](/guide/cli) writes. This is the direct way to call an OpenAPI service, and the one to reach for unless the client also carries other extensions – see [Create the Client](/extensions/openapi#create-the-client).

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

A 4xx or 5xx response throws, and [`FetchResponseError`](/extensions/openapi#catch-error-responses) types the body the error carries – from the same OpenAPI document, in the same way it works with `openAPIBuilder`.

## Type Definition

```ts
declare function createOpenAPIClient<
  Service extends keyof OpenAPIServiceRepository,
  Paths = ServicePaths<Service>,
>(
  defaultOptions?: FetchOptions,
  factoryOptions?: ClientFactoryOptions
): OpenAPIClient<Paths>
```

`ClientFactoryOptions` is the same as for [`createClient`](/reference/create-client#type-definition).

> [!NOTE]
> `Service` is the service name from your `apiful.config.ts` file, same as with `openAPIBuilder`. A name no service carries fails to compile. `Paths` is derived from it, and is passed only for [`paths` you placed yourself](/reference/type-generator#generatetypehelpers).

## Supplying Your Own Fetch

`createOpenAPIClient` builds its fetch function from `defaultOptions` with `ofetch.create`. To supply one yourself – an instance you already configured, or a stub in a test – pass it as `fetch`:

```ts
import { createOpenAPIClient } from 'apiful/openapi'

const petStore = createOpenAPIClient<'petStore'>({}, { fetch: myFetch })
```

The client resolves the `path` parameters and passes every other option to your fetch unchanged – `defaultOptions` do not reach it, [as with `createClient`](/reference/create-client#supplying-your-own-fetch). The exception is an object body on a method such as `QUERY`, which the client [sends as JSON](/extensions/openapi#send-a-request-body) through an instance it derives with your fetch's `create` and `native` – a stub called that way needs both.
