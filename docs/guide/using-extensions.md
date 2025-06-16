# Using Extensions

## Prerequisite: Create a Client

Before you can use extensions, you must create a client. Once a client is initialized, you can add extensions to it:

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

> [!IMPORTANT]
> The client by itself cannot make requests - you need at least one handler extension to provide the actual HTTP functionality.

> [!TIP]
> Default options are automatically passed to all extensions, ensuring consistent configuration across your entire client.

## Built-in Extensions

APIful includes several pre-built extensions that provide different API interaction patterns. You can add multiple extensions to a client by chaining the `with` method.

Choose the extension that best fits your use case and personal preference:

- **[ofetch](/extensions/ofetch)** - Direct fetch-style requests with `client('/path', options)`
- **[OpenAPI](/extensions/openapi)** - Type-safe requests based on OpenAPI schemas
- **[API Router](/extensions/api-router)** - jQuery/Axios-style chaining with `client.users.get()`

> [!TIP]
> Start with the ofetch extension if you are new to APIful - it provides the most familiar API for developers coming from fetch or Axios.

## Custom Extensions

Need something specific? Follow the [Custom Extensions](/guide/custom-extensions) guide to learn how to create your own extensions that perfectly match your requirements.
