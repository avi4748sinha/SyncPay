/**
 * Build payload string same as backend (utils/crypto.js payloadForSignature)
 * and produce 64-char hex signature for offline sync verification.
 */
export function payloadStringForSignature(payload: {
  txn_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: number;
  device_id: string;
}): string {
  return [
    payload.txn_id,
    payload.sender_id,
    payload.receiver_id,
    String(payload.amount),
    String(payload.timestamp),
    payload.device_id || '',
  ].join('|');
}

export async function hashPayloadToSignature(payloadStr: string): Promise<string> {
  const buf = new TextEncoder().encode(payloadStr);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
