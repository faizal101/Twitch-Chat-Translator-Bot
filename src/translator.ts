import type tmi from 'tmi.js';

const endpoint = 'https://api.cognitive.microsofttranslator.com';

export async function detectLanguage(message: string): Promise<string> {
  const response = await fetch(`${endpoint}/detect?api-version=3.0`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY ?? '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ text: message }])
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Detect request failed: ${response.status} ${response.statusText} ${bodyText}`);
  }

  const data = await response.json();
  return data[0]?.language;
}

export async function translateMessage(
  client: tmi.Client,
  message: string,
  target: string,
  translateTo: string
): Promise<void> {
  const response = await fetch(`${endpoint}/translate?api-version=3.0&to=${encodeURIComponent(
    translateTo
  )}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SUB_KEY ?? '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ text: message }])
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Translate request failed: ${response.status} ${response.statusText} ${bodyText}`);
  }

  const data = await response.json();

  const translatedText = data[0]?.translations?.[0]?.text;
  const detectedLang = data[0]?.detectedLanguage?.language;

  if (message === translatedText) return;

  await client.say(target, `/me [${detectedLang}->${translateTo}]: ${translatedText}`);
}
