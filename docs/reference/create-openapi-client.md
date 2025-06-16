# `createOpenAPIClient`

Creates a type-safe OpenAPI client directly without using the APIful extension system. This is a lightweight alternative to using [`createClient`](/reference/create-client) with `OpenAPIBuilder` when you want to bypass the extensible API that APIful provides.

## When to Use

Use `createOpenAPIClient` when you:

- Want a direct, lightweight OpenAPI client
- Don not need the extensibility features of the main APIful client system
- Prefer a simpler API without the `.with()` extension pattern
- Want to avoid the additional abstraction layer

## Prerequisites

Same as the [`OpenAPIBuilder`](/extensions/openapi) extension:

::: code-group
  ```bash [pnpm]
  pnpm add -D openapi-typescript
  ```
  ```bash [yarn]
  yarn add -D openapi-typescript
  ```
  ```bash [npm]
  npm install -D openapi-typescript
  ```
:::

You also need to generate TypeScript definitions using the [`generate`](/guide/cli) command.

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

## Example

```ts
import { createOpenAPIClient } from 'apiful'

const petStore = createOpenAPIClient({
  baseURL: 'https://petstore3.swagger.io/api/v3',
})

const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

## Type Definition

```ts
declare function createOpenAPIClient<Paths>(
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
