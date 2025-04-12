import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { ServiceOptions } from '../config'
import { defu } from 'defu'
import { pascalCase } from 'scule'
import { CODE_HEADER_DIRECTIVES } from '../constants'

export type ParseInt<S extends string> = S extends `${infer N extends number}` ? N : never

export async function generateDTS(
  services: Record<string, ServiceOptions>,
  openAPITSOptions?: OpenAPITSOptions,
) {
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
      return [
        `  export type ${pascalCase(id)}Response<`,
        `    T extends keyof ${pascalCase(id)}Operations,`,
        `    R extends keyof ${pascalCase(id)}Operations[T]['responses'] = 200 extends keyof ${pascalCase(id)}Operations[T]['responses'] ? 200 : never`,
        `  > = ${pascalCase(id)}Operations[T]['responses'][R] extends { content: { 'application/json': infer U } } ? U : never`,
        `  export type ${pascalCase(id)}RequestBody<`,
        `    T extends keyof ${pascalCase(id)}Operations`,
        `  > = ${pascalCase(id)}Operations[T]['requestBody'] extends { content: { 'application/json': infer U } } ? U : never`,
        `  export type ${pascalCase(id)}RequestQuery<`,
        `    T extends keyof ${pascalCase(id)}Operations`,
        `  > = ${pascalCase(id)}Operations[T]['parameters'] extends { query?: infer U } ? U : never`,

        `  // Helper type to get the operation from a path entry`,
        `  export type GetOperation<T, M extends string> = `,
        `    M extends 'get' ? T extends { get: infer Op } ? Op : never :`,
        `    M extends 'post' ? T extends { post: infer Op } ? Op : never :`,
        `    M extends 'put' ? T extends { put: infer Op } ? Op : never :`,
        `    M extends 'delete' ? T extends { delete: infer Op } ? Op : never :`,
        `    M extends 'patch' ? T extends { patch: infer Op } ? Op : never :`,
        `    never;`,

        `  // Direct type that allows accessing path parameters by specifying the HTTP method`,
        `  export type PathParamsFrom${pascalCase(id)}<`,
        `  P extends keyof ${pascalCase(id)}Paths,`,
        `  M extends NonNeverKeysWithout<${pascalCase(id)}Paths[P]>`,
        `  > = GetOperation<${pascalCase(id)}Paths[P], M> extends infer Op`,
        `  ? Op extends { parameters?: any }`,
        `    ? NonNullable<Op['parameters']>['path'] extends infer Params`,
        `      ? Params extends object`,
        `        ? Params`,
        `        : Record<string, never>`,
        `      : Record<string, never>`,
        `    : Record<string, never>`,
        `  : Record<string, never>;`,

        `  // Direct type that allows accessing request body by specifying the HTTP method`,
        `  export type RequestBodyFrom${pascalCase(id)}<`,
        `  P extends keyof ${pascalCase(id)}Paths,`,
        `  M extends NonNeverKeysWithout<${pascalCase(id)}Paths[P]>`,
        `  > = GetOperation<${pascalCase(id)}Paths[P], M> extends infer Op`,
        `  ? Op extends { requestBody?: any }`,
        `    ? NonNullable<Op['requestBody']>['content']['application/json'] extends infer Body`,
        `      ? Body extends object`,
        `        ? Body`,
        `        : Record<string, never>`,
        `      : Record<string, never>`,
        `    : Record<string, never>`,
        `  : Record<string, never>;`,

        `  // Direct type that allows accessing query parameters by specifying the HTTP method`,
        `  export type QueryParamsFrom${pascalCase(id)}<`,
        `  P extends keyof ${pascalCase(id)}Paths,`,
        `  M extends NonNeverKeysWithout<${pascalCase(id)}Paths[P]>`,
        `  > = GetOperation<${pascalCase(id)}Paths[P], M> extends infer Op`,
        `  ? Op extends { parameters?: any }`,
        `    ? NonNullable<Op['parameters']>['query'] extends infer Params`,
        `      ? Params extends object`,
        `        ? Params`,
        `        : Record<string, never>`,
        `      : Record<string, never>`,
        `    : Record<string, never>`,
        `  : Record<string, never>;`,

        `  // Direct type that allows accessing response body by specifying the HTTP method`,
        `  export type ResponseFrom${pascalCase(id)}<`,
        `  P extends keyof ${pascalCase(id)}Paths,`,
        `  M extends NonNeverKeysWithout<${pascalCase(id)}Paths[P]>,`,
        `  C extends \`\${keyof NonNullable<GetOperation<${pascalCase(id)}Paths[P], M>>['responses']}\` = '200'`,
        `  > = GetOperation<${pascalCase(id)}Paths[P], M> extends infer Op`,
        `  ? Op extends { responses?: any }`,
        `    ? ParseInt<C> extends keyof Op['responses']`,
        `      ? Op['responses'][ParseInt<C>] extends { content: { 'application/json': infer Body } }`,
        `        ? Body`,
        `        : Record<string, never>`,
        `      : Record<string, never>`,
        `    : Record<string, never>`,
        `  : Record<string, never>;`,
      ].join('\n')
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

  type ParseInt<S extends string> = S extends \`\${infer N extends number}\` ? N : never;

  type NonNeverKeys<T> = {
    [K in keyof T]: [T[K]] extends [never] ? never : 
                    [undefined] extends [T[K]] ? (
                      [never] extends [Exclude<T[K], undefined>] ? never : K
                    ) : K
  }[keyof T];

  type NonNeverKeysWithout<T> = Exclude<NonNeverKeys<T>, 'parameters'>;


  interface OpenAPISchemaRepository {
${repositoryEntries}
  }

${typeExports}
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

function normalizeIndentation(code: string) {
  // Replace each cluster of four spaces with two spaces
  const replacedCode = code.replace(/^( {4})+/gm, match => '  '.repeat(match.length / 4))

  // Ensure each line starts with exactly two spaces
  const normalizedCode = replacedCode.replace(/^/gm, '  ')

  return normalizedCode
}
