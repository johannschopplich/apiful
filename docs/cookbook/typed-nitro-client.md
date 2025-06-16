# Typed Client for Nitro Servers

[Nitro](https://nitro.unjs.io) is excellent for building web servers with everything you need and deploying them wherever you want. This guide shows you how to set up a fully typed client for your Nitro server quickly.

We will use the [APIful CLI](/guide/cli) to transform the OpenAPI schema into type definitions and [`createClient`](/reference/create-client) with [`OpenAPIBuilder`](/extensions/openapi) to instantiate a typed client.

## 1️⃣ Enable OpenAPI Schema in Nitro

Nitro provides a public `/_openapi.json` route to expose the OpenAPI schema. To enable this feature, add the following configuration to your `nitro.config.ts`:

```ts
export default defineNitroConfig({
  experimental: {
    openAPI: true,
  },

  openAPI: {
    production: 'runtime',
    meta: {
      title: 'My API',
    },
  },
})
```

## 2️⃣ Generate Type Definitions for the OpenAPI Schema

Create an `apiful.config.ts` file and define your API service with the OpenAPI schema URL. For this example, we will set up the `myApi` service with the OpenAPI schema from `https://api.example.com/_openapi.json`:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    myApi: {
      schema: 'https://api.example.com/_openapi.json',
    },
  },
})
```

Next, run the following command to generate the type definitions, saved as `apiful.d.ts` by default:

```bash
npx apiful generate
```

Type definitions for the `myApi` service will augment the global `apiful/schema`, making them available to the `OpenAPIBuilder` extension.

> [!IMPORTANT]
> Make sure your Nitro server is running when generating types from a URL, or use a local schema file path instead.

## 3️⃣ Create the Typed Client

Finally, create an API client using the `OpenAPIBuilder` extension. Pass `myApi` as a generic type parameter to `OpenAPIBuilder` so that the client is typed with the definitions generated from the OpenAPI schema:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const client = createClient({ baseURL: 'https://api.example.com' })
  .with(OpenAPIBuilder<'myApi'>())
```

## 4️⃣ Request Data With the Typed Client

Now you can use the typed client to make requests to your Nitro server. Return types and parameters are automatically inferred from the OpenAPI schema:

```ts
// GET request with full type safety
const users = await client('/users', { method: 'GET' })

// POST request with typed body and response
const newUser = await client('/users', {
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})

// Path parameters are type-checked
const user = await client('/users/{id}', {
  method: 'GET',
  path: { id: 123 }
})
```

> [!TIP]
> Your editor will provide full IntelliSense support, including autocomplete for paths, methods, and request/response shapes.
