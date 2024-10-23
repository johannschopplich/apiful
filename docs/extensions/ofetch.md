# `ofetchBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension).

This built-in extension wraps [ofetch](https://github.com/unjs/ofetch) to handle API requests. It is the most basic adapter and inherits all default options from the client.

Import the `ofetchBuilder` extension and add it to your client to get started:

```ts
import { createClient, ofetchBuilder } from 'apiful'

// Set the base URL for your API calls
const baseURL = 'https://jsonplaceholder.typicode.com'

const client = createClient({ baseURL })
  // Add the ofetch extension
  .with(ofetchBuilder())
```

The `client` now has the type signature of the [ofetch](https://github.com/unjs/ofetch) library. It accepts all options that the library provides.

```ts
// POST request to <baseURL>/users with payload
const response = await client('users', {
  method: 'POST',
  body: { foo: 'bar' },
})
```
