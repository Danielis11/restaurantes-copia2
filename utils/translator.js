/**
 * Traduce un texto usando la API de DeepL.
 * @param {string} text - El texto a traducir.
 * @param {string} targetLang - El código de idioma de destino (ej. 'EN-US', 'FR', 'DE').
 * @returns {Promise<string>} - El texto traducido.
 */
async function translateText(text, targetLang = 'EN-US') {
  if (!text) return text;
  
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.warn('DEEPL_API_KEY no está configurada. Se omitirá la traducción.');
    return text;
  }

  // Determinar si es la API Free o Pro en base a la llave
  const isFree = apiKey.endsWith(':fx');
  const apiUrl = isFree 
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  let retries = 3;
  let backoff = 1000;

  while (retries >= 0) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: [text],
          target_lang: targetLang,
          // Configuración para respetar el formato (útil si hay etiquetas HTML)
          tag_handling: 'html'
        }),
        // Aumentado el timeout ligeramente a 5000
        signal: AbortSignal.timeout(5000)
      });

      // Manejar el límite de ratio de DeepL
      if (response.status === 429 && retries > 0) {
        console.warn(`DeepL API 429 Rate Limit Hit. Esperando ${backoff}ms... (${retries} reintentos restantes)`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        retries--;
        backoff *= 2; // backoff exponencial
        continue;
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error de DeepL API:', response.status, errorData);
        // Fallback: retornar el texto original si falla la traducción
        return text;
      }

      const data = await response.json();
      if (data.translations && data.translations.length > 0) {
        return data.translations[0].text;
      }

      return text;
    } catch (error) {
      if (retries > 0 && (error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn(`DeepL Error de conexión/Timeout. Esperando ${backoff}ms... (${retries} reintentos restantes)`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        retries--;
        backoff *= 2;
        continue;
      }
      console.error('Error al conectar con DeepL (agotados reintentos):', error);
      return text; // Fallback
    }
  }
  return text;
}

module.exports = { translateText };
