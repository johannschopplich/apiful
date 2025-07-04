# Getting Started

## What Is This?

APIful provides a unified interface to manage all your API interactions by setting up a client with default fetch options, such as the base API URL and headers. Extensions add a variety of features to the client through a sophisticated proxy-based architecture that maintains full TypeScript type safety while allowing runtime composition. This approach ensures that each extension can enhance or override behavior without breaking the client contract, while keeping bundle sizes minimal through intelligent tree-shaking.

You can use one of the [built-in extensions](/guide/using-extensions#built-in-extensions) to get started right away, or create your own [custom extension](/guide/custom-extensions) to meet your specific needs.

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

> [!TIP]
> APIful is designed as a development dependency since it is primarily used for generating types and building API clients during your build process.

## Your First API Client

Start by creating your first API client with a base URL and authorization headers:

```ts
import { createClient } from 'apiful'

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
```

> [!NOTE]
> The `createClient` function returns an [`ApiClient`](/reference/api-client) instance that cannot yet make requests. You will need to add a handler extension to enable HTTP functionality.

## Choose a Built-in Extension

APIful includes several extensions to handle different API interaction patterns:

- **[ofetch](/extensions/ofetch)** - Simple fetch-style requests, perfect for getting started
- **[OpenAPI](/extensions/openapi)** - Type-safe requests from OpenAPI schemas
- **[API Router](/extensions/api-router)** - jQuery-style chaining for intuitive API calls

The `ofetchBuilder` extension wraps [ofetch](https://github.com/unjs/ofetch) and provides the most straightforward way to make HTTP requests.

Add the `ofetchBuilder` to your client using the `with` method:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
  .with(ofetchBuilder())
```

Your client can now make HTTP requests:

```ts
// GET request to https://api.example.com/users/1
const user = await client('users/1', { method: 'GET' })

// POST request with JSON body
const newUser = await client('users', {
  method: 'POST',
  body: { name: 'John Doe', email: 'john@example.com' }
})
```

> [!NOTE]
> Each request automatically inherits your client's default options (base URL, headers, etc.) while allowing you to override them per request. The ofetch extension handles JSON serialization, response parsing, and error handling automatically, making API interactions feel natural and predictable.

> [!TIP]
> If your API provides an OpenAPI schema, follow the [OpenAPI extension documentation](/extensions/openapi) to learn more about how to generate TypeScript definitions from your OpenAPI schema files and create fully typed API clients.

## Chaining Extensions

Each client can have more than one extension. You can chain `with` methods to add multiple extensions to your client:

```ts
import type { MethodsExtensionBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  }
})) satisfies MethodsExtensionBuilder

const extendedClient = client
  .with(logExtension)

extendedClient.logDefaults() // { baseURL: 'https://api.example.com', headers: { Authorization: 'Bearer <your-bearer-token>' } }
```

## Error Handling Across Extensions

Each extension can implement its own error handling strategy, and errors propagate through the extension chain in a predictable manner. The ofetch extension automatically throws detailed errors with status codes and response bodies, while custom extensions can implement retry logic, circuit breakers, or custom error transformation. This layered approach allows higher-level extensions to catch and transform errors from lower-level ones, giving you complete control over how your application handles API failures.

> [!IMPORTANT]
> When chaining multiple extensions, later extensions override methods from earlier ones. This gives you fine-grained control over the final client behavior.

> [!TIP]
> If you have specific requirements that are not covered by the included extensions, you can create your own extensions. Follow the [Custom Extensions](/guide/custom-extensions) guide to learn more.
