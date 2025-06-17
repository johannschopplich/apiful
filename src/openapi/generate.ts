import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { ServiceOptions } from '../config'
import { pascalCase } from 'scule'
import { defu } from 'utilful'
import { CODE_HEADER_DIRECTIVES } from '../constants'

export async function generateDTS(
  services: Record<string, ServiceOptions>,
  openAPITSOptions?: OpenAPITSOptions,
): Promise<string> {
  const resolvedSchemaEntries = await Promise.all(
    Object.entries(services)
      .filter(([, service]) => Boolean(service.schema))
      .map(async ([id, service]) => {
        const types = await generateSchemaTypes({ id, service, openAPITSOptions })
        return [id, types] as const
      }),
  )

  const resolvedSchemas = Object.fromEntries(resolvedSchemaEntries)
  const serviceIds = Object.keys(resolvedSchemas)

  // Build import statements
  const servicePathImports = serviceIds
    .map(id => `  import { paths as ${pascalCase(id)}Paths } from 'apiful/services/${id}'`)
    .join('\n')

  // Build repository interface entries
  const schemaRepositoryEntries = serviceIds
    .map(id => `    ${id}: ${pascalCase(id)}Paths`)
    .join('\n')

  // Build type exports
  const typeExports = serviceIds
    .map((id) => {
      return [`
/**
 * OpenAPI endpoint type helper for the ${pascalCase(id)} API
 *
 * @example
 * // Get path parameters for retrieving a user by ID:
 * type UserParams = ${pascalCase(id)}<'/users/{id}', 'get'>['path']
 *
 * // Get query parameters for listing users:
 * type UsersQuery = ${pascalCase(id)}<'/users', 'get'>['query']
 *
 * // Get request body type for creating a user:
 * type CreateUserBody = ${pascalCase(id)}<'/users', 'post'>['request']
 *
 * // Get success response for retrieving a user:
 * type UserResponse = ${pascalCase(id)}<'/users/{id}', 'get'>['response']
 *
 * // Get a specific status code response:
 * type UserNotFoundResponse = ${pascalCase(id)}<'/users/{id}', 'get'>['responses'][404]
 *
 * // Get complete endpoint type definition:
 * type UserEndpoint = ${pascalCase(id)}<'/users/{id}', 'get'>
 */
export type ${pascalCase(id)}<
  Path extends keyof ${pascalCase(id)}Paths,
  Method extends PathMethods<${pascalCase(id)}Paths, Path> = PathMethods<${pascalCase(id)}Paths, Path> extends string ? PathMethods<${pascalCase(id)}Paths, Path> : never
> = {
  /** Path parameters for this endpoint */
  path: ${pascalCase(id)}Paths[Path][Method] extends { parameters?: { path?: infer P } } ? P : Record<string, never>;

  /** Query parameters for this endpoint */
  query: ${pascalCase(id)}Paths[Path][Method] extends { parameters?: { query?: infer Q } } ? Q : Record<string, never>;

  /** Request body for this endpoint */
  request: ${pascalCase(id)}Paths[Path][Method] extends { requestBody?: { content: { 'application/json': infer R } } } ? R : Record<string, never>;

  /** Success response for this endpoint (defaults to 200 status code) */
  response: ${pascalCase(id)}Paths[Path][Method] extends { responses: infer R }
    ? 200 extends keyof R
      ? R[200] extends { content: { 'application/json': infer S } } ? S : Record<string, never>
      : Record<string, never>
    : Record<string, never>;

  /** All possible responses for this endpoint by status code */
  responses: {
    [Status in keyof ${pascalCase(id)}Paths[Path][Method]['responses']]:
      ${pascalCase(id)}Paths[Path][Method]['responses'][Status] extends { content: { 'application/json': infer R } }
        ? R
        : Record<string, never>
  };

  /** Full path with typed parameters for this endpoint (useful for route builders) */
  fullPath: Path;

  /** HTTP method for this endpoint */
  method: Method;

  /**
   * Full operation object for this endpoint
   *
   * @remarks
   * Useful for accessing additional metadata, such as tags or security requirements.
   */
  operation: ${pascalCase(id)}Paths[Path][Method]
}

/**
 * Type helper to list all available paths of the ${pascalCase(id)} API
 *
 * @example
 * type AvailablePaths = ${pascalCase(id)}ApiPaths // Returns literal union of all available paths
 */
export type ${pascalCase(id)}ApiPaths = keyof ${pascalCase(id)}Paths;

/**
 * Type helper to get available methods for a specific path of the ${pascalCase(id)} API
 *
 * @example
 * type UserMethods = ${pascalCase(id)}ApiMethods<'/users/{id}'> // Returns 'get' | 'put' | 'delete' etc.
 */
export type ${pascalCase(id)}ApiMethods<P extends keyof ${pascalCase(id)}Paths> = PathMethods<${pascalCase(id)}Paths, P>;
`.trim()].join('\n')
    })
    .join('\n\n')

  // Build module declarations
  const moduleDeclarations = Object.entries(resolvedSchemas)
    .map(([id, types]) => {
      // Primary module path (new semantic path)
      const primaryModule = `declare module 'apiful/services/${id}' {
${normalizeIndentation(types).trimEnd()}
}`

      // Legacy module path for backward compatibility (re-exports from new path)
      // TODO: Remove this in apiful v4
      const legacyModule = `declare module 'apiful/__${id}__' {
  export * from 'apiful/services/${id}'
}`

      return `${primaryModule}\n\n${legacyModule}`
    })
    .join('\n\n')

  return `
${CODE_HEADER_DIRECTIVES}
declare module 'apiful/schema' {
${servicePathImports}

  // Augment the schema repository interface with all service schemas
  interface OpenAPISchemaRepository {
${schemaRepositoryEntries}
  }

  // Type helpers for OpenAPI paths
  type ValidKeys<T> = {
    [K in keyof T]: [T[K]] extends [never] ? never : [undefined] extends [T[K]] ? [never] extends [Exclude<T[K], undefined>] ? never : K : K;
  }[keyof T];
  type PathMethods<T, P extends keyof T> = Exclude<ValidKeys<T[P]>, 'parameters'>

${applyLineIndent(typeExports)}
}

${moduleDeclarations}
`.trimStart()
}

async function generateSchemaTypes(options: {
  id: string
  service: ServiceOptions
  openAPITSOptions?: OpenAPITSOptions
}) {
  const { default: openAPITS, astToString } = await import('openapi-typescript')
    .catch(() => {
      throw new Error('Missing dependency "openapi-typescript", please install it')
    })

  const schema = await resolveSchema(options.service)
  const resolvedOpenAPITSOptions = defu(options.service.openAPITS || {}, options.openAPITSOptions || {})

  try {
    const ast = await openAPITS(schema, resolvedOpenAPITSOptions)
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

async function resolveSchema({ schema }: ServiceOptions): Promise<string | URL | OpenAPI3> {
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

// Add indentation of two spaces to each line
function applyLineIndent(code: string) {
  return code
    .split('\n')
    .map(line => line.replace(/^/gm, '  '))
    .join('\n')
}

function normalizeIndentation(code: string) {
  // Replace each cluster of four spaces with two spaces
  const replacedCode = code.replace(/^( {4})+/gm, match => '  '.repeat(match.length / 4))

  // Ensure each line starts with exactly two spaces
  const normalizedCode = replacedCode.replace(/^/gm, '  ')

  return normalizedCode
}
