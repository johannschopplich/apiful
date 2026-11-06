# JSON to Type Definition

APIful provides a utility for generating TypeScript interfaces from JSON data. This is especially useful if you want to create type definitions for your API responses or work with dynamic JSON structures.

> [!NOTE]
> All properties in generated interfaces are optional by default to accommodate varying JSON structures. Mark them as required as needed with the `strictProperties` option.

## Usage

Import the `jsonToTypeDefinition` function from `apiful/utils`. Pass your JSON data and specify the interface name you want to generate. The function returns a string containing the TypeScript type definition.

A JSON object becomes an interface, any other JSON value a type alias, named after the `typeName` option or `Root` by default. Use the `strictProperties` option to mark all properties as required.

Here is an example of generating a type definition for a JSON response:

> [!TIP]
> This is particularly useful for creating types from API responses during development, then manually refining them for production use.

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

The `responseTypeDefinition` variable will contain the following TypeScript interface as a string:

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

> [!TIP]
> You can use the generated type definitions directly in your code or save them to a `.ts` file for better type support in your TypeScript projects.

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

The input parameter `data` is a JSON object or any other valid JSON value. For reference, here is the definition of the `JsonValue` type:

```ts
type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined }
type JsonArray = JsonValue[] | readonly JsonValue[]
type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonArray
```
