// Forked from unjs/defu (MIT)

export type PlainObject = Record<PropertyKey, any>

export type Merger<T extends PlainObject = PlainObject> = (
  target: T,
  key: PropertyKey,
  value: any,
  namespace: string,
) => boolean | void

/**
 * Defu function type that accepts a source and multiple defaults
 */
export type DefuFn = <T extends PlainObject>(
  source: T,
  ...defaults: PlainObject[]
) => T

/**
 * Create a defu function with optional custom merger
 */
export function createDefu(
  merger?: Merger,
): DefuFn {
  return (source, ...defaults) => {
    return defaults.reduce(
      (acc, current) => _defu(acc, current ?? {}, '', merger),
      source ?? ({} as any),
    ) as any
  }
}

export const defu: DefuFn = createDefu()

function _defu<T extends PlainObject>(
  source: T,
  defaults: PlainObject,
  namespace = '',
  merger?: Merger,
): T {
  if (!isPlainObject(defaults)) {
    return source
  }

  const result = { ...defaults }

  for (const [key, value] of Object.entries(source)) {
    // Skip prototype pollution
    if (key === '__proto__' || key === 'constructor') {
      continue
    }

    // Skip null/undefined values - let defaults take precedence
    if (value == null) {
      continue
    }

    // Use custom merger if provided
    if (merger?.(result, key, value, namespace)) {
      continue
    }

    const currentNamespace = namespace ? `${namespace}.${key}` : key

    // Merge arrays by concatenation
    if (Array.isArray(value) && Array.isArray(result[key])) {
      result[key] = [...value, ...result[key]]
    }
    // Recursively merge plain objects
    else if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = _defu(value, result[key], currentNamespace, merger)
    }
    // Override with source value
    else {
      result[key] = value
    }
  }

  return result as T
}

function isPlainObject(value: unknown): value is PlainObject {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  if (
    prototype !== null
    && prototype !== Object.prototype
    && Object.getPrototypeOf(prototype) !== null
  ) {
    return false
  }

  if (Symbol.iterator in value) {
    return false
  }

  return true
}
