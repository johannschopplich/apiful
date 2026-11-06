[![APIful library](./docs/public/og.png)](https://apiful.land)

# APIful

An APIful client is a set of default fetch options – a base URL, headers, retries – plus the extensions you add to it. The extensions decide how you write a request and how much of it TypeScript knows: plain `fetch`-style calls, a chain of path segments, or paths and responses typed from an OpenAPI document.

Start with one of the [built-in extensions](https://apiful.land/extensions/), or [write your own](https://apiful.land/guide/custom-extensions).

## Setup

> [!TIP]
> [📖 Read the documentation](https://apiful.land)

> [!NOTE]
> Upgrading from an earlier major? See the [migration guide](https://apiful.land/guide/migration). Coming from openapi-typescript and openapi-fetch? See [Migrating From openapi-typescript and openapi-fetch](https://apiful.land/guide/migrating-from-openapi-typescript).

```bash
# pnpm
pnpm add apiful

# npm
npm i apiful
```

## Usage

### Compose a Client

`createClient` takes the default options every request starts from, and `with` adds the extension that makes the client callable:

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

### Built-in Extensions

<table><tr><td width="500px" valign="top">

### `ofetchBuilder`

```ts
import { createClient, ofetchBuilder } from 'apiful'

const api = createClient({ baseURL: 'https://api.example.com' })
  .with(ofetchBuilder())

// GET request to https://api.example.com/users/1
await api('users/1', { method: 'GET' })
```

</td><td width="500px"><br>

**What it does:**

The `ofetchBuilder` wraps [ofetch](https://github.com/unjs/ofetch) to handle API requests.

</td></tr><tr><td width="500px" valign="top">

### `apiRouterBuilder`

```ts
import { apiRouterBuilder, createClient } from 'apiful'

const api = createClient({ baseURL: 'https://api.example.com' })
  .with(apiRouterBuilder())

// GET request to https://api.example.com/users/1
await api.users(1).get()
// POST request to https://api.example.com/users with payload
await api.users.post({ name: 'foo' })
```

</td><td width="500px"><br>

**What it does:**

The `apiRouterBuilder` builds the request from property access: each property adds a path segment, and the HTTP method at the end of the chain sends the request.

</td></tr><tr><td width="500px" valign="top">

### `openAPIBuilder`

```ts
import { createClient, openAPIBuilder } from 'apiful'

// Pass the service name from apiful.config.ts
const api = createClient({ baseURL: 'https://petstore3.swagger.io/api/v3' })
  .with(openAPIBuilder<'petStore'>())

// Typed parameters and response
const response = await api('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

</td><td width="500px"><br>

**What it does:**

If your API publishes an [OpenAPI](https://swagger.io/resources/open-api/) document, `apiful generate` turns it into types, and `openAPIBuilder` checks every call against them. A client with no other extension can come from `createOpenAPIClient` of `apiful/openapi` instead, which takes the same service name.

`response` is typed from the OpenAPI document:

```ts
const response: {
  id?: number
  username?: string
  // …
}
```

Follow the [OpenAPI extension documentation](https://apiful.land/extensions/openapi) to generate the types from your OpenAPI document.

</td></tr></table>

## Development

- Clone this repository
- Install [Node.js](https://nodejs.org/en/) 24 or later
- Install [pnpm](https://pnpm.io/installation)
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm test`

## License

Made with 💛

Published under [MIT License](./LICENSE).
