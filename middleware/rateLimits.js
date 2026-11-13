// Límites de peticiones (una sola instancia compartida por server.js y las rutas)
const rateLimit = require('express-rate-limit');

// Rate limiting para rutas de autenticación (máx 20 intentos en 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }
});

// Límite general de la API (protege contra abuso / scraping masivo)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/img-proxy'),
  message: { success: false, message: 'Demasiadas peticiones. Intenta en un momento.' }
});

module.exports = { authLimiter, apiLimiter };
