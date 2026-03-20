const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware para verificar token JWT
const verificarToken = async (req, res, next) => {
  try {
    let token;

    // Verificar si el token viene en el header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Si no hay token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el admin y agregarlo a req
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Usuario no encontrado'
      });
    }

    if (!admin.activo) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Cuenta inactiva'
      });
    }

    req.admin = admin;
    next();

  } catch (error) {
    console.error('Error en verificación de token:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token expirado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar rol de super-admin
const verificarSuperAdmin = (req, res, next) => {
  if (req.admin && req.admin.rol === 'super-admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado - Se requieren permisos de super-admin'
    });
  }
};

// Middleware para verificar admin de turismo (super-admin o admin-turismo)
const verificarAdminTurismo = (req, res, next) => {
  if (req.admin && (req.admin.rol === 'super-admin' || req.admin.rol === 'admin-turismo')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado - Se requieren permisos de admin-turismo'
    });
  }
};

// Middleware para verificar que el admin solo acceda a sus propios restaurantes
const verificarPropietario = async (req, res, next) => {
  try {
    const Restaurant = require('../models/Restaurant');
    const restaurantId = req.params.id;
    
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    // Super-admin puede acceder a cualquier restaurante
    if (req.admin.rol === 'super-admin') {
      return next();
    }

    // Admin normal solo puede acceder a sus propios restaurantes
    if (restaurant.adminId.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - No tienes permiso para este restaurante'
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de propietario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar token de usuario (Turista)
const verificarTokenUsuario = async (req, res, next) => {
  try {
    const User = require('../models/User');
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'No autorizado - Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt_super_seguro_2024');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'No autorizado - Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en verificación de token de usuario:', error);
    res.status(401).json({ success: false, message: 'No autorizado - Token inválido' });
  }
};

module.exports = {
  verificarToken,
  verificarSuperAdmin,
  verificarAdminTurismo,
  verificarPropietario,
  verificarTokenUsuario
};