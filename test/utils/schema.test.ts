import type { Schema } from '../../src/utils/schema.ts'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isSchema, jsonSchema } from '../../src/utils/schema.ts'

describe('schema', () => {
  describe('jsonSchema', () => {
    it('creates a valid schema', () => {
      const schema = jsonSchema<string>({
        type: 'string',
      })
      expectTypeOf(schema).toEqualTypeOf<Schema<string>>()
      expect(schema.jsonSchema).toMatchInlineSnapshot(`
        {
          "type": "string",
        }
      `)
    })

    it('creates a schema with custom validation', () => {
      const schema = jsonSchema<number>(
        {
          type: 'number',
        },
        {
          validate: (value) => {
            if (typeof value === 'number') {
              return { success: true, value }
            }
            return { success: false, error: new Error('Not a number') }
          },
        },
      )

      expectTypeOf(schema).toEqualTypeOf<Schema<number>>()
      expect(schema.validate).toBeDefined()
    })
  })

  describe('isSchema', () => {
    it('returns true for valid schemas', () => {
      const schema = jsonSchema<string>({ type: 'string' })
      expect(isSchema(schema)).toBe(true)
    })

    it('returns false for non-schemas', () => {
      expect(isSchema({})).toBe(false)
      expect(isSchema(null)).toBe(false)
      expect(isSchema(undefined)).toBe(false)
    })
  })
})
