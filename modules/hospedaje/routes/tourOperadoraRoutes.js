const express = require('express');
const tourOperadoraController = require('../controllers/tourOperadoraController');
const authMiddleware = require('../middlewares/authMiddleware');
const TourOperadora = require('../models/TourOperadora');

const router = express.Router();

// Rutas públicas
router.get('/', tourOperadoraController.getAllTourOperadoras);
router.get('/:id/tours', tourOperadoraController.getToursDeOperadora);

// Rutas protegidas
router.use(authMiddleware.protect);

// CORREGIDO: Agregado restrictTo('admin')
router.get('/mis-operadoras', authMiddleware.restrictTo('admin'), tourOperadoraController.getMisTourOperadoras);

router
  .route('/nuevo')
  .post(
    authMiddleware.restrictTo('admin'),
    tourOperadoraController.createTourOperadora
  );

router
  .route('/editar/:id')
  .patch(
    authMiddleware.restrictTo('admin'),
    tourOperadoraController.updateTourOperadora
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    tourOperadoraController.deleteTourOperadora
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

    const tourOperadora = await TourOperadora.findById(req.params.id);

    if (!tourOperadora) {
      return res.status(404).json({
        status: 'error',
        message: 'Tour operadora no encontrada'
      });
    }

    // Toggle el estado activo
    tourOperadora.activo = !tourOperadora.activo;
    
    // Agregar información de auditoría
    tourOperadora.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      accion: tourOperadora.activo ? 'activado' : 'bloqueado',
      motivo: 'Cambio de estado por super administrador'
    };

    await tourOperadora.save();

    res.status(200).json({
      status: 'success',
      message: `Tour operadora ${tourOperadora.activo ? 'activada' : 'bloqueada'} exitosamente`,
      data: {
        tourOperadora: {
          id: tourOperadora._id,
          nombre: tourOperadora.nombre,
          activo: tourOperadora.activo
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
router.get('/:id', tourOperadoraController.getTourOperadora);

module.exports = router;