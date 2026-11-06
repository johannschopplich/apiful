# OpenAPI Type Helpers

[`apiful generate`](/guide/cli) declares a set of type helpers per service in `apiful/schema`. They name the request and response types of one operation, so you never write them by hand.

## One Helper per Operation

The helper named after the service – `PetStore` for `petStore` – takes a path and a method, following the pattern `Service<Path, Method>`, and holds every type of that operation:

```ts
import type { PetStore } from 'apiful/schema'

type UserEndpoint = PetStore<'/user/{username}', 'get'>

// Extract any part of the endpoint
type PathParams = UserEndpoint['path'] // { username: string }
type QueryParams = UserEndpoint['query'] // Query parameters
type RequestBody = UserEndpoint['request'] // Request body type
type Response = UserEndpoint['response'] // Success response
type ErrorResponse = UserEndpoint['responses'][404] // Specific status code
```

Both parameters are required, and both are checked against the schema. A path the service doesn't declare is a compile error, and so is a method the path doesn't allow – `PetStore<'/pet', 'get'>` doesn't compile, because the Petstore declares only `post` and `put` there.

## Core Type Properties

Each property is one type of the operation:

| Property | Description | Example |
|----------|-------------|---------|
| `path` | Path parameters extracted from URL segments enclosed in braces | `{ petId: number }` |
| `query` | Query string parameters that can be appended to the URL | `{ status?: 'available' \| 'pending' \| 'sold' }` |
| `request` | Request body, for whichever media type the operation declares | `{ name: string; photoUrls: string[] }` |
| `response` | Body of the successful response, for whichever 2xx status the operation declares | `{ id?: number; name: string }` |
| `responses` | Map of every status code the operation declares to the body it returns | `{ 200: Pet; 400: undefined; 404: undefined }` |
| `error` | Body of every 4xx, 5xx, and `default` response the operation declares, as one union | `Error` |
| `fullPath` | The complete path template as defined in the OpenAPI spec | `'/pet/{petId}'` |
| `method` | HTTP method verb for the operation | `'get'` |
| `operation` | Complete OpenAPI operation object with all metadata | Complete operation object |

Where an operation declares nothing at all for a property, the type says so rather than inventing an empty object: `path` and `query` are `never`, `request` is `undefined`, and `response` is `undefined` where the 2xx status declares no content and `never` where the operation declares no 2xx status.

`request` and `response` resolve through the same helpers a request resolves through, so a value annotated with `Service<Path, Method>['response']` is exactly what the client hands back for that call.

## Examples

### Basic Type Extraction

Extract individual type components for use in your application logic, form validation, or component props:

```ts
import type { PetStore } from 'apiful/schema'

// Extract path parameters
type PetParams = PetStore<'/pet/{petId}', 'get'>['path']
//   ^? { petId: number }

// Extract query parameters
type StatusQuery = PetStore<'/pet/findByStatus', 'get'>['query']
//   ^? { status?: "available" | "pending" | "sold" }

// Extract request body
type CreatePetBody = PetStore<'/pet', 'post'>['request']
//   ^? { id?: number; name: string; category?: Category; photoUrls: string[]; tags?: Tag[]; status?: 'available' | 'pending' | 'sold' } | URLSearchParams

// Extract response type
type PetResponse = PetStore<'/pet/{petId}', 'get'>['response']
//   ^? { id?: number; name: string; category?: Category; photoUrls: string[]; tags?: Tag[]; status?: 'available' | 'pending' | 'sold' }
```

A request body the schema marks optional comes back widened with `undefined`, matching what the client accepts:

```ts
type PlaceOrderBody = PetStore<'/store/order', 'post'>['request']
//   ^? Order | URLSearchParams | undefined
```

### Error Response Types

`responses` maps every status code the operation declares to the body it returns:

```ts
// All responses the endpoint declares
type AllPetResponses = PetStore<'/pet/{petId}', 'get'>['responses']
//   ^? { 200: Pet; 400: undefined; 404: undefined }

// A single status code
type PetNotFound = PetStore<'/pet/{petId}', 'get'>['responses'][404]
//   ^? undefined
```

Only the codes the operation itself declares are available, so `PetStore<'/pet', 'post'>['responses']` offers `200` and `405` and nothing else. A status declared without a response body – which is every error in the Petstore schema – resolves to `undefined`, the same answer the thrown error gives on its `data`.

This is the body a status maps to. To type the error a failed request actually throws, use [`FetchResponseError`](/extensions/openapi#error-responses).

## Schema Discovery

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

// Extract schema models directly
type Pet = PetStoreModel<'Pet'>
//   ^? { id?: number; name: string; category?: Category; photoUrls: string[]; tags?: Tag[]; status?: 'available' | 'pending' | 'sold' }

type Category = PetStoreModel<'Category'>
//   ^? { id?: number; name?: string }

type User = PetStoreModel<'User'>
//   ^? { id?: number; username?: string; firstName?: string; lastName?: string; email?: string; password?: string; phone?: string; userStatus?: number }
```
