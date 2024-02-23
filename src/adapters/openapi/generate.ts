import { pascalCase } from 'scule'
import type { OpenAPI3, OpenAPITSOptions } from 'openapi-typescript'
import type { OpenAPIEndpoint } from './endpoints'

export async function generateOpenAPITypes(
  endpoints: Record<string, OpenAPIEndpoint>,
  openAPITSOptions?: OpenAPITSOptions,
) {
  const schemas = await generateSchemas(endpoints, openAPITSOptions)

  return `
declare module 'apiverse' {
${Object.keys(schemas)
    .map(
      i => `  import { paths as ${pascalCase(i)}Paths } from 'apiverse/${i}'`,
    )
    .join('\n')}

  export interface OpenAPISchemaRepository {
${Object.keys(schemas)
  .map(i => `${i}: { paths: ${pascalCase(i)}Paths }`.replace(/^/gm, '    '))
  .join('\n')}
  }
}

${Object.entries(schemas)
  .map(([id, types]) =>
    `
declare module 'apiverse/${id}' {
${types.replace(/^/gm, '  ').trimEnd()}
}`.trimStart(),
  )
  .join('\n\n')}
`.trimStart()
}

async function generateSchemas(
  endpoints: Record<string, OpenAPIEndpoint>,
  openAPITSOptions?: OpenAPITSOptions,
) {
  let runningCount = 0

  // openapi-typescript uses `process.exit()` to handle errors
  // eslint-disable-next-line node/prefer-global/process
  process.on('exit', () => {
    if (runningCount > 0)
      throw new Error('Failed to generate OpenAPI types')
  })

  const openAPITS = await interopDefault(import('openapi-typescript'))
  const schemas = await Promise.all(
    Object.entries(endpoints)
      .filter(([, endpoint]) => Boolean(endpoint.schema))
      .map(async ([id, endpoint]) => {
        let types = ''

        const schema = await resolveSchema(endpoint)
        runningCount++

        try {
          types = await openAPITS(schema, {
            commentHeader: '',
            ...openAPITSOptions,
          })
        }
        catch {
          types = `
export type paths = Record<string, never>
export type webhooks = Record<string, never>
export type components = Record<string, never>
export type external = Record<string, never>
export type operations = Record<string, never>
        `.trimStart()
        }
        finally {
          runningCount--
        }

        return [id, types] as const
      }),
  )

  return Object.fromEntries(schemas)
}

async function resolveSchema({
  schema,
}: OpenAPIEndpoint): Promise<string | URL | OpenAPI3> {
  if (typeof schema === 'function')
    return await schema()

  return schema!
}

async function interopDefault<T>(
  m: T | Promise<T>,
): Promise<T extends { default: infer U } ? U : T> {
  const resolved = await m
  return (resolved as any).default || resolved
}
