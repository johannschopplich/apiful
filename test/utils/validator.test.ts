import type { Validator } from '../../src/utils/validator'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  isValidator,
  safeValidateTypes,
  TypeValidationError,
  validateTypes,
  validator,
} from '../../src/utils/validator'

describe('validator', () => {
  const schema = validator<number>((value) => {
    if (typeof value === 'number') {
      return { success: true, value }
    }
    return { success: false, error: new Error('Not a number') }
  })

  describe('validator', () => {
    it('creates validator instance with default behavior', () => {
      const testValidator = validator<string>()
      expectTypeOf(testValidator).toEqualTypeOf<Validator<string>>()
    })

    it('creates validator with custom validation logic', () => {
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
    it('validates and returns value when schema matches', () => {
      const result = validateTypes({ value: 42, schema })
      expect(result).toBe(42)
    })

    it('throws TypeValidationError on validation failure', () => {
      expect(() => validateTypes({ value: 'not a number', schema }))
        .toThrow(TypeValidationError)
    })

    it('passes through value without validation function', () => {
      const schema = validator<string>()
      const result = validateTypes({ value: 'test', schema })
      expect(result).toBe('test')
    })
  })

  describe('safeValidateTypes', () => {
    it('returns success result on validation pass', () => {
      const result = safeValidateTypes({ value: 42, schema })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value).toBe(42)
      }
    })

    it('returns failure result on validation error', () => {
      const result = safeValidateTypes({ value: 'not a number', schema })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(TypeValidationError)
      }
    })
  })

  describe('isValidator', () => {
    it('identifies valid validator objects', () => {
      const testValidator = validator<string>()
      expect(isValidator(testValidator)).toBe(true)
    })

    it('rejects non-validator objects', () => {
      expect(isValidator({})).toBe(false)
      expect(isValidator(null)).toBe(false)
      expect(isValidator(undefined)).toBe(false)
    })
  })
})
