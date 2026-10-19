type RandomSource = Partial<Pick<Crypto, 'getRandomValues' | 'randomUUID'>>

const byteToHex = (byte: number) => byte.toString(16).padStart(2, '0')

/**
 * Creates a UUID that can be used as an idempotency key over HTTP on a local
 * network. `crypto.randomUUID()` is unavailable in non-secure browser contexts
 * such as http://192.168.x.x, whereas `getRandomValues()` remains available.
 */
export const createMutationId = (
  randomSource: RandomSource | undefined = globalThis.crypto
): string => {
  try {
    if (typeof randomSource?.randomUUID === 'function') {
      return randomSource.randomUUID()
    }
  } catch {
    // Fall through to getRandomValues for non-secure contexts.
  }

  const bytes = new Uint8Array(16)

  if (typeof randomSource?.getRandomValues === 'function') {
    randomSource.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, byteToHex).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
