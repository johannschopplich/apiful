// Ported from the compiler-free generator of openapi-typescript (MIT), proposed in
// https://github.com/openapi-ts/openapi-typescript/pull/2872 (darkbasic/openapi-typescript@a8e1738).

import type { OpenAPIDocument } from './load.ts'
import type { TSNode } from './typescript.ts'
import { isObject } from 'utilful/object'
import { createRef, parseRef } from './pointer.ts'
import {
  BOOLEAN,
  createJSDocComment,
  INDENT,
  indexSignature,
  NEVER,
  NULL,
  NUMBER,
  propertySignature,
  STRING,
  tsArray,
  tsIndexedAccess,
  tsIntersection,
  tsIsPrimitive,
  tsLiteral,
  tsNullable,
  tsOmit,
  tsPropertyIndex,
  tsRecord,
  tsUnion,
  tsWithRequired,
  tupleType,
  typeLiteral,
  UNKNOWN,
  WITH_REQUIRED_HELPER,
} from './typescript.ts'

type SchemaObject = Record<string, any>
type ReferenceObject = { $ref: string } & Record<string, any>

interface ParameterObject {
  name: string
  in: 'query' | 'querystring' | 'header' | 'path' | 'cookie'
  required?: boolean
  deprecated?: boolean
  schema?: SchemaObject | ReferenceObject
  content?: Record<string, SchemaObject>
  [key: string]: any
}

interface DiscriminatorObject {
  propertyName: string
  mapping?: Record<string, string>
}

interface EmitContext {
  discriminators: {
    objects: Record<string, DiscriminatorObject>
    refsHandled: string[]
  }
  hasWithRequired: boolean
  hasMediaTypesGroup: boolean
  resolve: <T = any>($ref: string) => T | undefined
  /** Returns the node a ref points to as it stands, even where that node is itself a ref, which `resolve` would follow. */
  resolveOneHop: <T = any>($ref: string) => T | undefined
  /** Memo of `collectEagerMembers`. */
  eagerMembers: WeakMap<object, Set<object>>
}

interface TransformOptions {
  /** Ref to the node being transformed – its position in the document, not a ref it holds. */
  ref?: string
  /** Refs inlined on the way to the node, so a ref already among them recurses. */
  inlinedRefs?: string[]
  /**
   * Schema of the member whose type the node is part of, up to the closest object literal.
   * TypeScript resolves that type in one go, so a ref leading back to the member is circular.
   */
  member?: object
  context: EmitContext
}

/** HTTP methods a path item declares as fixed fields, `query` arriving with OpenAPI 3.2. */
const PATH_ITEM_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
  'query',
] as const
const PARAMETER_LOCATIONS = ['query', 'header', 'path', 'cookie'] as const
/** Component groups that hold types, in the order OpenAPI lists them, `mediaTypes` arriving with OpenAPI 3.2. */
const COMPONENT_GROUPS = [
  'schemas',
  'responses',
  'parameters',
  'requestBodies',
  'headers',
  'pathItems',
  'mediaTypes',
] as const
/** Keys an `allOf` member may carry and still describe nothing but which keys are required, annotations among them. */
const REQUIRED_ONLY_KEYS = new Set([
  'type',
  'properties',
  'required',
  'title',
  'description',
  'example',
  'examples',
  'default',
  'deprecated',
  'nullable',
  'readOnly',
  'writeOnly',
  'externalDocs',
  'xml',
  '$comment',
])
const PRIMITIVE_TYPES = [
  'boolean',
  'string',
  'number',
  'integer',
  'null',
]
const BINARY_TYPE = 'Blob | File'
const JSON_MEDIA_TYPE_RE = /^application\/(?:[\w.+-]+\+)?json(?:;|$)/i
const MULTIPART_FORM_DATA_RE = /^multipart\/form-data(?:;|$)/i
const FORM_URLENCODED_RE = /^application\/x-www-form-urlencoded(?:;|$)/i
const EMPTY_PATHS = `export type paths = ${tsRecord(STRING, NEVER)};`
const EMPTY_COMPONENTS = `export type components = ${tsRecord(STRING, NEVER)};`

/**
 * Stand-in for the types of a document that failed to load, declaring `paths` and `components`
 * without members, so the helpers and clients typed after them still compile.
 */
export const EMPTY_DOCUMENT_TYPES: string = `${EMPTY_PATHS}\n${EMPTY_COMPONENTS}\n`

/**
 * Emits the `paths` and `components` declarations for a bundled OpenAPI document. Operations
 * are inlined into `paths` rather than collected in an `operations` interface; each path item
 * lists only the methods it declares, with path-level parameters folded into its operations.
 */
export function generateDocumentTypes(document: OpenAPIDocument): string {
  // Discriminator handling patches the schemas it maps, which must not reach the caller's document.
  const clonedDocument = structuredClone(document)
  const context: EmitContext = {
    discriminators: { objects: {}, refsHandled: [] },
    hasWithRequired: false,
    hasMediaTypesGroup: hasMediaTypesGroup(clonedDocument.openapi),
    resolve: $ref => resolveRef(clonedDocument, $ref),
    resolveOneHop: $ref => resolveRefOneHop(clonedDocument, $ref),
    eagerMembers: new WeakMap(),
  }
  context.discriminators = scanDiscriminators(clonedDocument, context)

  const declarations: TSNode[] = []

  const pathMembers = isObject(clonedDocument.paths)
    ? transformPathsObject(clonedDocument.paths, context)
    : []
  declarations.push(pathMembers.length
    ? `export interface paths {\n${pathMembers.join('\n')}\n}`
    : EMPTY_PATHS)

  declarations.push(isObject(clonedDocument.components)
    ? `export interface components {\n${transformComponentsObject(clonedDocument.components, context).join('\n')}\n}`
    : EMPTY_COMPONENTS)

  if (context.hasWithRequired)
    declarations.push(WITH_REQUIRED_HELPER)

  return `${declarations.join('\n')}\n`
}

/** Whether an OpenAPI version has the `mediaTypes` components group, which OpenAPI 3.2 adds. */
export function hasMediaTypesGroup(openapi: string): boolean {
  return !/^3\.[01](?:\.|$)/.test(openapi)
}

/** Types a schema object that stands on its own, outside any document, and so holds no `$ref`. */
export function generateStandaloneSchemaType(schemaObject: SchemaObject): string {
  const context: EmitContext = {
    discriminators: { objects: {}, refsHandled: [] },
    hasWithRequired: false,
    hasMediaTypesGroup: false,
    resolve: () => undefined,
    resolveOneHop: () => undefined,
    eagerMembers: new WeakMap(),
  }
  return transformSchemaObject(schemaObject, { context }, '')
}

