/** Splits a `$ref` into the document it points into, `null` for its own, and its decoded JSON pointer segments. */
export function parseRef($ref: string): { uri: string | null, segments: string[] } {
  const [uri = '', pointer = ''] = $ref.split('#/')
  return {
    uri: (uri.endsWith('#')
      ? uri.slice(0, -1)
      : uri) || null,
    segments: pointer.split('/').map(unescapePointer).filter(Boolean),
  }
}

/** Escapes a JSON pointer segment for a `$ref`, which `unescapePointer` reverses. */
export function escapePointer(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1').replace(/%/g, '%25')
}

function unescapePointer(segment: string): string {
  return decodeURIComponent(segment.replace(/~1/g, '/').replace(/~0/g, '~'))
}

/** Joins path parts into a `#/…` ref, expanding a part that is itself a ref. */
export function createRef(parts: (number | string | undefined)[]): string {
  let ref = '#'
  for (const part of parts) {
    if (part === undefined || part === '')
      continue
    const { segments } = parseRef(String(part))
    for (const segment of segments.length
      ? segments
      : [
          String(part),
        ])
      ref += `/${escapePointer(segment)}`
  }
  return ref
}
