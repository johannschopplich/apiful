import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { ServiceOptions } from '../config.ts'
import { defu } from 'defu'
import { pascalCase } from 'scule'
import { CODE_HEADER_DIRECTIVES } from '../constants.ts'

export type ParseInt<S extends string> = S extends `${infer N extends number}` ? N : never

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
  const imports = serviceIds
    .map(id => `  import { paths as ${pascalCase(id)}Paths, operations as ${pascalCase(id)}Operations } from 'apiful/__${id}__'`)
    .join('\n')

  // Build repository interface entries
  const repositoryEntries = serviceIds
    .map(id => `    ${id}: ${pascalCase(id)}Paths`)
    .join('\n')

  // Build type exports
  const typeExports = serviceIds
    .map((id) => {
      return [`
/**
 * Generic response type for ${pascalCase(id)} operations
 * @deprecated Use the more intuitive ${pascalCase(id)}<Path, Method>['response'] syntax instead
 */
export type ${pascalCase(id)}Response<
  T extends keyof ${pascalCase(id)}Operations,
  R extends keyof ${pascalCase(id)}Operations[T]['responses'] = 200 extends keyof ${pascalCase(id)}Operations[T]['responses'] ? 200 : never
> = ${pascalCase(id)}Operations[T]['responses'][R] extends { content: { 'application/json': infer U } } ? U : never

/**
 * Generic request body type for ${pascalCase(id)} operations
 * @deprecated Use the more intuitive ${pascalCase(id)}<Path, Method>['request'] syntax instead
 */
export type ${pascalCase(id)}RequestBody<
  T extends keyof ${pascalCase(id)}Operations
> = ${pascalCase(id)}Operations[T]['requestBody'] extends { content: { 'application/json': infer U } } ? U : never

/**
 * Generic query parameters type for ${pascalCase(id)} operations
 * @deprecated Use the more intuitive ${pascalCase(id)}<Path, Method>['query'] syntax instead
 */
export type ${pascalCase(id)}RequestQuery<
  T extends keyof ${pascalCase(id)}Operations
> = ${pascalCase(id)}Operations[T]['parameters'] extends { query?: infer U } ? U : never

/**
 * A complete and intuitive API for accessing OpenAPI types from ${pascalCase(id)} service
 *
 * @example
 * // Get path parameters for /users/{id} path with GET method:
 * type Params = ${pascalCase(id)}<'/users/{id}', 'get'>['path']
 *
 * // Get request body type for creating a user:
 * type CreateUserBody = ${pascalCase(id)}<'/users', 'post'>['request']
 *
 * // Get query parameters for listing users:
 * type ListUsersQuery = ${pascalCase(id)}<'/users', 'get'>['query']
 *
 * // Get success response type:
 * type UserResponse = ${pascalCase(id)}<'/users/{id}', 'get'>['response']
 *
 * // Get a specific status code response:
 * type NotFoundResponse = ${pascalCase(id)}<'/users/{id}', 'get'>['responses'][404]
 *
 * // Get complete endpoint type definition:
 * type UserEndpoint = ${pascalCase(id)}<'/users/{id}', 'get'>
 */
export type ${pascalCase(id)}<
  Path extends keyof ${pascalCase(id)}Paths,
  Method extends HttpMethodsForPath<${pascalCase(id)}Paths, Path> = HttpMethodsForPath<${pascalCase(id)}Paths, Path> extends string ? HttpMethodsForPath<${pascalCase(id)}Paths, Path> : never
> = {
  /** Path parameters for this endpoint */
  path: ${pascalCase(id)}Paths[Path][Method] extends { parameters?: { path?: infer P } } ? P : Record<string, never>;

  /** Query parameters for this endpoint */
  query: ${pascalCase(id)}Paths[Path][Method] extends { parameters?: { query?: infer Q } } ? Q : Record<string, never>;

  /** Request body for this endpoint */
  request: ${pascalCase(id)}Paths[Path][Method] extends { requestBody?: { content: { 'application/json': infer B } } } ? B : Record<string, never>;

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

  /** The full path with typed parameters (useful for route builders) */
  fullPath: Path;

  /** The HTTP method for this endpoint */
  method: Method;

  /**
   * Full operation object from the OpenAPI spec.
   * Useful for accessing additional metadata like tags, security, etc.
   */
  operation: ${pascalCase(id)}Paths[Path][Method];
}

/**
 * Type helper to list all available paths for ${pascalCase(id)} API
 *
 * @example
 * // Get all available API paths:
 * type AvailablePaths = ${pascalCase(id)}ApiPaths // Returns literal union of all available paths
 */
export type ${pascalCase(id)}ApiPaths = keyof ${pascalCase(id)}Paths;

/**
 * Type helper to get available methods for a specific path in the ${pascalCase(id)} API
 *
 * @example
 * type MethodsForUserPath = ${pascalCase(id)}ApiMethods<'/users/{id}'> // Returns 'get' | 'put' | 'delete' etc.
 */
export type ${pascalCase(id)}ApiMethods<P extends keyof ${pascalCase(id)}Paths> = HttpMethodsForPath<${pascalCase(id)}Paths, P>;
`.trim()].join('\n')
    })
    .join('\n\n')

  // Build module declarations
  const moduleDeclarations = Object.entries(resolvedSchemas)
    .map(([id, types]) => `declare module 'apiful/__${id}__' {
${normalizeIndentation(types).trimEnd()}
}`)
    .join('\n\n')

  return `
${CODE_HEADER_DIRECTIVES}

declare module 'apiful/schema' {
${imports}

  type NonNeverKeys<T> = {
    [K in keyof T]: [T[K]] extends [never]
      ? never
      : [undefined] extends [T[K]]
        ? [never] extends [Exclude<T[K], undefined>] ? never : K
        : K;
  }[keyof T];
  type HttpMethodsForPath<T, P extends keyof T> = Exclude<NonNeverKeys<T[P]>, 'parameters'>
  type ParseInt<S extends string> = S extends \`\${infer N extends number}\` ? N : never

  interface OpenAPISchemaRepository {
${repositoryEntries}
  }

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
  const resolvedOpenAPITSOptions = defu(options.service.openAPITS, options.openAPITSOptions || {})

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
