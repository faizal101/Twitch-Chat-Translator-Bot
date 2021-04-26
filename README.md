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
**AZURE_SUB_KEY** Read the [prequisites in the Quickstart documentation](https://docs.microsoft.com/en-gb/azure/cognitive-services/translator/quickstart-translator) on how to create a Translator resource in Azure and generate a key. Make sure you set the Region to "Global".\
**PRIMARY_LANG** is the target language you want the bot to translate to. Uses the ISO 639-1 standard. Examples: `en` for English, `ja` for Japanese, `ko` for Korean, `zh-Hans` for Simplified Chinese. Check the [Language Support](https://docs.microsoft.com/en-us/azure/cognitive-services/translator/language-support) doc to see what languages Azure supports and what the code is.\
**SECONDARY_ LANG** optional entry. Add this if you want the bot to translate to another language that isn't the primary language. Useful for (semi)-bilingual chat. For example: Assume there's a Japanese VTuber where they have both Japanese and Western fans. The VTuber only understands Japanese. If only `PRIMARY_LANG` is set, non-Japanese messages (for example English) will be translated to Japanese. So the VTuber and Japanese fans can understand it. However, if someone types in Japanese, only the VTuber and other Japanese fans can understand it, leaving the western fans a left out a bit. In this case, `SECONDARY_LANG` can be set to `en` for English. What now happens is that the messages Japanese will be translated to English, so now even the western fans can understand what the other fans are saying.

Obviously, machine translation isn't perfect and probably won't be for a very long time due to how languages work. However, that doesn't mean it's useless. It could be very useful in some streams, depending on what the chat is like.

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
PRIMARY_LANG=en
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
- [x] Allow the bot to translate to multiple languages (useful for (semi)-bilingual chat)
- [ ] Implement a web GUI for configurating the bot

## Contributing

Feel free to create a PR to this repo. You could work on one of the tasks in the TODO list, fix a bug or even implement a feature I haven't considered.
