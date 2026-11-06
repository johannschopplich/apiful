// Ported from the compiler-free generator of openapi-typescript (MIT), proposed in
// https://github.com/openapi-ts/openapi-typescript/pull/2872 (darkbasic/openapi-typescript@a8e1738).

/**
 * Generated TypeScript source. An expression fragment (`string`, `Foo | Bar`, an object
 * literal) starts without leading whitespace and its closing bracket sits at the indent it
 * was built for; a line fragment (a property signature) carries the indent of its own line.
 */
export type TSNode = string

export const INDENT = '  '

export const BOOLEAN = 'boolean'
export const NEVER = 'never'
export const NULL = 'null'
export const NUMBER = 'number'
export const STRING = 'string'
const UNDEFINED = 'undefined'
export const UNKNOWN = 'unknown'

// A nullable parent or an optional property drops out of the type that requires its keys.
export const WITH_REQUIRED_HELPER: string = `type WithRequired<T, K extends keyof NonNullable<T>> = NonNullable<T> & {
${INDENT}[P in K]-?: NonNullable<T>[P];
};`

interface AnnotatedObject {
  const?: unknown
  default?: unknown
  deprecated?: boolean
  description?: string
  enum?: unknown[]
  example?: unknown
  examples?: unknown
  format?: string
  nullable?: boolean
  summary?: string
  title?: string
  type?: string | string[]
}

const IDENTIFIER_RE = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u
/** Identifier TypeScript's scanner reads under any Unicode version and target, where `IDENTIFIER_RE` follows the runtime's. */
const ASCII_IDENTIFIER_RE = /^[A-Z_$][\w$]*$/i
const COMMENT_LINE_BREAK_RE = /\r?\n/g
const COMMENT_END_RE = /\*\//g
const TRAILING_WHITESPACE_RE = /[ \t]+$/

/** Escapes TypeScript's printer applies to a synthesized string literal. */
const ESCAPED_CHARACTERS: Record<string, string> = {
  '\t': '\\t',
  '\v': '\\v',
  '\f': '\\f',
  '\b': '\\b',
  '\r': '\\r',
  '\n': '\\n',
  '\\': '\\\\',
  '"': '\\"',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
  '\u0085': '\\u0085',
}

/** Builds the JSDoc block for a schema, parameter, or operation, or an empty string where it carries nothing to document. */
export function createJSDocComment(annotatedObject: AnnotatedObject, indent = ''): string {
  if (!annotatedObject || typeof annotatedObject !== 'object' || Array.isArray(annotatedObject))
    return ''

  const output: string[] = []

  if (annotatedObject.title)
    output.push(formatCommentText(annotatedObject.title))
  if (annotatedObject.summary)
    output.push(formatCommentText(annotatedObject.summary))
  if (annotatedObject.format)
    output.push(`Format: ${annotatedObject.format}`)
  if (annotatedObject.deprecated)
    output.push('@deprecated')

  for (const field of ['description', 'default', 'example'] as const) {
    const value = annotatedObject[field]
    if (value === undefined || (value === '' && field === 'description'))
      continue
    const serializedValue = typeof value === 'object'
      ? JSON.stringify(value, undefined, 2)
      : value
    output.push(`@${field} ${formatCommentText(String(serializedValue))}`)
  }

  if (Array.isArray(annotatedObject.examples)) {
    for (const example of annotatedObject.examples) {
      const serializedExample = typeof example === 'object'
        ? JSON.stringify(example, undefined, 2)
        : example
      output.push(`@example ${formatCommentText(String(serializedExample))}`)
    }
  }

  if ('const' in annotatedObject)
    output.push('@constant')

  if (annotatedObject.enum) {
    let type = 'unknown'
    if (Array.isArray(annotatedObject.type))
      type = annotatedObject.type.join('|')
    else if (typeof annotatedObject.type === 'string')
      type = annotatedObject.type
    output.push(`@enum {${type}${annotatedObject.nullable ? '|null' : ''}}`)
  }

  if (!output.length)
    return ''

  const hasMultiLineContent = output.some(item => item.includes('\n'))
  const text = (output.length === 1 && !hasMultiLineContent
    ? `* ${output[0]} `
    : `*\n * ${output.join('\n * ')}\n `
  ).replace(COMMENT_END_RE, '*\\/')

  // The TypeScript printer strips trailing whitespace from every line of a comment.
  const comment = `/*${text}*/`
    .split('\n')
    .map(line => line.replace(TRAILING_WHITESPACE_RE, ''))
    .join(`\n${indent}`)

  return `${indent}${comment}\n`
}

