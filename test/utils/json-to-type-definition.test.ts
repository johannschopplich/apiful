import type { JsonValue } from '../../src/utils'
import { describe, expect, it } from 'vitest'
import { jsonToTypeDefinition } from '../../src/utils/json-to-type-definition'

describe('jsonToTypeDefinition', () => {
  describe('primitive types', () => {
    it('handles string', async () => {
      const result = await jsonToTypeDefinition('test', { typeName: 'StringType' })
      expect(result).toContain('export type StringType = string')
    })

    it('handles number', async () => {
      const result = await jsonToTypeDefinition(42, { typeName: 'NumberType' })
      expect(result).toContain('export type NumberType = number')
    })

    it('handles boolean', async () => {
      const result = await jsonToTypeDefinition(true, { typeName: 'BooleanType' })
      expect(result).toContain('export type BooleanType = boolean')
    })

    it('handles null', async () => {
      const result = await jsonToTypeDefinition(null, { typeName: 'NullType' })
      expect(result).toContain('export type NullType = null')
    })
  })

  describe('arrays', () => {
    it('handles empty array', async () => {
      const result = await jsonToTypeDefinition([], { typeName: 'EmptyArray' })
      expect(result).toContain('export type EmptyArray = unknown[]')
    })

    it('handles homogeneous array', async () => {
      const result = await jsonToTypeDefinition([1, 2, 3], { typeName: 'NumberArray' })
      expect(result).toContain('export type NumberArray = number[]')
    })

    it('handles mixed type array', async () => {
      const result = await jsonToTypeDefinition([1, 'two', true], { typeName: 'MixedArray' })
      expect(result).toContain('(number | string | boolean)[]')
    })

    it('handles nested arrays', async () => {
      const result = await jsonToTypeDefinition([[1, 2], [3, 4]], { typeName: 'Matrix' })
      expect(result).toContain('export type Matrix = number[][]')
    })

    it('merges object properties across array items', async () => {
      const input = [
        { id: 1, name: 'first' },
        { id: 2, email: 'test@example.com' },
      ]
      const result = await jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'ObjectArray' })
      expect(result).toContain('id?: number')
      expect(result).toContain('name?: string')
      expect(result).toContain('email?: string')
    })

    it('filters undefined and sparse values', async () => {
      // eslint-disable-next-line no-sparse-arrays
      const result = await jsonToTypeDefinition([1, undefined, , 3] as unknown as JsonValue, { typeName: 'Filtered' })
      expect(result).toContain('export type Filtered = number[]')
    })

    it('deduplicates primitive types', async () => {
      const result = await jsonToTypeDefinition([null, 'a', null, 'b'], { typeName: 'Dedup' })
      expect(result).toContain('(null | string)[]')
      expect(result).not.toMatch(/null.*null/) // No duplicate null
    })
  })

  describe('objects', () => {
    it('handles empty object', async () => {
      const result = await jsonToTypeDefinition({}, { typeName: 'EmptyObject' })
      expect(result).toContain('[k: string]: unknown')
    })

    it('handles nested objects', async () => {
      const result = await jsonToTypeDefinition({ a: { b: { c: 1 } } }, { typeName: 'Nested' })
      expect(result).toMatchInlineSnapshot(`
        "/* eslint-disable */

        export interface Nested {
          a?: {
            b?: {
              c?: number
            }
          }
        }

        "
      `)
    })

    it('quotes special property names', async () => {
      const result = await jsonToTypeDefinition({ 'kebab-case': 1, '123': 2 }, { typeName: 'Special' })
      expect(result).toContain('"kebab-case"?: number')
      expect(result).toContain('"123"?: number')
    })

    it('excludes undefined properties', async () => {
      const result = await jsonToTypeDefinition({ a: 1, undef: undefined } as unknown as JsonValue, { typeName: 'NoUndef' })
      expect(result).toContain('a?: number')
      expect(result).not.toContain('undef')
    })
  })

  describe('options', () => {
    it('defaults typeName to "Root"', async () => {
      const result = await jsonToTypeDefinition({ value: 1 })
      expect(result).toContain('export interface Root')
    })

    it('makes properties optional by default', async () => {
      const result = await jsonToTypeDefinition({ a: 1 }, { typeName: 'T' })
      expect(result).toContain('a?: number')
    })

    it('makes properties required with strictProperties', async () => {
      const result = await jsonToTypeDefinition({ a: 1 }, { typeName: 'T', strictProperties: true })
      expect(result).toContain('a: number')
      expect(result).not.toContain('?')
    })
  })

  describe('output format', () => {
    it('includes eslint-disable header', async () => {
      const result = await jsonToTypeDefinition({ a: 1 }, { typeName: 'T' })
      expect(result).toMatch(/^\/\* eslint-disable \*\//)
    })
  })
})
