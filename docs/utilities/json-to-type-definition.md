# JSON to Type Definition

APIful provides a utility for generating TypeScript interfaces from JSON data. This is especially useful if you want to create type definitions for your API responses or work with dynamic JSON structures.

> [!NOTE]
> All properties in generated interfaces are optional by default to accommodate varying JSON structures. Mark them as required as needed with the `strictProperties` option.

## Usage

Import the `jsonToTypeDefinition` function from `apiful/utils`. Pass it your JSON data and define the interface name you want to generate. The function returns a promise that resolves to a string containing the TypeScript interface definition.

```ts
import { jsonToTypeDefinition } from 'apiful/utils'

const apiReponse = {
  status: 'success',
  data: {
    id: 123,
    items: [
      { name: 'Item 1', price: 10 },
      { name: 'Item 2', price: 20 }
    ],
    metadata: {
      total: 2,
      page: 1
    }
  }
}

const apiTypeDefinition = await jsonToTypeDefinition(apiReponse, 'Response')
```

The `apiTypeDefinition` variable will contain the following TypeScript interface as a string:

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
  typeName: string
  /** @default false */
  strictProperties: boolean
  /** @default '' */
  bannerComment: string
}

declare function jsonToTypeDefinition(
  data: Record<string, JsonValue>,
  options?: Partial<TypeDefinitionOptions>,
): Promise<string>
```