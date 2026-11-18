const IgnoredWord = require('../models/IgnoredWord');

// Utiliza la versión Free de la API por defecto
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

exports.translateText = async (req, res) => {
    try {
        let { text, target_lang } = req.body;

        if (!text || !target_lang) {
            return res.status(400).json({ success: false, message: 'El texto y el idioma de destino son requeridos' });
        }

        if (!Array.isArray(text)) {
            text = [text];
        }

        // 1. Obtener las palabras ignoradas de la base de datos
        const ignoredWordsDocs = await IgnoredWord.find({}, 'word');
        const ignoredWords = ignoredWordsDocs.map(doc => doc.word);

        // 2. Procesar los textos para envolver las palabras ignoradas en un tag de no-traducción
        const processedTexts = text.map(t => {
            let result = t;
            ignoredWords.forEach(word => {
                // Regex para buscar la palabra completa (word boundary) e ignorando mayúsculas/minúsculas
                // pero manteniendo el caso original al reemplazar
                const regex = new RegExp(`\\b(${word})\\b`, 'gi');
                // Usar <span translate="no"> para decirle a DeepL (y Google Translate) que no traduzca eso
                result = result.replace(regex, '<span translate="no">$1</span>');
            });
            return result;
        });

        // 3. Preparar los datos para la API de DeepL
        const data = {
            text: processedTexts,
            target_lang: target_lang.toUpperCase(), // Ej: 'EN', 'FR'
            tag_handling: 'html', // IMPORTANTE para que DeepL respete los tags HTML como el <span translate="no">
        };

        const headers = {
            'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
            'Content-Type': 'application/json'
        };

        // 4. Hacer la petición a DeepL
        const respuesta = await fetch(DEEPL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
        if (!respuesta.ok) throw new Error('DeepL respondió ' + respuesta.status);
        const response = { data: await respuesta.json() };

        // 5. Devolver las traducciones (DeepL ya devuelve el HTML intacto donde no tradujo)
        const translations = response.data.translations.map(t => t.text);

        res.status(200).json({
            success: true,
            data: translations
        });

    } catch (error) {
        console.error('Error de traducción DeepL:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Error al traducir el texto',
            error: error.response?.data?.message || error.message
        });
    }
};