function transformPathsObject(pathsObject: Record<string, any>, context: EmitContext): TSNode[] {
  const memberIndent = INDENT
  const members: TSNode[] = []

  for (const [url, pathItemObject] of Object.entries(pathsObject)) {
    if (!isObject(pathItemObject))
      continue

    if ('$ref' in pathItemObject) {
      members.push(propertySignature({
        name: tsPropertyIndex(url),
        type: refToType(pathItemObject.$ref),
        comment: createJSDocComment(pathItemObject, memberIndent),
        indent: memberIndent,
      }))
      continue
    }

    members.push(propertySignature({
      name: tsPropertyIndex(url),
      type: transformPathItemObject(pathItemObject, {
        ref: createRef(['paths', url]),
        context,
      }, memberIndent),
      indent: memberIndent,
    }))
  }

  return members
}

function transformComponentsObject(componentsObject: Record<string, any>, context: EmitContext): TSNode[] {
  const memberIndent = INDENT
  const itemIndent = `${memberIndent}${INDENT}`
  const members: TSNode[] = []

  for (const componentGroup of COMPONENT_GROUPS) {
    if (componentGroup === 'mediaTypes' && !context.hasMediaTypesGroup)
      continue
    const items: TSNode[] = []

    for (const [name, item] of Object.entries<any>(componentsObject[componentGroup] ?? {})) {
      const options: TransformOptions = {
        ref: createRef(['components', componentGroup, name]),
        context,
      }
      let type: TSNode
      switch (componentGroup) {
        case 'schemas':
          type = transformSchemaObject(item, { ...options, member: item }, itemIndent)
          break
        case 'responses':
          type = transformResponseObject(item, options, itemIndent)
          break
        case 'parameters':
          type = transformParameterObject(item, options, itemIndent)
          break
        case 'requestBodies':
          type = transformRequestBodyObject(item, options, itemIndent)
          break
        case 'headers':
          type = transformHeaderObject(item, options, itemIndent)
          break
        case 'pathItems':
          type = transformPathItemObject(item, options, itemIndent)
          break
        case 'mediaTypes':
          type = transformMediaTypeObject(item, options, itemIndent)
          break
      }

      items.push(propertySignature({
        name: tsPropertyIndex(name),
        type,
        comment: createJSDocComment(item, itemIndent),
        indent: itemIndent,
      }))
    }

    members.push(propertySignature({
      name: componentGroup,
      type: items.length
        ? typeLiteral(items, memberIndent)
        : NEVER,
      indent: memberIndent,
    }))
  }

  return members
}

function transformPathItemObject(pathItem: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  if ('$ref' in pathItem)
    return refToType(pathItem.$ref)

  const memberIndent = `${indent}${INDENT}`
  const members: TSNode[] = []
  const operations: [method: string, operation: any, ref: string][] = PATH_ITEM_METHODS
    .filter(method => pathItem[method])
    .map(method => [
      method,
      pathItem[method],
      createRef([options.ref, method]),
    ])

  // OpenAPI 3.2 keys custom methods by their spelling on the wire; `paths` keys every method in lowercase.
  for (const [method, operation] of Object.entries<any>(pathItem.additionalOperations ?? {})) {
    const lowercasedMethod = method.toLowerCase()
    if (operation && !operations.some(([existingMethod]) => existingMethod === lowercasedMethod)) {
      operations.push([
        lowercasedMethod,
        operation,
        createRef([options.ref, 'additionalOperations', method]),
      ])
    }
  }

  for (const [method, operationObject, operationRef] of operations) {
    let operationType: TSNode
    if ('$ref' in operationObject) {
      operationType = refToType(operationObject.$ref)
    }
    else {
      // Operation parameters come last and override a path-level parameter of the same location and name.
      const keyedParameters: Record<string, ParameterObject | ReferenceObject> = {}
      for (const parameter of [
        ...(pathItem.parameters ?? []),
        ...(operationObject.parameters ?? []),
      ]) {
        const resolvedParameter = resolveParameter(parameter, options.context)
        keyedParameters[`${resolvedParameter?.in}-${resolvedParameter?.name}`] = parameter
      }

      operationType = typeLiteral(
        transformOperationObject(
          {
            ...operationObject,
            parameters: Object.values(keyedParameters),
          },
          { ...options, ref: operationRef },
          `${memberIndent}${INDENT}`,
        ),
        memberIndent,
      )
    }

    members.push(propertySignature({
      name: tsPropertyIndex(method),
      type: operationType,
      comment: createJSDocComment(operationObject, memberIndent),
      indent: memberIndent,
    }))
  }

  return typeLiteral(members, indent)
}

/** Returns the members of an operation's object type, not the type itself. */
function transformOperationObject(operationObject: Record<string, any>, options: TransformOptions, indent: string): TSNode[] {
  const members: TSNode[] = [
    transformParametersArray(operationObject.parameters ?? [], options, indent),
  ]

  if (operationObject.requestBody) {
    const requestBody = operationObject.requestBody
    const requestBodyType = '$ref' in requestBody
      ? refToType(requestBody.$ref)
      : transformRequestBodyObject(requestBody, {
          ...options,
          ref: createRef([options.ref, 'requestBody']),
        }, indent)
    const isRequired = !!('$ref' in requestBody
      ? options.context.resolve(requestBody.$ref)
      : requestBody)?.required
    members.push(propertySignature({
      name: 'requestBody',
      type: requestBodyType,
      optional: !isRequired,
      comment: createJSDocComment(requestBody, indent),
      indent,
    }))
  }
  else {
    members.push(propertySignature({
      name: 'requestBody',
      optional: true,
      type: NEVER,
      indent,
    }))
  }

  members.push(propertySignature({
    name: 'responses',
    type: transformResponsesObject(operationObject.responses ?? {}, options, indent),
    indent,
  }))

  return members
}

/**
 * Builds the `parameters` member of an operation. An OpenAPI 3.2 `querystring` parameter
 * describes the whole query string, so its type stands in for the `query` object.
 */
