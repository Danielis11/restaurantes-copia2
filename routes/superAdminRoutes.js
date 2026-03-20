const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { verificarToken, verificarSuperAdmin } = require('../middleware/auth'); // Asegurar rutas importadas desde el lugar correcto

// Middleware checks (ensure ONLY super admins get here)
router.use(verificarToken, verificarSuperAdmin);

// Rutas de Dashboard
router.get('/dashboard', superAdminController.getDashboardStats);

// Rutas de Administradores
router.get('/admins', superAdminController.getAdmins);
router.post('/admins', superAdminController.createAdmin);
router.put('/admins/:id', superAdminController.updateAdmin);
router.patch('/admins/:id/toggle-status', superAdminController.toggleAdminStatus);
router.delete('/admins/:id', superAdminController.deleteAdmin);

// Rutas de Restaurantes gestionados por el Super Admin
router.get('/restaurants', superAdminController.getRestaurants);
router.get('/restaurants/:id', superAdminController.getRestaurantById);
router.post('/restaurants-with-admin', superAdminController.createRestaurantWithAdmin);
router.patch('/restaurants/:id/toggle-status', superAdminController.toggleRestaurantStatus);
router.delete('/restaurants/:id', superAdminController.deleteRestaurant);

// Rutas de Reseñas
router.get('/reviews', superAdminController.getReviews);
router.delete('/reviews/:id', superAdminController.deleteReview);
router.patch('/reviews/:id/status', superAdminController.changeReviewStatus);

module.exports = router;
