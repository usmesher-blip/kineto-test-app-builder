/** Tiny crypto-based ID generator — no external dependency needed */
export const nanoid = (size = 12): string =>
  crypto.getRandomValues(new Uint8Array(size)).reduce(
    (acc, b) => acc + (b & 63).toString(36),
    ''
  )