function transformParametersArray(
  parametersArray: (ParameterObject | ReferenceObject)[],
  options: TransformOptions,
  indent: string,
): TSNode {
  const locationIndent = `${indent}${INDENT}`
  const parameterIndent = `${locationIndent}${INDENT}`
  const parameters = parametersArray.map(original => ({
    original,
    resolved: resolveParameter(original, options.context),
  }))
  const locationMembers: TSNode[] = []

  for (const location of PARAMETER_LOCATIONS) {
    const members: TSNode[] = []
    const optionalFlags: boolean[] = []

    for (const { original, resolved } of parameters) {
      if (resolved?.in !== location)
        continue
      const isOptional = isParameterOptional(resolved, options.context)
      optionalFlags.push(isOptional)
      members.push(propertySignature({
        name: tsPropertyIndex(resolved.name),
        type: transformParameter(original, resolved, options, parameterIndent),
        optional: isOptional,
        comment: createJSDocComment(resolved, parameterIndent),
        indent: parameterIndent,
      }))
    }

    let type = members.length
      ? typeLiteral(members, locationIndent)
      : undefined
    let isOptional = optionalFlags.every(Boolean)

    const querystring = location === 'query'
      ? parameters.find(({ resolved }) => resolved?.in === 'querystring')
      : undefined
    if (querystring) {
      const querystringType = transformParameter(querystring.original, querystring.resolved!, options, locationIndent)
      type = type
        ? tsIntersection([type, querystringType])
        : querystringType
      isOptional = isOptional && !querystring.resolved!.required
    }

    locationMembers.push(propertySignature({
      name: location,
      type: type ?? NEVER,
      optional: isOptional,
      indent: locationIndent,
    }))
  }

  return propertySignature({
    name: 'parameters',
    type: typeLiteral(locationMembers, indent),
    indent,
  })
}

/**
 * References a parameter component by name. A ref anywhere else is inlined, since path-level
 * parameters, the usual other target, have no counterpart in the generated `paths`.
 */
function transformParameter(
  original: ParameterObject | ReferenceObject,
  resolved: ParameterObject,
  options: TransformOptions,
  indent: string,
): TSNode {
  if ('$ref' in original && original.$ref.startsWith('#/components/parameters/'))
    return refToType(original.$ref, resolved)
  return transformParameterObject(resolved, {
    ...options,
    ref: createRef([
      options.ref,
      'parameters',
      resolved.in,
      resolved.name,
    ]),
  }, indent)
}

/**
 * Types a parameter by its schema, or a string where it has none. A parameter described
 * by `content` instead takes its schema where the value is an object serialized as JSON
 * into the query, or is the OpenAPI 3.2 `querystring` as a whole.
 */
function transformParameterObject(parameterObject: ParameterObject, options: TransformOptions, indent: string): TSNode {
  if (parameterObject.schema)
    return transformSchemaObject(parameterObject.schema, options, indent)

  const [mediaType, mediaTypeObject] = Object.entries(parameterObject.content ?? {})[0] ?? []
  if (mediaType && mediaTypeObject?.schema) {
    if (parameterObject.in === 'querystring')
      return transformSchemaObject(mediaTypeObject.schema, options, indent)
    if (parameterObject.in === 'query' && JSON_MEDIA_TYPE_RE.test(mediaType) && isObjectSchema(mediaTypeObject.schema, options.context))
      return transformSchemaObject(mediaTypeObject.schema, options, indent)
  }

  return STRING
}

function transformRequestBodyObject(requestBodyObject: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  const memberIndent = `${indent}${INDENT}`
  const contentIndent = `${memberIndent}${INDENT}`
  const members: TSNode[] = []

  for (const [contentType, mediaTypeObject] of Object.entries<any>(requestBodyObject.content ?? {})) {
    members.push(propertySignature({
      name: tsPropertyIndex(contentType),
      type: transformRequestMediaType(contentType, mediaTypeObject, {
        ...options,
        ref: createRef([options.ref, 'content', contentType]),
      }, contentIndent),
      comment: createJSDocComment(mediaTypeObject, contentIndent),
      indent: contentIndent,
    }))
  }

  if (!members.length) {
    members.push(propertySignature({
      name: tsPropertyIndex('*/*'),
      optional: true,
      type: NEVER,
      indent: contentIndent,
    }))
  }

  return typeLiteral([
    propertySignature({
      name: 'content',
      type: typeLiteral(members, memberIndent),
      indent: memberIndent,
    }),
  ], indent)
}

/**
 * Types a request body by what reaches the wire. ofetch sends a plain object as JSON unless the
 * request sets an `application/x-www-form-urlencoded` content type, so a multipart body is typed
 * as the `FormData` it sends as is, and a urlencoded body takes a `URLSearchParams` besides its schema.
 */
function transformRequestMediaType(contentType: string, mediaTypeObject: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  if (MULTIPART_FORM_DATA_RE.test(contentType))
    return 'FormData'
  const mediaType = transformMediaTypeObject(mediaTypeObject, options, indent)
  return FORM_URLENCODED_RE.test(contentType)
    ? tsUnion([mediaType, 'URLSearchParams'])
    : mediaType
}

function transformResponsesObject(responsesObject: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  const memberIndent = `${indent}${INDENT}`
  const members: TSNode[] = []

  for (const [responseCode, responseObject] of Object.entries<any>(responsesObject)) {
    members.push(propertySignature({
      name: tsPropertyIndex(responseCode),
      type: '$ref' in responseObject
        ? refToType(responseObject.$ref)
        : transformResponseObject(responseObject, {
            ...options,
            ref: createRef([options.ref, 'responses', responseCode]),
          }, memberIndent),
      comment: createJSDocComment(responseObject, memberIndent),
      indent: memberIndent,
    }))
  }

  return members.length
    ? typeLiteral(members, indent)
    : NEVER
}

function transformResponseObject(responseObject: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  const memberIndent = `${indent}${INDENT}`
  const nestedIndent = `${memberIndent}${INDENT}`
  const headerMembers: TSNode[] = []

  for (const [name, headerObject] of Object.entries<any>(responseObject.headers ?? {})) {
    headerMembers.push(propertySignature({
      name: tsPropertyIndex(name),
      type: '$ref' in headerObject
        ? refToType(headerObject.$ref)
        : transformHeaderObject(headerObject, {
            ...options,
            ref: createRef([options.ref, 'headers', name]),
          }, nestedIndent),
      optional: !('$ref' in headerObject) && !headerObject.required,
      comment: createJSDocComment(headerObject, nestedIndent),
      indent: nestedIndent,
    }))
  }
  // A response may carry headers its definition leaves out.
  headerMembers.push(indexSignature({ keyName: 'name', valueType: UNKNOWN, indent: nestedIndent }))

  const contentMembers: TSNode[] = []
  for (const [contentType, mediaTypeObject] of Object.entries<any>(responseObject.content ?? {})) {
    contentMembers.push(propertySignature({
      name: tsPropertyIndex(contentType),
      type: transformMediaTypeObject(mediaTypeObject, {
        ...options,
        ref: createRef([options.ref, 'content', contentType]),
      }, nestedIndent),
      comment: createJSDocComment(mediaTypeObject, nestedIndent),
      indent: nestedIndent,
    }))
  }

  return typeLiteral([
    propertySignature({
      name: 'headers',
      type: typeLiteral(headerMembers, memberIndent),
      indent: memberIndent,
    }),
    contentMembers.length
      ? propertySignature({
          name: 'content',
          type: typeLiteral(contentMembers, memberIndent),
          indent: memberIndent,
        })
      : propertySignature({
          name: 'content',
          optional: true,
          type: NEVER,
          indent: memberIndent,
        }),
  ], indent)
}

