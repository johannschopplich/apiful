# Typed Client for Nitro Servers

This recipe generates types from the OpenAPI document a [Nitro](https://nitro.build) server serves, and calls the server through [`createOpenAPIClient`](/reference/create-openapi-client).

> [!NOTE]
> This guide targets **Nitro v3**, which ships as the `nitro` package and is currently in beta. Its OpenAPI support is behind an experimental flag. If you are starting from scratch, follow Nitro's [quick start](https://nitro.build/docs/quick-start) first – everything below assumes a working Nitro app.

## Enable the OpenAPI Document in Nitro

Nitro serves the OpenAPI document at `/_openapi.json`. The route is behind an experimental flag, so enable it in your `nitro.config.ts`:

```ts
import { defineConfig } from 'nitro'

export default defineConfig({
  experimental: {
    openAPI: true,
  },

  openAPI: {
    meta: {
      title: 'My API',
      version: '1.0.0',
    },
  },
})
```

Start your dev server and open `/_scalar` or `/_swagger` in the browser. Both UIs are served automatically and are the quickest way to confirm the document exists before you generate anything from it.

## Describe Your Routes

Nitro derives the OpenAPI document from your route handlers. Paths and path parameters are picked up automatically, but request and response shapes are not – a handler without metadata contributes a bare `200: { description: 'OK' }` to the document, which generates a client whose responses are typed `undefined`.

Use the `defineRouteMeta` macro to describe what a route accepts and returns. Its `openAPI` property takes a standard OpenAPI [Operation Object](https://spec.openapis.org/oas/v3.1.0#operation-object):

```ts
// server/api/users/index.get.ts
import { defineHandler, defineRouteMeta } from 'nitro'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    description: 'List all users',
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
    },
    $global: {
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'name', 'email'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
          },
        },
      },
    },
  },
})

export default defineHandler(() => {
  return [
    { id: '1', name: 'Alice', email: 'alice@example.com' }
  ]
})
```

Schemas declared under `$global` are hoisted into the top-level `components` section, so every other route can reference them with `$ref` instead of repeating them:

```ts
// server/api/users/[id].get.ts
import { defineHandler, defineRouteMeta } from 'nitro'
import { getRouterParam } from 'nitro/h3'

defineRouteMeta({
  openAPI: {
    tags: ['users'],
    description: 'Get a user by ID',
    responses: {
      200: {
        description: 'User found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' },
          },
        },
      },
      404: { description: 'User not found' },
    },
  },
})

export default defineHandler((event) => {
  const id = getRouterParam(event, 'id')
  return { id, name: 'Alice', email: 'alice@example.com' }
})
```

## Generate the Types

Create an `apiful.config.ts` file and point the service at your running dev server:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    myApi: {
      schema: 'http://localhost:3000/_openapi.json',
    },
  },
})
```

Run [`apiful generate`](/guide/cli), which writes `apiful.d.ts`:

```bash
npx apiful generate
```

The command adds the `myApi` service to the `apiful/schema` module.

> [!IMPORTANT]
> The `/_openapi.json` route is only served in development. Keep your Nitro dev server running while generating types from a URL.

> [!TIP]
> For CI, where booting the dev server is awkward, let Nitro write the OpenAPI document to disk instead. Setting `openAPI.production` to `'prerender'` emits `.output/public/_openapi.json` during `vite build`, which you can then reference as `schema: '.output/public/_openapi.json'`. Note that this also serves the document publicly in production – guard the route if that is not what you want.

## Create the Client

Pass the service name to `createOpenAPIClient`:

```ts
import { createOpenAPIClient } from 'apiful/openapi'

const client = createOpenAPIClient<'myApi'>({ baseURL: 'http://localhost:3000' })
```

## Call the Server

Paths, parameters, and responses are typed from the OpenAPI document:

```ts
// Response is typed as `User[]`
const users = await client('/api/users', { method: 'GET' })

// Path parameters are type-checked
const user = await client('/api/users/{id}', {
  method: 'GET',
  path: { id: '1' },
})
```

Nitro types every path parameter as `string`, so `path: { id: 1 }` is a type error even when the underlying value is numeric.

The schemas you hoisted with `$global` are available as named models, which saves you from re-deriving them from response types:

```ts
import type { MyApiModel } from 'apiful/schema'

type User = MyApiModel<'User'>
```

> [!NOTE]
> Nitro's own `/_openapi.json`, `/_scalar`, and `/_swagger` routes are part of the OpenAPI document, so they show up in path autocomplete next to your API routes.
