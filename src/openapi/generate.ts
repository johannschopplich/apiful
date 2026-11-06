import type { ServiceOptions } from '../config.ts'
import { pascalCase } from 'scule'
import { generateDocumentTypes } from './emit.ts'
import { getErrorMessage, loadOpenAPIDocument } from './load.ts'
import { isIdentifier } from './typescript.ts'

export { EMPTY_DOCUMENT_TYPES, generateDocumentTypes } from './emit.ts'
export { loadOpenAPIDocument } from './load.ts'
export type { LoadOpenAPIDocumentOptions, OpenAPIDocument, OpenAPIDocumentSource } from './load.ts'

const ENTRY_IMPORTED_TYPE_NAMES = ['OpenAPIEndpoint', 'OpenAPIPathMethods']
const SERVICE_REPOSITORY_TYPE_NAME = 'OpenAPIServiceRepository'
/** Types the `apiful/schema` entry declares itself, which no service may generate. */
const ENTRY_TYPE_NAMES = [...ENTRY_IMPORTED_TYPE_NAMES, SERVICE_REPOSITORY_TYPE_NAME]
const SERVICE_NAME_RE = /^[\p{L}\p{N}$_.-]+$/u

export interface GeneratedTypes {
  /** The `apiful/schema` module, importing from every fragment and exporting the type helpers. */
  entry: string
  /** One `apiful/schema/<service>` module per service, keyed by service name. */
  fragments: Record<string, string>
}

export interface GenerateTypesOptions {
  /** Directory a relative schema path resolves against. Defaults to the current working directory. */
  rootDir?: string
}

export interface TypeHelperIdentifiers {
  /** Name of the `paths` type the helpers read the endpoints from. */
  paths: string
  /** Name of the `components` type the model helper reads the schemas from. */
  components: string
}

export class GenerationError extends Error {
  override name = 'GenerationError'
}

/** Loads the OpenAPI document of every service and generates the entry and one fragment per service from them. */
export async function generateTypes(
  services: Record<string, ServiceOptions>,
  options: GenerateTypesOptions = {},
): Promise<GeneratedTypes> {
  assertDeclarableTypeNames(Object.keys(services))

  const fragmentEntries = await Promise.all(
    Object.entries(services).map(async ([serviceName, service]) => {
      const types = await generateServiceTypes(serviceName, service, options)
      return [
        serviceName,
        declareModule(`apiful/schema/${serviceName}`, types),
      ] as const
    }),
  )

  const serviceTypeNames = Object.keys(services).map(serviceName => [
    serviceName,
    createTypeNames(serviceName),
  ] as const)

  const servicePathImports = serviceTypeNames
    .map(([serviceName, typeNames]) => `import { paths as ${typeNames.paths}, components as ${typeNames.components} } from 'apiful/schema/${serviceName}'`)
    .join('\n')

  const serviceRepositoryEntries = serviceTypeNames
    .map(([serviceName, typeNames]) => `  '${serviceName}': ${typeNames.paths}`)
    .join('\n')

  const typeHelpers = serviceTypeNames
    .map(([serviceName, typeNames]) => generateTypeHelpers(serviceName, typeNames))
    .join('\n\n')

  const entry = declareModule('apiful/schema', `
import { ${ENTRY_IMPORTED_TYPE_NAMES.join(', ')} } from 'apiful/openapi'
${servicePathImports}

interface ${SERVICE_REPOSITORY_TYPE_NAME} {
${serviceRepositoryEntries}
}

${typeHelpers}
`.trimStart())

  return {
    entry,
    fragments: Object.fromEntries(fragmentEntries),
  }
}

/** Wraps declarations in an ambient module declaration, indenting every line that holds code. */
export function declareModule(specifier: string, body: string): string {
  return `declare module '${specifier}' {\n${body.trimEnd().replace(/^(?=.)/gm, '  ')}\n}\n`
}

/**
 * Emits the type helpers for one service, named after it. The emitted code references
 * the given `paths` and `components` types along with `OpenAPIEndpoint` and
 * `OpenAPIPathMethods` from `apiful/openapi`, none of which it imports – the code around it
 * brings them into scope.
 */
