import type { JSONSchema4 } from 'json-schema'
import type { JsonValue } from './types.ts'
import { CODE_HEADER_DIRECTIVES } from '../constants.ts'

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
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return {
        type: 'array',
        items: {},
      }
    }

    const itemSchemas = data.map(item => createJsonSchema(item, options))
    return {
      type: 'array',
      items: mergeSchemas(itemSchemas, options),
    }
  }
  else if (typeof data === 'object' && data !== null) {
    const properties = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        createJsonSchema(value, options),
      ]),
    )

    const isEmptyObject = Object.keys(data).length === 0

    return {
      type: 'object',
      properties: isEmptyObject ? undefined : properties,
      required: options.strictProperties && !isEmptyObject ? Object.keys(properties) : undefined,
      additionalProperties: isEmptyObject ? {} : false,
    }
  }
  else if (data === null) {
    // Handle null as unknown type in TypeScript
    return {
      type: 'null',
    }
  }
  else {
    // Handle primitive types
    const primitiveType = typeof data
    if (primitiveType === 'string' || primitiveType === 'number' || primitiveType === 'boolean') {
      return {
        type: primitiveType,
      }
    }

    // Fallback for any other primitive types
    return {}
  }
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
    const unionSchemas = [...definedSchemas]
    if (hasNullSchemas) {
      unionSchemas.push({}) // Add null schema
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
