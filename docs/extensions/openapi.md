# `OpenAPIBuilder`

> [!NOTE]
> This is a [handler extension](/guide/custom-extensions#handler-extension).

The OpenAPI built-in extension adds type-safety for API calls based on an OpenAPI schema. This includes path names, supported HTTP methods, request body, response body, query parameters, and headers.

In order to use this extension, APIful needs to generate TypeScript definitions from your OpenAPI schema files beforehand.

> [!NOTE]
> APIful will generate the TypeScript definitions for any OpenAPI schemas that you want to work with. Make sure to save it as a `.d.ts` file in your project and reference it in your `tsconfig.json` file, if it is not included by default.

## Schema Generation

APIful provides a `generateDTS` function that generates a TypeScript definition file that you must place in an appropriate location in your project.

Let us take this `prepare.ts' file as an example:

```ts
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineEndpoints, generateDTS } from 'apiful/openapi'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

export const endpoints = defineEndpoints({
  petStore: {
    // See: https://petstore3.swagger.io/api/v3/openapi.json
    schema: path.join(currentDir, 'schemas/pet-store.json'),
  },
})

const types = await generateDTS(endpoints)
await fsp.writeFile('apiful.d.ts', types)
```

> [!NOTE]
> The [`openapi-typescript`](https://www.npmjs.com/package/openapi-typescript) library is used to generate the TypeScript definitions.

## Using the `OpenAPIBuilder` Extension

After you have generated the TypeScript definitions file, you can use the `OpenAPIBuilder` extension to add type-safety to your API calls:

```ts
import { createClient, OpenAPIBuilder } from 'apiful'

const baseURL = 'https://petstore3.swagger.io/api/v3'
const adapter = OpenAPIBuilder<'petStore'>()
const petStore = createClient({ baseURL }).with(adapter)

// The response is typed based on the OpenAPI specification
const userResponse = await petStore('/user/{username}', {
  method: 'GET',
  path: { username: 'user1' },
})
console.log(userResponse)
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
