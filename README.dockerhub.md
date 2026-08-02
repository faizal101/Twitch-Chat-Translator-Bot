# Twitch Chat Translator Bot

A lightweight Twitch chat bot that joins your channel, translates chat messages, and can ignore specific users with commands like `!ignore add`, `!ignore remove`, and `!ignore list`.

## Quick start

The bot needs a Twitch account, a Twitch OAuth token (or OAuth flow), an Azure Translator key, and a target language.

### Required environment variables

- `BOT_USERNAME` — the Twitch username of the bot account.
- `CHANNEL_NAME` — the Twitch channel(s) to join. You can provide multiple channels separated by spaces or commas.
- `TWITCH_OAUTH` — the bot account OAuth token (for example `oauth:yourtoken`). Not required if you use the OAuth flow below.
- `AZURE_SUB_KEY` — your Azure Translator resource key.
- `PRIMARY_LANG` — the language code to translate to (for example `en`, `ja`, `ko`, or `zh-Hans`).

### Optional environment variables

- `TWITCH_OAUTH_FLOW=true` — use the built-in OAuth browser flow instead of providing `TWITCH_OAUTH` directly.
- `TWITCH_CLIENT_ID` — required when `TWITCH_OAUTH_FLOW=true`.
- `TWITCH_CLIENT_SECRET` — required when `TWITCH_OAUTH_FLOW=true`.
- `ENCRYPTION_KEY` — optional 64-character hex key for encrypting stored OAuth tokens.
- `SECONDARY_LANG` — optional second target language for bilingual chat setups.
- `TWITCH_OAUTH_REDIRECT_URI` — optional redirect URI for OAuth flow.
- `TWITCH_OAUTH_CERT_PATH` and `TWITCH_OAUTH_KEY_PATH` — optional HTTPS certificate/key paths for local development.

## Run with Docker

### Simple example

```bash
docker run -d --name twitch-chat-translator-bot \
  -e BOT_USERNAME=your_bot_username \
  -e CHANNEL_NAME=your_channel \
  -e TWITCH_OAUTH=oauth:your_token \
  -e AZURE_SUB_KEY=your_azure_key \
  -e PRIMARY_LANG=en \
  -v "$(pwd)/data:/data" \
  scsa20/twitch-chat-translator-bot:latest
```

### Using the built-in OAuth flow

If you do not already have a Twitch OAuth token, you can use the OAuth browser flow instead:

```bash
docker run -d --name twitch-chat-translator-bot \
  -e BOT_USERNAME=your_bot_username \
  -e CHANNEL_NAME=your_channel \
  -e TWITCH_OAUTH_FLOW=true \
  -e TWITCH_CLIENT_ID=your_client_id \
  -e TWITCH_CLIENT_SECRET=your_client_secret \
  -e AZURE_SUB_KEY=your_azure_key \
  -e PRIMARY_LANG=en \
  -v "$(pwd)/data:/data" \
  scsa20/twitch-chat-translator-bot:latest
```

The bot will open an authorization flow on first run if needed.

## Persistent data

Mount a volume or bind mount at `/data` so the bot can keep its ignore lists and token data between restarts:

```bash
-v "$(pwd)/data:/data"
```

## How to use the bot

Once the bot is running in your channel, you can manage the ignore list with chat commands:

- `!ignore add username` — add a user to the current channel's ignore list
- `!ignore remove username` — remove a user from the current channel's ignore list
- `!ignore list` — list the ignored users for the current channel

Only broadcasters and moderators can use these commands.

## Notes

- The bot translates messages automatically after it joins the channel.
- For best results, use the language code that matches the audience you want to support.
- If you are using the OAuth flow, keep the mounted `/data` volume so the saved token can be reused.
