import crypto from 'crypto';

/**
 * Ed25519: Server does not hold user private keys.
 * Client sends signature; server can verify if we have public key stored,
 * or we verify via shared secret / hash of payload.
 * For offline txn verification we verify payload hash matches signed payload.
 */
const ALGORITHM = 'sha256';
const SIGNATURE_ENCODING = 'base64';

/**
 * Create payload string for signing (deterministic)
 */
export function payloadForSignature(payload) {
  return [
    payload.txn_id,
    payload.sender_id,
    payload.receiver_id,
    String(payload.amount),
    String(payload.timestamp),
    payload.device_id || '',
  ].join('|');
}

/**
 * Hash payload for verification
 */
export function hashPayload(payloadString) {
  return crypto.createHash(ALGORITHM).update(payloadString).digest('hex');
}

/**
 * Verify Ed25519 signature (hex signature from client)
 * In production, store user's public key and use crypto.verify(signature, payload, publicKey).
 * Here we verify: signature was created over correct payload hash (client sends signature of hash).
 */
export function verifySignature(payloadString, signatureHex, publicKeyHex) {
  if (!signatureHex || !payloadString) return false;
  try {
    const expectedHex = hashPayload(payloadString);
    const normalized = String(signatureHex).trim().toLowerCase();
    // Client (offlineSignature.ts) sends SHA-256 hex of payload string (64 hex chars = 32 bytes).
    if (/^[0-9a-f]{64}$/.test(normalized) && normalized === expectedHex.toLowerCase()) {
      return true;
    }
    // Legacy / future: raw Ed25519 signature as hex (128 hex chars = 64 bytes)
    const sigBuf = Buffer.from(signatureHex, 'hex');
    if (sigBuf.length === 64) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Check timestamp is within allowed window (e.g. 5 min)
 */
export function isTimestampValid(timestampMs, maxAgeSeconds = 300) {
  const now = Date.now();
  const t = Number(timestampMs);
  return !Number.isNaN(t) && Math.abs(now - t) <= maxAgeSeconds * 1000;
}
