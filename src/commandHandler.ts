import type tmi from 'tmi.js';
import { normalizeUsername } from './utils.js';
import { loadIgnoreListFromFile, parseEnvIgnoreUsers, saveIgnoreList } from './ignoreList.js';

export type IgnoreSet = Set<string>;

export function initializeIgnoreSets(channels: string[]): Map<string, IgnoreSet> {
  const perChannelIgnoreSets = new Map<string, IgnoreSet>();
  for (const channel of channels) {
    const initialIgnore = new Set<string>(loadIgnoreListFromFile(channel));
    for (const u of parseEnvIgnoreUsers()) initialIgnore.add(u);
    perChannelIgnoreSets.set(channel, initialIgnore);
  }
  return perChannelIgnoreSets;
}

export function handleIgnoreCommand(
  client: tmi.Client,
  target: string,
  channelName: string,
  message: string,
  ignoreSet: IgnoreSet
): boolean {
  const parts = message.trim().split(/\s+/);
  const sub = (parts[1] || '').toLowerCase();

  if (sub === 'add' || sub === '+') {
    const raw = parts[2];
    if (!raw) {
      client.say(target, '/me Usage: !ignore add <username>');
      return true;
    }
    const normalized = normalizeUsername(raw);
    if (!normalized) {
      client.say(target, '/me Invalid username.');
      return true;
    }
    if (ignoreSet.has(normalized)) {
      client.say(target, `/me ${normalized} is already in ignore list.`);
      return true;
    }
    ignoreSet.add(normalized);
    saveIgnoreList(ignoreSet, channelName);
    client.say(target, `/me Added ${normalized} to ignore list.`);
    return true;
  }

  if (sub === 'remove' || sub === '-') {
    const raw = parts[2];
    if (!raw) {
      client.say(target, '/me Usage: !ignore remove <username>');
      return true;
    }
    const normalized = normalizeUsername(raw);
    if (!normalized) {
      client.say(target, '/me Invalid username.');
      return true;
    }
    if (!ignoreSet.has(normalized)) {
      client.say(target, `/me ${normalized} is not in ignore list.`);
      return true;
    }
    ignoreSet.delete(normalized);
    saveIgnoreList(ignoreSet, channelName);
    client.say(target, `/me Removed ${normalized} from ignore list.`);
    return true;
  }

  if (sub === 'list') {
    const list = Array.from(ignoreSet.values()).sort();
    const preview = list.slice(0, 20).join(', ') || '(empty)';
    const suffix = list.length > 20 ? ` ... and ${list.length - 20} more` : '';
    client.say(target, `/me Ignore list: ${preview}${suffix}`);
    return true;
  }

  client.say(target, '/me Commands: !ignore add <username> | !ignore remove <username> | !ignore list');
  return true;
}

export function isIgnoreMessage(message: string): boolean {
  return message.toLowerCase().startsWith('!ignore');
}

export function normalizeCommandTyping(message: string): string {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.startsWith('!ignore')) {
    if (lowerMsg === '!ignoreadd' || lowerMsg.startsWith('!ignoreadd ')) {
      return '!ignore add' + message.slice('!ignoreadd'.length);
    }
    if (lowerMsg === '!ignoreremove' || lowerMsg.startsWith('!ignoreremove ')) {
      return '!ignore remove' + message.slice('!ignoreremove'.length);
    }
    if (lowerMsg === '!ignorelist') {
      return '!ignore list';
    }
  }
  return message;
}
