// routes/admin.js
const express = require('express');
const router = express.Router();
const {
  obtenerDashboard,
  obtenerMiRestaurante,
  obtenerMisRestaurantes,
  crearRestaurante,
  actualizarRestaurante,
  actualizarInformacionBasica,
  actualizarDireccion,
  actualizarHorarios,
  actualizarMenu,
  actualizarRedesSociales,
  actualizarServicios,
  actualizarPromociones,
  subirImagenPromocion,
  obtenerResenasAdmin,
  responderResena,
  cambiarEstadoRestaurante,
  eliminarRestaurante,
  obtenerAnaliticasAdmin
} = require('../controllers/adminController');

const { verificarToken, verificarPropietario } = require('../middleware/auth');
const { getUploadMiddleware } = require('../middleware/upload');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// ===== RUTAS DEL DASHBOARD =====
router.get('/dashboard', obtenerDashboard);

// ===== RUTAS DE MI RESTAURANTE (INDIVIDUAL) =====
router.get('/my-restaurant', obtenerMiRestaurante);
router.get('/my-restaurant/analytics', obtenerAnaliticasAdmin);

// Actualizar información específica de MI restaurante
router.patch('/my-restaurant/basic-info', actualizarInformacionBasica);
router.patch('/my-restaurant/address', actualizarDireccion);
router.patch('/my-restaurant/schedule', actualizarHorarios);
router.patch('/my-restaurant/menu', actualizarMenu);
router.patch('/my-restaurant/social-media', actualizarRedesSociales);
router.patch('/my-restaurant/amenities', actualizarServicios);
router.patch('/my-restaurant/promotions', actualizarPromociones);
router.post('/my-restaurant/promotions/upload-image', getUploadMiddleware().single('imagen'), subirImagenPromocion);

// ===== RUTAS DE RESEÑAS (ADMIN) =====
router.get('/my-restaurant/reviews', obtenerResenasAdmin);
router.patch('/my-restaurant/reviews/:id/reply', responderResena);

// ===== RUTAS DE RESTAURANTES (MÚLTIPLES) =====
router.get('/restaurants', obtenerMisRestaurantes);
router.post('/restaurants', crearRestaurante);

// Rutas con verificación de propietario
router.put('/restaurants/:id', verificarPropietario, actualizarRestaurante);
router.patch('/restaurants/:id/toggle-status', verificarPropietario, cambiarEstadoRestaurante);
router.delete('/restaurants/:id', verificarPropietario, eliminarRestaurante);

module.exports = router;