# Getting Started

## Installation

Get started by installing `apiful` in your project:

::: code-group
  ```bash [pnpm]
  pnpm add -D apiful
  ```
  ```bash [yarn]
  yarn add -D apiful
  ```
  ```bash [npm]
  npm install -D apiful
  ```
:::

## What Is This?

`apiful` provides a unified way to manage all your API interactions by setting up a client with default fetch options, such as the API base URL and headers. Adapters extend the client with a variety of features to match your favorite API management flavor.

You can use one of the pre-built adapters to get started quickly, or create your own custom adapter to meet your specific requirements.

### `ofetch` Adapter

The `ofetch` adapter wraps [ofetch](https://github.com/unjs/ofetch) to handle API calls:

```ts
import { createClient, ofetch } from 'apiful'

const baseURL = '<your-api-base-url>'
const adapter = ofetch()
const api = createClient({ baseURL }).with(adapter)

// GET request to <baseURL>/users/1
await api('users/1', { method: 'GET' })
```

### `apiRouteBuilder` Adapter

The `apiRouteBuilder` adapter provides a jQuery-like and Axios-esque API for building and making API calls. It allows you to construct your API calls in a declarative way:

```ts
import { apiRouteBuilder, createClient } from 'apiful'

const baseURL = '<your-api-base-url>'
const adapter = apiRouteBuilder()
const api = createClient({ baseURL }).with(adapter)

// GET request to <baseURL>/users/1
await api.users.get(1)
// POST request to <baseURL>/users with payload
await api.users.post({ name: 'foo' })
```

### `OpenAPI` Adapter

If your API has an [OpenAPI](https://swagger.io/resources/open-api/) schema, `apiful` can use it to generate types for you, which the `OpenAPI` adapter then consumes to provide type-safe API calls:

```ts
import { createClient, OpenAPI } from 'apiful'

const baseURL = 'https://petstore3.swagger.io/api/v3'
// Pass pre-generated schema type ID to adapter
const adapter = OpenAPI<'petStore'>()
const api = createClient({ baseURL }).with(adapter)

// Typed parameters and response
const response = await api('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

For example, the response returned by the API call above is typed as follows:

```ts
const response: {
  id?: number
  username?: string
  // …
}
```

> [!TIP]
> Please follow the [OpenAPI adapter documentation](/adapters/openapi) to learn more about how to generate TypeScript definitions from your OpenAPI schema files.
