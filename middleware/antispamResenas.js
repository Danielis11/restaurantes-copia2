// Filtro anti-spam para todas las reseñas del sitio (restaurantes, tours, guías y hospedajes).
// Va DESPUÉS de la autenticación (necesita req.user) y de multer (necesita req.body).
//
// Qué frena:
//  - Campo trampa oculto (`sitioWeb`): solo los bots lo llenan.
//  - Calificación que no sea un entero de 1 a 5.
//  - Comentarios muy cortos (< 10 letras) o muy largos (> 1000).
//  - Enlaces, correos y teléfonos (la forma típica de anunciarse en reseñas ajenas).
//  - Texto basura: la misma letra muchas veces seguidas o todo en MAYÚSCULAS.
//  - Ráfagas: más de 3 reseñas por hora o 10 por día de la misma cuenta.
//  - Copiar y pegar: el mismo texto publicado en otro lugar en las últimas 24 horas.
//
// El historial vive en memoria (se reinicia con el servidor); basta para cortar ráfagas.

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const MAX_POR_HORA = 3;
const MAX_POR_DIA = 10;
const MIN_LETRAS = 10;
const MAX_LETRAS = 1000;

// userId -> [{ t: fecha, texto: comentario normalizado }]
const historial = new Map();

function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function limpiarViejos(lista, ahora) {
  return lista.filter((r) => ahora - r.t < DIA);
}

// Devuelve un mensaje de error para el usuario o null si el texto está bien
function revisarTexto(comentario) {
  const texto = String(comentario || '').trim();
  if (texto.length < MIN_LETRAS) return `Cuéntanos un poco más de tu experiencia (mínimo ${MIN_LETRAS} caracteres).`;
  if (texto.length > MAX_LETRAS) return `La reseña no puede pasar de ${MAX_LETRAS} caracteres.`;
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|mx|info|biz|xyz|ru)\b)/i.test(texto)) {
    return 'Por seguridad, las reseñas no pueden incluir enlaces ni páginas web.';
  }
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(texto)) return 'Por seguridad, no incluyas correos en tu reseña.';
  if (/(\d[\s.-]?){8,}/.test(texto)) return 'Por seguridad, no incluyas números de teléfono en tu reseña.';
  if (/(.)\1{6,}/.test(texto)) return 'Tu reseña parece contener texto repetido. Escríbela con tus propias palabras.';
  const letras = texto.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
  if (letras.length >= 20 && letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / letras.length > 0.7) {
    return 'Por favor no escribas toda la reseña en mayúsculas.';
  }
  return null;
}

function antispamResenas(req, res, next) {
  const body = req.body || {};

  // Campo trampa: invisible para personas, los bots lo rellenan
  if (body.sitioWeb) {
    return res.status(400).json({ success: false, status: 'error', message: 'No se pudo enviar la reseña.' });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, status: 'error', message: 'Elige una calificación de 1 a 5 estrellas.' });
  }

  const problema = revisarTexto(body.comentario);
  if (problema) return res.status(400).json({ success: false, status: 'error', message: problema });

  const userId = String((req.user && (req.user._id || req.user.id)) || '');
  if (!userId) return res.status(401).json({ success: false, status: 'error', message: 'Inicia sesión para opinar.' });

  const ahora = Date.now();
  const lista = limpiarViejos(historial.get(userId) || [], ahora);
  historial.set(userId, lista);

  if (lista.filter((r) => ahora - r.t < HORA).length >= MAX_POR_HORA || lista.length >= MAX_POR_DIA) {
    return res.status(429).json({ success: false, status: 'error', message: 'Has publicado varias reseñas seguidas. Intenta de nuevo más tarde.' });
  }

  const texto = normalizar(body.comentario);
  if (texto.length >= 20 && lista.some((r) => r.texto === texto)) {
    return res.status(400).json({ success: false, status: 'error', message: 'Ya publicaste esta misma reseña en otro lugar. Cada opinión debe ser sobre este lugar.' });
  }

  // Normaliza lo que recibe la ruta
  req.body.rating = rating;
  req.body.comentario = String(body.comentario).trim();

  // Solo cuenta si la reseña realmente se guardó
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const actual = limpiarViejos(historial.get(userId) || [], Date.now());
      actual.push({ t: Date.now(), texto });
      historial.set(userId, actual);
    }
  });

  next();
}

// Limpieza periódica para que el mapa no crezca sin fin
setInterval(() => {
  const ahora = Date.now();
  for (const [id, lista] of historial) {
    const vigentes = limpiarViejos(lista, ahora);
    if (vigentes.length) historial.set(id, vigentes); else historial.delete(id);
  }
}, HORA).unref();

module.exports = { antispamResenas, revisarTexto };
