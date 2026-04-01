# `createOpenAPIClient`

Creates a type-safe OpenAPI client directly without using the APIful extension system. This is a lightweight alternative to using [`createClient`](/reference/create-client) with `OpenAPIBuilder` when you want to bypass the extensible API that APIful provides.

## When to Use

Use `createOpenAPIClient` when you:

- Want a direct, lightweight OpenAPI client
- Don't need the extensibility features of the main APIful client system
- Prefer a simpler API without the `.with()` extension pattern
- Want to avoid the additional abstraction layer

## Prerequisites

Same as the [`OpenAPIBuilder`](/extensions/openapi#prerequisites) extension – you need `openapi-typescript` installed and TypeScript definitions generated using the [`generate`](/guide/cli) command.

## Example

```ts
import { createOpenAPIClient } from 'apiful/openapi/client'

// Create the client directly
const petStore = createOpenAPIClient<'petStore'>({
  baseURL: 'https://petstore3.swagger.io/api/v3',
  headers: {
    Authorization: 'Bearer <token>',
  },
})

// Use it like the OpenAPIBuilder extension
const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

## Comparison with `createClient` + `OpenAPIBuilder`

| Feature | `createOpenAPIClient` | `createClient` + `OpenAPIBuilder` |
|---------|----------------------|-----------------------------------|
| Extensibility | ❌ No extension system | ✅ Full extension support |
| Bundle size | ✅ Smaller footprint | ❌ Includes extension system |
| Type safety | ✅ Full OpenAPI types | ✅ Full OpenAPI types |
| API complexity | ✅ Simple, direct API | ❌ More complex setup |
| Customization | ❌ Limited to fetch options | ✅ Unlimited via extensions |

## Type Definition

```ts
declare function createOpenAPIClient<
  const Schema extends string,
  Paths = SchemaPaths<Schema>,
>(
  defaultOptions?: FetchOptions | (() => FetchOptions)
): OpenAPIClient<Paths>
```

> [!NOTE]
> The generic `Paths` parameter should be the service name from your `apiful.config.ts` file, same as with `OpenAPIBuilder`.

## Dynamic Options

You can also provide a function that returns options, useful for dynamic configuration:

```ts
const client = createOpenAPIClient<'petStore'>(() => ({
  baseURL: process.env.API_BASE_URL,
  headers: {
    Authorization: `Bearer ${getAuthToken()}`,
  },
}))
```
