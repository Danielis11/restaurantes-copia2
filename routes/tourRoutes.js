const express = require('express');
const router = express.Router();
const {
  getTours,
  getTour,
  crearTour,
  actualizarTour,
  eliminarTour
} = require('../controllers/tourController');
const { verificarToken, verificarAdminTurismo } = require('../middleware/auth');
const { getUploadMiddleware } = require('../middleware/upload');
const { languageMiddleware } = require('../utils/languageUtils');

// Rutas públicas
router.get('/', languageMiddleware, getTours);
router.get('/:id', languageMiddleware, getTour);

// Rutas protegidas (Super Admin o Admin Turismo)
router.post('/', verificarToken, verificarAdminTurismo, getUploadMiddleware().any(), crearTour);
router.put('/:id', verificarToken, verificarAdminTurismo, getUploadMiddleware().any(), actualizarTour);
router.delete('/:id', verificarToken, verificarAdminTurismo, eliminarTour);

module.exports = router;
