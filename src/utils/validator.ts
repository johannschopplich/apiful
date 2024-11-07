export const validatorSymbol = Symbol.for('apiful.validator')

export type ValidationResult<T> =
  | { success: true, value: T }
  | { success: false, error: Error }

export interface Validator<T = unknown> {
  [validatorSymbol]: true

  /**
   * Optional. Validates that the structure of a value matches this schema,
   * and returns a typed version of the value if it does.
   */
  readonly validate?: (value: unknown) => ValidationResult<T>
}

/**
 * Create a validator.
 *
 * @param validate A validation function for the schema.
 */
export function validator<T>(
  validate?: ((value: unknown) => ValidationResult<T>),
): Validator<T> {
  return { [validatorSymbol]: true, validate }
}
