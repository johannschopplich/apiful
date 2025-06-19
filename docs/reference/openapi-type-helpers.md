# OpenAPI Type Helpers

When building clients with the [`OpenAPIBuilder` extension](/extensions/openapi), you may want to extract TypeScript types from your OpenAPI schema. APIful generates a comprehensive type system that lets you access request and response types for any endpoint without manually defining them.

## Why Use Type Helpers?

Instead of writing types manually for each API endpoint, you can extract them directly from your OpenAPI schema:

```ts
// ❌ Manual type definition (error-prone, out of sync)
interface CreateUserRequest {
  name: string
  email: string
}

// ✅ Extract from OpenAPI schema (always up-to-date)
type CreateUserRequest = PetStore<'/user', 'post'>['request']
```

## The Unified Type Interface

APIful generates a unified type interface for each service that gives you access to all endpoint information:

```ts
import type { PetStore } from 'apiful/schema'

// The unified interface: Service<Path, Method>
type UserEndpoint = PetStore<'/user/{username}', 'get'>

// Extract any part of the endpoint
type PathParams = UserEndpoint['path'] // { username: string }
type QueryParams = UserEndpoint['query'] // Query parameters
type RequestBody = UserEndpoint['request'] // Request body type
type Response = UserEndpoint['response'] // Success response (200)
type ErrorResponse = UserEndpoint['responses'][404] // Specific status code
```

## Core Type Properties

Every endpoint type provides these properties:

| Property | Description | Example |
|----------|-------------|---------|
| `path` | Path parameters | `{ petId: number }` |
| `query` | Query parameters | `{ status: 'available' \| 'pending' }` |
| `request` | Request body type | `{ name: string; category: Category }` |
| `response` | Default response (200) | `{ id: number; name: string }` |
| `responses` | All status responses | `{ 200: Pet; 404: Error; 400: ValidationError }` |
| `fullPath` | Complete path string | `'/pet/{petId}'` |
| `method` | HTTP method | `'get'` |
| `operation` | Full OpenAPI operation | Complete operation object |

## Practical Examples

### Basic Type Extraction

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
//   ^? { id?: number; name: string; category: Category }

// Extract response type
type PetResponse = PetStore<'/pet/{petId}', 'get'>['response']
//   ^? { id?: number; name: string; status: string }
```

### Error Handling Types

```ts
// Extract specific error response types
type NotFoundError = PetStore<'/pet/{petId}', 'get'>['responses'][404]
type ValidationError = PetStore<'/pet', 'post'>['responses'][400]

// All possible responses for an endpoint
type AllPetResponses = PetStore<'/pet/{petId}', 'get'>['responses']
//   ^? { 200: Pet; 404: NotFoundError; 400: ValidationError }
```

## Schema Discovery

APIful generates helper types for exploring your API:

```ts
import type { PetStoreApiMethods, PetStoreApiPaths } from 'apiful/schema'

// Get all available paths
type AllPaths = PetStoreApiPaths
//   ^? '/pet' | '/pet/{petId}' | '/pet/findByStatus' | /* ... */

// Get all available methods for a specific path
type PetMethods = PetStoreApiMethods<'/pet'>
//   ^? 'get' | 'post' | 'put'
```

## Schema Model Types

APIful also generates a dedicated helper for extracting OpenAPI schema models directly:

```ts
import type { PetStoreModel } from 'apiful/schema'

// Extract schema models directly
type Pet = PetStoreModel<'Pet'>
//   ^? { id?: number; name: string; category: Category; photoUrls: string[]; tags?: Tag[]; status?: 'available' | 'pending' | 'sold' }

type Category = PetStoreModel<'Category'>
//   ^? { id?: number; name?: string }

type User = PetStoreModel<'User'>
//   ^? { id?: number; username?: string; firstName?: string; lastName?: string; email?: string; password?: string; phone?: string; userStatus?: number }
```

This is particularly useful when you need to work with schema models independently of specific endpoints, such as for creating reusable components or utility functions.
