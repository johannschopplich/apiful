# apiverse

[![npm version][npm-version-src]][npm-version-href]
[![bundle][bundle-src]][bundle-href]

Unified API client with tasty flavors.

## What Is This?

`apiverse` provides a unified way to manage all your API interactions by setting up a client with default fetch options, such as the API base URL and headers. This ensures that your API calls are consistent across your application.

Adapters extend the client (including the default options) with a variety of features to match your favorite API management flavor:

```ini
Client + Adapter = Galaxies of API Management 🌌
```

You can use one of the pre-built adapters to get started quickly, or create your own custom adapter to meet your specific requirements.

<table><tr><td width="500px" valign="top">

### `ofetch` Adapter

```ts
import { createClient, ofetch } from 'apiverse'

const baseURL = '<your-api-base-url>'
const adapter = ofetch()
const api = createClient({ baseURL }).with(adapter)

// GET request to <baseURL>/users/1
await api('users/1', { method: 'GET' })
```

</td><td width="500px"><br>

**What it does:**

The `ofetch` adapter wraps [ofetch](https://github.com/unjs/ofetch) to handle API calls.

</td></tr><tr><td width="500px" valign="top">

### `routeBuilder` Adapter

```ts
import { createClient, routeBuilder } from 'apiverse'

const baseURL = '<your-api-base-url>'
const adapter = routeBuilder()
const api = createClient({ baseURL }).with(adapter)

// GET request to <baseURL>/users/1
await api.users.get(1)
// POST request to <baseURL>/users with payload
await api.users.post({ name: 'foo' })
```

</td><td width="500px"><br>

**What it does:**

The `routeBuilder` adapter provides a jQuery-like and Axios-esque API for building and making API calls. It allows you to construct your API calls in a declarative way.

</td></tr><tr><td width="500px" valign="top">

### `OpenAPI` Adapter

```ts
import { OpenAPI, createClient } from 'apiverse'

const baseURL = 'https://petstore3.swagger.io/api/v3'
// Pass pre-generated schema type ID to adapter
const adapter = OpenAPI<'petStore'>()
const api = createClient({ baseURL }).with(adapter)

// Typed parameters and response
const response = await api('user/{username}', {
  method: 'GET',
  pathParams: { username: 'user1' },
})
```

</td><td width="500px"><br>

**What it does:**

If your API has an [OpenAPI](https://swagger.io/resources/open-api/) schema, `apiverse` can use it to generate types for you, which the `OpenAPI` adapter then consumes to provide type-safe API calls.

For example, the response returned by the API call on the left is typed as follows:

```ts
const response: {
  id?: number
  username?: string
  // …
}
```

Please follow the [OpenAPI adapter documentation](#openapi) to learn more about how to generate TypeScript definitions from your OpenAPI schema files.

</td></tr></table>

## Installation

Get started by installing `apiverse` in your project:

```sh
# npm
npm install apiverse

# pnpm
pnpm add apiverse

# yarn
yarn add apiverse

# bun
bun install apiverse
```

## Usage

### Create a Client

The `createClient` function allows you to set up an API client with default options that are used in every API call. This simplifies the process of managing common settings like the API base URL and headers.

```ts
import { createClient } from 'apiverse'

const client = createClient({
  // Defaults to `/` if not set
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

> [!NOTE]
> No matter which adapter you use, the default options are always passed to the adapter.

### Use Adapters

Adapters are used to handle requests and responses to and from the API. You can choose from the following pre-built adapters:

- [`ofetch`](#ofetch)
- [`routeBuilder`](#routebuilder)
- [`OpenAPI`](#openapi)

Alternatively, you can create your own custom adapter to meet your specific requirements.

## Adapters

### `ofetch`

This adapter wraps [ofetch](https://github.com/unjs/ofetch) to handle API calls. It is the most basic adapter and inherits all default options from the client.

```ts
import { createClient, ofetch } from 'apiverse'

// Set the base URL for your API calls
const baseURL = 'https://jsonplaceholder.typicode.com'

const api = createClient({ baseURL }).with(ofetch())

// POST request to <baseURL>/users with payload
const response = await api('users', {
  method: 'POST',
  body: { foo: 'bar' },
})
```

### `routeBuilder`

The route builder adapter gives you an jQuery-like and Axios-esque API to construct your API calls. It is easy to use and allows you to build your API calls in a declarative way by chaining path segments and HTTP request methods:

```ts
// GET request to <baseURL>/users
const users = await api.users.get<UserResponse>()
```

Get started by using the `routeBuilder` adapter:

```ts
import { createClient, routeBuilder } from 'apiverse'

// Set the base URL for your API calls
const baseURL = 'https://jsonplaceholder.typicode.com'

const api = createClient({ baseURL }).with(routeBuilder())
```

#### Path Segment Chaining

Chain single path segments or path IDs by a dot. You can type the response by passing a generic type to the method:

```ts
// GET request to <baseURL>/users
const response = await api.users.get<UserResponse>()
```

For `GET` request, the first parameter is used as query parameters:

```ts
// <baseURL>/users?search=john
const response = await api.users.get<UserResponse>({ search: 'john' })
```

For HTTP request methods supporting a payload, the first parameter is used as payload:

```ts
// POST request to <baseURL>/users
const response = await api.users.post({ name: 'foo' })
```

To include dynamic API path segments, you can choose between the chain syntax or the bracket syntax:

```ts
const userId = 1

// Typed GET request to <baseURL>/users/1
// … using the chain syntax:
const user = await api.users(userId).get<UserResponse>()
// … or the bracket syntax:
const user = await api.users[`${userId}`].get<UserResponse>()
```

#### HTTP Request Methods

The following methods are supported as the last method in the chain:

- `get(<query>, <fetchOptions>)`
- `post(<payload>, <fetchOptions>)`
- `put(<payload>, <fetchOptions>)`
- `delete(<payload>, <fetchOptions>)`
- `patch(<payload>, <fetchOptions>)`

#### Override Default Options

If you need to override the default options set in `createClient`, you can pass custom fetch options to the method call:

```ts
const response = await api.users.get({
  headers: {
    'Cache-Control': 'no-cache',
  },
})
```

### `OpenAPI`

The OpenAPI adapter adds type-safety for API calls based on an OpenAPI schema. This includes path names, supported HTTP methods, request body, response body, query parameters, and headers.

In order to use this adapter, `apiverse` needs to generate TypeScript definitions from your OpenAPI schema files beforehand.

> [!NOTE]
> TypeScript definitions with all OpenAPI schema types will be generated by `apiverse`. Make sure to save it as a `.d.ts` file in your project and reference it in your `tsconfig.json` file, if it is not included by default.

#### Schema Generation

First, install the [`openapi-typescript`](https://www.npmjs.com/package/openapi-typescript) library:

```bash
# npm
npm install -D openapi-typescript

# pnpm
pnpm add -D openapi-typescript

# yarn
yarn add -D openapi-typescript
```

`apiverse` provides a `generateOpenAPITypes` function that generates a TypeScript definitions file, which you have to save to the proper destination in your project.

Take this `prepare.ts` file as an example:

```ts
import { writeFile } from 'node:fs/promises'
import { defineOpenAPIEndpoints, generateOpenAPITypes } from 'apiverse'

export const endpoints = defineOpenAPIEndpoints({
  petStore: {
    // See: https://petstore3.swagger.io/api/v3/openapi.json
    schema: resolve(currentDir, 'schemas/pet-store.json'),
  },
})

const types = await generateOpenAPITypes(endpoints)
await writeFile('openapi.d.ts', types)
```

#### Using the `OpenAPI` Adapter

After you have generated the TypeScript definitions file, you can use the `OpenAPI` adapter to add type-safety to your API calls:

```ts
import { OpenAPI, createClient } from 'apiverse'

const baseURL = 'https://petstore3.swagger.io/api/v3'
const adapter = OpenAPI<'petStore'>()
const petStore = createClient({ baseURL }).with(adapter)

// The response is typed based on the OpenAPI spec
const userResponse = await petStore('user/{username}', {
  method: 'GET',
  pathParams: { username: 'user1' },
})
console.log(userResponse)
```

The response returned by the API call on the left is typed as follows:

```ts
declare const userResponse: {
  id?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phone?: string
  userStatus?: number
}
```

### OpenAPI Path Parameters

OpenAPI can define path parameters on given endpoints. They are typically declared as `/foo/{id}`. Unfortunately, the endpoint type is not defined as `/foo/10`. Thus, using the latter as the path will break type inference.

Instead, use the property `pathParams` to pass an object of the parameters. You can then use the declared path for type inference, and the type checker will ensure you provide all required path parameters. The parameters will be interpolated into the path before the request is made.

```ts
const response = await petStore('foo/{id}', {
  pathParams: {
    id: 10,
  },
})
```

> [!WARNING]
> Incorrect parameters will not be reported at runtime. An incomplete path will be sent to the backend _as-is_.

## Outlook & Roadmap

As of right now, this library handles API management in the client. In the future, `apiverse` is intended to extend to the server side as well, providing a unified way to manage API calls in both client and server.

Some ides include:

- CRUD API with Nitro, based on a configuration ([unjs/website/issues/129](https://github.com/unjs/website/issues/129))
- Validation of API responses in the client

## Development

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with 💛

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/apiverse?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/apiverse
[bundle-src]: https://img.shields.io/bundlephobia/minzip/apiverse?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=apiverse
