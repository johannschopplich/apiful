# `ofetch`

This adapter wraps [ofetch](https://github.com/unjs/ofetch) to handle API calls. It is the most basic adapter and inherits all default options from the client.

```ts
import { createClient, ofetch } from 'apiful'

// Set the base URL for your API calls
const baseURL = 'https://jsonplaceholder.typicode.com'

const api = createClient({ baseURL }).with(ofetch())

// POST request to <baseURL>/users with payload
const response = await api('users', {
  method: 'POST',
  body: { foo: 'bar' },
})
```
