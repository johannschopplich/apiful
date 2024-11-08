# Schema & Validation Utilities

Schemas and their validation are a common requirement in API development. APIful provides a comprehensive set of utilities for creating and validating schemas using JSON Schema and TypeScript, providing both type safety and runtime validation.

## Core Concepts

### Validators

The foundation of the validation system is the `Validator<T>` interface, which provides type-safe validation capabilities:

```ts
interface Validator<T = unknown> {
  /**
   * Optional. Validates that the structure of a value matches this schema,
   * and returns a typed version of the value if it does.
   */
  readonly validate?: (value: unknown) => ValidationResult<T>
}
```

### Schemas

Schemas extend validators with JSON Schema support:

```ts
interface Schema<T = unknown> extends Validator<T> {
  /**
   * Schema type for inference.
   */
  _type: T

  readonly jsonSchema: JSONSchema7
}
```

## Creating Schemas

Schemas are created using the `jsonSchema` utility function.

```ts
import { jsonSchema } from 'apiful/utils'

const userSchema = jsonSchema<{
  id: number
  name: string
}>({
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' }
  },
  required: ['id', 'name']
})
```

### Custom Validation Logic

You can provide custom validation logic alongside the JSON Schema:

```ts
const userSchema = jsonSchema<User>(
  {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' }
    },
    required: ['id', 'name']
  },
  {
    validate: (value) => {
      if (myValidationLogic(value)) {
        return { success: false, error: new Error('Custom validation failed') }
      }
      return { success: true, value: value as User }
    }
  }
)
```

## Validation

### Unsafe Validation

Use the `validateTypes` function for scenarios where validation failures should throw errors:

```ts
import { validateTypes } from 'apiful/utils'

try {
  const user = validateTypes({
    value: data,
    schema: userSchema
  })
  // user is typed as { id: number, name: string }
}
catch (error) {
  if (error instanceof TypeValidationError) {
    console.error('Validation failed:', error.value, error.cause)
  }
}
```

### Safe Validation

For graceful error handling, use `safeValidateTypes` for handling validation results without throwing:

```ts
import { safeValidateTypes } from 'apiful/utils'

const result = safeValidateTypes({
  value: data,
  schema: userSchema
})

if (result.success) {
  // `result.value` is typed data
  console.log(result.value.name)
}
else {
  // `TypeValidationError` with details
  console.error(result.error.value, result.error.cause)
}
```

## Custom Validators

You can create standalone validators without JSON Schema using the `validator` function:

```ts
import { validator } from 'apiful/utils'

const emailValidator = validator<string>((value) => {
  if (typeof value !== 'string' || !value.includes('@'))
    return { success: false, error: new Error('Invalid email') }

  return { success: true, value }
})
```

## Type Guards

### Schema Type Guard

Ensure a value is a valid `Schema` using the `isSchema` type guard:

```ts
import { isSchema } from 'apiful/utils'

if (isSchema(value)) {
  console.log(value.jsonSchema)
}
```

### Validator Type Guard

Ensure a value is a valid `Validator` using the `isValidator` type guard:

```ts
import { isValidator } from 'apiful/utils'

if (isValidator(value)) {
  if (value.validate) {
    const result = value.validate(someValue)
  }
}
```

## Error Handling

### TypeValidationError

Thrown during validation failures with detailed context:

```ts
declare class TypeValidationError extends Error {
  readonly value: unknown // The value that failed validation
  readonly cause?: unknown // The underlying cause of the failure
}
```

### Error Messages

Error messages are automatically formatted to include:

- The invalid value (JSON stringified)
- The cause of the validation failure
- Proper error message extraction from various error types

## Best Practices

1. **Type Safety**: Always provide explicit types when creating schemas:
   ```ts
   jsonSchema<YourType>({ /* ... */ })
   ```

2. **Error Handling**: Choose the appropriate validation method:
   - Use `validateTypes` when validation failures should halt execution
   - Use `safeValidateTypes` when you need to handle validation errors gracefully

3. **Custom Validation**: Combine JSON Schema with custom validators for complex validation rules

4. **Modularity**: Create reusable schemas and validators for common patterns

5. **Type Guards**: Use type guards when working with dynamic schemas or validators
