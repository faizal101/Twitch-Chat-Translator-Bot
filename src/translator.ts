import axios from 'axios';
import type tmi from 'tmi.js';

const endpoint = 'https://api.cognitive.microsofttranslator.com';

export async function detectLanguage(message: string): Promise<string> {
  const response = await axios({
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
    data: [{ text: message }],
    responseType: 'json'
  });

  return response.data[0].language;
}

export async function translateMessage(
  client: tmi.Client,
  message: string,
  target: string,
  translateTo: string
): Promise<void> {
  const response = await axios({
    baseURL: endpoint,
    url: '/translate',
    method: 'post',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY,
      'Content-type': 'application/json'
    },
    params: {
      'api-version': '3.0',
      to: translateTo
    },
    data: [{ text: message }],
    responseType: 'json'
  });

  const translatedText = response.data[0].translations[0].text;
  const detectedLang = response.data[0].detectedLanguage.language;

  if (message === translatedText) return;

  await client.say(target, `/me [${detectedLang}->${translateTo}]: ${translatedText}`);
}
