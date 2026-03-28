import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const configuredIgnorePath = process.env.IGNORE_USERS_PATH;
const configuredIgnoreDir = process.env.IGNORE_USERS_DIR;

const runtimeConfigDir = configuredIgnorePath
  ? dirname(configuredIgnorePath)
  : configuredIgnoreDir
  ? configuredIgnoreDir
  : join(process.cwd(), 'config');

export const CONFIG_DIR = runtimeConfigDir;
export const IGNORE_USERS_PATH = configuredIgnorePath
  ? configuredIgnorePath
  : join(CONFIG_DIR, 'ignore-users.json');

export function ensureConfigDir() {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to ensure config directory:', err);
  }
}
