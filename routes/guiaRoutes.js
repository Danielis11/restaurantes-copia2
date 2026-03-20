const express = require('express');
const router = express.Router();
const {
  getGuias,
  getGuia,
  crearGuia,
  actualizarGuia,
  eliminarGuia,
  getEstadisticas
} = require('../controllers/guiaController');
const { verificarToken, verificarAdminTurismo } = require('../middleware/auth');
const { getUploadMiddleware } = require('../middleware/upload');
const { languageMiddleware } = require('../utils/languageUtils');

// Rutas públicas
router.get('/', languageMiddleware, getGuias);
router.get('/:id', languageMiddleware, getGuia);

// Rutas protegidas (Super Admin o Admin Turismo)
const uploadFields = getUploadMiddleware().fields([
  { name: 'fotoPerfil', maxCount: 1 },
  { name: 'galeria', maxCount: 5 }
]);

router.post('/', verificarToken, verificarAdminTurismo, uploadFields, crearGuia);
router.put('/:id', verificarToken, verificarAdminTurismo, uploadFields, actualizarGuia);
router.delete('/:id', verificarToken, verificarAdminTurismo, eliminarGuia);
router.get('/:id/estadisticas', verificarToken, getEstadisticas);

module.exports = router;