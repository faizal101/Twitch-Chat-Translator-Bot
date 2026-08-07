import type tmi from 'tmi.js';
import { isPrivilegedUser } from './utils.js';
import { detectLanguage, translateMessage } from './translator.js';
import { IgnoreSet } from './commandHandler.js';

export interface ChannelLanguageConfig {
  primary: string;
  secondary?: string;
}

export function initializeLanguageConfigs(channels: string[]): Map<string, ChannelLanguageConfig> {
  const perChannelLanguages = new Map<string, ChannelLanguageConfig>();
  const globalPrimary = requireEnv('PRIMARY_LANG');
  const globalSecondary = process.env.SECONDARY_LANG;

  for (const channel of channels) {
    const primary = process.env[`PRIMARY_LANG_${channel.toUpperCase()}`] || globalPrimary;
    const secondary = process.env[`SECONDARY_LANG_${channel.toUpperCase()}`] || globalSecondary;
    perChannelLanguages.set(channel, { primary, secondary });
  }

  return perChannelLanguages;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export async function shouldIgnoreMessage(
  target: string,
  context: any,
  msg: string,
  ignoreSet: IgnoreSet
): Promise<{ ignore: boolean; message: string; channelName: string; usernameLower: string; isBroadcaster: boolean }> {
  const channelName = target.toLowerCase().startsWith('#') ? target.slice(1) : target.toLowerCase();
  const message = msg.trim();
  const isBroadcaster = Boolean(context?.badges?.broadcaster);
  const usernameLower = String(context?.username ?? '').toLowerCase();
  const normalizedMessage = message;

  if (ignoreSet.has(usernameLower)) {
    return { ignore: true, message: normalizedMessage, channelName, usernameLower, isBroadcaster };
  }

  return { ignore: false, message: normalizedMessage, channelName, usernameLower, isBroadcaster };
}

export function removeEmotes(message: string, context: any): string {
  if (!context?.emotes) return message;

  const emotes = Object.values<string>(context.emotes)
    .map(([positions]) => {
      const [start, end] = positions.split('-').map(Number);
      return message.substring(start, end + 1);
    })
    .filter(Boolean);

  return emotes.reduce((text, emote) => text.replace(new RegExp(emote, 'g'), ''), message);
}

export async function processMessage(
  client: tmi.Client,
  target: string,
  message: string,
  channelName: string,
  usernameLower: string,
  isBroadcaster: boolean,
  ignoreSet: IgnoreSet,
  langConfig: ChannelLanguageConfig,
  context: any
): Promise<void> {
  if (isBroadcaster || message.length <= 7) return;

  const detectedLang = await detectLanguage(message);

  if (langConfig.secondary) {
    if (detectedLang === langConfig.secondary) {
      await translateMessage(client, message, target, langConfig.primary);
    } else if (detectedLang === langConfig.primary) {
      await translateMessage(client, message, target, langConfig.secondary);
    } else {
      await translateMessage(client, message, target, langConfig.primary);
    }
  } else if (detectedLang !== langConfig.primary) {
    await translateMessage(client, message, target, langConfig.primary);
  }
}
