# OpenAPI Type Helpers

When building clients with the [`OpenAPIBuilder` extension](/extensions/openapi), you may want to access the request and response types for each operation in the OpenAPI schema. APIful provides a set of shorthand types to help you with this.

## Basic Operation Helpers

Given the API service name `petStore`, APIful generates the following types:

- `PetStoreRequestBody`
- `PetStoreRequestQuery`
- `PetStoreResponse`

You can use these types to access types for query parameters, response body, etc.:

```ts
import type {
  PetStoreRequestBody,
  PetStoreRequestQuery,
  PetStoreResponse
} from 'apiful/schema'

type Status = PetStoreRequestQuery<'findPetsByStatus'>['status']
//   ^? "available" | "pending" | "sold" | undefined

type Pet = PetStoreResponse<'getPetById'>
```

The `Pet` shorthand will be expanded to the following type:

```ts
interface _Pet {
  id?: number
  name: string
  category?: components['schemas']['Category']
  photoUrls: string[]
  tags?: components['schemas']['Tag'][]
  status?: 'available' | 'pending' | 'sold'
}
```

## Path-based Type Helpers

In addition to operation-based helpers, APIful also provides more direct path-based type helpers. These allow you to extract types directly from path and HTTP method combinations:

- `PathParamsFrom<API>` - Extract path parameters for a specific path and method
- `RequestBodyFrom<API>` - Extract request body type for a specific path and method
- `QueryParamsFrom<API>` - Extract query parameters for a specific path and method
- `ResponseFrom<API>` - Extract response body type for a specific path and method with optional status code

### Examples

Using the same `petStore` API, you can access types directly from paths:

```ts
import type {
  PathParamsFromPetStore,
  RequestBodyFromPetStore,
  QueryParamsFromPetStore,
  ResponseFromPetStore
} from 'apiful/schema'

// Path parameters for GET /pet/{petId}
type PetIdParam = PathParamsFromPetStore<'/pet/{petId}', 'get'>
//   ^? { petId: number }

// Request body for POST /pet
type CreatePetBody = RequestBodyFromPetStore<'/pet', 'post'>
//   ^? { id?: number; name: string; /* ... */ }

// Query parameters for GET /pet/findByStatus
type StatusQueryParam = QueryParamsFromPetStore<'/pet/findByStatus', 'get'>
//   ^? { status?: "available" | "pending" | "sold" }

// Response type for GET /pet/{petId}
type PetResponse = ResponseFromPetStore<'/pet/{petId}', 'get'>
//   ^? { id?: number; name: string; /* ... */ }

// Response type for a specific status code (e.g., 201 Created)
type CreatedPetResponse = ResponseFromPetStore<'/pet', 'post', '201'>
```

### Benefits of Path-based Helpers

The path-based helpers offer several advantages:

1. **Direct access by URL path** - Use the actual API path as you would write it in your code
2. **HTTP method specificity** - Extract types for specific HTTP methods on the same path
3. **Status code support** - Extract response types for specific status codes
4. **IDE integration** - Better completion support in IDEs since paths are directly tied to your OpenAPI schema

These path-based helpers work particularly well when you want to type parameters or responses for specific API endpoints that you're working with in your code.
