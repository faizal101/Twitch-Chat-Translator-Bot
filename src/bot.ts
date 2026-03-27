import tmi from 'tmi.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config();
const CONFIG_DIR = join(process.cwd(), 'config');
const IGNORE_USERS_PATH = join(CONFIG_DIR, 'ignore-users.json');

function ensureConfigDir() {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to ensure config directory:', err);
  }
}

function normalizeUsername(u: string): string | null {
  if (!u) return null;
  const v = u.replace(/^@+/, '').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,30}$/.test(v)) return null;
  return v;
}

function loadIgnoreListFromFile(): string[] {
  try {
    if (!existsSync(IGNORE_USERS_PATH)) return [];
    const raw = readFileSync(IGNORE_USERS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((x: unknown) =>
        typeof x === 'string' ? normalizeUsername(x) : null
      )
      .filter((x): x is string => !!x);
  } catch (err) {
    console.warn('Failed to load ignore-users.json:', err);
    return [];
  }
}

function parseEnvIgnoreUsers(): string[] {
  const v = process.env.IGNORE_USERS;
  if (!v) return [];
  return v
    .split(',')
    .map((s) => normalizeUsername(s || ''))
    .filter((x): x is string => !!x);
}

function saveIgnoreList(set: Set<string>) {
  try {
    ensureConfigDir();
    const arr = Array.from(set.values()).sort();
    writeFileSync(IGNORE_USERS_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save ignore-users.json:', err);
  }
}

ensureConfigDir();
const initialIgnore = new Set<string>();
for (const u of loadIgnoreListFromFile()) initialIgnore.add(u);
for (const u of parseEnvIgnoreUsers()) initialIgnore.add(u);
let ignoreSet: Set<string> = initialIgnore;
const opts: object = {
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.TWITCH_OAUTH
  },
  channels: [process.env.CHANNEL_NAME]
};

const primaryLang = process.env.PRIMARY_LANG as string;
const secondaryLang = process.env.SECONDARY_LANG;
const endpoint = 'https://api.cognitive.microsofttranslator.com';
const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
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
  // Ignore messages from the bot
  if (self) {
    return;
  }
  let message = msg.trim();
  let emotes: string[] = [];
  const isBroadcaster: boolean = context.badges
    ? context.badges.broadcaster
      ? true
      : false
    : false;
  const isMod: boolean = context.badges
    ? context.badges.moderator
      ? true
      : false
    : false;

  const usernameLower: string = (
    context.username ? String(context.username) : ''
  ).toLowerCase();
  const isPrivileged: boolean = isBroadcaster || isMod;

  // Command handling for ignore list (broadcaster or Twitch mod only)
  if (message.toLowerCase().startsWith('!ignore')) {
    if (!isPrivileged) {
      return;
    }
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
      const suffix =
        list.length > 20 ? ` ... and ${list.length - 20} more` : '';
      client.say(target, `/me Ignore list: ${preview}${suffix}`);
      return;
    } else {
      client.say(
        target,
        '/me Commands: !ignore add <username> | !ignore remove <username> | !ignore list'
      );
      return;
    }
  }

  // Checks if the message has any emote(s) and removes them
  if (context.emotes) {
    Object.values<string>(context.emotes).forEach(([positions]) => {
      let pos: string[] = positions.split('-');
      emotes.push(message.substring(parseInt(pos[0]), parseInt(pos[1]) + 1));
    });
    emotes.forEach((x) => {
      message = message.replace(new RegExp(x, 'g'), '');
    });
  }

  if (ignoreSet.has(usernameLower)) return;

  // TODO: This is not a good implementation. Need to experiment and find a score that will only translate messages that needs to be translated.
  // Does not translate if the message is from the streamer or a mod, or the message is under 7 characters
  if (isBroadcaster || isMod || message.length <= 7) {
    return;
  }

  const detectedLang = await detectedLanguage(message);

  if (secondaryLang) {
    if (detectedLang == secondaryLang) {
      translateMessage(message, target, primaryLang);
    } else if (detectedLang == primaryLang) {
      translateMessage(message, target, secondaryLang);
    } else {
      translateMessage(message, target, primaryLang);
    }
  } else {
    if (detectedLang != primaryLang) {
      translateMessage(message, target, primaryLang);
    }
  }
}

// Detect language of the message
async function detectedLanguage(message: string) {
  return await axios({
    baseURL: endpoint,
    url: '/detect',
    method: 'post',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY,
      'Content-type': 'application/json'
    },
    params: {
      'api-version': '3.0'
    },
    data: [
      {
        text: message
      }
    ],
    responseType: 'json'
  }).then((response) => {
    return response.data[0].language;
  });
}

// Translate the message
function translateMessage(
  message: string,
  target: string,
  translateTo: string
) {
  axios({
    baseURL: endpoint,
    url: '/translate',
    method: 'post',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY,
      'Content-type': 'application/json'
    },
    params: {
      'api-version': '3.0',
      to: translateTo
    },
    data: [
      {
        text: message
      }
    ],
    responseType: 'json'
  }).then(function (response) {
    const translatedText = response.data[0].translations[0].text;
    const detectedLang = response.data[0].detectedLanguage.language;
    if (message == translatedText) {
      return;
    }
    return client.say(
      target,
      `/me [${detectedLang}->${translateTo}]: ${translatedText}`
    );
  });
}
