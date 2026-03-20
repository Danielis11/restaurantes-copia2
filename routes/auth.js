// routes/auth.js
const express = require('express');
const router = express.Router();
const {
  registrarAdmin,
  loginAdmin,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
  logout,
  googleLogin
} = require('../controllers/authController');

const { verificarToken } = require('../middleware/auth');

// ===== RUTAS PÚBLICAS =====
router.post('/register', registrarAdmin);
router.post('/login', loginAdmin);
router.post('/google', googleLogin);

// ===== RUTAS PROTEGIDAS =====
router.use(verificarToken); // Aplicar middleware a todas las rutas siguientes

router.get('/profile', obtenerPerfil);
router.put('/profile', actualizarPerfil);
router.put('/change-password', cambiarPassword);
router.post('/logout', logout);

module.exports = router;