# OpenAPI Type Helpers

When building clients with the [`OpenAPIBuilder` extension](/extensions/openapi), you may want to access the request and response types for each operation in the OpenAPI schema. APIful provides a set of shorthand types to help you with this.

## Example

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