function transformHeaderObject(headerObject: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  if (headerObject.schema)
    return transformSchemaObject(headerObject.schema, options, indent)

  if (headerObject.content) {
    const memberIndent = `${indent}${INDENT}`
    const members: TSNode[] = []
    for (const [contentType, mediaTypeObject] of Object.entries<any>(headerObject.content)) {
      members.push(propertySignature({
        name: tsPropertyIndex(contentType),
        type: transformMediaTypeObject(mediaTypeObject, {
          ...options,
          ref: createRef([options.ref, 'content', contentType]),
        }, memberIndent),
        comment: createJSDocComment(mediaTypeObject, memberIndent),
        indent: memberIndent,
      }))
    }
    return typeLiteral(members, indent)
  }

  return UNKNOWN
}

function transformMediaTypeObject(mediaTypeObject: Record<string, any>, options: TransformOptions, indent: string): TSNode {
  if ('$ref' in mediaTypeObject)
    return refToType(mediaTypeObject.$ref)
  return mediaTypeObject.schema
    ? transformSchemaObject(mediaTypeObject.schema, options, indent)
    : UNKNOWN
}

function transformSchemaObject(
  schemaObject: SchemaObject | ReferenceObject | boolean,
  options: TransformOptions,
  indent: string,
): TSNode {
  if (!schemaObject)
    return NEVER
  // A `true` schema accepts anything.
  if (schemaObject === true)
    return UNKNOWN
  if (Array.isArray(schemaObject) || typeof schemaObject !== 'object') {
    throw new TypeError(`Expected a schema object, received ${Array.isArray(schemaObject)
      ? 'an array'
      : typeof schemaObject} at \`${options.ref}\``)
  }

  if ('$ref' in schemaObject)
    return transformSchemaRef(schemaObject.$ref, options, indent)

  if ('const' in schemaObject)
    return tsLiteral(schemaObject.const, indent)

  // An enum on an object schema is a list of variants, handled with `oneOf` below.
  if (Array.isArray(schemaObject.enum) && schemaObject.type !== 'object' && !('properties' in schemaObject)) {
    const hasAdditionalProperties = !!schemaObject.additionalProperties
    if (!hasAdditionalProperties || schemaObject.type === 'string') {
      const enumTypes = schemaObject.enum.map((value: unknown) => tsLiteral(value, indent))
      if (isNullableSchema(schemaObject))
        enumTypes.push(NULL)
      const unionType = tsUnion(enumTypes)
      // An open string enum also accepts any other string.
      return hasAdditionalProperties
        ? tsUnion([
            unionType,
            tsIntersection([STRING, '{}']),
          ])
        : unionType
    }
  }

  const siblingProperties: unknown = schemaObject.properties
  const collectUnionCompositions = (items: (SchemaObject | ReferenceObject)[], unionKey: 'anyOf' | 'oneOf'): TSNode[] =>
    items.map((item, index) => {
      const itemOptions: TransformOptions = {
        ...options,
        ref: createRef([
          options.ref,
          unionKey,
          String(index),
        ]),
      }
      // A member that only lists required keys requires them of the properties beside it.
      if (isRequiredOnlySchema(item) && item.required?.length && isObject(siblingProperties)) {
        const memberIndent = `${indent}${INDENT}`
        return typeLiteral(item.required.map((key: string) => propertySignature({
          name: tsPropertyIndex(key),
          type: Object.hasOwn(siblingProperties, key)
            ? transformSchemaObject(siblingProperties[key], { ...itemOptions, member: undefined }, memberIndent)
            : UNKNOWN,
          indent: memberIndent,
        })), indent)
      }
      return transformSchemaObject(item, itemOptions, indent)
    })

  const collectAllOfCompositions = (items: (SchemaObject | ReferenceObject)[], required: string[] = []): TSNode[] => {
    return items.map((item) => {
      let itemType: TSNode
      if ('$ref' in item) {
        const parentSchema = options.context.resolve<SchemaObject>(item.$ref)
        // A parent whose `oneOf` lists this schema back would make each type contain the other,
        // so it is inlined without the union of its children.
        itemType = isObject(parentSchema) && hasOneOfMember(parentSchema, options.ref)
          ? transformSchemaObject({ ...parentSchema, oneOf: undefined, discriminator: undefined }, { ...options, ref: item.$ref }, indent)
          : transformSchemaObject(item, options, indent)
        // The keys the schema requires become required on a referenced schema, unless discriminator handling already did.
        if (
          isObject(parentSchema)
          && 'properties' in parentSchema
          && !options.context.discriminators.refsHandled.includes(item.$ref)
        ) {
          const validRequiredKeys = required.filter(key => !!parentSchema.properties?.[key])
          if (validRequiredKeys.length) {
            itemType = tsWithRequired(itemType, validRequiredKeys)
            options.context.hasWithRequired = true
          }
        }
      }
      else {
        const itemRequired = [...required]
        if (typeof item === 'object' && Array.isArray(item.required))
          itemRequired.push(...item.required)
        itemType = transformSchemaObject({ ...item, required: itemRequired }, options, indent)
      }

      const discriminator = ('$ref' in item && options.context.discriminators.objects[item.$ref]) || item.discriminator
      if (!discriminator)
        return itemType
      const parentSchema = '$ref' in item
        ? options.context.resolve<SchemaObject>(item.$ref)
        : item
      // `Omit` keeps only the index signature of a type that has one, so such a parent keeps its
      // discriminator property, which the value of the schema narrows.
      if (isObject(parentSchema) && (parentSchema.additionalProperties || parentSchema.patternProperties))
        return itemType
      return tsOmit(isObject(parentSchema) && isNullableSchema(parentSchema)
        ? `NonNullable<${itemType}>`
        : itemType, [discriminator.propertyName])
    })
  }

  schemaObject = foldRequiredOnlyMembers(schemaObject)
  let finalType: TSNode | undefined

  // A list of types already applies `allOf` and `anyOf` to each of its types but `null` and those
  // left to `oneOf`, so applying them again here would drop the `null`.
  const appliesCompositionsPerType = Array.isArray(schemaObject.type)
    && schemaObject.type.some((type: unknown) => typeof type === 'string' && type !== 'null' && !isTypeLeftToOneOf(schemaObject, type))
  const coreObjectType = transformSchemaObjectCore(schemaObject, options, indent)
  const allOfTypes = appliesCompositionsPerType
    ? []
    : collectAllOfCompositions(schemaObject.allOf ?? [], schemaObject.required)
  if (coreObjectType || allOfTypes.length) {
    const allOfType = allOfTypes.length
      ? tsIntersection(allOfTypes)
      : undefined
    finalType = tsIntersection([
      ...(coreObjectType
        ? [coreObjectType]
        : []),
      ...(allOfType
        ? [allOfType]
        : []),
    ])
  }

  // A union is closer to `anyOf` than to `oneOf`, since TypeScript has no exclusive union.
  const anyOfTypes = appliesCompositionsPerType
    ? []
    : collectUnionCompositions(schemaObject.anyOf ?? [], 'anyOf')
  if (anyOfTypes.length)
    finalType = applyUnionComposition(finalType, anyOfTypes)

  const oneOfTypes = collectUnionCompositions(
    schemaObject.oneOf || (schemaObject.type === 'object' && schemaObject.enum) || [],
    'oneOf',
  )
  if (oneOfTypes.length)
    finalType = applyUnionComposition(finalType, oneOfTypes)

  // An object schema without a `properties` or `additionalProperties` key admits any properties.
  if (!finalType && schemaObject.type === 'object' && !('properties' in schemaObject) && !('additionalProperties' in schemaObject))
    finalType = tsRecord(STRING, UNKNOWN)
  if (!finalType) {
    finalType = 'type' in schemaObject
      ? tsRecord(STRING, NEVER)
      : UNKNOWN
  }

  if (finalType !== UNKNOWN && schemaObject.nullable)
    finalType = tsNullable([finalType])

  return finalType
}

