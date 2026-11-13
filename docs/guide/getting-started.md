# Getting Started

An APIful client is a set of default fetch options – a base URL, headers, retries – plus the extensions you add to it. The extensions decide how you write a request and how much of it TypeScript knows: plain `fetch`-style calls, a chain of path segments, or paths and responses typed from an OpenAPI document.

Start with one of the [built-in extensions](/extensions/), or [write your own](/guide/custom-extensions). Either way the client stays one callable object, which is [how extensions work](/guide/how-extensions-work).

## Install APIful

APIful requires Node 24 or later, and its types require TypeScript 5.9 or later. `apiful generate` never loads the `typescript` package, so it runs the same whichever version is installed, and both the generated types and the ones APIful ships check against TypeScript 5.9, 6.0, and 7.0.

::: code-group
  ```bash [pnpm]
  pnpm add apiful
  ```
  ```bash [yarn]
  yarn add apiful
  ```
  ```bash [npm]
  npm install apiful
  ```
:::

> [!TIP]
> Your API client ships with your application, so `apiful` belongs in `dependencies`.

## Create a Client

`createClient` takes the default options every request of the client starts from:

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
> `createClient` returns an [`ApiClient`](/reference/api-client) that cannot make requests yet – calling it throws a `TypeError` until you add a handler extension.

## Add a Handler Extension

`ofetchBuilder` wraps [ofetch](https://github.com/unjs/ofetch) and is the shortest way to a working client. It is one of three [built-in extensions](/extensions/), which differ in how you write a request – pick another one later if it suits your API better.

Add it to your client with the `with` method:

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
  body: { name: 'John Doe', email: 'john@example.com' },
})
```

Each request inherits the client's default options and can override them individually. JSON serialization, response parsing, and thrown errors for 4xx and 5xx responses come from ofetch.

> [!TIP]
> If your API publishes an OpenAPI document, the [OpenAPI extension](/extensions/openapi) types paths, bodies, and responses for you from it.

## Chain More Extensions

Every `with` call returns the extended client, so the next one adds to it:

```ts
const client = createClient({ baseURL: 'https://api.example.com' })
  // Handler extension: makes the client callable
  .with(ofetchBuilder())
  // Methods extension: adds `logDefaults()`
  .with(logExtension)
```

See [Custom Extensions](/guide/custom-extensions) for how `logExtension` is written, and [how extensions work](/guide/how-extensions-work) for what happens when two of them collide.
