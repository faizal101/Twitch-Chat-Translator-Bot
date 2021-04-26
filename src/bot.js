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

const lang = process.env.PRIMARY_LANG;
console.log(lang);

// Create a client with out options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
async function onMessageHandler (target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot
  
    // Remove whitespace from chat message
    const message = msg.trim();

    // WIP
    /*
    IMPORTANT
    TODO: SANITISE THE MESSAGE SO THAT EMOTES ARE NOT TRANSLATED. 
    This is to avoid situations like this: https://i.imgur.com/h6qZS8i.png
    */
    console.log(context.emotes)
    console.log(message);
    Object.values(context.emotes).forEach(([positions]) => {
      console.log(positions);
      let foo = positions.split('-');
      console.log(foo)
      console.log(message.substring(foo[0], foo[1]+1))
    })


    // Translates the message if it's not true
    // if (!(await detectedLanguage(message))) {
    //   translateMessage(message, target);
    // }
  }
  
// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

// Detect language of the message
async function detectedLanguage(message) {
  const endpoint = "https://api.cognitive.microsofttranslator.com/detect";
  return await axios({
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
}).then((response) => {
  const detectedLang = response.data[0].language;
  
  // Returns bool if the message is in chosen language or not
  return (detectedLang == lang ? true : false);
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
        'to': [lang]
    },
    data: [{
        'text': message
    }],
    responseType: 'json'
}).then(function(response){
  const translatedText = response.data[0].translations[0].text;
  const detectedLang = response.data[0].detectedLanguage.language;
  return client.say(target, `\/me [${detectedLang}->${lang}]: ${translatedText}`);
});
}