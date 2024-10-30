import type { JsonValue } from '../../src/utils'
import { describe, expect, it } from 'vitest'
import { generateTypeFromJson } from '../../src/utils/generate-type-from-json'

describe('generateTypeFromJson', () => {
  it('should infer types from basic JSON data', async () => {
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

    const result = await generateTypeFromJson(input, 'User')
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

  it('should handle empty objects', async () => {
    const result = await generateTypeFromJson({}, 'Empty')
    expect(result).toMatchInlineSnapshot(`
      "export interface Empty {
        [k: string]: unknown;
      }
      "
    `)
  })

  it('should handle nested arrays', async () => {
    const input = {
      matrix: [[1, 2], [3, 4]],
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    }

    const result = await generateTypeFromJson(input, 'Matrix')
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

  it('should handle mixed types', async () => {
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

    const result = await generateTypeFromJson(input, 'ComplexData')
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

  it('should handle arrays with mixed types', async () => {
    const input = {
      mixedArray: [1, 'string', true, { key: 'value' }],
    }

    const result = await generateTypeFromJson(input, 'MixedArray')
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

    const result = await generateTypeFromJson(input, 'Users')
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

  it('should handle deeply nested mixed arrays', async () => {
    const input = {
      data: [
        [{ id: 1, type: 'A' }],
        [{ id: 2, status: 'active' }],
        [{ type: 'B', meta: { tag: 'important' } }],
      ],
    }

    const result = await generateTypeFromJson(input, 'DeepNested')
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

  it('should handle empty arrays', async () => {
    const input = {
      emptyArray: [],
      nestedEmpty: [[]],
      mixedEmpty: {
        data: [],
      },
    }

    const result = await generateTypeFromJson(input, 'EmptyArrays')
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

  it('should handle complex union types', async () => {
    const input: JsonValue = {
      result: [
        { type: 'success', data: { id: 1 } },
        { type: 'error', message: 'Failed' },
        { type: 'pending' },
      ],
    }

    const result = await generateTypeFromJson(input, 'Result')
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

  it('should handle recursive structures', async () => {
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

    const result = await generateTypeFromJson(input, 'Tree')
    expect(result).toMatchInlineSnapshot(`
      "export interface Tree {
        tree?: {
          value?: number;
          children?: {
            value?: number;
            children?: unknown[];
          }[];
        };
      }
      "
    `)
  })

  it('should handle objects with mixed property types', async () => {
    const input = {
      properties: [
        { name: 'prop1', value: 123 },
        { name: 'prop2', value: 'string' },
        { name: 'prop3', value: { nested: true } },
      ],
    }

    const result = await generateTypeFromJson(input, 'Properties')
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
})
