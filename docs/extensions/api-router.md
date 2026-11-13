# `apiRouterBuilder`

This [handler extension](/guide/custom-extensions#write-a-handler-extension) builds the request from property access: each property adds a path segment, and the HTTP method at the end of the chain sends the request – which reads well for REST APIs with deep, predictable paths such as `/api/v1/organizations/123/projects/456/tasks`.

Add it to your client:

```ts
import { apiRouterBuilder, createClient } from 'apiful'

const baseURL = 'https://jsonplaceholder.typicode.com'
const api = createClient({ baseURL }).with(apiRouterBuilder())

// GET request to <baseURL>/users
const users = await api.users.get<UserResponse>()
```

## Path Building Strategies

Four ways to build a path mix freely within one chain:

```ts
// Every property that is not an HTTP method is a segment
// GET request to <baseURL>/users/profile/settings
const settings = await api.users.profile.settings.get<SettingsResponse>()

// Brackets, for segments that are not valid identifiers or not known ahead of time
// GET request to <baseURL>/api-v2/special-endpoint
const data = await api['api-v2']['special-endpoint'].get()

// Calling a segment appends its arguments
// GET request to <baseURL>/users/123/posts/456
const post = await api.users(123).posts(456).get<PostResponse>()

// Calling the client appends every argument at once
// GET request to <baseURL>/users/123/posts/456/comments
const comments = await api('users', 123, 'posts', 456, 'comments').get<CommentResponse[]>()
```

> [!NOTE]
> `then`, `toString`, and `valueOf` are not path segments. `then` stays undefined so that a chain missing its final `.get()` is not mistaken for a promise, and the other two report the URL built so far, which is what appears when you log a route. Pass such a segment as an argument instead: `api('then').get()`.

## Request Parameters and Payloads

The method at the end of the chain takes the request data first and ofetch's options second.

### GET Requests

The first parameter becomes query parameters:

```ts
// GET <baseURL>/users?page=1&limit=10
const users = await api.users.get({ page: 1, limit: 10 })

// Works with all path building strategies
const user = await api.users(123).get({ include: 'profile' })
```

### POST, PUT, PATCH, DELETE

The first parameter becomes the request body:

```ts
// POST <baseURL>/users with JSON body
const newUser = await api.users.post({
  name: 'John Doe',
  email: 'john@example.com',
})

// PUT <baseURL>/users/123 with JSON body
const updatedUser = await api.users(123).put({
  name: 'Jane Doe',
})
```

## HTTP Request Methods

The chain ends in one of these methods:

- `get(<query>, <fetchOptions>)`
- `post(<payload>, <fetchOptions>)`
- `put(<payload>, <fetchOptions>)`
- `delete(<payload>, <fetchOptions>)`
- `patch(<payload>, <fetchOptions>)`

## Handle Errors

A 4xx or 5xx response throws ofetch's `FetchError`, which carries the status:

```ts
import type { FetchError } from 'ofetch'

try {
  const user = await api.users(999).get<UserResponse>()
}
catch (caught) {
  // Handle 404, 500, etc.
  const error = caught as FetchError
  if (error.status === 404) {
    console.log('User not found')
  }
  else {
    console.log('API error:', error.message)
  }
}
```

## Per-Request Options

The second argument takes ofetch's options for that request. Its headers and query merge with the client's defaults, and every other option replaces its default. The first argument replaces any `query` (for `get`) or `body` passed in the options:

```ts
const users = await api.users.get({ page: 1 }, {
  headers: { 'Cache-Control': 'no-cache' },
  timeout: 5000,
  retry: 3,
})
```