/**
 * Combines the type of a schema with the union of its `anyOf` or `oneOf` members: intersected,
 * unless the members are all primitive or the schema is typed `null`, which both read as a union.
 */
function applyUnionComposition(type: TSNode | undefined, unionTypes: TSNode[]): TSNode {
  if (!type)
    return tsUnion(unionTypes)
  return type === NULL || unionTypes.every(tsIsPrimitive)
    ? tsUnion([type, ...unionTypes])
    : tsIntersection([
        type,
        tsUnion(unionTypes),
      ])
}

/**
 * Types a schema ref as an indexed access where it names a member of the generated types. Any
 * other ref – into `items` or `allOf`, or under `paths` – is inlined, following a ref it lands on
 * one hop at a time so that each hop can still index, and is `unknown` where it recurses or
 * points to nothing.
 */
function transformSchemaRef(ref: string, options: TransformOptions, indent: string): TSNode {
  const indexedType = schemaRefToType(ref, options.context)
  if (indexedType) {
    const { member, context } = options
    const target = context.resolveOneHop<unknown>(ref)
    // A type made of itself outside any object literal fails to compile (TS2502), as in `string | JsonValue[]`.
    if (member && isObject(target) && (target === member || collectEagerMembers(target, context).has(member)))
      return UNKNOWN
    return indexedType
  }

  const targetSchema = options.context.resolveOneHop<SchemaObject | boolean>(ref)
  if (targetSchema === undefined || options.inlinedRefs?.includes(ref))
    return UNKNOWN
  return transformSchemaObject(targetSchema, {
    ...options,
    ref,
    inlinedRefs: [
      ...(options.inlinedRefs ?? []),
      ref,
    ],
  }, indent)
}

/**
 * Indexes the generated types along a schema ref that names a component, or a `properties` or
 * `$defs` entry of one at any depth, or returns `undefined` where a step passes through a schema
 * that holds no members to index. A step out of a member that may be absent or `null` indexes
 * into that member's `NonNullable` type, and an optional member at the end leaves out `undefined`.
 */
function schemaRefToType(ref: string, context: EmitContext): TSNode | undefined {
  const { segments } = parseRef(ref)
  if (segments[0] !== 'components' || segments.length < 3 || segments.length % 2 === 0)
    return undefined

  let type = tsIndexedAccess(segments[0], ...segments.slice(1, 3))
  let schemaObject = context.resolveOneHop<unknown>(createRef(segments.slice(0, 3)))
  let isOptional = false
  for (let index = 3; index < segments.length; index += 2) {
    const memberGroup = segments[index]!
    const memberName = segments[index + 1]!
    if ((memberGroup !== 'properties' && memberGroup !== '$defs') || !hasIndexableMembers(schemaObject))
      return undefined
    const members = schemaObject[memberGroup]
    if (!isObject(members) || !Object.hasOwn(members, memberName))
      return undefined

    const parentType = isOptional || isNullableSchema(schemaObject)
      ? `NonNullable<${type}>`
      : type
    // The `$defs` member is optional.
    type = memberGroup === '$defs'
      ? tsIndexedAccess(`NonNullable<${tsIndexedAccess(parentType, '$defs')}>`, memberName)
      : tsIndexedAccess(parentType, memberName)
    isOptional = memberGroup === 'properties' && !(Array.isArray(schemaObject.required) && schemaObject.required.includes(memberName))
    schemaObject = members[memberName]
  }

  // The schema of an optional property describes its value, never its absence.
  return isOptional
    ? `Exclude<${type}, undefined>`
    : type
}

/**
 * Collects the schemas of the members whose types TypeScript resolves along with the type of
 * a schema: those its refs index, outside of an object literal, and theirs in turn.
 */
function collectEagerMembers(schemaObject: object, context: EmitContext): Set<object> {
  const memoized = context.eagerMembers.get(schemaObject)
  if (memoized)
    return memoized
  const members = new Set<object>()
  // Set before the walk, so a member reached again while collecting counts as collected.
  context.eagerMembers.set(schemaObject, members)

  const inlinedNodes = new Set<object>()
  const walk = (node: unknown, owner: object): void => {
    if (!isObject(node))
      return
    if (typeof node.$ref === 'string') {
      const target = context.resolveOneHop<unknown>(node.$ref)
      if (!isObject(target))
        return
      if (schemaRefToType(node.$ref, context)) {
        members.add(target)
        for (const member of collectEagerMembers(target, context))
          members.add(member)
      }
      else if (!inlinedNodes.has(target)) {
        inlinedNodes.add(target)
        walk(target, target)
      }
      return
    }
    for (const item of Array.isArray(node.allOf)
      ? node.allOf
      : []) {
      // A parent whose `oneOf` lists the schema back is inlined without that `oneOf`.
      const parent = isObject(item) && typeof item.$ref === 'string'
        ? context.resolve<unknown>(item.$ref)
        : undefined
      if (isObject(parent) && Array.isArray(parent.oneOf) && parent.oneOf.some((member: unknown) => isObject(member) && typeof member.$ref === 'string' && context.resolveOneHop(member.$ref) === owner))
        walk({ ...parent, oneOf: undefined }, parent)
      else
        walk(item, owner)
    }
    for (const key of ['anyOf', 'oneOf', 'prefixItems'] as const) {
      for (const item of Array.isArray(node[key])
        ? node[key]
        : [])
        walk(item, owner)
    }
    if (Array.isArray(node.items))
      node.items.forEach(item => walk(item, owner))
    else
      walk(node.items, owner)
  }
  walk(schemaObject, schemaObject)

  return members
}

