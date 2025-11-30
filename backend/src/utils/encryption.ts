import CryptoJS from 'crypto-js';
import { config } from '../config';

/**
 * Encrypts sensitive data using AES encryption
 * @param text - Plain text to encrypt
 * @returns Encrypted string
 */
export function encrypt(text: string): string {
  if (!config.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }
  return CryptoJS.AES.encrypt(text, config.ENCRYPTION_KEY).toString();
}

/**
 * Decrypts encrypted data
 * @param encryptedText - Encrypted string
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!config.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedText, config.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

