export function newId(prefix = ''): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return prefix + cryptoObj.randomUUID()
  }
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}${random}`
}
