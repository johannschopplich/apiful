import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { parseYAML } from 'confbox/yaml'
import { isObject } from 'utilful/object'
import { escapePointer, parseRef } from './pointer.ts'

export interface OpenAPIDocument {
  openapi: string
  info: { title: string, version: string, [key: string]: unknown }
  paths?: Record<string, unknown>
  components?: Record<string, Record<string, unknown> | undefined>
  [key: string]: unknown
}

/** File path, `file:` or http(s) URL, in-memory document, or a function resolving to one. */
export type OpenAPIDocumentSource = string | URL | object | (() => Promise<object>)

export interface LoadOpenAPIDocumentOptions {
  /** Directory a relative path, and the relative refs of an in-memory document, resolve against. Defaults to the current working directory. */
  rootDir?: string
}

interface LoadedDocument {
  /** Absolute file path or URL, the base the document's relative refs resolve against. */
  absoluteRef: string
  parsed: unknown
}

interface NodeLocation {
  document: LoadedDocument
  pointer: string
}

interface ResolvedRef {
  /** Missing where the ref fails to parse, its file fails to load, or its chain loops. */
  location?: NodeLocation
  /** Missing where the pointer leads nowhere. */
  node?: unknown
  error?: unknown
}

interface NodeType {
  name: string
  properties?: Record<string, ChildType>
  additionalProperties?: ChildType
  items?: ChildType
  hasExtensions?: boolean
  /** Type a string value is read as, by wrapping it in a ref. */
  directResolveAs?: NodeType
}

type ChildType = NodeType | ((value: unknown, key: string) => NodeType | undefined)

/** The `//` is required, so a Windows drive letter is not read as a scheme. */
const URL_SCHEME_RE = /^[a-z][\w+.-]*:\/\//i
const RESPONSE_CODE_RE = /^\d[\dX]{2}$/i
const IN_MEMORY_DOCUMENT_NAME = '[in-memory document]'
const DOCUMENT_EXTENSIONS = new Set(['.json', '.yaml', '.yml'])
const FETCH_TIMEOUT_MS = 30_000

const COMPONENT_GROUPS_BY_TYPE: Record<string, string> = {
  Schema: 'schemas',
  Parameter: 'parameters',
  Response: 'responses',
  Example: 'examples',
  RequestBody: 'requestBodies',
  Header: 'headers',
  Link: 'links',
  Callback: 'callbacks',
}

/**
 * Loads an OpenAPI 3.x document and bundles every external `$ref` into it, so that only
 * refs within the document remain. External components are hoisted into `components`
 * under the names `@redocly/openapi-core` 1.x gives them, which keeps type names stable
 * for schemas openapi-typescript used to bundle.
 */
export async function loadOpenAPIDocument(
  source: OpenAPIDocumentSource,
  options: LoadOpenAPIDocumentOptions = {},
): Promise<OpenAPIDocument> {
  const rootDir = options.rootDir ?? process.cwd()
  const documents = new Map<string, Promise<LoadedDocument>>()
  const loadDocument = (absoluteRef: string, isRoot = false): Promise<LoadedDocument> => {
    let document = documents.get(absoluteRef)
    if (!document) {
      document = readDocument(absoluteRef, isRoot)
      documents.set(absoluteRef, document)
    }
    return document
  }

  const rootDocument = await loadRootDocument(source, rootDir, loadDocument)
  assertOpenAPIDocument(rootDocument)

  const resolvedRefs = await resolveRefs(rootDocument, loadDocument)
  bundleDocument(rootDocument, resolvedRefs)

  return rootDocument.parsed
}

async function loadRootDocument(
  source: OpenAPIDocumentSource,
  rootDir: string,
  loadDocument: (absoluteRef: string, isRoot: boolean) => Promise<LoadedDocument>,
): Promise<LoadedDocument> {
  if (typeof source === 'function')
    source = await source()

  if (source instanceof URL)
    source = source.href

  if (typeof source !== 'string') {
    return {
      absoluteRef: path.join(rootDir, IN_MEMORY_DOCUMENT_NAME),
      // Bundling rewrites the document in place, which must not reach the caller's object.
      parsed: structuredClone(source),
    }
  }

  if (URL_SCHEME_RE.test(source)) {
    if (source.startsWith('file:'))
      return await loadDocument(fileURLToPath(source), true)
    if (isAbsoluteURL(source))
      return await loadDocument(source, true)
    throw new Error(`Unsupported URL scheme in \`${source}\`, expected \`file:\`, \`http:\`, or \`https:\``)
  }

  return await loadDocument(path.resolve(rootDir, source), true)
}

