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

// Create a client with out options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot
  
    // Remove whitespace from chat message
    const message = msg.trim();
    // console.log(context);
    // console.log(msg);

    detectedLanguage(message, target);

    // translateMessage(commandName, target, context.username);
  }
  
// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

// Detect language of the message
function detectedLanguage(message, target) {
  const endpoint = "https://api.cognitive.microsofttranslator.com/detect";
  axios({
    baseURL: endpoint,
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
}).then(function(response){
  const detectedLang = response.data[0].language;

  // Checks if the message is in English
  (detectedLang == 'en' ? true : translateMessage(message, target));
});
}

// Translate the message
function translateMessage(message, target) {
  const endpoint = "https://api.cognitive.microsofttranslator.com/translate";
  axios({
    baseURL: endpoint,
    method: 'post',
    headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY,
        'Content-type': 'application/json',
    },
    params: {
        'api-version': '3.0',
        'to': ['en']
    },
    data: [{
        'text': message
    }],
    responseType: 'json'
}).then(function(response){
  const translatedText = response.data[0].translations[0].text;
  const detectedLang = response.data[0].detectedLanguage.language;
  return client.say(target, `\/me [${detectedLang}->en]: ${translatedText}`);
});
}