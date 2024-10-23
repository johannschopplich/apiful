# `createClient`

Heart of APIful. Creates an [`ApiClient`](/reference/api-client) instance with the given default options.

## Type Definition

```ts
function createClient<const BaseURL extends string = '/'>(
  defaultOptions?: Omit<FetchOptions, 'baseURL'> & { baseURL?: BaseURL }
): ApiClient<BaseURL>
```

> [!NOTE]
> `FetchOptions` are imported from [ofetch](https://github.com/unjs/ofetch).