async function readDocument(absoluteRef: string, isRoot: boolean): Promise<LoadedDocument> {
  let text: string
  let extension: string
  let contentType = ''

  if (isAbsoluteURL(absoluteRef)) {
    let response: Response
    try {
      response = await fetch(absoluteRef, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      // The timeout also covers the body, which a server can stall on after sending the headers.
      // An error response's body is skipped, so its status always reaches the error message.
      text = response.ok ? await response.text() : ''
    }
    catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError')
        throw new Error(`Timed out fetching \`${absoluteRef}\` after ${FETCH_TIMEOUT_MS / 1000} seconds`, { cause: error })
      throw new Error(`Failed to fetch \`${absoluteRef}\` – ${getErrorMessage(error)}`, { cause: error })
    }
    if (!response.ok)
      throw new Error(`Failed to fetch \`${absoluteRef}\` – ${response.status} ${response.statusText}`.trimEnd())
    extension = path.extname(new URL(absoluteRef).pathname)
    contentType = response.headers.get('content-type') ?? ''
  }
  else {
    try {
      text = await readFile(absoluteRef, 'utf8')
    }
    catch (error) {
      throw new Error(`Failed to read \`${absoluteRef}\` – ${getErrorMessage(error)}`, { cause: error })
    }
    extension = path.extname(absoluteRef)
  }

  // Like Redocly, a referenced file in neither format, a code sample for instance, is inlined as text.
  if (!isRoot && !DOCUMENT_EXTENSIONS.has(extension) && !/json|yaml|openapi/.test(contentType))
    return { absoluteRef, parsed: text }

  try {
    const isJSON = extension === '.json' || contentType.includes('json')
    return {
      absoluteRef,
      parsed: isJSON ? JSON.parse(text.replace(/^\uFEFF/, '')) : parseYAMLKeepingTimestamps(text),
    }
  }
  catch (error) {
    throw new Error(`Failed to parse \`${absoluteRef}\` – ${getErrorMessage(error)}`, { cause: error })
  }
}

function assertOpenAPIDocument(document: LoadedDocument): asserts document is LoadedDocument & { parsed: OpenAPIDocument } {
  const { parsed } = document
  const sourceName = path.basename(document.absoluteRef) === IN_MEMORY_DOCUMENT_NAME
    ? 'The in-memory document'
    : `\`${document.absoluteRef}\``

  if (!isObject(parsed))
    throw new Error(`${sourceName} is not an OpenAPI document`)
  if ('swagger' in parsed)
    throw new Error(`${sourceName} is a Swagger 2.0 document, convert it to OpenAPI 3.x first`)
  if (typeof parsed.openapi !== 'string' || !parsed.openapi.startsWith('3.'))
    throw new Error(`${sourceName} declares an unsupported OpenAPI version \`${String(parsed.openapi)}\`, expected 3.x`)
}

/**
 * Resolves every `$ref` reachable from the root document, loading the files and URLs
 * they point into. A ref that fails to resolve is kept with its error, since only a ref
 * the bundler visits is fatal.
 *
 * Ported from `resolveDocument` in `@redocly/openapi-core` 1.x (MIT),
 * https://github.com/Redocly/redocly-cli/blob/v1/packages/core/src/resolve.ts
 */