/**
 * Whether a schema is typed as an object literal that holds its `properties` and `$defs` as
 * members, at most intersected with its `allOf` and `oneOf` or made nullable, rather than as a
 * primitive, an array, a ref, a `const` or `enum` literal, or an `anyOf` union.
 */
function hasIndexableMembers(schemaObject: unknown): schemaObject is SchemaObject {
  if (!isObject(schemaObject) || '$ref' in schemaObject || 'const' in schemaObject || 'enum' in schemaObject || 'anyOf' in schemaObject)
    return false
  // A `oneOf` of primitives joins the object literal in a union, which holds no members to index.
  if (Array.isArray(schemaObject.oneOf) && schemaObject.oneOf.length && schemaObject.oneOf.every(isPrimitiveSchema))
    return false
  return schemaObject.type === undefined || isObjectType(schemaObject.type)
}

/** Whether a schema `type`, or a type list once `null` is left out, is `object` alone. */
function isObjectType(type: unknown): boolean {
  const types = (Array.isArray(type)
    ? type
    : [type]).filter(item => item !== 'null')
  return types.length === 1 && types[0] === 'object'
}

/** Whether an inline schema is typed as nothing but primitive types. */
function isPrimitiveSchema(schemaObject: unknown): boolean {
  if (!isObject(schemaObject) || '$ref' in schemaObject)
    return false
  // A schema without a type takes the type of its compositions.
  if (schemaObject.type === undefined) {
    const members: unknown[] = [schemaObject.allOf, schemaObject.anyOf, schemaObject.oneOf].flatMap(items => Array.isArray(items)
      ? items
      : [])
    return members.length > 0 && members.every(isPrimitiveSchema)
  }
  const types: unknown[] = Array.isArray(schemaObject.type)
    ? schemaObject.type
    : [schemaObject.type]
  return types.every(type => PRIMITIVE_TYPES.includes(type as string))
}

function isNullableSchema(schemaObject: SchemaObject): boolean {
  return !!schemaObject.nullable || (Array.isArray(schemaObject.type) && schemaObject.type.includes('null'))
}

function hasOneOfMember(schemaObject: SchemaObject, ref: string | undefined): boolean {
  return !!ref && Array.isArray(schemaObject.oneOf) && schemaObject.oneOf.some((item: unknown) => isObject(item) && item.$ref === ref)
}

/**
 * Folds each `allOf` member that describes nothing but which keys are required into the schema
 * itself, which makes those keys required on its own properties and on its other members, and
 * types the schema as an object where such a member does.
 */
function foldRequiredOnlyMembers(schemaObject: SchemaObject): SchemaObject {
  if (!Array.isArray(schemaObject.allOf))
    return schemaObject
  const requiredOnlyItems = schemaObject.allOf.filter(isRequiredOnlySchema)
  if (!requiredOnlyItems.length)
    return schemaObject

  return {
    ...schemaObject,
    ...(schemaObject.type === undefined && requiredOnlyItems.some(item => item.type === 'object') && { type: 'object' }),
    required: [
      ...(schemaObject.required ?? []),
      ...requiredOnlyItems.flatMap(item => item.required ?? []),
    ],
    allOf: schemaObject.allOf.filter((item: SchemaObject) => !requiredOnlyItems.includes(item)),
  }
}

/** Whether an inline schema, at most typed as an object, describes nothing but which keys are required. */
function isRequiredOnlySchema(schemaObject: SchemaObject | ReferenceObject | boolean): schemaObject is SchemaObject {
  if (!isObject(schemaObject) || '$ref' in schemaObject)
    return false
  return (schemaObject.type === undefined || schemaObject.type === 'object')
    && !Object.keys(schemaObject.properties ?? {}).length
    && Object.keys(schemaObject).every(key => REQUIRED_ONLY_KEYS.has(key) || key.startsWith('x-'))
}

/** Whether a primitive type of a type list is one that `oneOf` lists again, which leaves it to `oneOf`. */
function isTypeLeftToOneOf(schemaObject: SchemaObject, type: string): boolean {
  return Array.isArray(schemaObject.oneOf)
    && PRIMITIVE_TYPES.includes(type)
    && schemaObject.oneOf.some((item: any) => typeof item === 'object' && item.type === type)
}

