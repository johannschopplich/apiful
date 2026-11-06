# JSON to Type Definition

`jsonToTypeDefinition` from `apiful/utils` infers a TypeScript type from a JSON value and returns its source: an interface for an object, a type alias for anything else, named after `typeName` (default `Root`). Every property is optional unless you pass `strictProperties: true`.

## Usage

```ts
import { jsonToTypeDefinition } from 'apiful/utils'

const response = {
  status: 'success',
  data: {
    id: 123,
    items: [
      { name: 'Item 1', price: 10 },
      { name: 'Item 2', price: 20 },
    ],
    metadata: {
      total: 2,
      page: 1,
    },
  },
}

const responseTypeDefinition = jsonToTypeDefinition(
  response,
  { typeName: 'Response' },
)
```

`responseTypeDefinition` holds this source:

<!-- eslint-skip -->

```ts
export interface Response {
  status?: string;
  data?: {
    id?: number;
    items?: {
      name?: string;
      price?: number;
    }[];
    metadata?: {
      total?: number;
      page?: number;
    };
  };
}
```

## Type Definition

```ts
interface TypeDefinitionOptions {
  /** @default 'Root' */
  typeName?: string
  /** @default false */
  strictProperties?: boolean
}

declare function jsonToTypeDefinition(
  data: JsonValue,
  options?: TypeDefinitionOptions,
): string
```

`data` takes any JSON value:

```ts
type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined }
type JsonArray = JsonValue[] | readonly JsonValue[]
type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonArray
```
