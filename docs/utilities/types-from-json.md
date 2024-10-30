# Generate Types from JSON

APIful provides a utility for generating TypeScript interfaces from JSON data. This is especially useful if you want to create type definitions for your API responses or work with dynamic JSON structures.

> [!NOTE]
> All properties in generated interfaces are optional by default to accommodate varying JSON structures.

## Usage

Import the `generateTypeFromJson` function from `apiful/utils`. Pass it your JSON data and a type name of your choice, and it will return a string containing the TypeScript interface definition.

```ts
import { generateTypeFromJson } from 'apiful/utils'

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

const apiTypeDefinitiom = await generateTypeFromJson(apiReponse, 'Response')
```

The `apiTypeDefinitiom` variable will contain the following TypeScript interface:

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
declare function generateTypeFromJson(
  data: Record<string, JsonValue>,
  typeName: string
): Promise<string>
```

### Parameters

- `data`: A JavaScript object containing the JSON structure to convert.
- `typeName`: The name to use for the generated interface.

### Returns

A `Promise` that resolves to a string containing the TypeScript interface definition.
