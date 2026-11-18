// ===== Arranque del servidor =====
// Aquí solo se configura la app, se aplican los middlewares y se montan las rutas.
// La lógica de cada endpoint vive en routes/ (y controllers/).
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
// Anti-XSS: limpia HTML de todo texto que se guarde. Debe registrarse ANTES de cargar los modelos.
mongoose.plugin(require('./utils/sanitizePlugin'));
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const connectDB = require('./config/database');
const { authLimiter, apiLimiter } = require('./middleware/rateLimits');
const { sanitizarEntrada, permitirPopupsGoogle, bloquearArchivosPrivados } = require('./middleware/seguridad');
const cloudinaryProxy = require('./middleware/cloudinaryProxy');
const erroresSubida = require('./middleware/erroresSubida');
const { seoMiddleware, sitemapHandler, robotsHandler } = require('./utils/seo');

const app = express();
const PORT = process.env.PORT || 3003;
const IS_PROD = process.env.NODE_ENV === 'production';

// JWT_SECRET es obligatorio: sin él cualquiera podría firmar tokens con un secreto conocido
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET no está definido o es demasiado corto (mínimo 32 caracteres). Configúralo en .env');
  process.exit(1);
}

// Detrás de un proxy/hosting (Render, Railway, Nginx...) para que rate-limit vea la IP real
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ===== MIDDLEWARES =====

// Seguridad: cabeceras HTTP protectoras
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Desactivado porque usamos scripts inline en HTML
}));

// Rendimiento: compresión gzip
app.use(compression());

// Logs de peticiones HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(IS_PROD ? 'combined' : 'dev'));
}

// Límites de peticiones: login/registro (20 intentos en 15 min) y API en general
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/hospedaje/auth/login', authLimiter);
app.use('/api/hospedaje/auth/signup', authLimiter);
app.use('/api/hospedaje/auth/google-login', authLimiter);
app.use('/api/auth/user/login', authLimiter);
app.use('/api/auth/user/register', authLimiter);
app.use('/api', apiLimiter);

// CORS: en producción define CORS_ORIGINS (separados por coma). Sin definir = mismo comportamiento abierto que antes.
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));

// Las imágenes se suben con multer (multipart), así que el JSON no necesita ser enorme
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(sanitizarEntrada);       // anti inyección NoSQL (claves con "$")
app.use(permitirPopupsGoogle);   // login con Google en ventana emergente
app.use('/api', cloudinaryProxy); // URLs de Cloudinary → /api/img-proxy

// ===== SEO: sitemap y robots dinámicos + metadatos en el HTML de cada ficha =====
app.get('/sitemap.xml', sitemapHandler);
app.get('/robots.txt', robotsHandler);
// Los navegadores piden /favicon.ico en la raíz aunque el HTML apunte a /icons/
app.get('/favicon.ico', (req, res) => {
  res.set('Cache-Control', 'public, max-age=2592000');
  res.sendFile(path.join(__dirname, 'public', 'icons', 'favicon.ico'));
});
app.use(seoMiddleware);

app.use(bloquearArchivosPrivados);

// Archivos estáticos con caché del navegador (cargas mucho más rápidas en visitas repetidas)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html' || filePath.endsWith('sw.js')) {
      // HTML y service worker: siempre revalidar para que los cambios se vean al instante
      res.setHeader('Cache-Control', 'no-cache');
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.mp4', '.webm'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 días
    } else if (ext === '.css' || ext === '.js') {
      res.setHeader('Cache-Control', 'no-cache'); // revalida con ETag (304 si no cambió) para que los cambios se vean al instante
    }
  }
}));

// ===== RUTAS =====
// El orden importa: si dos rutas coinciden, responde la que se montó primero.
app.use('/api/guias', require('./routes/guiaRoutes'));
app.use('/api/tours', require('./routes/tourRoutes'));
app.use('/api/noticias', require('./routes/noticias'));
app.use('/api/agencias', require('./routes/agenciaRoutes'));
app.use('/api/hospedajes', require('./routes/hospedajeRoutes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/itinerarios', require('./routes/itinerarioRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/ranking-admin', require('./routes/rankingAdminRoutes'));
app.use('/api/ofertas-flash', require('./routes/ofertaFlashRoutes'));
app.use('/api/crm-quejas', require('./routes/crmQuejasRoutes'));
app.use('/api/bolsa-trabajo', require('./routes/bolsaTrabajoRoutes'));
app.use('/api/recomendaciones', require('./routes/recommendationsRoutes'));
app.use('/api/gobierno', require('./routes/gobiernoRoutes'));

// Módulo de hospedaje (antes turismo-app): API en /api/hospedaje, páginas en /hospedaje/
require('./modules/hospedaje').montar(app);

// Rutas que antes vivían dentro de server.js (usan la ruta completa, p. ej. '/api/user/favorites')
app.use(require('./routes/utilidadesRoutes'));     // /api/config/mapbox, /api/img-proxy
app.use(require('./routes/paginasRoutes'));        // /admin, /super-admin, /test...
app.use(require('./routes/authRoutes'));           // /api/auth/* (administradores)
app.use(require('./routes/usuarioRoutes'));        // /api/auth/user/*, /api/user/* (turistas)
app.use(require('./routes/resenasRoutes'));        // reseñas, galería y moderación
app.use(require('./routes/miRestauranteRoutes'));  // panel del restaurante, imágenes y eventos
app.use(require('./routes/superAdminExtraRoutes')); // estadísticas, precios, alta de restaurantes/admins

// ===== MANEJO DE ERRORES =====
app.use(erroresSubida);

app.use('*', (req, res) => {
  // Si es una petición de navegador, mostrar página 404 bonita
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  // Para peticiones API, responder con JSON
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// ===== BASE DE DATOS =====
connectDB();

// ===== INICIALIZAR WEBSOCKET Y SERVIDOR =====
let wsServer = null;

try {
  // Intentar importar el WebSocket Server
  const { WebSocketServer } = require('./websocket/websocketServer');
  const server = http.createServer(app);
  wsServer = new WebSocketServer(server);
  global.wsServer = wsServer;

  server.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO CON WEBSOCKET =====');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectada' : 'Desconectada'}`);
    console.log('============================================\n');
  });
} catch (error) {
  console.log('⚠️  WebSocket no disponible, iniciando servidor básico...');
  app.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO =====');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectada' : 'Desconectada'}`);
    console.log('===============================\n');
  });
}

// ===== CIERRE ORDENADO =====
// Mongoose 7 ya no acepta callback en close(): se usa la promesa
const cerrar = () => {
  console.log('\n🔄 Cerrando servidor...');
  mongoose.connection.close(false)
    .then(() => console.log('✅ Conexión MongoDB cerrada'))
    .catch(() => {})
    .finally(() => process.exit(0));
};
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

module.exports = app;
