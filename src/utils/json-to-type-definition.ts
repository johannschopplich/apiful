import type { JSONSchema } from 'json-schema-to-typescript'
import type { JsonValue } from './types'

export interface TypeDefinitionOptions {
  /** @default 'Root' */
  typeName?: string
  /** @default false */
  strictProperties?: boolean
  /** @default '' */
  bannerComment?: string
  /** @default true */
  format?: boolean
}

export type ResolvedTypeDefinitionOptions = Required<TypeDefinitionOptions>

export async function jsonToTypeDefinition(
  data: JsonValue,
  options: TypeDefinitionOptions = {},
) {
  const resolvedOptions = resolveOptions(options)
  const schema = createJsonSchema(data, resolvedOptions)
  return await schemaToTypeDefinition(schema, resolvedOptions)
}

export async function schemaToTypeDefinition(
  schema: JSONSchema,
  options: TypeDefinitionOptions = {},
): Promise<string> {
  const resolvedOptions = resolveOptions(options)
  const { typeName } = resolvedOptions
  const { compile } = await import('json-schema-to-typescript')

  if (schema.type === 'array' && schema.items) {
    const itemTypeName = `${typeName}Item`
    const itemType = await compile(schema.items, itemTypeName, {
      bannerComment: options.bannerComment,
      format: options.format,
    })

    return `
${itemType}

export type ${typeName} = ${itemTypeName}[];
`.trimStart()
  }

  return await compile(schema, typeName, {
    bannerComment: options.bannerComment,
    format: options.format,
  })
}

function createJsonSchema(data: unknown, options: ResolvedTypeDefinitionOptions): JSONSchema {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return {
        type: 'array',
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

    return {
      type: 'object',
      properties,
      required: options.strictProperties ? Object.keys(properties) : false,
      additionalProperties: Object.keys(data).length === 0,
    }
  }
  else if (data == null) {
    return {
      type: 'any',
    }
  }
  else {
    return {
      type: typeof data as JSONSchema['type'],
    }
  }
}

function mergeSchemas(schemas: JSONSchema[], options: ResolvedTypeDefinitionOptions): JSONSchema {
  if (schemas.length === 0)
    return {}

  if (schemas.length === 1)
    return schemas[0]!

  const types = new Set(schemas.map(schema => schema.type))

  if (types.size !== 1) {
    return {
      anyOf: schemas.map(schema => ({
        ...schema,
        additionalProperties: schema.type === 'object'
          ? schema.additionalProperties
          : undefined,
      })),
    }
  }

  const type = schemas[0]!.type

  if (type === 'object') {
    const propertySchemas = new Map<string, JSONSchema[]>()
    const requiredProperties = new Set<string>()

    for (const schema of schemas) {
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
      additionalProperties: propertySchemas.size === 0,
    }
  }
  else if (type === 'array') {
    const itemSchemas = schemas
      .map(schema => schema.items)
      .filter((items): items is JSONSchema => Boolean(items))

    return {
      type: 'array',
      items: mergeSchemas(itemSchemas, options),
    }
  }
  else {
    return schemas[0]!
  }
}

function resolveOptions(options: TypeDefinitionOptions): ResolvedTypeDefinitionOptions {
  return {
    typeName: options.typeName || 'Root',
    strictProperties: options.strictProperties ?? false,
    bannerComment: options.bannerComment ?? '',
    format: options.format ?? true,
  }
}
