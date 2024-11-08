export function base64ToUint8Array(base64String: string) {
  const base64Url = base64String.replaceAll('-', '+').replaceAll('_', '/')
  const latin1String = globalThis.atob(base64Url)
  return Uint8Array.from(latin1String, byte => byte.codePointAt(0)!)
}

export function uint8ArrayToBase64(array: Uint8Array) {
  let latin1String = ''

  for (const byte of array) {
    latin1String += String.fromCodePoint(byte)
  }

  return globalThis.btoa(latin1String)
}
