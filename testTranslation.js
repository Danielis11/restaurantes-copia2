require('dotenv').config();
const { translateText } = require('./utils/translator');

async function test() {
  console.log('Probando traducción...');
  const result = await translateText('Hola, probando la API de DeepL para Jalpan de Serra.', 'EN-US');
  console.log('Resultado:', result);
}

test();
