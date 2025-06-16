# `ofetchBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) that wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

This built-in extension provides the most straightforward way to make HTTP requests with APIful. It is the simplest adapter and inherits all default options from the client, making it perfect for developers familiar with fetch or Axios.

Import the `ofetchBuilder` extension and add it to your client:

```ts
import { createClient, ofetchBuilder } from 'apiful'

const client = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .with(ofetchBuilder())
```

The `client` now has the same API as [ofetch](https://github.com/unjs/ofetch), accepting all options that ofetch provides:

```ts
// GET request with query parameters
const users = await client('users', {
  method: 'GET',
  query: { page: 1, limit: 10 }
})

// POST request with JSON body
const newUser = await client('users', {
  method: 'POST',
  body: { name: 'John Doe', email: 'john@example.com' }
})
```

> [!TIP]
> The ofetch extension automatically handles JSON serialization, response parsing, and error handling, making it ideal for REST APIs.