/** Builds an object type from line fragments, or `{}` without any. */
export function typeLiteral(members: TSNode[], indent = ''): TSNode {
  return members.length
    ? `{\n${members.join('\n')}\n${indent}}`
    : '{}'
}

/** Builds a tuple type, multi-line like the TypeScript printer even when empty. */
export function tupleType(elements: TSNode[], indent = ''): TSNode {
  if (!elements.length)
    return `[\n${indent}]`
  const elementIndent = `${indent}${INDENT}`
  return `[\n${elements.map(element => `${elementIndent}${element}`).join(',\n')}\n${indent}]`
}

/**
 * Builds the literal type of a JSON value, keeping non-ASCII characters of a string as they are
 * but for the line and paragraph separators, which would break the lines of the source.
 */
export function tsLiteral(value: unknown, indent = ''): TSNode {
  if (typeof value === 'string')
    return JSON.stringify(value).replace(/[\u2028\u2029]/g, character => ESCAPED_CHARACTERS[character]!)
  if (typeof value === 'number') {
    // A YAML `.inf` or `.nan` has no literal type.
    if (!Number.isFinite(value))
      return NUMBER
    return value < 0
      ? `-${Math.abs(value)}`
      : String(value)
  }
  if (typeof value === 'boolean')
    return String(value)
  if (value === null)
    return NULL
  if (Array.isArray(value)) {
    if (!value.length)
      return `${NEVER}[]`
    const elementIndent = `${indent}${INDENT}`
    return tupleType(value.map(item => tsLiteral(item, elementIndent)), indent)
  }
  if (typeof value === 'object') {
    const memberIndent = `${indent}${INDENT}`
    const members = Object.entries(value).map(([key, item]) => propertySignature({
      name: tsPropertyIndex(key),
      type: tsLiteral(item, memberIndent),
      indent: memberIndent,
    }))
    return members.length
      ? typeLiteral(members, indent)
      : tsRecord(STRING, NEVER)
  }
  return UNKNOWN
}

export function tsNullable(types: TSNode[]): TSNode {
  return [
    ...types.map(tsParenthesize),
    NULL,
  ].join(' | ')
}

export function tsOmit(type: TSNode, keys: string[]): TSNode {
  return `Omit<${type}, ${tsUnion(keys.map(key => tsLiteral(key)))}>`
}

export function tsRecord(key: TSNode, value: TSNode): TSNode {
  return `Record<${key}, ${value}>`
}

export function tsWithRequired(type: TSNode, keys: string[]): TSNode {
  return `WithRequired<${type}, ${tsUnion(keys.map(key => tsLiteral(key)))}>`
}

/** Renders a property name bare where it is an ASCII identifier or a non-negative number in canonical form, quoted otherwise. */
export function tsPropertyIndex(index: string | number): string {
  if (
    (typeof index === 'number' && !(index < 0))
    || (typeof index === 'string' && String(Number(index)) === index && index[0] !== '-')
  ) {
    return String(index)
  }
  return typeof index === 'string' && ASCII_IDENTIFIER_RE.test(index)
    ? index
    : tsStringLiteral(String(index))
}

export function isIdentifier(name: string): boolean {
  return IDENTIFIER_RE.test(name)
}

export function tsUnion(types: TSNode[]): TSNode {
  if (types.length === 0)
    return NEVER
  if (types.length === 1)
    return types[0]!
  return tsDedupe(types).map(tsParenthesize).join(' | ')
}

export function tsIntersection(types: TSNode[]): TSNode {
  if (types.length === 0)
    return NEVER
  if (types.length === 1)
    return types[0]!
  return tsDedupe(types).map(tsParenthesize).join(' & ')
}

/** Whether a type is a primitive keyword – literal types, `true` and `false` among them, are not. */
export function tsIsPrimitive(type: TSNode): boolean {
  if (!type)
    return true
  return type === BOOLEAN || type === NEVER || type === NULL || type === NUMBER || type === STRING || type === UNDEFINED
}

