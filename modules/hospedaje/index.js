// Módulo de hospedaje (hoteles, cabañas, airbnb, operadoras de tours, guías y cuestionarios).
// Viene de turismo-app y vive aparte: su API cuelga de /api/hospedaje y sus páginas de /hospedaje/.
const express = require('express');
const path = require('path');

const api = express.Router();
api.use('/auth', require('./routes/authRoutes'));
api.use('/hoteles', require('./routes/hotelRoutes'));
api.use('/cabanas', require('./routes/cabanaRoutes'));
api.use('/airbnb', require('./routes/airbnbRoutes'));
api.use('/tours', require('./routes/tourOperadoraRoutes'));
api.use('/guias', require('./routes/guiaTuristicaRoutes'));
api.use('/cuestionarios', require('./routes/cuestionarioRoutes'));
api.use('/super-admin', require('./routes/superAdminRoutes'));
api.use('/translate', require('./routes/translateRoutes'));
api.use('/ignored-words', require('./routes/ignoredWordRoutes'));
api.use('/user', require('./routes/touristRoutes'));

// Experiencias (tours del sitio principal) para sus páginas
api.get('/experiencias-partner', async (req, res) => {
  try {
    const PartnerTour = require('./models/PartnerTour');
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 50);
    const tours = await PartnerTour.find({ activo: true })
      .select('nombre categoria tipo imagenPrincipal imagenes slug')
      .limit(limit);
    res.json({ success: true, data: tours });
  } catch (error) {
    console.error('Error obteniendo experiencias:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener experiencias' });
  }
});

api.get('/test', (req, res) => res.json({ success: true, message: 'API de hospedaje funcionando' }));

// Rutas de la API que no existen: 404 en JSON (sin caer en las páginas)
api.use((req, res) => res.status(404).json({ success: false, message: 'Ruta de hospedaje no encontrada' }));

// Fotos subidas en disco cuando no hay Cloudinary. Algunas URL viejas guardadas en la BD
// empiezan con /uploads/hoteles, /uploads/cabanas o /uploads/airbnb.
const carpetaSubidas = path.join(__dirname, '../../public/hospedaje/uploads');
const subidas = express.static(carpetaSubidas, { maxAge: '30d' });

function montar(app) {
  app.use('/api/hospedaje', api);
  app.use('/uploads/hoteles', express.static(path.join(carpetaSubidas, 'hoteles'), { maxAge: '30d' }));
  app.use('/uploads/cabanas', express.static(path.join(carpetaSubidas, 'cabanas'), { maxAge: '30d' }));
  app.use('/uploads/airbnb', express.static(path.join(carpetaSubidas, 'airbnb'), { maxAge: '30d' }));
  app.use('/hospedaje/uploads', subidas);
  app.get(['/hospedaje/admin', '/hospedaje/admin/'], (req, res) => res.redirect('/hospedaje/admin/dashboard.html'));
  // Su portada vieja ya no se usa: la sección empieza en hospedaje.html y el inicio es el del sitio
  app.get(['/hospedaje', '/hospedaje/', '/hospedaje/index.html'], (req, res) => res.redirect(301, '/hospedaje/hospedaje.html'));
  // El turista usa el panel del sitio (favoritos y reseñas de hospedaje incluidos)
  app.get('/hospedaje/panel-turista.html', (req, res) => res.redirect(301, '/user-panel.html'));
}

module.exports = { montar, api };