async function resolveRefs(
  rootDocument: LoadedDocument,
  loadDocument: (absoluteRef: string) => Promise<LoadedDocument>,
): Promise<Map<string, ResolvedRef>> {
  const resolvedRefs = new Map<string, ResolvedRef>()
  const visitedPointers = new Set<string>()
  const pendingResolutions: Promise<void>[] = []

  collectRefs(rootDocument.parsed, { document: rootDocument, pointer: '#/' })
  // Each resolution may queue further ones, so the queue is drained until it stays empty. A
  // round settles in full before a rejection is rethrown, so none of that round's promises goes unhandled.
  while (pendingResolutions.length > 0) {
    const results = await Promise.allSettled(pendingResolutions.splice(0))
    const rejection = results.find(result => result.status === 'rejected')
    if (rejection)
      throw rejection.reason
  }

  return resolvedRefs

  function collectRefs(node: unknown, location: NodeLocation): void {
    if (typeof node !== 'object' || node === null)
      return

    const absolutePointer = getAbsolutePointer(location)
    if (visitedPointers.has(absolutePointer))
      return
    visitedPointers.add(absolutePointer)

    for (const [key, value] of Object.entries(node))
      collectRefs(value, childLocation(location, key))

    if (isRef(node))
      pendingResolutions.push(resolveAndCollect(location.document, node.$ref))

    const mapping = (node as { discriminator?: { mapping?: unknown } }).discriminator?.mapping
    if (isObject(mapping)) {
      for (const value of Object.values(mapping)) {
        if (typeof value === 'string' && isMappingRef(value))
          pendingResolutions.push(resolveAndCollect(location.document, value))
      }
    }
  }

  async function resolveAndCollect(document: LoadedDocument, $ref: string): Promise<void> {
    const resolvedRef = await followRef(document, $ref, [])
    if (resolvedRef.location)
      collectRefs(resolvedRef.node, resolvedRef.location)
  }

  async function followRef(document: LoadedDocument, $ref: string, refChain: string[]): Promise<ResolvedRef> {
    const refId = createRefId(document.absoluteRef, $ref)
    if (refChain.includes(refId))
      return { error: new Error(`Circular \`$ref\` chain through \`${$ref}\``) }

    let targetDocument = document
    let segments: string[]
    try {
      const parsedRef = parseRef($ref)
      segments = parsedRef.segments
      if (parsedRef.uri !== null)
        targetDocument = await loadDocument(resolveExternalRef(document.absoluteRef, parsedRef.uri))
    }
    catch (error) {
      const failedRef: ResolvedRef = { error }
      resolvedRefs.set(refId, failedRef)
      return failedRef
    }

    let node: unknown = targetDocument.parsed
    let pointer = '#/'
    for (const segment of segments) {
      if (typeof node !== 'object' || node === null) {
        node = undefined
        break
      }
      const child = (node as Record<string, unknown>)[segment]
      if (child !== undefined) {
        node = child
        pointer = joinPointer(pointer, escapePointer(segment))
      }
      else if (isRef(node)) {
        // The pointer continues through a ref, so it carries on from the ref's target.
        const intermediateRef = await followRef(targetDocument, node.$ref, [...refChain, refId])
        if (!intermediateRef.location || typeof intermediateRef.node !== 'object' || intermediateRef.node === null) {
          node = undefined
          break
        }
        targetDocument = intermediateRef.location.document
        node = (intermediateRef.node as Record<string, unknown>)[segment]
        pointer = joinPointer(intermediateRef.location.pointer, escapePointer(segment))
      }
      else {
        node = undefined
        break
      }
    }

    const resolvedRef = isRef(node)
      ? await followRef(targetDocument, node.$ref, [...refChain, refId])
      : { location: { document: targetDocument, pointer }, node }
    resolvedRefs.set(refId, resolvedRef)
    return resolvedRef
  }
}

/**
 * Rewrites the root document in place so that every external ref points into its
 * `components`. A ref is hoisted into the components group its position calls for, and
 * inlined where the position has none. Refs within the root document stay as they are,
 * except at a scalar position, where they are inlined.
 *
 * Ported from `bundleDocument` and `walkDocument` in `@redocly/openapi-core` 1.x (MIT),
 * https://github.com/Redocly/redocly-cli/blob/v1/packages/core/src/bundle.ts
 */