export function tsParenthesize(expression: TSNode): TSNode {
  return needsParentheses(expression)
    ? `(${expression})`
    : expression
}

export function tsArray(elementType: TSNode): TSNode {
  return `${tsParenthesize(elementType)}[]`
}

export function propertySignature({ name, type, optional, readonly, comment = '', indent }: {
  /** Name as `tsPropertyIndex` renders it. */
  name: string
  type: TSNode
  optional?: boolean
  readonly?: boolean
  comment?: string
  indent: string
}): TSNode {
  return `${comment}${indent}${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}: ${type};`
}

export function indexSignature({ keyName, valueType, indent }: {
  keyName: string
  valueType: TSNode
  indent: string
}): TSNode {
  return `${indent}[${keyName}: ${STRING}]: ${valueType};`
}

/** Builds `typeName["a"]["b"]`, leaving numeric segments unquoted. */
export function tsIndexedAccess(typeName: TSNode, ...segments: readonly (string | number)[]): TSNode {
  return segments.reduce<TSNode>(
    (type, segment) => `${type}[${typeof segment === 'number'
      ? String(segment)
      : tsStringLiteral(segment)}]`,
    typeName,
  )
}

/** Escapes a string the way TypeScript's printer does, including every code unit above U+007F. */
function tsStringLiteral(value: string): string {
  let output = '"'
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    const character = value[index]!
    if (code === 0) {
      // A digit after the escape would otherwise read as part of an octal escape.
      const nextCode = value.charCodeAt(index + 1)
      output += nextCode >= 48 && nextCode <= 57
        ? '\\x00'
        : '\\0'
    }
    else if (ESCAPED_CHARACTERS[character] !== undefined) {
      output += ESCAPED_CHARACTERS[character]
    }
    else if (code <= 0x1F || code > 0x7F) {
      output += `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`
    }
    else {
      output += character
    }
  }
  return `${output}"`
}

function formatCommentText(text: string): string {
  return text.trim().replace(COMMENT_LINE_BREAK_RE, '\n *     ')
}

/** Removes the primitive keywords `tsIsPrimitive` names when they repeat, keeping everything else. */
function tsDedupe(types: TSNode[]): TSNode[] {
  const encounteredTypes = new Set<string>()
  return types.filter((type) => {
    if (!tsIsPrimitive(type))
      return true
    if (encounteredTypes.has(type))
      return false
    encounteredTypes.add(type)
    return true
  })
}

/**
 * Whether an expression holds a union, an intersection, or a conditional type outside any
 * brackets, which then binds looser than a surrounding union, intersection, or array.
 * String literals and comments are skipped, so prose in a JSDoc block cannot unbalance the scan.
 */
function needsParentheses(expression: TSNode): boolean {
  let depth = 0
  for (let index = 0; index < expression.length; index++) {
    const character = expression[index]
    if (character === '"' || character === '\'') {
      index = skipQuoted(expression, index, character)
      continue
    }
    if (character === '/' && expression[index + 1] === '*') {
      const commentEnd = expression.indexOf('*/', index + 2)
      index = commentEnd === -1
        ? expression.length - 1
        : commentEnd + 1
      continue
    }
    if (character === '{' || character === '[' || character === '(' || character === '<') {
      depth++
      continue
    }
    if (character === '}' || character === ']' || character === ')' || character === '>') {
      depth--
      continue
    }
    if (depth !== 0)
      continue
    if (character === '|' || character === '&')
      return true
    if (character === 'e' && expression.startsWith('extends', index)) {
      const previous = index === 0
        ? ''
        : expression[index - 1]!
      const next = expression[index + 7] ?? ''
      if (!/[\w$]/.test(previous) && !/[\w$]/.test(next))
        return true
    }
  }
  return false
}

/** Returns the index of the quote closing the literal that opens at `start`. */
function skipQuoted(expression: TSNode, start: number, quote: string): number {
  for (let index = start + 1; index < expression.length; index++) {
    if (expression[index] === '\\') {
      index++
      continue
    }
    if (expression[index] === quote)
      return index
  }
  return expression.length - 1
}
