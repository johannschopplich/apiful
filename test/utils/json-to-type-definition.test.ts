import type { JsonValue } from '../../src/utils'
import { describe, expect, it } from 'vitest'
import { jsonToTypeDefinition } from '../../src/utils/json-to-type-definition'

describe('jsonToTypeDefinition', () => {
  it('inferes types from basic JSON data', async () => {
    const input = {
      name: 'John',
      age: 30,
      isActive: true,
      tags: ['developer', 'typescript'],
      address: {
        street: '123 Main St',
        city: 'Tech City',
        zipCode: 12345,
      },
      nullValue: null,
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'User' })
    expect(result).toMatchInlineSnapshot(`
      "export interface User {
        name?: string;
        age?: number;
        isActive?: boolean;
        tags?: string[];
        address?: {
          street?: string;
          city?: string;
          zipCode?: number;
        };
        nullValue?: unknown;
      }
      "
    `)
  })

  it('handles empty objects', async () => {
    const result = await jsonToTypeDefinition({}, { typeName: 'Empty' })
    expect(result).toMatchInlineSnapshot(`
      "export interface Empty {
        [k: string]: unknown;
      }
      "
    `)
  })

  it('handles nested arrays', async () => {
    const input = {
      matrix: [[1, 2], [3, 4]],
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'Matrix' })
    expect(result).toMatchInlineSnapshot(`
      "export interface Matrix {
        matrix?: number[][];
        points?: {
          x?: number;
          y?: number;
        }[];
      }
      "
    `)
  })

  it('handles mixed types', async () => {
    const input = {
      id: 1,
      metadata: {
        tags: ['important'],
        values: [1, 2, 3],
        settings: {
          enabled: true,
          config: null,
        },
      },
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'ComplexData' })
    expect(result).toMatchInlineSnapshot(`
      "export interface ComplexData {
        id?: number;
        metadata?: {
          tags?: string[];
          values?: number[];
          settings?: {
            enabled?: boolean;
            config?: unknown;
          };
        };
      }
      "
    `)
  })

  it('handles arrays with mixed types', async () => {
    const input = {
      mixedArray: [1, 'string', true, { key: 'value' }],
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'MixedArray' })
    expect(result).toMatchInlineSnapshot(`
      "export interface MixedArray {
        mixedArray?: (
          | number
          | string
          | boolean
          | {
              key?: string;
            }
        )[];
      }
      "
    `)
  })

  it('should merge object properties from different array items', async () => {
    const input: JsonValue = {
      users: [
        { id: 1, name: 'John' },
        { id: 2, email: 'john@example.com' },
        { name: 'Jane', age: 25 },
      ],
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'Users' })
    expect(result).toMatchInlineSnapshot(`
      "export interface Users {
        users?: {
          id?: number;
          name?: string;
          email?: string;
          age?: number;
        }[];
      }
      "
    `)
  })

  it('handles deeply nested mixed arrays', async () => {
    const input = {
      data: [
        [{ id: 1, type: 'A' }],
        [{ id: 2, status: 'active' }],
        [{ type: 'B', meta: { tag: 'important' } }],
      ],
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'DeepNested' })
    expect(result).toMatchInlineSnapshot(`
      "export interface DeepNested {
        data?: {
          id?: number;
          type?: string;
          status?: string;
          meta?: {
            tag?: string;
          };
        }[][];
      }
      "
    `)
  })

  it('handles empty arrays', async () => {
    const input = {
      emptyArray: [],
      nestedEmpty: [[]],
      mixedEmpty: {
        data: [],
      },
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'EmptyArrays' })
    expect(result).toMatchInlineSnapshot(`
      "export interface EmptyArrays {
        emptyArray?: unknown[];
        nestedEmpty?: unknown[][];
        mixedEmpty?: {
          data?: unknown[];
        };
      }
      "
    `)
  })

  it('handles complex union types', async () => {
    const input: JsonValue = {
      result: [
        { type: 'success', data: { id: 1 } },
        { type: 'error', message: 'Failed' },
        { type: 'pending' },
      ],
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'Result' })
    expect(result).toMatchInlineSnapshot(`
      "export interface Result {
        result?: {
          type?: string;
          data?: {
            id?: number;
          };
          message?: string;
        }[];
      }
      "
    `)
  })

  it('handles recursive structures', async () => {
    const input = {
      tree: {
        value: 1,
        children: [
          {
            value: 2,
            children: [
              { value: 3 },
            ],
          },
          {
            value: 4,
            children: [],
          },
        ],
      },
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'Tree' })
    expect(result).toMatchInlineSnapshot(`
      "export interface Tree {
        tree?: {
          value?: number;
          children?: {
            value?: number;
            children?: (
              | {
                  value?: number;
                }
              | {
                  [k: string]: unknown;
                }
            )[];
          }[];
        };
      }
      "
    `)
  })

  it('handles objects with mixed property types', async () => {
    const input = {
      properties: [
        { name: 'prop1', value: 123 },
        { name: 'prop2', value: 'string' },
        { name: 'prop3', value: { nested: true } },
      ],
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'Properties' })
    expect(result).toMatchInlineSnapshot(`
      "export interface Properties {
        properties?: {
          name?: string;
          value?:
            | number
            | string
            | {
                nested?: boolean;
              };
        }[];
      }
      "
    `)
  })

  it('allows disabling code formatting', async () => {
    const input = {
      name: 'John',
      age: 30,
    }

    const result = await jsonToTypeDefinition(input, { typeName: 'User', format: false })
    expect(result).toMatchInlineSnapshot(`
      "export interface User {
      name?: string
      age?: number
      }
      "
    `)
  })
})
