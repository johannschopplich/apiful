export function base64ToUint8Array(base64String: string): Uint8Array {
  const normalizedBase64 = base64String.replaceAll('-', '+').replaceAll('_', '/')
  const binaryString = globalThis.atob(normalizedBase64)
  return Uint8Array.from(binaryString, char => char.charCodeAt(0))
}

export function uint8ArrayToBase64(array: Uint8Array): string {
  let binaryString = ''

  for (const byte of array) {
    binaryString += String.fromCharCode(byte)
  }

  return globalThis.btoa(binaryString)
}