function bundleDocument(rootDocument: LoadedDocument & { parsed: OpenAPIDocument }, resolvedRefs: Map<string, ResolvedRef>): void {
  const root = rootDocument.parsed
  const types = createNodeTypes(root.openapi.startsWith('3.0'))
  const visitedNodesByType = new Map<string, Set<unknown>>()
  // A rewritten ref is tracked by its node, which may be reached again from another file,
  // where its new ref string could name a different target.
  const rewrittenRefs = new WeakMap<object, ResolvedRef>()
  const components = root.components ??= {}

  walkNode(root, types.root, { document: rootDocument, pointer: '#/' }, undefined, '')

  function walkNode(node: unknown, type: NodeType, location: NodeLocation, parent: any, key: string | number): void {
    let resolvedNode = node
    let resolvedLocation: NodeLocation | undefined = location
    let resolvedRef: ResolvedRef | undefined
    if (isRef(node)) {
      resolvedRef = resolveRefNode(node, location.document)
      resolvedNode = resolvedRef?.node
      resolvedLocation = resolvedRef?.location
    }

    if (resolvedNode !== undefined && resolvedLocation && type !== types.scalar) {
      let visitedNodes = visitedNodesByType.get(type.name)
      if (!visitedNodes) {
        visitedNodes = new Set()
        visitedNodesByType.set(type.name, visitedNodes)
      }

      if (!visitedNodes.has(resolvedNode)) {
        visitedNodes.add(resolvedNode)
        walkChildren(node, resolvedNode, type, location, resolvedLocation)
        if (type === types.discriminatorMapping)
          rewriteMapping(resolvedNode as Record<string, unknown>, resolvedLocation)
      }
    }

    if (isRef(node))
      bundleRef(node, resolvedRef, type, location, parent, key)
  }

  function walkChildren(node: unknown, resolvedNode: unknown, type: NodeType, location: NodeLocation, resolvedLocation: NodeLocation): void {
    if (Array.isArray(resolvedNode)) {
      if (!type.items)
        return
      for (const [index, item] of resolvedNode.entries()) {
        const itemType = resolveChildType(type.items, item, String(index))
        if (itemType)
          walkNode(item, itemType, childLocation(resolvedLocation, String(index)), resolvedNode, index)
      }
      return
    }

    if (typeof resolvedNode !== 'object' || resolvedNode === null)
      return

    const nodeRecord = resolvedNode as Record<string, unknown>
    // Declared properties come first, so the order components are hoisted in, and with it
    // the name each one gets, matches Redocly.
    const propertyNames = Object.keys(type.properties ?? {})
    const addPropertyNames = (names: string[]) => {
      for (const name of names) {
        if (!propertyNames.includes(name))
          propertyNames.push(name)
      }
    }
    if (type.additionalProperties)
      addPropertyNames(Object.keys(nodeRecord))
    else if (type.hasExtensions)
      addPropertyNames(Object.keys(nodeRecord).filter(name => name.startsWith('x-')))
    if (isRef(node))
      addPropertyNames(Object.keys(node).filter(name => name !== '$ref'))

    for (const propertyName of propertyNames) {
      let value = nodeRecord[propertyName]
      let valueLocation = resolvedLocation
      if (value === undefined && isRef(node)) {
        // A sibling of an OpenAPI 3.1 `$ref` belongs to the referencing document.
        value = (node as Record<string, unknown>)[propertyName]
        valueLocation = location
      }
      if (value === undefined)
        continue

      const declaredType = type.properties && Object.hasOwn(type.properties, propertyName)
        ? type.properties[propertyName]
        : undefined
      let propertyType = resolveChildType(declaredType ?? type.additionalProperties, value, propertyName)
      if (!propertyType && type.hasExtensions && propertyName.startsWith('x-'))
        propertyType = types.extension
      if (propertyType?.directResolveAs) {
        value = { $ref: value }
        propertyType = propertyType.directResolveAs
      }
      if (!propertyType || (propertyType === types.scalar && !isRef(value)))
        continue

      walkNode(value, propertyType, childLocation(valueLocation, propertyName), nodeRecord, propertyName)
    }
  }

  function bundleRef(
    node: { $ref: string },
    resolvedRef: ResolvedRef | undefined,
    type: NodeType,
    location: NodeLocation,
    parent: any,
    key: string | number,
  ): void {
    if (!resolvedRef?.location || resolvedRef.node === undefined)
      throw createUnresolvedRefError(node.$ref, location, resolvedRef?.error)

    if (
      resolvedRef.location.document === rootDocument
      && location.document === rootDocument
      && type !== types.scalar
    ) {
      return
    }

    const componentGroup = COMPONENT_GROUPS_BY_TYPE[type.name]
    if (!componentGroup) {
      inlineRef(node, resolvedRef.node, parent, key)
      return
    }

    node.$ref = saveComponent(componentGroup, resolvedRef as Required<ResolvedRef>)
    rewrittenRefs.set(node, {
      location: { document: rootDocument, pointer: node.$ref },
      node: resolvedRef.node,
    })
  }

  function rewriteMapping(mapping: Record<string, unknown>, location: NodeLocation): void {
    for (const [name, value] of Object.entries(mapping)) {
      // A bare schema name is no ref and stays as it is.
      if (typeof value !== 'string' || !isMappingRef(value))
        continue

      const resolvedRef = resolvedRefs.get(createRefId(location.document.absoluteRef, value))
      if (!resolvedRef?.location || resolvedRef.node === undefined)
        throw createUnresolvedRefError(value, childLocation(location, name), resolvedRef?.error)

      mapping[name] = saveComponent('schemas', resolvedRef as Required<ResolvedRef>)
    }
  }

  function saveComponent(componentGroup: string, target: Required<ResolvedRef>): string {
    const group = components[componentGroup] ??= {}
    const name = getComponentName(group, target)
    group[name] = target.node
    return `#/components/${componentGroup}/${escapePointer(name)}`
  }

  /**
   * Names a component after the last segment of its pointer, prepending earlier segments
   * while the name is taken by a different component, then the file name, and finally a
   * counter.
   */
  function getComponentName(group: Record<string, unknown>, target: Required<ResolvedRef>): string {
    const isAvailable = (name: string) => !Object.hasOwn(group, name) || isSameComponent(group[name], target)
    const { segments } = parseRef(target.location.pointer)

    let name = ''
    while (segments.length > 0) {
      name = segments.pop() + (name ? `-${name}` : '')
      if (isAvailable(name))
        return name
    }

    name = getRefBaseName(target.location.document.absoluteRef) + (name ? `_${name}` : '')
    if (isAvailable(name))
      return name

    const baseName = name
    for (let serialId = 2; ; serialId++) {
      name = `${baseName}-${serialId}`
      if (isAvailable(name))
        return name
    }
  }

  function isSameComponent(component: unknown, target: Required<ResolvedRef>): boolean {
    if (isRef(component)) {
      const componentLocation = resolveRefNode(component, rootDocument)?.location
      if (componentLocation && getAbsolutePointer(componentLocation) === getAbsolutePointer(target.location))
        return true
    }
    return isDeepStrictEqual(component, target.node)
  }

  function resolveRefNode(node: { $ref: string }, document: LoadedDocument): ResolvedRef | undefined {
    return rewrittenRefs.get(node) ?? resolvedRefs.get(createRefId(document.absoluteRef, node.$ref))
  }
}

