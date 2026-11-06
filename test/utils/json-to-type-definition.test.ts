import type { JsonValue } from '../../src/utils'
import { describe, expect, it } from 'vitest'
import { jsonToTypeDefinition } from '../../src/utils/json-to-type-definition'

describe('jsonToTypeDefinition', () => {
  describe('primitive types', () => {
    it.each([
      { input: 'test', typeName: 'StringType', expected: 'string' },
      { input: 42, typeName: 'NumberType', expected: 'number' },
      { input: true, typeName: 'BooleanType', expected: 'boolean' },
      { input: null, typeName: 'NullType', expected: 'null' },
    ] as const)('converts $input to the type $expected', ({ input, typeName, expected }) => {
      const result = jsonToTypeDefinition(input, { typeName })
      expect(result).toContain(`export type ${typeName} = ${expected}`)
    })
  })

  describe('arrays', () => {
    it('types an empty array as unknown[]', () => {
      const result = jsonToTypeDefinition([], { typeName: 'EmptyArray' })
      expect(result).toContain('export type EmptyArray = unknown[]')
    })

    it('types an array of numbers as number[]', () => {
      const result = jsonToTypeDefinition([1, 2, 3], { typeName: 'NumberArray' })
      expect(result).toContain('export type NumberArray = number[]')
    })

    it('unions the item types of a mixed array', () => {
      const result = jsonToTypeDefinition([1, 'two', true], { typeName: 'MixedArray' })
      expect(result).toContain('(number | string | boolean)[]')
    })

    it('types a nested array as number[][]', () => {
      const result = jsonToTypeDefinition([[1, 2], [3, 4]], { typeName: 'Matrix' })
      expect(result).toContain('export type Matrix = number[][]')
    })

    it('merges object properties across array items', () => {
      const input = [
        { id: 1, name: 'first' },
        { id: 2, email: 'test@example.com' },
      ]
      const result = jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'ObjectArray' })
      expect(result).toContain('id?: number')
      expect(result).toContain('name?: string')
      expect(result).toContain('email?: string')
    })

    it('merges object properties through nested arrays', () => {
      const result = jsonToTypeDefinition([[{ a: 1 }], [{ b: 2 }]], { typeName: 'Grid' })
      expect(result).toContain('a?: number')
      expect(result).toContain('b?: number')
      expect(result).toContain('}[][]')
    })

    it('merges deeply nested object schemas across array items', () => {
      const input = [
        { meta: { version: 1 } },
        { meta: { name: 'alpha' } },
      ]
      const result = jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Deep' })
      expect(result).toContain('version?: number')
      expect(result).toContain('name?: string')
    })

    it('unions a property that holds different types across items', () => {
      const input = [
        { id: 1 },
        { id: 'two' },
      ]
      const result = jsonToTypeDefinition(input, { typeName: 'MixedProp' })
      expect(result).toMatch(/id\?:\s*\(?number \| string\)?/)
    })

    it('merges objects even when the array also holds primitives', () => {
      const input = [1, 'two', { a: 1 }, { b: 2 }]
      const result = jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Mixed' })
      expect(result).toMatchInlineSnapshot(`
        "export type Mixed = ({
          a?: number;
          b?: number;
        } | number | string)[];
        "
      `)
    })

    it('filters undefined and sparse values', () => {
      // eslint-disable-next-line no-sparse-arrays
      const result = jsonToTypeDefinition([1, undefined, , 3] as unknown as JsonValue, { typeName: 'Filtered' })
      expect(result).toContain('export type Filtered = number[]')
    })

    it('types sparse or all-undefined arrays as unknown items', () => {
      // eslint-disable-next-line no-sparse-arrays
      const result = jsonToTypeDefinition([undefined, , undefined] as unknown as JsonValue, { typeName: 'AllUnknown' })
      expect(result).toContain('unknown[]')
    })

    it('deduplicates primitive types', () => {
      const result = jsonToTypeDefinition([null, 'a', null, 'b'], { typeName: 'Dedup' })
      expect(result).toContain('(null | string)[]')
    })
  })

  describe('objects', () => {
    it('types an empty object as an index signature', () => {
      const result = jsonToTypeDefinition({}, { typeName: 'EmptyObject' })
      expect(result).toContain('[key: string]: unknown')
    })

    it('nests an interface for a nested object', () => {
      const result = jsonToTypeDefinition({ a: { b: { c: 1 } } }, { typeName: 'Nested' })
      expect(result).toMatchInlineSnapshot(`
        "export interface Nested {
          a?: {
            b?: {
              c?: number;
            };
          };
        }
        "
      `)
    })

    it('quotes special property names', () => {
      const result = jsonToTypeDefinition({ 'kebab-case': 1, '123': 2 }, { typeName: 'Special' })
      expect(result).toContain('"kebab-case"?: number')
      expect(result).toContain('123?: number')
    })

    it('excludes undefined properties', () => {
      const result = jsonToTypeDefinition({ a: 1, undef: undefined } as unknown as JsonValue, { typeName: 'NoUndef' })
      expect(result).toContain('a?: number')
      expect(result).not.toContain('undef')
    })

    it('types a null property as null', () => {
      const result = jsonToTypeDefinition({ nullable: null, name: 'test' }, { typeName: 'WithNull' })
      expect(result).toContain('nullable?: null')
      expect(result).toContain('name?: string')
    })
  })

  describe('options', () => {
    it('defaults typeName to "Root"', () => {
      const result = jsonToTypeDefinition({ value: 1 })
      expect(result).toContain('export interface Root')
    })

    it('makes properties optional by default', () => {
      const result = jsonToTypeDefinition({ a: 1 }, { typeName: 'T' })
      expect(result).toContain('a?: number')
    })

    it('makes properties required with strictProperties', () => {
      const result = jsonToTypeDefinition({ a: 1 }, { typeName: 'T', strictProperties: true })
      expect(result).toContain('a: number')
      expect(result).not.toMatch(/a\?:/)
    })

    it('propagates strictProperties into nested objects', () => {
      const result = jsonToTypeDefinition({ a: { b: 1 } }, { typeName: 'Strict', strictProperties: true })
      expect(result).toMatchInlineSnapshot(`
        "export interface Strict {
          a: {
            b: number;
          };
        }
        "
      `)
    })

    it('uses intersection for required properties in merged objects', () => {
      const input = [
        { shared: 1, onlyFirst: 'a' },
        { shared: 2, onlySecond: true },
      ]
      const result = jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Merged', strictProperties: true })
      // `shared` appears in both objects, so it should be required.
      expect(result).toMatch(/shared:\s*number/)
      // `onlyFirst` and `onlySecond` only appear in one object each, so they should be optional.
      expect(result).toContain('onlyFirst?:')
      expect(result).toContain('onlySecond?:')
    })
  })

  describe('invalid input', () => {
    it.each([
      ['bigint at root', 10n],
      ['function nested in object', { fn: () => 1 }],
      ['symbol nested in array', [Symbol('x')]],
    ])('throws TypeError for %s', (_label, input) => {
      expect(() => jsonToTypeDefinition(input as unknown as JsonValue, { typeName: 'Bad' }))
        .toThrow(TypeError)
    })
  })
})
