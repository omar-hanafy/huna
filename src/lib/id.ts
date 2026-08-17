/**
 * Generates a record id.
 *
 * `crypto.randomUUID` only exists in a secure context. The dev server binds to
 * the LAN (`host: true`), so opening the app from a phone over plain http used
 * to throw on every check-in (defect 5). Each tier below degrades rather than
 * failing, because a slightly weaker id is always better than losing an entry.
 */
export function createId(): string {
  const webCrypto = globalThis.crypto as Crypto | undefined;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    // RFC 4122 version 4 and variant bits.
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // No crypto at all. Ids are only ever compared locally, never trusted as
  // secrets, so a timestamp plus randomness is sufficient here.
  const random = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `id-${stamp}-${random}`;
}
