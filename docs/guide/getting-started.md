# Getting Started

## What Is This?

APIful provides a unified interface to manage all your API interactions by setting up a client with default fetch options, such as the base API URL and headers. Extensions add a variety of features to the client to match your favorite flavor of API management.

You can use one of the [built-in extensions](/guide/using-extensions#built-in-extensions) to get started right away, or create your own [custom extension](/guide/custom-extensions) to meet your specific needs.

## Installation

Get started by installing `apiful` in your project. Choose your package manager:

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

## Your First API Client

Create your first API client by initialising it with a base URL and a sample bearer token for authorization:

```ts
import { createClient } from 'apiful'

const baseURL = '<your-api-base-url>'
const client = createClient({
  baseURL,
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
```

> [!NOTE]
> The `createClient` function returns an [`ApiClient`](/reference/api-client) instance that does not yet have a call signature. You will need to add a base extension to the client in order to make API requests. Read on to learn how to do this.

## Choose a Built-in Extension

For most use cases, one of the included base extensions should be sufficient. The following adapters are available:

- [ofetch](/extensions/ofetch)
- [OpenAPI](/extensions/openapi)
- [API Router](/extensions/api-router)

For example, The `ofetchBuilder` wraps [ofetch](https://github.com/unjs/ofetch) to handle API requests. It is the easiest way to get started with APIful.

Continuing from the previous example, add the `ofetchBuilder` to your client by chaining the `with` method. This will extend the client with the ofetch extension:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const baseURL = '<your-base-url>'

// Initialise the ofetch adapter
const adapter = ofetchBuilder()
const client = createClient({
  baseURL,
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
  .with(adapter)
```

Now that you have a client with ofetch as the base extension, you can make API requests:

```ts
// GET request to <baseURL>/users/1
await client('users/1', { method: 'GET' })
```

> [!TIP]
> If your API provides an OpenAPI schema, follow the [OpenAPI extension documentation](/extensions/openapi) to learn more about how to generate TypeScript definitions from your OpenAPI schema files and create fully typed API clients.

## Writing Extensions

Each client can have more than one extension. This means that you can chain `with` methods to add multiple extensions to your client.

For example, you can add a custom extension to log the default fetch options:

```ts
import type { MethodsExtensionBuilder } from 'apiful'

const logExtension = (client => ({
  logDefaults() {
    console.log('Default fetch options:', client.defaultOptions)
  }
})) satisfies MethodsExtensionBuilder

const extendedClient = client
  .with(logExtension)

extendedClient.logDefaults() // { baseURL: '<your-base-url>', headers: { Authorization: 'Bearer <your-bearer-token>' } }
```

If you have specific requirements that are not covered by the included extensions, you can create your own extensions. Follow the [Custom Extensions](/guide/custom-extensions) guide to learn more.
