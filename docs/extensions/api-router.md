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

There are four ways to build a path, and they mix freely within one chain.

### Dot Notation

Every property that is not an HTTP method becomes a segment:

```ts
// GET request to <baseURL>/users/profile/settings
const settings = await api.users.profile.settings.get<SettingsResponse>()

// POST request to <baseURL>/posts/comments
const comment = await api.posts.comments.post({ text: 'Hello!' })
```

### Chain Syntax With Dynamic Segments

Calling a segment appends its arguments, which is how you interpolate a value:

```ts
const userId = 123
const postId = 456

// GET request to <baseURL>/users/123/posts/456
const post = await api.users(userId).posts(postId).get<PostResponse>()

// Multiple dynamic segments
const response = await api.categories('tech').posts(postId).comments.get()
```

### Bracket Notation

The same as dot notation, for segments that are not valid identifiers or are not known ahead of time:

```ts
const userId = 123

// GET request to <baseURL>/users/123
const user = await api.users[`${userId}`].get<UserResponse>()

// Useful for paths with special characters or spaces
const data = await api['api-v2']['special-endpoint'].get()
```

### Multiple Arguments

Calling the client itself appends every argument at once:

```ts
// GET request to <baseURL>/users/123/posts/456/comments
const comments = await api('users', 123, 'posts', 456, 'comments').get<CommentResponse[]>()

// Mix static and dynamic segments
const result = await api('api', 'v1', 'users', userId, 'profile').get()
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
