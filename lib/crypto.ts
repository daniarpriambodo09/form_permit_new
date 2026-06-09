// lib/crypto.ts
// Helper enkripsi/dekripsi AES-256-GCM untuk menyimpan password plaintext
// secara reversible di kolom `password_encrypted`.
//
// PENTING:
//   - Kolom ini TIDAK pernah dipakai untuk proses login.
//   - Login selalu menggunakan kolom `password` (bcrypt hash).
//   - Kolom `password_encrypted` hanya untuk fitur "Lihat Password" di admin panel.
//
// ENV yang diperlukan:
//   PASSWORD_ENCRYPTION_KEY=<64 hex chars, 32 bytes>
//
// Generate key baru:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_LENGTH  = 12;  // 96-bit IV untuk GCM (NIST recommended)
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.PASSWORD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'PASSWORD_ENCRYPTION_KEY harus berisi 64 hex chars (32 bytes). ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

// ── Encrypt ──────────────────────────────────────────────────
// Output format: <iv_hex>:<tag_hex>:<ciphertext_hex>
// Semua bagian disimpan sebagai satu string di kolom password_encrypted.
export function encryptPassword(plaintext: string): string {
  const key        = getKey();
  const iv         = crypto.randomBytes(IV_LENGTH);
  const cipher     = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted  = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag        = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

// ── Decrypt ──────────────────────────────────────────────────
// Mengembalikan plaintext, atau melempar error jika format/kunci salah.
export function decryptPassword(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Format password_encrypted tidak valid.');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key        = getKey();
  const iv         = Buffer.from(ivHex,         'hex');
  const tag        = Buffer.from(tagHex,         'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}