export function generateTypeHelpers(serviceName: string, { paths, components }: TypeHelperIdentifiers): string {
  const { endpoint: helperName, apiPaths, apiMethods, model } = createTypeNames(serviceName)

  return `
/**
 * OpenAPI endpoint type helper for the ${helperName} API.
 *
 * @example
 * // Get path parameters for retrieving a user by ID:
 * type UserParams = ${helperName}<'/users/{id}', 'get'>['path']
 *
 * // Get query parameters for listing users:
 * type UsersQuery = ${helperName}<'/users', 'get'>['query']
 *
 * // Get request body type for creating a user:
 * type CreateUserBody = ${helperName}<'/users', 'post'>['request']
 *
 * // Get success response for retrieving a user:
 * type UserResponse = ${helperName}<'/users/{id}', 'get'>['response']
 *
 * // Get a specific status code response:
 * type UserNotFoundResponse = ${helperName}<'/users/{id}', 'get'>['responses'][404]
 *
 * // Get complete endpoint type definition:
 * type UserEndpoint = ${helperName}<'/users/{id}', 'get'>
 */
export type ${helperName}<
  Path extends keyof ${paths},
  Method extends OpenAPIPathMethods<${paths}, Path>
> = OpenAPIEndpoint<${paths}, Path, Method>

/**
 * @example
 * type AvailablePaths = ${apiPaths} // Returns literal union of all available paths
 */
export type ${apiPaths} = keyof ${paths}

/**
 * @example
 * type UserMethods = ${apiMethods}<'/users/{id}'> // Returns 'get' | 'put' | 'delete' etc.
 */
export type ${apiMethods}<Path extends keyof ${paths}> = OpenAPIPathMethods<${paths}, Path>

/**
 * @example
 * type Pet = ${model}<'Pet'> // Get the Pet schema model
 * type User = ${model}<'User'> // Get the User schema model
 */
export type ${model}<T extends keyof ${components}['schemas']> = ${components}['schemas'][T]
`.trim()
}

/**
 * Throws where a service name holds a character that its module specifier or fragment file
 * cannot, or where the service would declare a type in the `apiful/schema` module that is not
 * a valid identifier, or that another service or the module itself already declares.
 */
function assertDeclarableTypeNames(serviceNames: string[]): void {
  const serviceNamesByTypeName = new Map<string, string>()

  for (const serviceName of serviceNames) {
    // The name also ends a module specifier and names the file of its fragment.
    if (!SERVICE_NAME_RE.test(serviceName))
      throw new GenerationError(`Service \`${serviceName}\` may only hold letters, digits, \`_\`, \`$\`, \`.\`, and \`-\``)
    const typeNames = createTypeNames(serviceName)
    if (!isIdentifier(typeNames.endpoint))
      throw new GenerationError(`Service \`${serviceName}\` generates the type \`${typeNames.endpoint}\`, which is not a valid identifier`)

    for (const typeName of Object.values(typeNames)) {
      if (ENTRY_TYPE_NAMES.includes(typeName))
        throw new GenerationError(`Service \`${serviceName}\` generates the type \`${typeName}\`, which the \`apiful/schema\` module declares itself`)
      const existingServiceName = serviceNamesByTypeName.get(typeName)
      if (existingServiceName !== undefined)
        throw new GenerationError(`Services \`${existingServiceName}\` and \`${serviceName}\` both generate the type \`${typeName}\``)
      serviceNamesByTypeName.set(typeName, serviceName)
    }
  }
}

/** Loads the OpenAPI document of one service and returns its types, naming the service in any failure. */
async function generateServiceTypes(
  serviceName: string,
  service: ServiceOptions,
  { rootDir }: GenerateTypesOptions,
): Promise<string> {
  try {
    const document = await loadOpenAPIDocument(service.schema, { rootDir })
    return generateDocumentTypes(document)
  }
  catch (error) {
    throw new GenerationError(
      `Failed to generate types for service \`${serviceName}\` – ${getErrorMessage(error)}`,
      { cause: error },
    )
  }
}

/** Returns the name of every type the `apiful/schema` module declares for one service. */
function createTypeNames(serviceName: string) {
  const helperName = pascalCase(serviceName)
  return {
    endpoint: helperName,
    apiPaths: `${helperName}ApiPaths`,
    apiMethods: `${helperName}ApiMethods`,
    model: `${helperName}Model`,
    paths: `${helperName}Paths`,
    components: `${helperName}Components`,
  }
}
