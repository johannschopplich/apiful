# Typed Client for Nitro Servers

[Nitro](https://nitro.unjs.io) is great for building web servers with everything you need and deploying them wherever you want. This guide will show you how to setup a typed client for your Nitro server quickly.

For this guide, we will use the [APIful CLI](/guide/cli) to transform the OpenAPI schema into type definitions and [`createClient`](/reference/create-client) with [`OpenAPIBuilder`](/extensions/openapi) to instantiate a typed client.

> [!NOTE]
> This requires [Nitro](https://nitro.unjs.io) v2.10+, which supports a public `/_openapi.json` route to expose the OpenAPI schema.

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

Create an `apiful.config.ts` file and define your API service with the OpenAPI Schema URL. For this example, we will set up the `myApi` service with the OpenAPI schema from `https://myapi.dev/_openapi.json`:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    myApi: {
      // Public OpenAPI schema in Nitro v2.10+
      schema: 'https://myapi.dev/_openapi.json',
    },
  },
})
```

Next, run the following command to generate the type definitions, saved as `apiful.d.ts` by default:

```bash
npx apiful generate
```

Type definitions for the `myApi` service will augment the global `apiful/schema`, so that they can be used by the `OpenAPIBuilder` extension.

## 3️⃣ Create the Typed Client

Finally, create an API client using the `OpenAPIBuilder` extension. Pass `myApi` as a generic type parameter to `OpenAPIBuilder` so that the client is typed with the definitions generated from the OpenAPI schema:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const client = createClient({ baseURL: 'https://myapi.dev' })
  .with(OpenAPIBuilder<'myApi'>())
```

## 4️⃣ Request Data With the Typed Client

Now you can use the typed client to make requests to your Nitro server. Return types and parameters are automatically inferred from the OpenAPI schema:

```ts
const response = await client('/users')
```
