# Twitch Chat Translator Bot

## Powered by Microsoft Azure Cognitive Services

A Twitch chat bot that automatically translates users messages to the chosen language.

## Installing

- First clone the repo and then `cd` to the folder.
- Install all the dependicies and packages `npm i install`.
- Create an .env by using ~~the only~~ your favourite text editor `nano .env`
- The .env will have four entries, `BOT_USERNAME`, `TWITCH_OAUTH`, `CHANNEL_NAME`, and `AZURE_SUB_KEY`.

> **BOT_USERNAME** is the username of the Twitch account.\
**TWITCH_OAUTH** is the token needed to connect to Twitch chat. You can generate one [here](https://twitchapps.com/tmi/).\
**CHANNEL_NAME** is where you want the bot to run. This should be your Twitch channel (username).\
**AZURE_SUB_KEY** Read the [prequisites in the Quickstart documentation](https://docs.microsoft.com/en-gb/azure/cognitive-services/translator/quickstart-translator) on how to create a Translator resource in Azure and generate a key. Make sure you set the Region to "Global".
**PRIMARY_LANG** is the target language you want the bot to translate to. Uses the ISO 639-1 standard. Examples: `en` for English, `ja` for Japanese, `ko` for Korean, `zh-Hans` for Simplified Chinese. Check the [Language Support](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/language-support) doc to see what languages Azure supports and what the code is.

<details>
  <summary>About the free tier</summary>
  The F1 (Free) tier allows up-to 2M million characters translated per month. From the [FAQ](https://www.microsoft.com/en-us/translator/business/faq/): "A 30-page document has around 17,000 characters; the seven Harry Potter books comprise about 60 million characters." I'm not too good at estimating but I don't think that Twitch chat will exceed the 2 million characters per month.

  Though, if you're using this bot and chat is super-active, then 2 million characters *might* not be enough. In this case, open an issue or contact me on Discord and I'll give this "issue" a higher priority on the TODO list. Nevertheless, Azure won't overcharge you if you're on the F1 tier.
</details>

So the .env should look something like this:

```.env
BOT_USERNAME=faizal01
CHANNEL_NAME=faizal101
TWITCH_OAUTH=oauth:yourouathkeydontshare
AZURE_SUB_KEY=yoursubkeydontshare
```

Once you saved the .env, the bot should be good to go. Simply run it by `npm start`.

## TODO List

Note: The TODO list isn't in order.

- [x] Allow the user to choose what language to translate to
- [ ] Implement a user ignore list
- [ ] Implement a language ignore list
- [x] Split the function, one for detect and one to actually translate the message
- [ ] Think of a name of the bot
- [ ] Break message into multiple messages if it's too large
- [ ] Allow the bot to translate to multiple languages (useful for (semi)-bilugual chat)
- [ ] Implement a web GUI for configurating the bot

## Contributing

Feel free to create a PR to this repo. You could work on one of the tasks in the TODO list, fix a bug or even implement a feature I haven't considered.
