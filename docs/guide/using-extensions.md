# Using Extensions

## Prerequisite: Create a Client

Before you can use extensions, you must create a client. Once a client is initialised, you can add extensions to it.

```ts
import { createClient } from 'apiful'

const client = createClient({
  // Defaults to `/` if not set
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
  },
})
```

> [!TIP]
> No matter which extensions you use, the default options are always passed on to each extension. This means that the default options are always available.

## Built-in Extensions

All extensions included in APIful by default provide a call signature that allows you to make API requests. You can add multiple extensions to a client by chaining the `with` method.

Depending on your use case and personal preference, you can choose from the following pre-built extensions:

- [ofetch](/extensions/ofetch)
- [OpenAPI](/extensions/openapi)
- [API Router](/extensions/api-router)

## Custom Extensions

Follow the [Custom Extensions](/guide/custom-extensions) guide to learn how to create your own extensions.
