import type { Schema } from '../../src/utils/schema'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { isSchema, jsonSchema } from '../../src/utils/schema'

describe('schema', () => {
  describe('jsonSchema', () => {
    it('creates schema with JSON schema definition', () => {
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

    it('creates schema with custom validation function', () => {
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
    it('identifies valid schema objects', () => {
      const schema = jsonSchema<string>({ type: 'string' })
      expect(isSchema(schema)).toBe(true)
    })

    it('rejects non-schema objects', () => {
      expect(isSchema({})).toBe(false)
      expect(isSchema(null)).toBe(false)
      expect(isSchema(undefined)).toBe(false)
    })
  })
})
