const express = require('express');
const router = express.Router();
const agenciaController = require('../controllers/agenciaController');
const { verificarToken, verificarAdminTurismo, verificarTokenUsuario } = require('../middleware/auth');
const { getUploadMiddleware } = require('../middleware/upload');

router.route('/')
  .get(agenciaController.getAgencias)
  .post(verificarToken, verificarAdminTurismo, getUploadMiddleware().fields([{ name: 'logo', maxCount: 1 }, { name: 'galeria', maxCount: 5 }]), agenciaController.crearAgencia);

router.route('/:id')
  .get(agenciaController.getAgencia)
  .put(verificarToken, verificarAdminTurismo, getUploadMiddleware().fields([{ name: 'logo', maxCount: 1 }, { name: 'galeria', maxCount: 5 }]), agenciaController.actualizarAgencia)
  .delete(verificarToken, verificarAdminTurismo, agenciaController.eliminarAgencia);

// Reseñas de agencia (post/delete requires user auth)
router.get('/:id/resenas', agenciaController.getResenasAgencia);
router.post('/:id/resenas', verificarTokenUsuario, getUploadMiddleware().array('fotos', 5), agenciaController.crearResenaAgencia);
router.delete('/:id/resenas/:resenaId', verificarTokenUsuario, agenciaController.eliminarResenaAgencia);

// Tours de una agencia
router.get('/:id/tours', agenciaController.getToursAgencia);

// Calendario de disponibilidad de agencia
router.get('/:id/calendario', agenciaController.getCalendarioAgencia);

// Formulario de contacto directo para la agencia
router.post('/:id/contacto', agenciaController.enviarContactoAgencia);

module.exports = router;

