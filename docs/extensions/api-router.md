# `apiRouterBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) and wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

The route builder extension gives you an jQuery-like and Axios-esque API to construct your API calls. It is easy to use and allows you to build your API calls in a declarative way by chaining path segments and HTTP request methods:

```ts
// GET request to <baseURL>/users
const users = await api.users.get<UserResponse>()
```

Get started by using the `apiRouterBuilder` extension:

```ts
import { apiRouterBuilder, createClient } from 'apiful'

// Set the base URL for your API calls
const baseURL = 'https://jsonplaceholder.typicode.com'

const api = createClient({ baseURL }).with(apiRouterBuilder())
```

## Path Segment Chaining

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

## HTTP Request Methods

The following methods are supported as the last method in the chain:

- `get(<query>, <fetchOptions>)`
- `post(<payload>, <fetchOptions>)`
- `put(<payload>, <fetchOptions>)`
- `delete(<payload>, <fetchOptions>)`
- `patch(<payload>, <fetchOptions>)`

## Override Default Options

If you need to override the default options set in `createClient`, you can pass custom fetch options to the method call:

```ts
const response = await api.users.get({
  headers: {
    'Cache-Control': 'no-cache',
  },
})
```