/**
 * Types of the nodes that can hold a `$ref`, describing where the bundler looks for refs
 * and which components group a ref's position calls for.
 *
 * Ported from the OpenAPI 3.0 and 3.1 types of `@redocly/openapi-core` 1.x (MIT),
 * https://github.com/Redocly/redocly-cli/tree/v1/packages/core/src/types
 */
function createNodeTypes(isOpenAPI30: boolean) {
  const scalar: NodeType = { name: 'scalar' }
  const extension: NodeType = { name: 'SpecExtension', additionalProperties: scalar }
  const opaque: NodeType = { name: 'Opaque' }
  opaque.additionalProperties = opaque

  const schema: NodeType = { name: 'Schema', hasExtensions: true }
  const schemaList = listOf(schema)
  const namedSchemas = mapOf(schema, 'NamedSchemas')
  const schemaOrBoolean = (value: unknown) => typeof value === 'boolean' ? undefined : schema
  const schemaProperties: NodeType = {
    name: 'SchemaProperties',
    additionalProperties: isOpenAPI30 ? schema : schemaOrBoolean,
  }
  const discriminatorMapping: NodeType = {
    name: 'DiscriminatorMapping',
    additionalProperties: value => typeof value === 'string' && isMappingRef(value)
      ? { name: 'MappingRef', directResolveAs: schema }
      : undefined,
  }
  const discriminator: NodeType = {
    name: 'Discriminator',
    properties: { mapping: discriminatorMapping },
    hasExtensions: true,
  }

  schema.properties = isOpenAPI30
    ? {
        externalDocs: opaque,
        discriminator,
        enum: scalar,
        allOf: schemaList,
        anyOf: schemaList,
        oneOf: schemaList,
        not: schema,
        properties: schemaProperties,
        items: value => Array.isArray(value) ? schemaList : schema,
        additionalProperties: schemaOrBoolean,
        xml: opaque,
        example: scalar,
      }
    : {
        definitions: namedSchemas,
        $defs: namedSchemas,
        externalDocs: opaque,
        discriminator,
        enum: scalar,
        allOf: schemaList,
        anyOf: schemaList,
        oneOf: schemaList,
        not: schema,
        if: schema,
        then: schema,
        else: schema,
        dependentSchemas: mapOf(schema),
        prefixItems: schemaList,
        contains: schema,
        patternProperties: schemaProperties,
        propertyNames: schema,
        unevaluatedItems: schemaOrBoolean,
        unevaluatedProperties: schemaOrBoolean,
        properties: schemaProperties,
        items: schemaOrBoolean,
        additionalProperties: schemaOrBoolean,
        contentSchema: schema,
        xml: opaque,
        examples: scalar,
        example: scalar,
        const: scalar,
      }

  const example: NodeType = { name: 'Example', properties: { value: scalar }, hasExtensions: true }
  const examplesMap = mapOf(example)
  const header: NodeType = { name: 'Header', hasExtensions: true }
  const headersMap = mapOf(header)
  const encoding: NodeType = { name: 'Encoding', properties: { headers: headersMap }, hasExtensions: true }
  const mediaType: NodeType = {
    name: 'MediaType',
    properties: { schema, example: scalar, examples: examplesMap, encoding: mapOf(encoding) },
    hasExtensions: true,
  }
  const mediaTypesMap = mapOf(mediaType, 'MediaTypesMap')
  header.properties = { schema, example: scalar, examples: examplesMap, content: mediaTypesMap }

  const parameter: NodeType = {
    name: 'Parameter',
    properties: { schema, example: scalar, examples: examplesMap, content: mediaTypesMap },
    hasExtensions: true,
  }
  const parameterList = listOf(parameter)
  const requestBody: NodeType = { name: 'RequestBody', properties: { content: mediaTypesMap }, hasExtensions: true }
  const link: NodeType = { name: 'Link', properties: { server: opaque }, hasExtensions: true }
  const response: NodeType = {
    name: 'Response',
    properties: { headers: headersMap, content: mediaTypesMap, links: mapOf(link) },
    hasExtensions: true,
  }
  const responses: NodeType = {
    name: 'Responses',
    properties: { default: response },
    additionalProperties: (_value, key) => RESPONSE_CODE_RE.test(key) ? response : undefined,
  }

  const pathItem: NodeType = { name: 'PathItem', hasExtensions: true }
  const callback = mapOf(pathItem, 'Callback')
  const operation: NodeType = {
    name: 'Operation',
    properties: {
      'externalDocs': opaque,
      'parameters': parameterList,
      'security': opaque,
      'servers': opaque,
      requestBody,
      responses,
      'callbacks': mapOf(callback),
      'x-codeSamples': listOf(opaque),
      'x-code-samples': listOf(opaque),
    },
    hasExtensions: true,
  }
  pathItem.properties = {
    servers: opaque,
    parameters: parameterList,
    get: operation,
    put: operation,
    post: operation,
    delete: operation,
    options: operation,
    head: operation,
    patch: operation,
    trace: operation,
    // OpenAPI 3.2 operations, which Redocly 1.x leaves unbundled.
    query: operation,
    additionalOperations: mapOf(operation),
  }
  const webhooks = mapOf(pathItem, 'WebhooksMap')

  const components: NodeType = {
    name: 'Components',
    properties: {
      parameters: mapOf(parameter, 'NamedParameters'),
      schemas: namedSchemas,
      responses: mapOf(response, 'NamedResponses'),
      examples: mapOf(example, 'NamedExamples'),
      requestBodies: mapOf(requestBody, 'NamedRequestBodies'),
      headers: mapOf(header, 'NamedHeaders'),
      securitySchemes: mapOf(opaque, 'NamedSecuritySchemes'),
      links: mapOf(link, 'NamedLinks'),
      callbacks: mapOf(callback, 'NamedCallbacks'),
      ...(!isOpenAPI30 && {
        pathItems: mapOf(pathItem, 'NamedPathItems'),
        // An OpenAPI 3.2 group, which Redocly 1.x leaves unbundled.
        mediaTypes: mapOf(mediaType, 'NamedMediaTypes'),
      }),
    },
    hasExtensions: true,
  }

  const root: NodeType = {
    name: 'Root',
    properties: {
      info: opaque,
      servers: opaque,
      security: opaque,
      tags: opaque,
      externalDocs: opaque,
      paths: {
        name: 'Paths',
        additionalProperties: (_value, key) => key.startsWith('/') ? pathItem : undefined,
      },
      ...(isOpenAPI30
        ? { 'components': components, 'x-webhooks': webhooks }
        : { webhooks, components }),
    },
    hasExtensions: true,
  }

  return { root, scalar, extension, discriminatorMapping }
}