/** Types a schema apart from its `allOf`, `anyOf`, and `oneOf` compositions. */
function transformSchemaObjectCore(schemaObject: SchemaObject, options: TransformOptions, indent: string): TSNode | undefined {
  if (schemaObject.type) {
    if (schemaObject.type === 'null')
      return NULL
    if (schemaObject.type === 'string') {
      return isBinarySchema(schemaObject)
        ? BINARY_TYPE
        : STRING
    }
    if (schemaObject.type === 'number' || schemaObject.type === 'integer')
      return NUMBER
    if (schemaObject.type === 'boolean')
      return BOOLEAN

    if (schemaObject.type === 'array') {
      // Only `prefixItems` and the legacy array form of `items` describe a tuple.
      if (schemaObject.prefixItems || Array.isArray(schemaObject.items)) {
        const prefixItems: (SchemaObject | ReferenceObject)[] = schemaObject.prefixItems ?? schemaObject.items
        const elementTypes = prefixItems.map(item => transformSchemaObject(item, options, `${indent}${INDENT}`))
        // `items` beside `prefixItems` types the elements after them, which `false` or `maxItems` rule out.
        const isClosed = !schemaObject.prefixItems
          || schemaObject.items === false
          || (typeof schemaObject.maxItems === 'number' && schemaObject.maxItems <= prefixItems.length)
        if (!isClosed) {
          const restType = isObject(schemaObject.items)
            ? transformSchemaObject(schemaObject.items, options, `${indent}${INDENT}`)
            : UNKNOWN
          elementTypes.push(`...${tsArray(restType)}`)
        }
        return tupleType(elementTypes, indent)
      }
      return tsArray(schemaObject.items
        ? transformSchemaObject(schemaObject.items, options, indent)
        : UNKNOWN)
    }

    // A list of types, among them OpenAPI 3.1's way of saying nullable.
    if (Array.isArray(schemaObject.type)) {
      const uniqueTypes: TSNode[] = []
      for (const type of schemaObject.type) {
        if (isTypeLeftToOneOf(schemaObject, type))
          continue
        uniqueTypes.push(type === 'null' || type === null
          ? NULL
          : transformSchemaObject({
              ...schemaObject,
              type,
              ...(Array.isArray(schemaObject.oneOf) && { oneOf: undefined }),
            }, options, indent))
      }
      return tsUnion(uniqueTypes)
    }
  }

  const memberIndent = `${indent}${INDENT}`
  const coreMembers: TSNode[] = []
  const propertyTypes: TSNode[] = []

  // A schema inheriting from a discriminated parent gets the discriminator property, unless it is a parent itself.
  for (const compositionKey of ['allOf', 'anyOf'] as const) {
    if (!schemaObject[compositionKey])
      continue
    const discriminator = !schemaObject.discriminator
      && !options.context.discriminators.refsHandled.includes(options.ref ?? '')
      && options.context.discriminators.objects[options.ref ?? '']
    if (discriminator) {
      coreMembers.unshift(createDiscriminatorProperty(discriminator, options.ref ?? '', memberIndent))
      break
    }
  }

  const hasProperties = isObject(schemaObject.properties) && Object.keys(schemaObject.properties).length > 0
  if (!hasProperties && !schemaObject.additionalProperties && !schemaObject.patternProperties && !schemaObject.$defs) {
    return coreMembers.length
      ? typeLiteral(coreMembers, indent)
      : undefined
  }

  if (hasProperties) {
    for (const [key, value] of Object.entries<any>(schemaObject.properties)) {
      if ((typeof value !== 'object' && typeof value !== 'boolean') || Array.isArray(value))
        throw new TypeError(`Invalid property \`${key}\` at \`${options.ref}\`, expected a schema object or a boolean`)

      const isReadOnly = typeof value === 'object' && !!value.readOnly
      const isRequired = !!schemaObject.required?.includes(key)

      const propertyType = transformSchemaObject(value, {
        ...options,
        ref: createRef([options.ref, key]),
        member: value,
      }, memberIndent)
      propertyTypes.push(propertyType)
      coreMembers.push(propertySignature({
        name: tsPropertyIndex(key),
        type: propertyType,
        optional: !isRequired,
        readonly: isReadOnly,
        comment: createJSDocComment(value, memberIndent),
        indent: memberIndent,
      }))
    }
  }

  if (isObject(schemaObject.$defs) && Object.keys(schemaObject.$defs).length) {
    const defsIndent = `${memberIndent}${INDENT}`
    const defMembers = Object.entries<any>(schemaObject.$defs).map(([key, value]) => propertySignature({
      name: tsPropertyIndex(key),
      type: transformSchemaObject(value, {
        ...options,
        ref: createRef([options.ref, '$defs', key]),
        member: value,
      }, defsIndent),
      readonly: !!value?.readOnly,
      comment: createJSDocComment(value, defsIndent),
      indent: defsIndent,
    }))
    // Data never carries `$defs`, which is only there to hold the schemas refs point into.
    coreMembers.push(propertySignature({
      name: '$defs',
      type: typeLiteral(defMembers, memberIndent),
      optional: true,
      indent: memberIndent,
    }))
  }

  const { additionalProperties, patternProperties } = schemaObject
  const indexTypes: TSNode[] = []
  if (isObject(additionalProperties) && Object.keys(additionalProperties).length)
    indexTypes.push(transformSchemaObject(additionalProperties, { ...options, member: undefined }, memberIndent))
  if (additionalProperties === true || (isObject(additionalProperties) && !Object.keys(additionalProperties).length))
    indexTypes.push(UNKNOWN)
  if (isObject(patternProperties)) {
    for (const value of Object.values<any>(patternProperties))
      indexTypes.push(transformSchemaObject(value, { ...options, member: undefined }, memberIndent))
  }

  if (!indexTypes.length) {
    return coreMembers.length
      ? typeLiteral(coreMembers, indent)
      : undefined
  }

  // The index signature also covers the declared properties, which an intersection with a
  // narrower one would make impossible to satisfy.
  if (!indexTypes.includes(UNKNOWN))
    indexTypes.push(...propertyTypes)

  return tsIntersection([
    ...(coreMembers.length
      ? [
          typeLiteral(coreMembers, indent),
        ]
      : []),
    typeLiteral([
      indexSignature({
        keyName: 'key',
        valueType: tsUnion(indexTypes),
        indent: memberIndent,
      }),
    ], indent),
  ])
}

/**
 * Converts a `$ref` into an indexed access type, `components["responses"]["NotFound"]`. A ref
 * to a parameter indexes by its location and name.
 */
function refToType(ref: string, resolvedParameter?: ParameterObject): TSNode {
  const { segments } = parseRef(ref)
  if (segments.length === 0)
    throw new Error(`Failed to parse the $ref \`${ref}\``)

  const isParameter = !!resolvedParameter && !('$ref' in resolvedParameter) && !!resolvedParameter.in
  const restSegments = segments.slice(3)

  return restSegments.reduce<TSNode>((type, segment, index) => {
    if (isParameter && index === restSegments.length - 1)
      return tsIndexedAccess(type, resolvedParameter.in, resolvedParameter.name)
    return tsIndexedAccess(type, segment)
  }, tsIndexedAccess(segments[0]!, ...segments.slice(1, 3)))
}

function resolveParameter(parameter: ParameterObject | ReferenceObject, context: EmitContext): ParameterObject | undefined {
  return '$ref' in parameter
    ? context.resolve<ParameterObject>(parameter.$ref)
    : parameter as ParameterObject
}

/**
 * Whether a client may leave a parameter out: a query, header, or cookie parameter unless
 * required, or whose schema declares a default the server falls back to. A path parameter
 * never is – the URL template has no value to fall back to.
 */
function isParameterOptional(parameter: ParameterObject, context: EmitContext): boolean {
  if (parameter.in === 'path')
    return false
  if (!parameter.required)
    return true
  const mediaType = Object.values(parameter.content ?? {})[0]
  const schema = parameter.schema ?? (mediaType && '$ref' in mediaType
    ? context.resolve<SchemaObject>(mediaType.$ref)
    : mediaType)?.schema
  const resolvedSchema = schema && '$ref' in schema
    ? context.resolve<SchemaObject>(schema.$ref)
    : schema
  return resolvedSchema?.default !== undefined
}

/** Whether a schema, followed through refs and compositions, describes a JSON object. */
function isObjectSchema(schemaObject: SchemaObject | ReferenceObject, context: EmitContext): boolean {
  const schema = '$ref' in schemaObject
    ? context.resolve<SchemaObject>(schemaObject.$ref)
    : schemaObject
  if (!isObject(schema))
    return false
  if (schema.type !== undefined)
    return isObjectType(schema.type)
  if (schema.properties || schema.additionalProperties || schema.patternProperties)
    return true
  const compositions: (SchemaObject | ReferenceObject)[] | undefined = schema.allOf ?? schema.oneOf ?? schema.anyOf
  return !!compositions?.length && compositions.every(item => isObjectSchema(item, context))
}

