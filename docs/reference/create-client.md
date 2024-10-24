# `createClient`

Heart of APIful. Creates an [`ApiClient`](/reference/api-client) instance with the given default options.

## Example

```ts
import { createClient, ofetchBuilder } from 'apiful'

interface JSONPlaceholderTodoResponse {
  userId: number
  id: number
  title: string
  completed: boolean
}

const client = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
}).with(ofetchBuilder())

const response = await client<JSONPlaceholderTodoResponse>('todos/1')
```

## Type Definition

```ts
declare function createClient<const BaseURL extends string = '/'>(
  defaultOptions?: Omit<FetchOptions, 'baseURL'> & { baseURL?: BaseURL }
): ApiClient<BaseURL>
```

> [!NOTE]
> `FetchOptions` are imported from [ofetch](https://github.com/unjs/ofetch).
