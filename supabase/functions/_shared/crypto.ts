/**
 * AES-256-GCM encryption/decryption for sensitive tokens.
 * Uses Web Crypto API (available in Deno).
 * 
 * Format: base64(iv + ciphertext + tag)
 * - IV: 12 bytes
 * - Tag: 16 bytes (appended by AES-GCM)
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

async function getKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY");
  if (!keyHex) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY not configured");
  }
  
  // Key is a 64-char hex string = 32 bytes = 256 bits
  const keyBytes = new Uint8Array(
    keyHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
  );
  
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );
  
  // Combine IV + ciphertext into single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Encode as base64 with prefix to identify encrypted values
  return "enc:" + btoa(String.fromCharCode(...combined));
}

export async function decryptToken(encrypted: string): Promise<string> {
  // If not encrypted (legacy plaintext), return as-is
  if (!encrypted.startsWith("enc:")) {
    return encrypted;
  }
  
  const key = await getKey();
  const raw = encrypted.slice(4); // Remove "enc:" prefix
  const combined = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}
