import tmi from 'tmi.js';
import dotenv from 'dotenv';
import { ensureConfigDir } from './config';
import { normalizeUsername } from './utils';
import { loadIgnoreListFromFile, parseEnvIgnoreUsers, saveIgnoreList } from './ignoreList';
import { detectLanguage, translateMessage } from './translator';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

ensureConfigDir();
const initialIgnore = new Set<string>(loadIgnoreListFromFile());
for (const u of parseEnvIgnoreUsers()) initialIgnore.add(u);
let ignoreSet = initialIgnore;

const opts = {
  identity: {
    username: requireEnv('BOT_USERNAME'),
    password: requireEnv('TWITCH_OAUTH')
  },
  channels: [requireEnv('CHANNEL_NAME')]
};

const primaryLang = requireEnv('PRIMARY_LANG');
const secondaryLang = process.env.SECONDARY_LANG;
const client = new tmi.client(opts);

client.on('connected', onConnectedHandler);
client.on('message', onMessageHandler);
client.connect();

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr: string, port: number) {
  console.log(`* Connected to ${addr}:${port}`);
}

// Called every time a message comes in
async function onMessageHandler(
  target: string,
  context: any,
  msg: string,
  self: boolean
) {
  if (self) return;

  let message = msg.trim();

  const isBroadcaster = Boolean(context?.badges?.broadcaster);
  const isMod = Boolean(context?.badges?.moderator);
  const usernameLower = String(context?.username ?? '').toLowerCase();
  const isPrivileged = isBroadcaster || isMod;

  if (message.toLowerCase().startsWith('!ignore')) {
    if (!isPrivileged) return;

    const parts = message.trim().split(/\s+/);
    const sub = (parts[1] || '').toLowerCase();

    if (sub === 'add' || sub === '+') {
      const raw = parts[2];
      if (!raw) {
        client.say(target, '/me Usage: !ignore add <username>');
        return;
      }
      const normalized = normalizeUsername(raw);
      if (!normalized) {
        client.say(target, '/me Invalid username.');
        return;
      }
      if (ignoreSet.has(normalized)) {
        client.say(target, `/me ${normalized} is already in ignore list.`);
        return;
      }
      ignoreSet.add(normalized);
      saveIgnoreList(ignoreSet);
      client.say(target, `/me Added ${normalized} to ignore list.`);
      return;
    } else if (sub === 'remove' || sub === '-') {
      const raw = parts[2];
      if (!raw) {
        client.say(target, '/me Usage: !ignore remove <username>');
        return;
      }
      const normalized = normalizeUsername(raw);
      if (!normalized) {
        client.say(target, '/me Invalid username.');
        return;
      }
      if (!ignoreSet.has(normalized)) {
        client.say(target, `/me ${normalized} is not in ignore list.`);
        return;
      }
      ignoreSet.delete(normalized);
      saveIgnoreList(ignoreSet);
      client.say(target, `/me Removed ${normalized} from ignore list.`);
      return;
    } else if (sub === 'list') {
      const list = Array.from(ignoreSet.values()).sort();
      const preview = list.slice(0, 20).join(', ') || '(empty)';
      const suffix = list.length > 20 ? ` ... and ${list.length - 20} more` : '';
      client.say(target, `/me Ignore list: ${preview}${suffix}`);
      return;
    }

    client.say(target, '/me Commands: !ignore add <username> | !ignore remove <username> | !ignore list');
    return;
  }

  if (context?.emotes) {
    const emotes = Object.values<string>(context.emotes)
      .map(([positions]) => {
        const [start, end] = positions.split('-').map(Number);
        return message.substring(start, end + 1);
      })
      .filter(Boolean);

    emotes.forEach((x) => {
      message = message.replace(new RegExp(x, 'g'), '');
    });
  }

  if (ignoreSet.has(usernameLower)) return;

  if (isBroadcaster || isMod || message.length <= 7) return;

  const detectedLang = await detectLanguage(message);

  if (secondaryLang) {
    if (detectedLang === secondaryLang) {
      await translateMessage(client, message, target, primaryLang);
    } else if (detectedLang === primaryLang) {
      await translateMessage(client, message, target, secondaryLang);
    } else {
      await translateMessage(client, message, target, primaryLang);
    }
  } else if (detectedLang !== primaryLang) {
    await translateMessage(client, message, target, primaryLang);
  }
}


