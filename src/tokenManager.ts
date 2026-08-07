import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { CONFIG_DIR } from './config.js';

const ENCRYPTION_KEY_FILE = join(CONFIG_DIR, 'encryption-key.txt');

function getEncryptionKey(): Buffer {
  let key: string;
  if (process.env.ENCRYPTION_KEY) {
    key = process.env.ENCRYPTION_KEY;
  } else {
    if (existsSync(ENCRYPTION_KEY_FILE)) {
      key = readFileSync(ENCRYPTION_KEY_FILE, 'utf-8').trim();
    } else {
      // Generate a new key
      key = crypto.randomBytes(32).toString('hex');
      try {
        writeFileSync(ENCRYPTION_KEY_FILE, key, 'utf-8');
        console.warn(
          'Generated new encryption key and saved to config/encryption-key.txt. For security, set ENCRYPTION_KEY environment variable instead.'
        );
      } catch (err) {
        console.error('Failed to save encryption key:', err);
        throw new Error('Cannot generate or load encryption key');
      }
    }
  }

  // Ensure key is 32 bytes
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }
  return keyBuffer;
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const TOKEN_FILE = join(CONFIG_DIR, 'oauth-token.json');

export function loadStoredToken(): StoredToken | null {
  try {
    if (!existsSync(TOKEN_FILE)) {
      return null;
    }
    const encryptedData = readFileSync(TOKEN_FILE, 'utf-8');
    const decryptedData = decrypt(encryptedData);
    return JSON.parse(decryptedData) as StoredToken;
  } catch (err) {
    console.warn('Failed to load stored token:', err);
    return null;
  }
}

export function saveToken(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  const token: StoredToken = { accessToken, refreshToken, expiresAt };
  try {
    const jsonData = JSON.stringify(token, null, 2);
    const encryptedData = encrypt(jsonData);
    writeFileSync(TOKEN_FILE, encryptedData, 'utf-8');
    console.log('Token saved securely to config directory.');
  } catch (err) {
    console.warn('Failed to save token:', err);
  }
}

export function isTokenExpired(token: StoredToken): boolean {
  // Consider token expired if it will expire within the next 5 minutes
  const buffer = 5 * 60 * 1000;
  return Date.now() >= token.expiresAt - buffer;
}

export async function refreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<StoredToken> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Refresh token request failed: ${response.status} ${response.statusText} ${bodyText}`);
    }

    const data = await response.json();
    const newAccessToken = data?.access_token;
    const newRefreshToken = data?.refresh_token || refreshToken;
    const expiresIn = data?.expires_in || 3600;

    if (!newAccessToken) {
      throw new Error('No access token in refresh response');
    }

    const token: StoredToken = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: Date.now() + expiresIn * 1000
    };

    saveToken(newAccessToken, newRefreshToken, expiresIn);
    console.log('Token refreshed successfully.');
    return token;
  } catch (err) {
    console.error('Failed to refresh token:', err);
    throw err;
  }
}

export function getAccessToken(token: StoredToken): string {
  return token.accessToken.startsWith('oauth:')
    ? token.accessToken
    : `oauth:${token.accessToken}`;
}
