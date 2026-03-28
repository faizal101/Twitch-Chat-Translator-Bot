import { existsSync, readFileSync, writeFileSync } from 'fs';
import { IGNORE_USERS_PATH, ensureConfigDir } from './config';
import { normalizeUsername } from './utils';

export function loadIgnoreListFromFile(): string[] {
  try {
    if (!existsSync(IGNORE_USERS_PATH)) return [];
    const raw = readFileSync(IGNORE_USERS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((x: unknown) => (typeof x === 'string' ? normalizeUsername(x) : null))
      .filter((x): x is string => !!x);
  } catch (err) {
    console.warn('Failed to load ignore-users.json:', err);
    return [];
  }
}

export function parseEnvIgnoreUsers(): string[] {
  const v = process.env.IGNORE_USERS;
  if (!v) return [];
  return v
    .split(',')
    .map((s) => normalizeUsername(s || ''))
    .filter((x): x is string => !!x);
}

export function saveIgnoreList(set: Set<string>) {
  try {
    ensureConfigDir();
    const arr = Array.from(set.values()).sort();
    writeFileSync(IGNORE_USERS_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save ignore-users.json:', err);
  }
}
