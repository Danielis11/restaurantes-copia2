const User = require('../models/User');
const Tourist = require('../models/Tourist');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Client ID de Google proporcionado por el usuario
const client = new OAuth2Client('321224739454-fv0reej797gt3jur9ubq4mja590voovc.apps.googleusercontent.com');

// Función para crear JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Función para enviar respuesta con token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remover contraseña de la respuesta
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Registro de usuario
exports.signup = async (req, res) => {
  try {
    const { nombre, email, password, role, tipoNegocio } = req.body;
    
    // Por defecto si no envían rol, es un turista (usuario normal)
    const isNormalUser = (!role || role === 'user');
    
    if (isNormalUser) {
      // Registrar en la base de datos compartida del compañero (Partner DB)
      const existingTourist = await Tourist.findOne({ email });
      if (existingTourist) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un usuario con este email en el sistema'
        });
      }
      
      const newTourist = await Tourist.create({ nombre, email, password });
      return createSendToken(newTourist, 201, res);
    } else {
      // Registrar en la base de datos local (Admins, Hoteles, etc.)
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un usuario administrador/local con este email'
        });
      }
      
      const newUser = await User.create({ nombre, email, password, role, tipoNegocio });
      return createSendToken(newUser, 201, res);
    }
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Login de usuario
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1) Verificar que email y password existan
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Por favor proporciona email y contraseña'
      });
    }
    
    // 2) Intentar iniciar sesión en la Base de Datos Local
    const user = await User.findOne({ email }).select('+password');
    if (user) {
      if (!(await user.correctPassword(password, user.password))) {
        return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
      }
      return createSendToken(user, 200, res);
    }
    
    // 3) Intentar iniciar sesión en la Base de Datos del Compañero (Turistas)
    const tourist = await Tourist.findOne({ email }).select('+password');
    if (tourist) {
      if (!(await tourist.correctPassword(password, tourist.password))) {
        return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
      }
      return createSendToken(tourist, 200, res);
    }
    
    // 4) Si no existe en ninguna base de datos
    return res.status(401).json({
      status: 'error',
      message: 'Email o contraseña incorrectos'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener usuario actual
exports.getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      user = await Tourist.findById(req.user.id);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Login con Google (Solo para Turistas)
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ status: 'error', message: 'Token de Google no proporcionado' });
    }

    // Verificar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '321224739454-fv0reej797gt3jur9ubq4mja590voovc.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Buscar si el turista ya existe
    let tourist = await Tourist.findOne({ email });

    // Si no existe, lo creamos
    if (!tourist) {
      // Generar una contraseña aleatoria segura ya que usan Google para entrar
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      tourist = await Tourist.create({
        nombre: name,
        email: email,
        password: randomPassword
      });
    }

    // Enviar el token JWT de nuestra app
    return createSendToken(tourist, 200, res);

  } catch (error) {
    console.error('Error en googleLogin:', error);
    res.status(400).json({
      status: 'error',
      message: 'Fallo al autenticar con Google. Por favor, intenta de nuevo.'
    });
  }
};
