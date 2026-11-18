const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Rutas públicas
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);

// Rutas protegidas
router.get('/me', authMiddleware.protect, authController.getMe);

module.exports = router;