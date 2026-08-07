import tmi from 'tmi.js';
import dotenv from 'dotenv';
import { ensureConfigDir } from './config.js';
import { initializeIgnoreSets, handleIgnoreCommand, isIgnoreMessage, normalizeCommandTyping } from './commandHandler.js';
import { initializeLanguageConfigs, removeEmotes, processMessage } from './messageProcessor.js';
import { getOAuthTokenViaFlow } from './authFlow.js';
import { requireEnv } from './env.js';
import {
  loadStoredToken,
  saveToken,
  isTokenExpired,
  refreshToken as refreshStoredToken,
  getAccessToken
} from './tokenManager.js';

dotenv.config();

ensureConfigDir();

const botUsername = requireEnv('BOT_USERNAME');
const channelInput = process.env.CHANNEL_NAME || botUsername;
const channels = channelInput
  .split(/[,\s]+/)
  .map((c) => c.trim().toLowerCase())
  .filter((c) => c.length > 0);

const perChannelIgnoreSets = initializeIgnoreSets(channels);
const perChannelLanguages = initializeLanguageConfigs(channels);

let client: tmi.Client;
let tokenRefreshInterval: NodeJS.Timeout | null = null;
const useOAuthFlow = ['1', 'true', 'yes'].includes((process.env.TWITCH_OAUTH_FLOW || '').toLowerCase());
const envOAuth = process.env.TWITCH_OAUTH;

async function getOrRefreshToken(): Promise<string> {
  if (useOAuthFlow) {
    const clientId = requireEnv('TWITCH_CLIENT_ID');
    const clientSecret = requireEnv('TWITCH_CLIENT_SECRET');

    const storedToken = loadStoredToken();
    if (storedToken) {
      if (!isTokenExpired(storedToken)) {
        console.log('Using stored OAuth token.');
        return getAccessToken(storedToken);
      }

      try {
        console.log('Stored token expired, refreshing...');
        const refreshed = await refreshStoredToken(clientId, clientSecret, storedToken.refreshToken);
        return getAccessToken(refreshed);
      } catch (err) {
        console.warn('Failed to refresh token, requesting new authorization...', err);
      }
    }

    const tokenData = await getOAuthTokenViaFlow();
    saveToken(tokenData.accessToken, tokenData.refreshToken, tokenData.expiresIn);
    return getAccessToken({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: 0
    });
  }

  if (!envOAuth) {
    throw new Error('Twitch auth is required. Set TWITCH_OAUTH or enable TWITCH_OAUTH_FLOW=true');
  }
  return envOAuth.startsWith('oauth:') ? envOAuth : `oauth:${envOAuth}`;
}

function setupAutoTokenRefresh(): void {
  if (!useOAuthFlow) return;

  tokenRefreshInterval = setInterval(async () => {
    try {
      const storedToken = loadStoredToken();
      if (!storedToken) return;

      if (isTokenExpired(storedToken)) {
        const clientId = requireEnv('TWITCH_CLIENT_ID');
        const clientSecret = requireEnv('TWITCH_CLIENT_SECRET');
        console.log('Auto-refreshing expired token...');
        await refreshStoredToken(clientId, clientSecret, storedToken.refreshToken);
        console.log('Token auto-refreshed successfully.');
      }
    } catch (err) {
      console.error('Auto-refresh failed:', err);
    }
  }, 30 * 60 * 1000);
}

async function createClientAndConnect() {
  const formattedToken = await getOrRefreshToken();

  client = new tmi.Client({
    identity: {
      username: botUsername,
      password: formattedToken
    },
    channels
  });

  client.on('connected', onConnectedHandler);
  client.on('message', onMessageHandler);

  await client.connect();
  console.log(`Bot connected as '${botUsername}' to ${channels.length} channel(s): ${channels.join(', ')}`);

  setupAutoTokenRefresh();

  return client;
}

function onConnectedHandler(addr: string, port: number) {
  console.log(`* Connected to ${addr}:${port}`);
}

async function onMessageHandler(target: string, context: any, msg: string, self: boolean) {
  if (self) return;

  const channelName = target.toLowerCase().startsWith('#') ? target.slice(1) : target.toLowerCase();
  const ignoreSet = perChannelIgnoreSets.get(channelName) || new Set<string>();
  const langConfig = perChannelLanguages.get(channelName)!;

  let message = normalizeCommandTyping(msg.trim());
  const isBroadcaster = Boolean(context?.badges?.broadcaster);
  const usernameLower = String(context?.username ?? '').toLowerCase();
  const isPrivileged = Boolean(context?.badges?.broadcaster || context?.mod || context?.['user-type'] === 'mod');

  if (isIgnoreMessage(message)) {
    if (!isPrivileged) return;
    handleIgnoreCommand(client, target, channelName, message, ignoreSet);
    return;
  }

  message = removeEmotes(message, context).trim();

  if (ignoreSet.has(usernameLower)) return;
  if (isBroadcaster || message.length <= 7) return;

  await processMessage(client, target, message, channelName, usernameLower, isBroadcaster, ignoreSet, langConfig, context);
}

createClientAndConnect().catch((err) => {
  console.error('Failed to start bot:', err.message || err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }
  process.exit(0);
});

