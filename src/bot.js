const tmi = require('tmi.js');
const axios = require('axios').default;
require('dotenv').config();

const opts = {
    identity: {
        username: process.env.BOT_USERNAME,
        password: process.env.TWITCH_OAUTH
    },
    channels: [
        process.env.CHANNEL_NAME
    ]
};

const primaryLang = process.env.PRIMARY_LANG;
const secondaryLang = process.env.SECONDARY_LANG;
const endpoint = 'https://api.cognitive.microsofttranslator.com';
const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.connect();

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

// Called every time a message comes in
async function onMessageHandler (target, context, msg, self) {
  if (self) {return;} // Ignore messages from the bot

  let message = msg.trim();
  let emotes = [];

  // Checks if the message has any emotes 
  if(context.emotes) {
    Object.values(context.emotes).forEach(([positions]) => {
      let pos = positions.split('-');
      emotes.push(message.substring(pos[0], (parseInt(pos[1])+1)));
    })
    emotes.forEach(x => {
      message = message.replace(new RegExp(x, 'g'), '');
    });
  }

  // Does not translate if message is under 5 characters
  if(message.length <=5) {return;}

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
async function detectedLanguage(message) {
  return await axios({
    baseURL: endpoint,
    url: '/detect',
    method: 'post',
    headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY,
        'Content-type': 'application/json',
    },
    params: {
        'api-version': '3.0'
    },
    data: [{
        'text': message
    }],
    responseType: 'json'
}).then((response) => {
  return (response.data[0].language);
});
}

// Translate the message
function translateMessage(message, target, translateTo) {
  axios({
    baseURL: endpoint,
    url: '/translate',
    method: 'post',
    headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY,
        'Content-type': 'application/json',
    },
    params: {
        'api-version': '3.0',
        'to': [translateTo]
    },
    data: [{
        'text': message
    }],
    responseType: 'json'
}).then(function(response){
  const translatedText = response.data[0].translations[0].text;
  const detectedLang = response.data[0].detectedLanguage.language;
  if (message == translatedText) {return;}
  return client.say(target, `/me [${detectedLang}->${translateTo}]: ${translatedText}`);
});
}