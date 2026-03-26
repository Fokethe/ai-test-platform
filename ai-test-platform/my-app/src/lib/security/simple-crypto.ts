import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DEV_FALLBACK_SECRET = 'dev-crypto-secret-change-me';

function getSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.APP_SECRET || DEV_FALLBACK_SECRET;
}

function deriveKey(secret: string) {
  return createHash('sha256').update(secret).digest();
}

export function encryptText(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(getSecret());
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptText(cipherText: string): string {
  const [ivBase64, authTagBase64, dataBase64] = cipherText.split('.');
  if (!ivBase64 || !authTagBase64 || !dataBase64) {
    throw new Error('Invalid cipher text payload');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(dataBase64, 'base64');
  const key = deriveKey(getSecret());

  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
