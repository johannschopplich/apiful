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
})
