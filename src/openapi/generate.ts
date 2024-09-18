import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { OpenAPIEndpoint } from './endpoints'
import { pascalCase } from 'scule'

const HEAD_DECLARATION = `/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
` as const

export async function generateDTS(
  endpoints: Record<string, OpenAPIEndpoint>,
  openAPITSOptions?: OpenAPITSOptions,
) {
  const resolvedSchemaEntries = await Promise.all(
    Object.entries(endpoints)
      .filter(([, endpoint]) => Boolean(endpoint.schema))
      .map(async ([id, endpoint]) => {
        const types = await generateSchemaTypes({ id, endpoint, openAPITSOptions })
        return [id, types] as const
      }),
  )

  const resolvedSchemas = Object.fromEntries(resolvedSchemaEntries)

  return `
${HEAD_DECLARATION}
declare module 'apiful/schema' {
${Object.keys(resolvedSchemas)
    .map(i => `  import { paths as ${pascalCase(i)}Paths, operations as ${pascalCase(i)}Operations } from 'apiful/__${i}__'`)
    .join('\n')}

  interface OpenAPISchemaRepository {
${Object.keys(resolvedSchemas)
    .map(i => `${i}: ${pascalCase(i)}Paths`.replace(/^/gm, '    '))
    .join('\n')}
  }

${Object.keys(resolvedSchemas)
    .map(i => `  export type ${pascalCase(i)}Response<
    T extends keyof ${pascalCase(i)}Operations,
    R extends keyof ${pascalCase(i)}Operations[T]['responses'] = 200 extends keyof ${pascalCase(i)}Operations[T]['responses'] ? 200 : never
  > = ${pascalCase(i)}Operations[T]['responses'][R] extends { content: { 'application/json': infer U } } ? U : never
  export type ${pascalCase(i)}RequestBody<
    T extends keyof ${pascalCase(i)}Operations
  > = ${pascalCase(i)}Operations[T]['requestBody'] extends { content: { 'application/json': infer U } } ? U : never
  export type ${pascalCase(i)}RequestQuery<
    T extends keyof ${pascalCase(i)}Operations
  > = ${pascalCase(i)}Operations[T]['parameters'] extends { query?: infer U } ? U : never
`)
    .join('\n')
    .trimEnd()}
}

${Object.entries(resolvedSchemas)
    .map(([id, types]) =>
      `
declare module 'apiful/__${id}__' {
${normalizeIndentation(types).trimEnd()}
}`.trimStart(),
    )
    .join('\n\n')}
`.trimStart()
}

async function generateSchemaTypes(options: {
  id: string
  endpoint: OpenAPIEndpoint
  openAPITSOptions?: OpenAPITSOptions
},
) {
  const { default: openAPITS, astToString } = await import('openapi-typescript')
  const schema = await resolveSchema(options.endpoint)

  try {
    const ast = await openAPITS(schema, options.openAPITSOptions)
    return astToString(ast)
  }
  catch (error) {
    console.error(`Failed to generate types for ${options.id}`)
    console.error(error)
    return `
export type paths = Record<string, never>
export type webhooks = Record<string, never>
export interface components {
  schemas: never
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export type operations = Record<string, never>
`.trimStart()
  }
}

async function resolveSchema({ schema }: OpenAPIEndpoint): Promise<string | URL | OpenAPI3> {
  if (typeof schema === 'function')
    return await schema()

  if (typeof schema === 'string')
    return isValidUrl(schema) ? schema : new URL(schema, import.meta.url)

  return schema!
}

function isValidUrl(url: string) {
  try {
    return Boolean(new URL(url))
  }
  catch {
    return false
  }
}

function normalizeIndentation(code: string): string {
  // Replace each cluster of four spaces with two spaces
  const replacedCode = code.replace(/^( {4})+/gm, match => '  '.repeat(match.length / 4))

  // Ensure each line starts with exactly two spaces
  const normalizedCode = replacedCode.replace(/^/gm, '  ')

  return normalizedCode
}
