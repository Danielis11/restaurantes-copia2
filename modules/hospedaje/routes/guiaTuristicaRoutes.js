const express = require('express');
const guiaTuristicaController = require('../controllers/guiaTuristicaController');
const authMiddleware = require('../middlewares/authMiddleware');
const GuiaTuristica = require('../models/GuiaTuristica');

const router = express.Router();

// Rutas públicas
router.get('/', guiaTuristicaController.getAllGuias);
router.get('/especialidad/:especialidad', guiaTuristicaController.getGuiasPorEspecialidad);
router.get('/:id/disponibilidad', guiaTuristicaController.verificarDisponibilidad);

// Rutas protegidas
router.use(authMiddleware.protect);

// CORREGIDO: Agregado restrictTo('admin')
router.get('/mis-guias', authMiddleware.restrictTo('admin'), guiaTuristicaController.getMisGuias);

router
  .route('/nuevo')
  .post(
    authMiddleware.restrictTo('admin'),
    guiaTuristicaController.createGuia
  );

router
  .route('/editar/:id')
  .patch(
    authMiddleware.restrictTo('admin'),
    guiaTuristicaController.updateGuia
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    guiaTuristicaController.deleteGuia
  );


// REEMPLAZAR LA RUTA EXISTENTE DE TOGGLE-STATUS CON ESTA CORREGIDA:
router.patch('/:id/toggle-status', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    // Verificar si es super admin
    const isSuperAdmin = req.user.email === 'superadmin@turismo.com' || 
                          req.user.email === 'direcciondeturismojalpan@gmail.com' || 
                          req.user.isSuperAdmin || 
                          req.user.role === 'super-admin';

    if (!isSuperAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para realizar esta acción. Se requieren privilegios de super administrador.'
      });
    }

    const guia = await GuiaTuristica.findById(req.params.id);

    if (!guia) {
      return res.status(404).json({
        status: 'error',
        message: 'Guía turística no encontrada'
      });
    }

    // Toggle el estado activo
    guia.activo = !guia.activo;
    
    // Agregar información de auditoría
    guia.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      accion: guia.activo ? 'activado' : 'bloqueado',
      motivo: 'Cambio de estado por super administrador'
    };

    await guia.save();

    res.status(200).json({
      status: 'success',
      message: `Guía ${guia.activo ? 'activada' : 'bloqueada'} exitosamente`,
      data: {
        guia: {
          id: guia._id,
          nombre: `${guia.nombre} ${guia.apellidos}`,
          activo: guia.activo
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});



// IMPORTANTE: Esta ruta debe ir AL FINAL
router.get('/:id', guiaTuristicaController.getGuia);

module.exports = router;