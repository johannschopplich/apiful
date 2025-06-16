# `OpenAPIBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) that wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

This built-in extension provides complete type safety for API calls based on OpenAPI schemas. You get full TypeScript support for paths, HTTP methods, request bodies, response types, query parameters, and headers.

To use this extension, APIful must first generate TypeScript definitions from your OpenAPI schema files.

## Prerequisites

To keep the package size small, APIful does not include `openapi-typescript` as a dependency. Install the package using your preferred package manager:

::: code-group
  ```bash [pnpm]
  pnpm add -D openapi-typescript
  ```
  ```bash [yarn]
  yarn add -D openapi-typescript
  ```
  ```bash [npm]
  npm install -D openapi-typescript
  ```
:::

> [!NOTE]
> `openapi-typescript` is only needed during development for type generation. It will not be included in your production bundle.

## TypeScript Definitions Generation

Before creating your type-safe API client, generate TypeScript definitions from your OpenAPI schema files. This involves creating an `apiful.config.ts` file with your API services and running the APIful CLI.

Create an `apiful.config.ts` file and define your API services. Here is an example using the [Swagger Petstore](https://petstore.swagger.io) API:

```ts
import { defineApifulConfig } from 'apiful/config'

export default defineApifulConfig({
  services: {
    petStore: {
      schema: 'https://petstore3.swagger.io/api/v3/openapi.json',
    },
  },
})
```

Then, run the [`generate`](/guide/cli) command in your terminal to generate the TypeScript definitions, saved as `apiful.d.ts`. It augments the `apiful/schema` module with the generated types, so that this extension and you can access the globally defined types.

```sh
npx apiful generate
```

Done! You can now use the `OpenAPIBuilder` extension to create a type-safe API client. Make sure you pass the **service name** to it as a generic parameter, such as `OpenAPIBuilder<'petStore'>()`. Follow the next chapter for more details.

> [!IMPORTANT]
> Make sure the generated `apiful.d.ts` file is not excluded by your `tsconfig.json` configuration. TypeScript needs to find this file to provide typed definitions for your OpenAPI schema.

> [!TIP]
> Run the generate command whenever your OpenAPI schema changes to keep your types up-to-date. Consider adding it to your build process or a pre-commit hook.

## Using the `OpenAPIBuilder` Extension

Once you have generated the TypeScript definitions, create a type-safe API client using the `OpenAPIBuilder` extension:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const baseURL = 'https://petstore3.swagger.io/api/v3'
const adapter = OpenAPIBuilder<'petStore'>()
const petStore = createClient({ baseURL }).with(adapter)
```

Your client now provides full type safety based on the OpenAPI specification. Here is how to fetch a user by username:

```ts
const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
```

The response returned by the API call on the left is typed as follows:

```ts
declare const userResponse: {
  id?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  phone?: string
  userStatus?: number
}
```

## OpenAPI Path Parameters

OpenAPI can define path parameters on given endpoints. They are typically declared as `/foo/{id}`. Unfortunately, the endpoint type is not defined as `/foo/10`. Thus, using the latter as the path will break type inference.

Instead, use the property `path` to pass an object of the parameters. You can then use the declared path for type inference, and the type checker will ensure you provide all required path parameters. The parameters will be interpolated into the path before the request is made.

```ts
const response = await petStore('/foo/{id}', {
  path: {
    id: 10,
  },
})
```

> [!WARNING]
> Incorrect parameters will not be reported at runtime. An incomplete path will be sent to the backend _as-is_.

## Request Headers

Add headers to the request using the `headers`field. All headers defined in the OpenAPI schema will be type checked. You can still add additional headers that are not defined in the schema, which will not be type checked.

```ts
const response = await petStore('/some/endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',
  }
})
```
