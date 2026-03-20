// utils/languageUtils.js

/**
 * Recorre un objeto o array y extrae el valor del idioma seleccionado 
 * en caso de encontrar un campo bilingüe ({ es: '...', en: '...' }).
 * @param {any} data - El objeto o array a procesar (ej. restaurante, tour).
 * @param {string} lang - El idioma solicitado (ej. 'es', 'en').
 * @returns {any} - El objeto modificado con strings simples en lugar de objetos bilingües.
 */
function extractLanguage(data, lang = 'es') {
  if (!data) return data;

  // Si es un array, mapeamos la función a cada elemento
  if (Array.isArray(data)) {
    return data.map(item => extractLanguage(item, lang));
  }

  // Si es un objeto de mongoose, lo convertimos a objeto plano
  if (data.$__ || typeof data.toJSON === 'function') {
    data = data.toJSON ? data.toJSON() : data.toObject();
  }

  // Si es un objeto literal
  if (typeof data === 'object' && data !== null) {
    // Si detectamos la estructura bilingüe { es: '...', en: '...' }
    if ('es' in data && 'en' in data && Object.keys(data).length <= 3) { // Asumiendo a veces viene _id
      // Retornar el idioma solicitado, o fallback a 'es'
      return data[lang] || data['es'] || '';
    }

    // Si es un objeto normal, buscamos recursivamente en sus propiedades
    const result = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = extractLanguage(data[key], lang);
      }
    }
    return result;
  }

  // Si es primitivo (string, number, boolean), se devuelve tal cual
  return data;
}

/**
 * Middleware de Express para inyectar automáticamente la respuesta en el idioma solicitado
 * Intercepta res.json() y aplica la traducción antes de enviarla al cliente.
 */
const languageMiddleware = (req, res, next) => {
  if (req.query.allLangs === 'true') {
    return next();
  }

  // Obtener idioma principal del header o query param
  const requestedLang = req.query.lang || req.headers['accept-language']?.split(',')[0].split('-')[0] || 'es';
  // Asegurarnos que solo sea 'es' o 'en'
  const lang = requestedLang.toLowerCase().includes('en') ? 'en' : 'es';

  // Guardar referencia al res.json original
  const originalJson = res.json;

  // Sobrescribir res.json
  res.json = function (body) {
    if (body && body.data) {
      // Extraemos el lenguaje solo a los datos
      body.data = extractLanguage(body.data, lang);
    }
    // Llamar a la función original con el cuerpo modificado
    return originalJson.call(this, body);
  };

  next();
};

module.exports = {
  extractLanguage,
  languageMiddleware
};
