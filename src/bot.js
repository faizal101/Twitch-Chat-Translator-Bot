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
    const commandName = msg.trim();
  
    // If the command is known, let's execute it
    if (commandName === '!hello') {
      client.say(target, 'Hello World!');
      console.log(`* Executed ${commandName} command`);
    } 
    // else {
    //   console.log(`* Unknown command ${commandName}`);
    // }

    if (commandName.includes("ping")) {
      client.say(target, "pong")
    }

    translateMessage(commandName, target);

  }
  
  // Called every time the bot connects to Twitch chat
  function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }

  // Translate Message
  function translateMessage(message, target) {
    var subscriptionKey = process.env.AZURE_SUB_KEY;
    var endpoint = "https://api.cognitive.microsofttranslator.com/translate";
    axios({
      baseURL: endpoint,
      method: 'post',
      headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
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
    const data = JSON.stringify(response.data)
    // console.log(JSON.stringify(response.data, null, 4));
    const translatedText = response.data[0].translations[0].text;
    const detectedLang = response.data[0].detectedLanguage.language;
    console.log(data)
    console.log(translatedText)
    console.log(detectedLang)
    if (detectedLang != 'en') return client.say(target, translatedText);
  });
  }