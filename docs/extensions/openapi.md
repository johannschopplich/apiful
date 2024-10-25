# `OpenAPIBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension) and wraps [ofetch](https://github.com/unjs/ofetch) under the hood.

This built-in APIful extension adds type-safety for API calls based on an OpenAPI schema. This includes path names, supported HTTP methods, request body, response body, query parameters, and headers.

In order to use this extension, APIful needs to generate TypeScript definitions from your OpenAPI schema files beforehand.

## TypeScript Definitions Generation

Before initiating the type-safe API client, you need to generate TypeScript definitions from your OpenAPI schema files. You can do this by defining API services with OpenAPI schemas in the `apiful.config.ts` file and running the [`generate`](/guide/cli) command of the APIful CLI.

Create an `apiful.config.ts` file and define your API services. For example, let's define a `petStore` service using the OpenAPI schema from the [Swagger Petstore](https://petstore.swagger.io) API:

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

> [!NOTE]
> Make sure the generated `apiful.d.ts` is not excluded by your `tsconfig.json` configuration.

## Using the `OpenAPIBuilder` Extension

After you have generated the TypeScript definitions file, you can use the `OpenAPIBuilder` extension to create a type-safe API client:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const baseURL = 'https://petstore3.swagger.io/api/v3'
const adapter = OpenAPIBuilder<'petStore'>()
const petStore = createClient({ baseURL }).with(adapter)
```

Now, the responses are typed based on the OpenAPI specification. For example, the following code snippet fetches a user by username:

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
