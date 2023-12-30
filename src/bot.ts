import tmi from 'tmi.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
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
  const isBroadcaster = context.badges.broadcaster;
  const isMod = context.badges.moderator;

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

  // TODO: This is not a good implementation. Need to experiment and find a score that will only translate messages that needs to be translated.
  // Does not translate if the message is from the streamer or a mod, or the message is under 10 characters
  if (isMod || message.length <= 5) {
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
      // As long as the detected language doesn't match the primary language, translate the message
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
      to: [translateTo]
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
