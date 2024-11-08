import type { JSONSchema7 } from 'json-schema'
import type { ValidationResult, Validator } from './validator'
import { validatorSymbol } from './validator'

const schemaSymbol = Symbol.for('apiful.schema')

export interface Schema<T = unknown> extends Validator<T> {
  [schemaSymbol]: true

  /**
   * Schema type for inference.
   */
  _type: T

  /**
   * The JSON Schema for the schema.
   */
  readonly jsonSchema: JSONSchema7
}

/**
 * Create a schema using a JSON Schema.
 */
export function jsonSchema<T = unknown>(
  jsonSchema: JSONSchema7,
  { validate }: {
    validate?: (value: unknown) => ValidationResult<T>
  } = {},
): Schema<T> {
  return {
    [schemaSymbol]: true,
    _type: undefined as T, // Should never be used directly
    [validatorSymbol]: true,
    jsonSchema,
    validate,
  }
}

export function isSchema(value: unknown): value is Schema {
  return (
    typeof value === 'object'
    && value !== null
    && schemaSymbol in value
    && value[schemaSymbol] === true
    && 'jsonSchema' in value
    && 'validate' in value
  )
}
