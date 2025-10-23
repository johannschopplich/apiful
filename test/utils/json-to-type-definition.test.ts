import type { JsonValue } from '../../src/utils/index'
import { describe, expect, it } from 'vitest'
import { jsonToTypeDefinition } from '../../src/utils/json-to-type-definition'

describe('jsonToTypeDefinition', () => {
  it('generates TypeScript types from comprehensive JSON data', async () => {
    const input: JsonValue = {
      // Basic primitive types
      stringValue: 'test-string',
      numberValue: 42,
      booleanValue: true,
      nullValue: null,

      // Arrays
      stringArray: ['item1', 'item2'],
      emptyArray: [],
      mixedArray: [1, 'string', true, { nestedKey: 'nestedValue' }],

      // Nested objects
      nestedObject: {
        stringProp: 'nested-string',
        numberProp: 123,
        booleanProp: false,
      },

      // Special property names
      specialKeys: {
        'normal-key': 'value1',
        '123': 'numeric-key-value',
        'key with spaces': 'spaced-key-value',
        'special@chars': 'special-chars-value',
      },

      // Arrays with object merging and null values
      objectArray: [
        { idField: 1, stringField: 'value1', emailField: 'test@example.com' },
        { idField: 2, stringField: 'value2' },
        { stringField: 'value3', numberField: 99, nullField: null },
      ],

      // Nested arrays
      numberMatrix: [[1, 2], [3, 4]],

      // Empty object
      emptyObject: {},
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'ComprehensiveData' })
    expect(result).toMatchInlineSnapshot(`
      "/* eslint-disable */

      export interface ComprehensiveData {
        stringValue?: string
        numberValue?: number
        booleanValue?: boolean
        nullValue?: null
        stringArray?: string[]
        emptyArray?: unknown[]
        mixedArray?: (number | string | boolean | {
          nestedKey?: string
        })[]
        nestedObject?: {
          stringProp?: string
          numberProp?: number
          booleanProp?: boolean
        }
        specialKeys?: {
          "123"?: string
          "normal-key"?: string
          "key with spaces"?: string
          "special@chars"?: string
        }
        objectArray?: {
          idField?: number
          stringField?: string
          emailField?: string
          numberField?: number
          nullField?: null
        }[]
        numberMatrix?: number[][]
        emptyObject?: {
          [k: string]: unknown
        }
      }

      "
    `)
  })

  it('generates types for primitive root values', async () => {
    expect(await jsonToTypeDefinition('string', { typeName: 'StringRoot' }))
      .toContain('export type StringRoot = string')

    expect(await jsonToTypeDefinition(123, { typeName: 'NumberRoot' }))
      .toContain('export type NumberRoot = number')

    expect(await jsonToTypeDefinition(true, { typeName: 'BooleanRoot' }))
      .toContain('export type BooleanRoot = boolean')

    expect(await jsonToTypeDefinition(null, { typeName: 'NullRoot' }))
      .toContain('export type NullRoot = null')

    // Array as root
    const result = await jsonToTypeDefinition(['a', 'b', 'c'], { typeName: 'StringArray' })
    expect(result).toContain('export type StringArray = string[]')
  })

  it('respects strictProperties option for required fields', async () => {
    const input = {
      stringField: 'test-value',
      numberField: 123,
    }

    const strict = await jsonToTypeDefinition(input, {
      typeName: 'StrictType',
      strictProperties: true,
    })

    const nonStrict = await jsonToTypeDefinition(input, {
      typeName: 'NonStrictType',
      strictProperties: false,
    })

    // With strict properties, fields should be required (no `?`)
    expect(strict).toContain('stringField: string')
    expect(strict).toContain('numberField: number')

    // With non-strict, fields should be optional (with `?`)
    expect(nonStrict).toContain('stringField?: string')
    expect(nonStrict).toContain('numberField?: number')
  })

  it('generates types for complex nested and recursive structures', async () => {
    const input = {
      treeStructure: {
        nodeValue: 1,
        childNodes: [
          {
            nodeValue: 2,
            childNodes: [
              { nodeValue: 3 },
            ],
          },
          {
            nodeValue: 4,
            childNodes: [],
          },
        ],
      },
      deeplyNested: {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  deepValue: 'deep-string',
                },
              },
            },
          },
        },
      },
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'ComplexNested' })
    expect(result).toMatchInlineSnapshot(`
      "/* eslint-disable */

      export interface ComplexNested {
        treeStructure?: {
          nodeValue?: number
          childNodes?: {
            nodeValue?: number
            childNodes?: ({
              nodeValue?: number
            } | {
              [k: string]: unknown
            })[]
          }[]
        }
        deeplyNested?: {
          level1?: {
            level2?: {
              level3?: {
                level4?: {
                  level5?: {
                    deepValue?: string
                  }
                }
              }
            }
          }
        }
      }

      "
    `)
  })
})
