# apiverse

[![npm version][npm-version-src]][npm-version-href]
[![bundle][bundle-src]][bundle-href]

`apiverse` provides a unified way to manage all your API interactions by setting up a client with default fetch options, such as the API base URL and headers. Adapters extend the client with a variety of features to match your favorite API management flavor.

You can use one of the pre-built adapters to get started quickly, or create your own custom adapter to meet your specific requirements.

## Setup

> [!TIP]
> [📖 Read the documentation](https://apiverse.byjohann.dev)

```bash
# pnpm
pnpm add -D apiverse

# npm
npm i -D apiverse
```

## Usage

> [!TIP]
> [📖 Read the documentation](https://apiverse.byjohann.dev)

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
const response = await api('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
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

Please follow the [OpenAPI adapter documentation](https://apiverse.byjohann.dev/adapters/openapi) to learn more about how to generate TypeScript definitions from your OpenAPI schema files.

</td></tr></table

## Outlook & Roadmap

As of right now, this library handles API management in the client. In the future, `apiverse` is intended to extend to the server side as well, providing a unified way to manage API calls in both client and server.

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

[npm-version-src]: https://img.shields.io/npm/v/apiverse?style=flat
[npm-version-href]: https://npmjs.com/package/apiverse
[bundle-src]: https://img.shields.io/bundlephobia/minzip/apiverse?style=flat
[bundle-href]: https://bundlephobia.com/result?p=apiverse