function listOf(item: NodeType): NodeType {
  return { name: `${item.name}List`, items: item }
}

function mapOf(item: NodeType, name = `${item.name}Map`): NodeType {
  return { name, additionalProperties: item }
}

function resolveChildType(childType: ChildType | undefined, value: unknown, key: string): NodeType | undefined {
  return typeof childType === 'function' ? childType(value, key) : childType
}

/** Replaces a ref with its target, the ref's siblings taking precedence over the target's properties. */
function inlineRef(node: Record<string, unknown>, target: unknown, parent: any, key: string | number): void {
  if (!isObject(target)) {
    parent[key] = target
    return
  }
  delete node.$ref
  Object.assign(node, { ...target, ...node })
}

function createUnresolvedRefError($ref: string, location: NodeLocation, cause: unknown): Error {
  const reason = cause === undefined ? 'the target does not exist' : getErrorMessage(cause)
  return new Error(
    `Failed to resolve \`$ref\` \`${$ref}\` at \`${getAbsolutePointer(location)}\` – ${reason}`,
    { cause },
  )
}

/** Parses YAML like Redocly, which keeps dates as the strings they are written as. */
function parseYAMLKeepingTimestamps(text: string): unknown {
  const nodeStartPositions: number[] = []
  const timestampTexts = new Map<Date, string>()
  const parsed = parseYAML(text, {
    // js-yaml reports the bounds of every node it composes, which recovers a date's text.
    listener(event: string, state: { input: string, position: number, result: unknown }) {
      if (event === 'open') {
        nodeStartPositions.push(state.position)
        return
      }
      const startPosition = nodeStartPositions.pop()!
      if (state.result instanceof Date)
        timestampTexts.set(state.result, state.input.slice(startPosition, state.position).trim())
    },
  })

  if (timestampTexts.size === 0)
    return parsed

  const visitedNodes = new Set<object>()
  const restoreTimestamps = (value: unknown): unknown => {
    if (value instanceof Date)
      return timestampTexts.get(value) ?? value.toISOString()
    if (typeof value === 'object' && value !== null && !visitedNodes.has(value)) {
      visitedNodes.add(value)
      for (const [key, child] of Object.entries(value))
        (value as Record<string, unknown>)[key] = restoreTimestamps(child)
    }
    return value
  }
  return restoreTimestamps(parsed)
}

