const express = require('express');
const router = express.Router();
const cuestionarioController = require('../controllers/CuestionarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware.protect);

// ==================== RUTAS UNIFICADAS ====================

// Crear cuestionario (acepta tanto hoteles como airbnb)
router.post('/', cuestionarioController.crearCuestionario);

// Obtener mis cuestionarios (todos los tipos)
router.get('/mis-cuestionarios', cuestionarioController.getMisCuestionarios);

// Obtener estadísticas generales
router.get('/estadisticas', cuestionarioController.getEstadisticas);

// Actualizar cuestionario (cualquier tipo)
router.put('/:id', cuestionarioController.actualizarCuestionario);

// Eliminar cuestionario (cualquier tipo)
router.delete('/:id', cuestionarioController.eliminarCuestionario);

// ==================== RUTAS ESPECÍFICAS DE HOTELES (mantener compatibilidad) ====================

// Obtener cuestionarios de un hotel específico
router.get('/hotel/:hotelId', cuestionarioController.getCuestionariosHotel);

// ==================== RUTAS ESPECÍFICAS DE AIRBNB ====================

// Obtener cuestionarios de un alojamiento específico
router.get('/alojamiento/:establecimientoId', (req, res) => {
  req.query.tipo = 'airbnb';
  cuestionarioController.getCuestionariosEstablecimiento(req, res);
});

// Alias para airbnb (para mantener consistencia)
router.get('/airbnb/:establecimientoId', (req, res) => {
  req.query.tipo = 'airbnb';
  cuestionarioController.getCuestionariosEstablecimiento(req, res);
});

// ==================== RUTAS DE ESTADÍSTICAS AVANZADAS ====================

// Reportes y estadísticas para super admin
router.get('/reportes-todos-establecimientos', authMiddleware.requireSuperAdmin, cuestionarioController.getReportesSemanalesTodosLosEstablecimientos);
router.get('/reportes-super-admin', authMiddleware.requireSuperAdmin, cuestionarioController.getReportesSemanalesTodosLosEstablecimientos);
router.get('/estadisticas-avanzadas', authMiddleware.requireSuperAdmin, cuestionarioController.getEstadisticasAvanzadas);
router.get('/analisis-fechas-concurridas', authMiddleware.requireSuperAdmin, cuestionarioController.getAnalisisFechasConcurridas);
router.get('/analisis-procedencia', authMiddleware.requireSuperAdmin, cuestionarioController.getAnalisisProcedencia);
router.get('/comparacion-periodos', authMiddleware.requireSuperAdmin, cuestionarioController.getComparacionPeriodos);
router.get('/exportar-estadisticas', authMiddleware.requireSuperAdmin, cuestionarioController.exportarEstadisticas);
router.get('/estadisticas-por-tipo/:tipo', authMiddleware.requireSuperAdmin, cuestionarioController.getEstadisticasPorTipo);
router.get('/tendencias-mensuales', authMiddleware.requireSuperAdmin, cuestionarioController.getTendenciasMensuales);
router.get('/top-establecimientos', authMiddleware.requireSuperAdmin, cuestionarioController.getTopEstablecimientos);

// ✅ EXPORTAR AL FINAL - DESPUÉS DE TODAS LAS RUTAS
module.exports = router;