import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  isValidator,
  safeValidateTypes,
  TypeValidationError,
  validateTypes,
  validator,
  type Validator,
} from '../../src/utils/validator'

describe('validator', () => {
  const schema = validator<number>((value) => {
    if (typeof value === 'number') {
      return { success: true, value }
    }
    return { success: false, error: new Error('Not a number') }
  })

  describe('validator', () => {
    it('creates a valid validator', () => {
      const testValidator = validator<string>()
      expectTypeOf(testValidator).toEqualTypeOf<Validator<string>>()
    })

    it('creates a validator with custom validation function', () => {
      const customValidator = validator<number>((value) => {
        if (typeof value === 'number') {
          return { success: true, value }
        }
        return { success: false, error: new Error('Not a number') }
      })

      expectTypeOf(customValidator).toEqualTypeOf<Validator<number>>()
      expect(customValidator.validate).toBeDefined()
      expect(customValidator.validate!(42)).toEqual({ success: true, value: 42 })
    })
  })

  describe('validateTypes', () => {
    it('validates successfully when schema matches', () => {
      const result = validateTypes({ value: 42, schema })
      expect(result).toBe(42)
    })

    it('throws TypeValidationError when validation fails', () => {
      expect(() => validateTypes({ value: 'not a number', schema }))
        .toThrow(TypeValidationError)
    })

    it('passes through value when no validate function is provided', () => {
      const schema = validator<string>()
      const result = validateTypes({ value: 'test', schema })
      expect(result).toBe('test')
    })
  })

  describe('safeValidateTypes', () => {
    it('returns success result when validation passes', () => {
      const result = safeValidateTypes({ value: 42, schema })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toBe(42)
      }
    })

    it('returns failure result when validation fails', () => {
      const result = safeValidateTypes({ value: 'not a number', schema })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(TypeValidationError)
      }
    })
  })

  describe('isValidator', () => {
    it('returns true for valid validators', () => {
      const testValidator = validator<string>()
      expect(isValidator(testValidator)).toBe(true)
    })

    it('returns false for non-validators', () => {
      expect(isValidator({})).toBe(false)
      expect(isValidator(null)).toBe(false)
      expect(isValidator(undefined)).toBe(false)
    })
  })
})
