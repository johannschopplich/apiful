# JSON to Type Definition

APIful provides a utility for generating TypeScript interfaces from JSON data. This is especially useful if you want to create type definitions for your API responses or work with dynamic JSON structures.

> [!NOTE]
> All properties in generated interfaces are optional by default to accommodate varying JSON structures. Mark them as required as needed with the `strictProperties` option.

## Prerequisites

This piece of APIful requires `json-schema-to-typescript` to be installed in your project. You can install it using your preferred package manager:

::: code-group
  ```bash [pnpm]
  pnpm add -D json-schema-to-typescript
  ```
  ```bash [yarn]
  yarn add -D json-schema-to-typescript
  ```
  ```bash [npm]
  npm install -D json-schema-to-typescript
  ```
:::

## Usage

Import the `jsonToTypeDefinition` function from `apiful/utils`. Pass it your JSON data and define the interface name you want to generate. The function returns a promise that resolves to a string containing the TypeScript interface definition.

All objects, arrays, and primitive values in the JSON data are converted to TypeScript interfaces, types, and literals. The generated interfaces are named based on the `typeName` option or default to `Root`. The `strictProperties` option can be used to mark all properties as required.

Here's an example of how to generate a type definition for a JSON response:

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

const responseTypeDefinition = await jsonToTypeDefinition(
  apiReponse,
  { typeName: 'Response' },
)
```

The `responseTypeDefinition` variable will contain the following TypeScript interface as a string:

```ts
export interface Response {
  status?: string
  data?: {
    id?: number
    items?: {
      name?: string
      price?: number
    }[]
    metadata?: {
      total?: number
      page?: number
    }
  }
}
```

> [!TIP]
> You can use the generated type definitions directly in your code or save them to a `.ts` file for better type support in your TypeScript projects.

## Type Definition

```ts
interface TypeDefinitionOptions {
  /** @default 'Root' */
  typeName?: string
  /** @default false */
  strictProperties?: boolean
  /** @default '' */
  bannerComment?: string
  /** @default true */
  format?: boolean
}

declare function jsonToTypeDefinition(
  data: JsonValue,
  options?: TypeDefinitionOptions,
): Promise<string>
```

The input parameter `data` is a JSON object or any other valid JSON value. For reference, here's the definition of the `JsonValue` type:

```ts
type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined }
type JsonArray = JsonValue[] | readonly JsonValue[]
type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonArray
```
