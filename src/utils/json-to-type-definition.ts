import type { JSONSchema4 } from 'json-schema'
import type { JsonValue } from './types'
import { CODE_HEADER_DIRECTIVES } from '../constants'

export interface TypeDefinitionOptions {
  /** @default 'Root' */
  typeName?: string
  /** @default false */
  strictProperties?: boolean
}

export type ResolvedTypeDefinitionOptions = Required<TypeDefinitionOptions>

export async function jsonToTypeDefinition(
  data: JsonValue,
  options: TypeDefinitionOptions = {},
): Promise<string> {
  const { compile } = await import('json-schema-to-typescript-lite')
    .catch(() => {
      throw new Error('Missing dependency "json-schema-to-typescript-lite", please install it')
    })

  const resolvedOptions = resolveOptions(options)
  const schema = createJsonSchema(data, resolvedOptions)
  const output = await compile(schema, resolvedOptions.typeName)

  return `
${CODE_HEADER_DIRECTIVES}
${output}
`.trimStart()
}

function createJsonSchema(data: unknown, options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  if (data === null) {
    return { type: 'null' }
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: {} }
    }

    const itemSchemas = data
      .filter(item => item !== undefined)
      .map(item => createJsonSchema(item, options))

    return {
      type: 'array',
      items: mergeSchemas(itemSchemas, options),
    }
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined)

    if (entries.length === 0) {
      return {
        type: 'object',
        additionalProperties: {},
      }
    }

    const properties = Object.fromEntries(entries.map(
      ([key, value]) => [key, createJsonSchema(value, options)],
    ))
    const propertyKeys = Object.keys(properties)

    return {
      type: 'object',
      properties,
      required: options.strictProperties ? propertyKeys : undefined,
      additionalProperties: false,
    }
  }

  const primitiveType = typeof data

  if (primitiveType === 'string' || primitiveType === 'number' || primitiveType === 'boolean') {
    return { type: primitiveType }
  }

  // Fallback for unsupported types
  return {}
}

function mergeSchemas(schemas: JSONSchema4[], options: ResolvedTypeDefinitionOptions): JSONSchema4 {
  if (schemas.length === 0)
    return {}

  if (schemas.length === 1)
    return schemas[0]!

  // Filter out empty schemas (representing null/any types)
  const definedSchemas = schemas.filter(schema => schema.type !== undefined || Object.keys(schema).length > 0)
  const hasNullSchemas = schemas.length > definedSchemas.length

  if (definedSchemas.length === 0) {
    // All schemas were null/empty
    return {}
  }

  if (definedSchemas.length === 1 && !hasNullSchemas) {
    return definedSchemas[0]!
  }

  const types = new Set(definedSchemas.map(schema => schema.type).filter(Boolean))

  // Create a union for mixed types or if there are null schemas
  if (types.size !== 1 || hasNullSchemas) {
    // Deduplicate schemas by type to avoid redundant union members (e.g., null | null)
    const schemasByType = new Map<string, JSONSchema4>()

    for (const schema of definedSchemas) {
      const typeKey = schema.type as string | undefined
      // For primitive types, deduplicate by type
      // For objects/arrays, we need to merge them (handled below)
      if (typeKey && typeKey !== 'object' && typeKey !== 'array') {
        if (!schemasByType.has(typeKey)) {
          schemasByType.set(typeKey, schema)
        }
      }
      else {
        // For objects/arrays or undefined types, keep all (use unique key)
        schemasByType.set(`${typeKey}-${schemasByType.size}`, schema)
      }
    }

    const unionSchemas = Array.from(schemasByType.values())

    if (hasNullSchemas && !schemasByType.has('null')) {
      unionSchemas.push({}) // Add null schema
    }

    // If after deduplication we only have one schema, return it directly
    if (unionSchemas.length === 1 && !hasNullSchemas) {
      return unionSchemas[0]!
    }

    return {
      anyOf: unionSchemas.map(schema => ({
        ...schema,
        additionalProperties: schema.type === 'object'
          ? schema.additionalProperties
          : undefined,
      })),
    }
  }

  const type = definedSchemas[0]!.type

  if (type === 'object') {
    const propertySchemas = new Map<string, JSONSchema4[]>()
    const requiredProperties = new Set<string>()

    for (const schema of definedSchemas) {
      if (!schema.properties)
        continue

      for (const [key, value] of Object.entries(schema.properties)) {
        if (!propertySchemas.has(key))
          propertySchemas.set(key, [])

        propertySchemas.get(key)!.push(value)
      }

      if (Array.isArray(schema.required)) {
        for (const key of schema.required)
          requiredProperties.add(key)
      }
    }

    return {
      type: 'object',
      properties: Object.fromEntries(
        Array.from(propertySchemas.entries()).map(([key, propertySchemas]) => [
          key,
          mergeSchemas(propertySchemas, options),
        ]),
      ),
      required: requiredProperties.size > 0 ? Array.from(requiredProperties) : undefined,
      additionalProperties: propertySchemas.size === 0 ? {} : false,
    }
  }
  else if (type === 'array') {
    const itemSchemas = definedSchemas
      .map(schema => schema.items)
      .filter((items): items is JSONSchema4 => Boolean(items))

    return {
      type: 'array',
      items: mergeSchemas(itemSchemas, options),
    }
  }
  else {
    return definedSchemas[0]!
  }
}

function resolveOptions(options: TypeDefinitionOptions): ResolvedTypeDefinitionOptions {
  return {
    typeName: options.typeName || 'Root',
    strictProperties: options.strictProperties ?? false,
  }
}