function resolveExternalRef(base: string, ref: string): string {
  if (isAbsoluteURL(ref))
    return ref
  if (isAbsoluteURL(base))
    return new URL(ref, base).href
  return path.resolve(path.dirname(base), ref)
}

function isMappingRef(value: string): boolean {
  return value.startsWith('#') || value.includes('/')
}

function isRef(node: unknown): node is { $ref: string } {
  return isObject(node) && typeof node.$ref === 'string'
}

function isAbsoluteURL(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function createRefId(absoluteRef: string, $ref: string): string {
  return `${absoluteRef}::${$ref}`
}

function childLocation(location: NodeLocation, key: string): NodeLocation {
  return { document: location.document, pointer: joinPointer(location.pointer, escapePointer(key)) }
}

function getAbsolutePointer({ document, pointer }: NodeLocation): string {
  return document.absoluteRef + (pointer === '#/' ? '' : pointer)
}

function joinPointer(base: string, key: string): string {
  return base.endsWith('/') ? base + key : `${base}/${key}`
}

/** Last segment of a path or URL, without its extension. */
function getRefBaseName(absoluteRef: string): string {
  return absoluteRef.split(/[/\\]/).pop()!.replace(/\.[^.]+$/, '')
}

function getErrorMessage(error: unknown): string {
  return Error.isError(error) ? error.message : String(error)
}