/** Whether a string schema carries raw bytes rather than text: `format: binary`, or a non-JSON `contentMediaType` without `contentEncoding`. */
function isBinarySchema(schemaObject: SchemaObject): boolean {
  if (schemaObject.format === 'binary')
    return true
  return typeof schemaObject.contentMediaType === 'string'
    && !schemaObject.contentEncoding
    && !JSON_MEDIA_TYPE_RE.test(schemaObject.contentMediaType)
}

function createDiscriminatorProperty(discriminator: DiscriminatorObject, ref: string, indent: string): TSNode {
  // The schema name is the value the spec infers, unless the mapping names another.
  let value = parseRef(ref).segments.pop()
  if (discriminator.mapping) {
    // A mapping value is either a ref or a bare schema name.
    const matchedEntry = Object.entries(discriminator.mapping).find(([, mappedValue]) =>
      (!mappedValue.startsWith('#') && mappedValue === value)
      || (mappedValue.startsWith('#') && parseRef(mappedValue).segments.pop() === value))
    if (matchedEntry)
      value = matchedEntry[0]
  }
  return propertySignature({
    name: tsPropertyIndex(discriminator.propertyName),
    type: tsLiteral(value),
    indent,
  })
}

function resolveRef<T>(document: unknown, $ref: string, visitedRefs: string[] = []): T | undefined {
  const node = resolveRefOneHop<any>(document, $ref)
  if (node && typeof node === 'object' && typeof node.$ref === 'string') {
    if (visitedRefs.includes(node.$ref))
      return undefined
    return resolveRef(document, node.$ref, [...visitedRefs, node.$ref])
  }

  return node
}

function resolveRefOneHop<T>(document: unknown, $ref: string): T | undefined {
  const { segments } = parseRef($ref)
  if (!segments.length)
    return undefined

  let node: any = document
  for (const key of segments) {
    if (node && typeof node === 'object' && node[key])
      node = node[key]
    else
      return undefined
  }
  return node
}

/**
 * Collects every discriminator by the ref of the schema declaring it, and patches each
 * schema a `oneOf` discriminator maps to with a required enum property holding its value,
 * which lets TypeScript narrow the union.
 */
function scanDiscriminators(document: OpenAPIDocument, context: EmitContext): EmitContext['discriminators'] {
  const objects: Record<string, DiscriminatorObject> = {}
  const refsHandled: string[] = []

  walk(document, (node, path) => {
    const discriminator = node.discriminator as DiscriminatorObject | undefined
    if (!discriminator?.propertyName)
      return

    const ref = createRef(path)
    objects[ref] = discriminator

    if (!Array.isArray(node.oneOf))
      return

    const mapping: Record<string, { inferred?: string, defined?: string[] }> = {}

    // Each `oneOf` ref infers its schema name as the value.
    for (const item of node.oneOf) {
      if ('$ref' in item) {
        const value = item.$ref.split('/').pop()
        if (value)
          mapping[item.$ref] = { ...mapping[item.$ref], inferred: value }
      }
    }

    // A value the mapping defines replaces the inferred one.
    for (const [mappedValue, mappingTarget] of Object.entries(discriminator.mapping ?? {})) {
      if (!mappingTarget)
        continue
      const mappedRef = toMappingRef(mappingTarget)
      if (!mapping[mappedRef]?.defined)
        mapping[mappedRef] = { defined: [] }
      mapping[mappedRef].defined!.push(mappedValue)
    }

    for (const [mappedRef, { inferred, defined }] of Object.entries(mapping)) {
      if (refsHandled.includes(mappedRef) || (!inferred && !defined))
        continue
      if (patchDiscriminatorEnum(document, mappedRef, defined ?? [inferred!], discriminator, context))
        refsHandled.push(mappedRef)
    }
  })

  // Inheritance can be implicit, so it is resolved once every discriminator is known.
  walk(document, (node, path) => {
    if (!Array.isArray(node.allOf))
      return

    for (const item of node.allOf) {
      if ('$ref' in item) {
        if (!objects[item.$ref])
          continue

        const ref = createRef(path)
        const discriminator = objects[item.$ref]!
        const mappedValues = Object.entries(discriminator.mapping ?? {})
          .filter(([, mappingTarget]) => toMappingRef(mappingTarget) === ref)
          .map(([mappedValue]) => mappedValue)

        if (mappedValues.length && !refsHandled.includes(ref) && patchDiscriminatorEnum(document, ref, mappedValues, discriminator, context))
          refsHandled.push(ref)

        objects[ref] = { ...discriminator }
      }
      else if (item.discriminator?.propertyName) {
        objects[createRef(path)] = { ...item.discriminator }
      }
    }
  })

  return { objects, refsHandled }
}

/** Turns a discriminator mapping value into a ref, reading a bare schema name as the schema component of that name. */
function toMappingRef(mappingTarget: string): string {
  return mappingTarget.startsWith('#')
    ? mappingTarget
    : createRef(['components', 'schemas', mappingTarget])
}

function patchDiscriminatorEnum(
  document: OpenAPIDocument,
  ref: string,
  values: string[],
  discriminator: DiscriminatorObject,
  context: EmitContext,
): boolean {
  const resolvedSchema = context.resolve<SchemaObject>(ref)

  if (resolvedSchema?.allOf) {
    resolvedSchema.allOf.push({
      type: 'object',
      required: [discriminator.propertyName],
      properties: {
        [discriminator.propertyName]: createDiscriminatorEnum(values),
      },
    })
    return true
  }

  if (typeof resolvedSchema === 'object' && resolvedSchema.type === 'object') {
    resolvedSchema.properties ??= {}
    resolvedSchema.required ??= []
    if (!resolvedSchema.required.includes(discriminator.propertyName))
      resolvedSchema.required.push(discriminator.propertyName)
    resolvedSchema.properties[discriminator.propertyName] = createDiscriminatorEnum(
      values,
      resolvedSchema.properties[discriminator.propertyName],
    )
    return true
  }

  return false
}

function createDiscriminatorEnum(values: string[], previousSchema?: SchemaObject): SchemaObject {
  return {
    type: 'string',
    enum: values,
    description: previousSchema?.description
      ? `${previousSchema.description} (enum property replaced by apiful)`
      : 'discriminator enum property added by apiful',
  }
}

function walk(node: unknown, callback: (value: Record<string, any>, path: (string | number)[]) => void, path: (string | number)[] = []): void {
  if (!node || typeof node !== 'object')
    return
  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index++)
      walk(node[index], callback, [...path, index])
    return
  }
  callback(node as Record<string, any>, path)
  for (const key of Object.keys(node))
    walk((node as Record<string, unknown>)[key], callback, [...path, key])
}
