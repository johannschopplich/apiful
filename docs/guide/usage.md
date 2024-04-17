# Usage

## Create a Client

The `createClient` function allows you to set up an API client with default options that are used in every API call. This simplifies the process of managing common settings like the API base URL and headers.

```ts
import { createClient } from 'apiverse'

const client = createClient({
  // Defaults to `/` if not set
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

> [!NOTE]
> No matter which adapter you use, the default options are always passed to the adapter.

## Use Adapters

Adapters are used to handle requests and responses to and from the API. You can choose from the following pre-built adapters:

- [ofetch](/adapters/ofetch)
- [OpenAPI](/adapters/openapi)
- [Route Builder](/adapters/route-builder)

Alternatively, you can create your own custom adapter to meet your specific requirements.
