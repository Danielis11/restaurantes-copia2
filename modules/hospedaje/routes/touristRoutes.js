const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const touristController = require('../controllers/touristController');

// Todas las rutas requieren autenticación
router.use(authMiddleware.protect);

// ===== RESEÑAS =====
router.get('/reviews', touristController.getMyReviews);
router.delete('/reviews/restaurante/:id', touristController.deleteMyReview);
router.delete('/reviews/hospedaje/:id', touristController.deleteMyHospedajeReview);

// ===== FAVORITOS =====
router.get('/favorites', touristController.getFavorites);
router.post('/favorites', touristController.addFavorite);
router.delete('/favorites/:hospedajeId', touristController.removeFavorite);
router.get('/favorites/check/:hospedajeId', touristController.checkFavorite);

// ===== NOTIFICACIONES (placeholder por ahora) =====
router.get('/notifications', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

module.exports = router;
