const express = require('express');
const router = express.Router();
const gobiernoController = require('../controllers/gobiernoController');
const { verificarToken, verificarGobernamental } = require('../middleware/auth');

// Middleware checks (ensure ONLY super admins or government get here)
router.use(verificarToken, verificarGobernamental);

// Rutas de Dashboard de Solo Lectura
router.get('/dashboard', gobiernoController.getDashboardStats);

// Rutas de Restaurantes de Solo Lectura
router.get('/restaurants', gobiernoController.getRestaurantsReadOnly);

module.exports = router;
