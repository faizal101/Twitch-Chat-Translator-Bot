import http from 'http';
import https from 'https';
import fs from 'fs';
import { requireEnv } from './env.js';

export interface OAuthTokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const scopes = ['chat:read', 'chat:edit', 'whispers:read', 'whispers:edit'];
  return `${TWITCH_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${encodeURIComponent(state)}`;
}

function buildRedirectUri(useHttps: boolean): string {
  const protocol = useHttps ? 'https' : 'http';
  return process.env.TWITCH_OAUTH_REDIRECT_URI || `${protocol}://localhost:3000/auth/callback`;
}

export async function getOAuthTokenViaFlow(): Promise<OAuthTokenData> {
  const clientId = requireEnv('TWITCH_CLIENT_ID');
  const clientSecret = requireEnv('TWITCH_CLIENT_SECRET');
  const certPath = process.env.TWITCH_OAUTH_CERT_PATH;
  const keyPath = process.env.TWITCH_OAUTH_KEY_PATH;
  const useHttps = Boolean(certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath));
  const redirectUri = buildRedirectUri(useHttps);
  const state = `${Math.random().toString(36).slice(2)}_${Date.now()}`;

  console.log('Open this URL in your browser to authorize your bot:');
  console.log(buildAuthorizeUrl(clientId, redirectUri, state));

  return new Promise((resolve, reject) => {
    const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (!req.url) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || (useHttps ? 'https' : 'http');
      const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
      const url = new URL(req.url, `${forwardedProto}://${forwardedHost}`);

      if (url.pathname !== '/auth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      if (!code || returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid state or missing code.');
        return;
      }

      try {
        const tokenResponse = await fetch(TWITCH_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          })
        });

        if (!tokenResponse.ok) {
          const bodyText = await tokenResponse.text();
          throw new Error(`OAuth token request failed: ${tokenResponse.status} ${tokenResponse.statusText} ${bodyText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData?.access_token;
        const refreshToken = tokenData?.refresh_token;
        const expiresIn = tokenData?.expires_in || 3600;

        if (!accessToken || !refreshToken) {
          throw new Error('No access or refresh token in response');
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization complete</h1><p>You may close this window and return to your terminal.</p>');
        server.close();
        resolve({ accessToken, refreshToken, expiresIn });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to exchange code for token.');
        server.close();
        reject(err);
      }
    };

    const server = useHttps
      ? https.createServer(
          {
            cert: fs.readFileSync(certPath!),
            key: fs.readFileSync(keyPath!)
          },
          requestHandler
        )
      : http.createServer(requestHandler);

    server.listen(3000, '0.0.0.0', () => {
      console.log(`Waiting for Twitch auth callback at ${redirectUri} ...`);
    });

    setTimeout(() => {
      reject(new Error('OAuth authorization timed out after 2 minutes.'));
      server.close();
    }, 120000);
  });
}
