# OpenAPI Type Helpers

[`apiful generate`](/guide/cli) declares a set of type helpers per service in `apiful/schema`. They name the types of one operation, or of one schema in `components`, so you never write them by hand.

## One Helper per Operation

The helper named after the service – `PetStore` for `petStore` – takes a path and a method, following the pattern `Service<Path, Method>`, and holds every type of that operation:

```ts
import type { PetStore } from 'apiful/schema'

type UserEndpoint = PetStore<'/user/{username}', 'get'>

type PathParams = UserEndpoint['path']
//   ^? { username: string }
type QueryParams = UserEndpoint['query']
//   ^? never
type RequestBody = UserEndpoint['request']
//   ^? undefined
type Response = UserEndpoint['response']
//   ^? { id?: number; username?: string; … }
type NotFound = UserEndpoint['responses'][404]
//   ^? undefined
```

Both parameters are required, and both are checked against the OpenAPI document. A path the service does not declare is a compile error, and so is a method the path does not allow – `PetStore<'/pet', 'get'>` does not compile, because the Petstore declares only `post` and `put` there.

## Core Type Properties

| Property | Description | Example |
|----------|-------------|---------|
| `path` | Path parameters the operation declares | `{ petId: number }` |
| `query` | Query parameters the operation declares | `{ status?: 'available' \| 'pending' \| 'sold' }` |
| `request` | Request body, for whichever media type the operation declares | `{ name: string; photoUrls: string[] }` |
| `response` | Body of the successful response, for whichever 2xx status the operation declares | `{ id?: number; name: string }` |
| `responses` | Map of every status code the operation declares to the body it returns | `{ 200: Pet; 400: undefined; 404: undefined; default: undefined }` |
| `error` | Body of every 4xx, 5xx, and `default` response the operation declares, as one union | `Error` |
| `fullPath` | The complete path template, as the OpenAPI document declares it | `'/pet/{petId}'` |
| `method` | HTTP method verb for the operation | `'get'` |
| `operation` | The operation as `paths` declares it | `{ parameters: …; requestBody: …; responses: … }` |

Where an operation declares nothing at all for a property, the type says so rather than inventing an empty object: `path` and `query` are `never`, `request` is `undefined`, and `response` is `undefined` where the 2xx status declares no content and `never` where the operation declares no 2xx status.

`request` and `response` resolve through the same types a request resolves through, so a value annotated with `Service<Path, Method>['response']` is exactly what the client hands back for that call.

A request body the operation marks optional comes back widened with `undefined`, matching what the client accepts:

```ts
type PlaceOrderBody = PetStore<'/store/order', 'post'>['request']
//   ^? Order | URLSearchParams | undefined
```

`responses` holds only the codes the operation itself declares, so `PetStore<'/pet', 'post'>['responses']` offers `200`, `400`, `422`, and `default` and nothing else. A status declared without a response body – which is every error and every `default` in the Petstore – resolves to `undefined`, the same answer the thrown error gives on its `data`.

This is the body a status maps to. To type the error a failed request actually throws, use [`FetchResponseError`](/extensions/openapi#catch-error-responses).

## Path and Method Discovery

`PetStoreApiPaths` lists every path of the service, and `PetStoreApiMethods` the methods of one path:

```ts
import type { PetStoreApiMethods, PetStoreApiPaths } from 'apiful/schema'

// Get all available paths
type AllPaths = PetStoreApiPaths
//   ^? '/pet' | '/pet/{petId}' | '/pet/findByStatus' | /* ... */

// Get all available methods for a specific path
type PetMethods = PetStoreApiMethods<'/pet'>
//   ^? 'post' | 'put'
```

Only the methods the path declares are listed.

## Schema Model Types

`PetStoreModel` reads a schema from `components` by name, without going through an operation:

```ts
import type { PetStoreModel } from 'apiful/schema'

type Pet = PetStoreModel<'Pet'>
//   ^? { id?: number; name: string; category?: Category; photoUrls: string[]; tags?: Tag[]; status?: 'available' | 'pending' | 'sold' }

type Category = PetStoreModel<'Category'>
//   ^? { id?: number; name?: string }

type User = PetStoreModel<'User'>
//   ^? { id?: number; username?: string; firstName?: string; lastName?: string; email?: string; password?: string; phone?: string; userStatus?: number }
```
