const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ===== MODELOS =====
const Admin = require('./models/Admin');
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const Review = require('./models/Review');
const Guia = require('./models/Guia');
const Tour = require('./models/Tour');
const Agencia = require('./models/Agencia');
const { translateText } = require('./utils/translator');
const { ReviewTurismo, HotelTurismo, AirbnbTurismo, CabanaTurismo } = require('./models/turismoModels');

const app = express();
const PORT = process.env.PORT || 3003;

// ===== MIDDLEWARES =====

// Seguridad: cabeceras HTTP protectoras
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Desactivado porque usamos scripts inline en HTML
}));

// Rendimiento: compresión gzip
app.use(compression());

// Logs de peticiones HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting para rutas de autenticación (máx 20 intentos en 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configurar cabeceras COOP y COEP para permitir popups de Google (Cross-Origin-Opener-Policy)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
// ===== RUTAS EXTERNAS =====
app.use('/api/guias', require('./routes/guiaRoutes'));
app.use('/api/tours', require('./routes/tourRoutes'));
app.use('/api/noticias', require('./routes/noticias'));
app.use('/api/agencias', require('./routes/agenciaRoutes'));
app.use('/api/hospedajes', require('./routes/hospedajeRoutes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/itinerarios', require('./routes/itinerarioRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/ofertas-flash', require('./routes/ofertaFlashRoutes'));

// ===== CONECTAR A MONGODB =====
const connectDB = async () => {
  try {
    console.log('🔄 Intentando conectar a MongoDB Atlas...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está definida en el archivo .env');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Atlas conectado exitosamente`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.log('💡 Verifica tu archivo .env y la configuración de MongoDB Atlas');
    console.log('⚠️  Continuando sin base de datos para desarrollo...');
  }
};

// Conectar a MongoDB
connectDB();

// El esquema y modelo de Admin se han movido a ./models/Admin.js

// ===== RUTAS PRINCIPALES =====

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Panel de admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Panel de admin Turismo
app.get('/admin-turismo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-turismo.html'));
});

// ===== RUTAS DE AUTENTICACIÓN (EMBEBIDAS) =====

// Generar JWT
const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'mi_secreto_jwt_super_seguro_2024', {
    expiresIn: '7d'
  });
};

// Middleware de autenticación
const verificarToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      if (token) {
        // Eliminar comillas dobles si el token fue stringificado por accidente en localStorage
        token = token.replace(/^"|"$/g, '');
        // Evitar que el string "null" o "undefined" pase como token válido
        if (token === 'null' || token === 'undefined') token = '';
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt_super_seguro_2024');
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
        message: 'No autorizado - Cuenta inactiva',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    req.admin = admin;
    next();

  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(401).json({
      success: false,
      message: 'No autorizado - Token inválido'
    });
  }
};


// Middleware para verificar super-admin
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

const { OAuth2Client } = require('google-auth-library');
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// POST /api/auth/google
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ success: false, message: 'Falta el token de Google' });
    }
    if (!googleClient) {
        return res.status(500).json({ success: false, message: 'Google Client ID no configurado en el servidor' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;
    
    let user = await Admin.findOne({ email });
    
    if (!user) {
      user = await User.findOne({ email });
    }
    
    if (!user) {
      // Registrar como turista en la coleccion User
      user = await User.create({
        nombre: given_name,
        apellido: family_name || '',
        email: email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-10) + 'A1!', 10)
      });
      user.rol = 'turista'; // Se asigna virtualmente para el token
    } else if (user.constructor.modelName === 'Admin' && user.activo === false) {
        // Solo bloquear si es un Admin explicitamente desactivado
        return res.status(401).json({ success: false, message: 'Cuenta inactiva' });
    }
    
    const token = generarToken(user._id);
    
    return res.json({
      success: true,
      message: 'Inicio de sesión con Google exitoso',
      data: {
        admin: {
          id: user._id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          telefono: user.telefono,
          rol: user.rol || 'turista'
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en login con Google:', error);
    res.status(401).json({ success: false, message: 'Token inválido', error: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Intento de login:', req.body);
    
    const { email, password } = req.body;

    // Verificar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    // 1. Buscar admin por email (incluir password)
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (admin) {
      // Verificar contraseña
      const passwordValida = await admin.compararPassword(password);
      if (!passwordValida) {
        console.log('❌ Contraseña inválida (Admin) para:', email);
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      // Verificar que esté activo
      if (!admin.activo) {
        return res.status(401).json({ success: false, message: 'Cuenta inactiva', code: 'ACCOUNT_INACTIVE' });
      }

      // Actualizar último acceso
      admin.actualizarUltimoAcceso();
      const token = generarToken(admin._id);
      console.log('✅ Login exitoso (Admin/SuperAdmin) para:', email);

      return res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          admin: {
            id: admin._id,
            nombre: admin.nombre,
            apellido: admin.apellido,
            email: admin.email,
            telefono: admin.telefono,
            rol: admin.rol,
            ultimoAcceso: admin.ultimoAcceso
          },
          token
        }
      });
    }

    // 2. Si no es Admin, buscar en Turistas
    const tourist = await User.findOne({ email }).select('+password');

    if (tourist) {
      const passwordValida = await tourist.compararPassword(password);
      if (!passwordValida) {
        console.log('❌ Contraseña inválida (Turista) para:', email);
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      const token = generarToken(tourist._id);
      console.log('✅ Login exitoso (Turista) para:', email);

      return res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          // Mantener la clave "admin" para compatibilidad con código frontend de login.html antiguo
          admin: {
            id: tourist._id,
            nombre: tourist.nombre,
            email: tourist.email,
            rol: 'turista'
          },
          token
        }
      });
    }

    // 3. Ni en admin ni en turista
    console.log('❌ Usuario no encontrado en ninguna colección:', email);
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    // Verificar campos requeridos
    if (!nombre || !apellido || !email || !password || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    // Verificar si el email ya existe
    const adminExistente = await Admin.findOne({ email });
    if (adminExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un administrador con este email'
      });
    }

    // Crear nuevo admin
    const admin = await Admin.create({
      nombre,
      apellido,
      email,
      password,
      telefono
    });

    // Generar token
    const token = generarToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Administrador registrado exitosamente',
      data: {
        admin: {
          id: admin._id,
          nombre: admin.nombre,
          apellido: admin.apellido,
          email: admin.email,
          telefono: admin.telefono,
          rol: admin.rol
        },
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/profile
app.get('/api/auth/profile', verificarToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        admin: req.admin
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/verify-token
app.get('/api/auth/verify-token', verificarToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        admin: {
          id: req.admin._id,
          nombre: req.admin.nombre,
          apellido: req.admin.apellido,
          email: req.admin.email,
          telefono: req.admin.telefono,
          rol: req.admin.rol
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

// POST /api/auth/logout
// PUT /api/auth/profile - Actualizar perfil
app.put('/api/auth/profile', verificarToken, async (req, res) => {
  try {
    const { nombre, apellido, telefono, configuracion } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellido || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido y teléfono son obligatorios'
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      {
        ...(nombre && { nombre }),
        ...(apellido && { apellido }),
        ...(telefono && { telefono }),
        ...(configuracion && { configuracion })
      },
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        admin: {
          id: admin._id,
          nombre: admin.nombre,
          apellido: admin.apellido,
          email: admin.email,
          telefono: admin.telefono,
          rol: admin.rol,
          fechaCreacion: admin.fechaCreacion,
          ultimoAcceso: admin.ultimoAcceso
        }
      }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/auth/change-password - Cambiar contraseña
app.put('/api/auth/change-password', verificarToken, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son obligatorias'
      });
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener admin con contraseña
    const admin = await Admin.findById(req.admin._id).select('+password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const passwordValida = await admin.compararPassword(passwordActual);
    if (!passwordValida) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Actualizar contraseña
    admin.password = passwordNueva;
    await admin.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== RECUPERACIÓN DE CONTRASEÑA =====
const nodemailer = require('nodemailer');

// Configurar transporter de email
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /api/auth/forgot-password - Solicitar código de recuperación
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email es requerido' });
    }

    // Buscar usuario (turista) o admin
    let user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
    let userType = 'turista';
    
    if (!user) {
      user = await Admin.findOne({ email });
      userType = 'admin';
    }

    // Por seguridad, siempre responder con éxito (no revelar si el email existe)
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'Si el correo existe, recibirás un código de recuperación' 
      });
    }

    // Generar código de recuperación
    let resetCode;
    if (userType === 'turista') {
      resetCode = user.crearResetToken();
    } else {
      // Para admin, generar código manual
      resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordToken = resetCode;
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    }
    await user.save({ validateBeforeSave: false });

    // Enviar email con el código
    const mailOptions = {
      from: `"RestauranteWeb" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Código de recuperación — RestauranteWeb',
      html: `
        <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <h1 style="color: #1e293b; font-size: 1.5rem; margin-bottom: 0.5rem;">RestauranteWeb</h1>
            <p style="color: #94a3b8; font-size: 0.9rem;">Recuperación de contraseña</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 2rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="color: #475569; margin-bottom: 1rem;">Usa el siguiente código para restablecer tu contraseña:</p>
            <div style="font-size: 2.5rem; font-weight: 800; letter-spacing: 0.5rem; color: #2563eb; background: #eff6ff; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
              ${resetCode}
            </div>
            <p style="color: #94a3b8; font-size: 0.85rem;">Este código expira en <strong>15 minutos</strong>.</p>
            <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 1rem;">Si no solicitaste este cambio, ignora este correo.</p>
          </div>
          <p style="text-align: center; color: #cbd5e1; font-size: 0.75rem; margin-top: 1rem;">© ${new Date().getFullYear()} RestauranteWeb — Jalpan de Serra</p>
        </div>
      `
    };

    try {
      await emailTransporter.sendMail(mailOptions);
      console.log(`📧 Código de recuperación enviado a: ${email}`);
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      // Si falla el envío, limpiar el token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ 
        success: false, 
        message: 'Error al enviar el correo. Verifica la configuración de email.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Si el correo existe, recibirás un código de recuperación' 
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/reset-password - Restablecer contraseña con código
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Buscar usuario con token válido
    let user = await User.findOne({ 
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires +password');

    let userType = 'turista';

    if (!user) {
      // Intentar con Admin
      user = await Admin.findOne({ 
        email,
        resetPasswordToken: code,
        resetPasswordExpires: { $gt: Date.now() }
      }).select('+password');
      userType = 'admin';
    }

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código inválido o expirado' 
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Contraseña restablecida para: ${email} (${userType})`);

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' 
    });

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


// ===== ENDPOINT: CREAR ADMIN TURISMO (Solo Super Admin) =====
app.post('/api/admins/turismo', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    if (!nombre || !apellido || !email || !password || !telefono) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const existente = await Admin.findOne({ email });
    if (existente) {
      return res.status(400).json({ success: false, message: 'Ya existe un administrador con este email' });
    }

    const admin = await Admin.create({
      nombre, apellido, email, password, telefono,
      rol: 'admin-turismo'
    });

    res.status(201).json({
      success: true,
      message: 'Admin de Turismo creado exitosamente',
      data: {
        admin: {
          id: admin._id,
          nombre: admin.nombre,
          apellido: admin.apellido,
          email: admin.email,
          telefono: admin.telefono,
          rol: admin.rol
        }
      }
    });
  } catch (error) {
    console.error('Error creando admin turismo:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


// ===== RUTAS DE PRUEBA =====

// Test básico
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '🎉 Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    database: {
      connected: mongoose.connection.readyState === 1,
      name: mongoose.connection.name || 'No conectado',
      host: mongoose.connection.host || 'No disponible'
    },
    routes: {
      available: [
        'GET / - Página principal',
        'GET /admin - Panel de administración',
        'GET /login.html - Login',
        'GET /setup - Crear admin de prueba',
        'POST /api/auth/login - API Login ✅',
        'POST /api/auth/register - API Registro ✅',
        'GET /api/auth/profile - Perfil del usuario ✅'
      ]
    }
  });
});

// Setup admin de prueba
app.get('/setup', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1 style="color: #ef4444;">❌ MongoDB no conectado</h1>
          <p>Verifica tu archivo .env</p>
          <a href="/test">Ver diagnóstico</a>
        </div>
      `);
    }

    const existingAdmin = await Admin.findOne({ email: 'admin@test.com' });
    
    if (existingAdmin) {
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 2px solid #10b981; border-radius: 10px; background: #f0fdf4;">
          <h1 style="color: #10b981;">✅ Admin de prueba ya existe</h1>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> admin@test.com</p>
            <p><strong>Password:</strong> password123</p>
          </div>
          <a href="/login.html" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">🔐 Ir al Login</a>
          <a href="/admin.html" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">🎛️ Panel Admin</a>
        </div>
      `);
    }

    const nuevoAdmin = new Admin({
      nombre: 'Admin',
      apellido: 'Prueba',
      email: 'admin@test.com',
      password: 'password123',
      telefono: '4441234567'
    });

    await nuevoAdmin.save();

    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 2px solid #10b981; border-radius: 10px; background: #f0fdf4;">
        <h1 style="color: #10b981;">🎉 Admin creado exitosamente</h1>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> admin@test.com</p>
          <p><strong>Password:</strong> password123</p>
        </div>
        <a href="/login.html" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">🔐 Probar Login</a>
      </div>
    `);

  } catch (error) {
    console.error('Error en setup:', error);
    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1 style="color: #ef4444;">❌ Error: ${error.message}</h1>
        <a href="/test">Ver diagnóstico</a>
      </div>
    `);
  }
});




// Modelos importados al inicio del archivo

// ===== MIDDLEWARE DE USUARIOS (TURISTAS) =====
const verificarTokenUsuario = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'No autorizado - Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt_super_seguro_2024');
    // Buscamos en la colección User
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

// ===== RUTAS DE AUTENTICACIÓN PARA PUBLICO (TURISTAS) =====

// POST /api/auth/user/register
app.post('/api/auth/user/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, email y contraseña son obligatorios' });
    }

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ success: false, message: 'Ya existe una cuenta con este correo' });
    }

    const newUser = await User.create({ nombre, email, password });
    const token = generarToken(newUser._id); // Usamos la misma función de JWT del admin

    res.status(201).json({
      success: true,
      data: {
        user: { id: newUser._id, nombre: newUser.nombre, email: newUser.email, rol: 'turista' },
        token
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Error registro turista:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/user/login
app.post('/api/auth/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const passwordValida = await user.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = generarToken(user._id);

    res.json({
      success: true,
      data: {
        user: { id: user._id, nombre: user.nombre, email: user.email, rol: 'turista' },
        token
      }
    });
  } catch (error) {
    console.error('Error login turista:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/auth/user/profile
app.get('/api/auth/user/profile', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const userWithRol = user.toObject ? user.toObject() : { ...user };
    userWithRol.rol = 'turista';
    res.json({ success: true, data: userWithRol });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo perfil' });
  }
});

// PUT /api/auth/user/profile - Actualizar perfil de turista
app.put('/api/auth/user/profile', verificarTokenUsuario, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (nombre) user.nombre = nombre;
    if (email) {
      // Verificar si el email ya está en uso por otro usuario
      if (email !== user.email) {
         const existingEmail = await User.findOne({ email });
         if (existingEmail) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya está en uso' });
         }
      }
      user.email = email;
    }
    if (password) {
      user.password = password; // Se hasheará en el pre-save hook de Mongoose
    }

    await user.save();
    
    // Devolver el super user act. sin password
    res.json({ 
      success: true, 
      message: 'Perfil actualizado correctamente', 
      data: { _id: user._id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (error) {
    console.error('Error actualizando perfil turista:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar perfil' });
  }
});

// ===== RUTAS DE FAVORITOS (TURISTAS) =====

// Obtener todos los favoritos del usuario (BD local)
app.get('/api/user/favorites', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favoritos')
      .populate('experienciasFavoritas.tourId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    res.json({ 
      success: true, 
      data: {
        restaurantes: user.favoritos || [],
        experiencias: user.experienciasFavoritas || []
      }
    });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener favoritos' });
  }
});

// Alternar (Agregar/Quitar) un restaurante de favoritos
app.post('/api/user/favorites/:id', verificarTokenUsuario, async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const index = user.favoritos.indexOf(restaurantId);
    let isFavorite = false;

    if (index === -1) {
      // No está en favoritos, agregarlo
      user.favoritos.push(restaurantId);
      isFavorite = true;
      
      // Inteligencia Conceptual: Generar notificación al guardar un favorito
      try {
        // const Restaurant = require('./models/Restaurant'); // Ya importado al inicio
        const restInfo = await Restaurant.findById(restaurantId).select('nombre');
        if (restInfo) {
          user.notificaciones.push({
            mensaje: `¡Has guardado ${restInfo.nombre} en tus favoritos! ¿Por qué no dejas una reseña cuando lo visites?`,
            tipo: 'recordatorio-reseña'
          });
        }
      } catch(e) { console.error('Error generando notificación:', e); }
      
    } else {
      // Ya está en favoritos, quitarlo
      user.favoritos.splice(index, 1);
      isFavorite = false;
    }

    await user.save();
    
    res.json({ 
      success: true, 
      message: isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos',
      isFavorite 
    });
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al modificar favoritos' });
  }
});

// Alternar (Agregar/Quitar) un tour de experiencias favoritas (con clasificación)
app.post('/api/user/tour-favorites/:id', verificarTokenUsuario, async (req, res) => {
  try {
    const tourId = req.params.id;
    const { tipoMeGusta = 'Favorito general' } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const index = user.experienciasFavoritas.findIndex(f => f.tourId.toString() === tourId);
    let isFavorite = false;

    if (index === -1) {
      // No está en favoritos, agregarlo
      user.experienciasFavoritas.push({ tourId, tipoMeGusta });
      isFavorite = true;
    } else {
      // Ya está en favoritos, si cambia el tipo actualizarlo, si es el mismo u otra acción, quitarlo
      if (req.body.updateOnly && user.experienciasFavoritas[index].tipoMeGusta !== tipoMeGusta) {
         user.experienciasFavoritas[index].tipoMeGusta = tipoMeGusta;
         isFavorite = true;
      } else {
         user.experienciasFavoritas.splice(index, 1);
         isFavorite = false;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos',
      isFavorite,
      experienciasFavoritas: user.experienciasFavoritas
    });
  } catch (error) {
    console.error('Error al alternar favorito de tour:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al modificar favoritos' });
  }
});

// Alternar restaurante o agencia favorita (Agencia)
app.post('/api/user/favorito-agencia', verificarTokenUsuario, async (req, res) => {
  try {
    const { agenciaId } = req.body;
    if (!agenciaId) return res.status(400).json({ success: false, message: 'ID de agencia requerido' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Ensure array exists
    if (!user.agenciasFavoritas) user.agenciasFavoritas = [];

    const index = user.agenciasFavoritas.indexOf(agenciaId);
    let isFavorite = false;

    if (index === -1) {
      user.agenciasFavoritas.push(agenciaId);
      isFavorite = true;
    } else {
      user.agenciasFavoritas.splice(index, 1);
      isFavorite = false;
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorite ? 'Agencia añadida a favoritos' : 'Agencia eliminada de favoritos',
      isFavorite
    });
  } catch (error) {
    console.error('Error al alternar favorito de agencia:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Obtener notificaciones del usuario
app.get('/api/user/notifications', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificaciones');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    // Ordenar notificaciones por fecha (más recientes primero)
    const sortedNotifs = user.notificaciones.sort((a,b) => b.fecha - a.fecha);
    
    res.json({ success: true, data: sortedNotifs });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener notificaciones' });
  }
});

// Marcar notificación como leída
app.patch('/api/user/notifications/:id/read', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const notificacion = user.notificaciones.id(req.params.id);
    if (notificacion) {
      notificacion.leida = true;
      await user.save();
      res.json({ success: true, message: 'Notificación marcada como leída' });
    } else {
      res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Obtener reseñas del usuario — UNIFICADAS (BD local + turismo-db)
app.get('/api/user/reviews', verificarTokenUsuario, async (req, res) => {
  try {
    const userId = req.user._id;

    // === 1. Reseñas LOCALES: restaurantes (modelo Review local) ===
    const restaurantReviews = await Review.find({ userId })
      .populate('restaurantId', 'nombre imagenes direccion')
      .sort({ fechaCreacion: -1 });

    const mappedRestaurant = restaurantReviews.map(r => ({
      _id: r._id,
      tipoLugar: 'Restaurante',
      lugarId: r.restaurantId?._id || r.restaurantId,
      lugarNombre: r.restaurantId?.nombre || 'Restaurante Desconocido',
      lugarUrl: `/restaurante.html?id=${r.restaurantId?._id || r.restaurantId}`,
      rating: r.rating,
      comentario: r.comentario,
      fotos: r.fotos || [],
      estado: r.estado,
      fechaCreacion: r.fechaCreacion
    }));

    // === 2. Reseñas LOCALES: tours (embebidas en Tour.resenas) ===
    const toursWithMyReviews = await Tour.find({ 'resenas.usuario': userId });
    const mappedTours = [];
    toursWithMyReviews.forEach(tour => {
      tour.resenas.forEach(resena => {
        if (resena.usuario.toString() === userId.toString()) {
          mappedTours.push({
            _id: resena._id,
            tourId: tour._id,
            tipoLugar: 'Experiencia',
            lugarId: tour._id,
            lugarNombre: tour.nombre?.es || 'Experiencia Desconocida',
            lugarUrl: `/experiencia.html?id=${tour._id}`,
            rating: resena.calificacion,
            comentario: resena.comentario,
            fotos: resena.fotos || [],
            estado: 'aprobada',
            fechaCreacion: resena.fecha
          });
        }
      });
    });

    // === 3. Reseñas LOCALES: agencias ===
    const agenciasWithMyReviews = await Agencia.find({ 'resenas.usuario': userId });
    const mappedAgencias = [];
    agenciasWithMyReviews.forEach(agencia => {
      agencia.resenas.forEach(resena => {
        if (resena.usuario.toString() === userId.toString()) {
          mappedAgencias.push({
            _id: resena._id,
            agenciaId: agencia._id,
            tipoLugar: 'Agencia',
            lugarId: agencia._id,
            lugarNombre: agencia.nombre || 'Agencia Desconocida',
            lugarUrl: `/agencia.html?id=${agencia._id}`,
            rating: resena.calificacion,
            comentario: resena.comentario,
            fotos: resena.fotos || [],
            estado: resena.estado || 'aprobada',
            fechaCreacion: resena.fecha
          });
        }
      });
    });

    // === 4. Reseñas de TURISMO-DB (hospedajes: hoteles, cabañas, airbnbs) ===
    const hospedajeReviews = await ReviewTurismo.find({ userId: userId.toString() })
      .sort({ fecha: -1 });

    const mappedHospedajes = hospedajeReviews.map(r => ({
      _id: r._id,
      tipoLugar: `Hospedaje (${r.tipoHospedaje || 'hotel'})`,
      lugarId: r.hospedajeId,
      lugarNombre: r.nombreHospedaje || 'Hospedaje Desconocido',
      lugarUrl: '#',
      rating: r.rating,
      comentario: r.comentario,
      fotos: [],
      estado: 'aprobada',
      fechaCreacion: r.fecha || r.createdAt
    }));

    // === 5. Combinar y ordenar ===
    const allReviews = [...mappedRestaurant, ...mappedTours, ...mappedAgencias, ...mappedHospedajes]
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

    res.json({ success: true, count: allReviews.length, data: allReviews });
  } catch (error) {
    console.error('Error obteniendo reseñas del usuario:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener las opiniones' });
  }
});

// Eliminar una reseña propia de RESTAURANTE
app.delete('/api/user/reviews/restaurante/:id', verificarTokenUsuario, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No puedes eliminar una reseña que no es tuya' });
    }
    await review.deleteOne();
    res.json({ success: true, message: 'Reseña eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña de restaurante:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Eliminar una reseña propia de TOUR/EXPERIENCIA
app.delete('/api/user/reviews/tour/:tourId/review/:reviewId', verificarTokenUsuario, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour no encontrado' });

    const resena = tour.resenas.id(req.params.reviewId);
    if (!resena) return res.status(404).json({ success: false, message: 'Reseña no encontrada en este tour' });
    if (resena.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No puedes eliminar una reseña que no es tuya' });
    }

    // Quitar la reseña del array
    tour.resenas.pull(req.params.reviewId);

    // Recalcular estadísticas
    if (tour.resenas.length > 0) {
      const totalCalif = tour.resenas.reduce((sum, r) => sum + r.calificacion, 0);
      tour.calificacionPromedio = totalCalif / tour.resenas.length;
    } else {
      tour.calificacionPromedio = 0;
    }
    tour.numeroResenas = tour.resenas.length;
    await tour.save();
    res.json({ success: true, message: 'Reseña de experiencia eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña de tour:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Eliminar una reseña propia de AGENCIA
app.delete('/api/user/reviews/agencia/:agenciaId/review/:reviewId', verificarTokenUsuario, async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.agenciaId);
    if (!agencia) return res.status(404).json({ success: false, message: 'Agencia no encontrada' });

    const resena = agencia.resenas.id(req.params.reviewId);
    if (!resena) return res.status(404).json({ success: false, message: 'Reseña no encontrada en esta agencia' });
    if (resena.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No puedes eliminar una reseña que no es tuya' });
    }

    resena.deleteOne(); // Removes the subdocument
    await agencia.save();

    res.json({ success: true, message: 'Reseña eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña de agencia:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// ===== RUTAS DE RESEÑAS PÚBLICAS (TURISTAS) =====

// Obtener reseñas aprobadas de un restaurante específico
app.get('/api/restaurants/:id/reviews', async (req, res, next) => {
  try {
    // Skip if id is not a valid ObjectId (e.g. 'my-restaurant') so the specific admin route can handle it
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return next();
    }
    const reviews = await Review.find({ restaurantId: req.params.id, estado: 'aprobada' })
      .populate('userId', 'nombre')
      .sort({ destacada: -1, fechaCreacion: -1 });
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error('Error obteniendo reseñas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Crear una nueva reseña (Debe estar logueado como turista)
app.post('/api/restaurants/:id/reviews', verificarTokenUsuario, (req, res, next) => {
  // Multi-foto: hasta 5 archivos con campo 'fotos'
  const upload = getUploadMiddleware().array('fotos', 5);
  upload(req, res, function(err) {
    if (err) {
      console.error('Error de multer (nueva reseña):', err);
      return res.status(400).json({ success: false, message: 'Error subiendo las imágenes' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { rating, comentario } = req.body;

    // Construir objetos de foto si hay archivos adjuntos
    let fotos = [];
    let imagenUrl = null;
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('./config/cloudinary');
      fotos = req.files.map(file => {
        if (cloudinaryConfigurado()) {
          return {
            filename: file.filename,
            url: file.path,
            cloudinaryId: file.filename,
            size: file.size || 0
          };
        } else {
          return {
            filename: file.filename,
            url: `/uploads/restaurants/${file.filename}`,
            size: file.size || 0
          };
        }
      });
      // Compatibilidad: primera foto como imagenUrl
      imagenUrl = fotos[0].url;
    }

    // Verificar si el restaurante existe
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
    }

    // Comprobar si el usuario ya hizo una reseña para este restaurante (opcional, para evitar spam)
    const existingReview = await Review.findOne({ restaurantId: req.params.id, userId: req.user._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Ya has escrito una opinión para este restaurante.' });
    }

    const newReview = await Review.create({
      restaurantId: req.params.id,
      userId: req.user._id,
      rating,
      comentario,
      imagenUrl,
      fotos
    });

    res.status(201).json({ success: true, message: 'Reseña enviada correctamente. En espera de moderación.', data: newReview });
  } catch (error) {
    console.error('Error creando reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Alternar (Agregar/Quitar) me gusta a una reseña de restaurante
app.post('/api/restaurants/:id/reviews/:reviewId/like', verificarTokenUsuario, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    const userId = req.user._id;
    const index = review.likedBy.indexOf(userId);
    let isLiked = false;

    if (index === -1) {
      review.likedBy.push(userId);
      review.likes = (review.likes || 0) + 1;
      isLiked = true;
    } else {
      review.likedBy.splice(index, 1);
      review.likes = Math.max(0, (review.likes || 1) - 1);
      isLiked = false;
    }

    await review.save();

    res.json({ success: true, isLiked, likes: review.likes });
  } catch (error) {
    console.error('Error al dar like a reseña:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// PUT /api/reviews/:reviewId/reply - Responder a una reseña (Solo Admin)
app.put('/api/reviews/:reviewId/reply', verificarToken, async (req, res) => {
  try {
    const { respuesta } = req.body;

    if (!respuesta || respuesta.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'La respuesta es requerida' });
    }

    if (respuesta.length > 500) {
      return res.status(400).json({ success: false, message: 'La respuesta no puede exceder 500 caracteres' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    review.respuestaAdmin = respuesta.trim();
    review.fechaRespuesta = Date.now();
    await review.save();

    console.log(`💬 Admin respondió a reseña ${req.params.reviewId}`);

    res.json({ success: true, message: 'Respuesta publicada', data: review });
  } catch (error) {
    console.error('Error respondiendo a reseña:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Crear una nueva reseña para un TOUR (Debe estar logueado como turista)
app.post('/api/tours/:id/reviews', verificarTokenUsuario, (req, res, next) => {
  const { getUploadMiddleware } = require('./middleware/upload');
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.array('fotos', 5)(req, res, next);
}, async (req, res) => {
  try {
    const { rating, comentario } = req.body;
    
    if (!rating || !comentario) {
      return res.status(400).json({ success: false, message: 'La calificación y el comentario son requeridos' });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour no encontrado' });
    }

    // Comprobar si el usuario ya hizo una reseña para este tour
    const existingReview = tour.resenas.find(r => r.usuario.toString() === req.user._id.toString());
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Ya has escrito una opinión para esta experiencia.' });
    }

    // Construir objetos de foto si hay archivos adjuntos
    let fotos = [];
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('./config/cloudinary');
      fotos = req.files.map(file => {
        if (cloudinaryConfigurado()) {
          return {
            filename: file.filename,
            url: file.path,
            cloudinaryId: file.filename,
            size: file.size || 0,
            uploadDate: new Date()
          };
        } else {
          return {
            filename: file.filename,
            url: `/uploads/restaurants/${file.filename}`,
            path: file.path,
            size: file.size,
            uploadDate: new Date()
          };
        }
      });
    }

    const nuevaResena = {
      usuario: req.user._id,
      nombreUsuario: req.user.nombre,
      calificacion: Number(rating),
      comentario,
      fotos
    };

    tour.resenas.push(nuevaResena);
    tour.numeroResenas = tour.resenas.length;
    tour.calificacionPromedio = tour.resenas.reduce((acc, curr) => acc + curr.calificacion, 0) / tour.numeroResenas;

    await tour.save();

    res.status(201).json({ success: true, message: 'Reseña enviada correctamente.', data: nuevaResena });
  } catch (error) {
    console.error('Error creando reseña de tour:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


// ===== RUTAS DE RESEÑAS PÚBLICAS PARA GUÍAS =====

// Obtener reseñas de un guía
app.get('/api/guias/:id/reviews', async (req, res) => {
  try {
    const guia = await Guia.findById(req.params.id);
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }
    // Devolver las reseñas asociadas (aquí se ordenan de más reciente a más antigua)
    const reviews = (guia.resenas || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error('Error obteniendo reseñas del guía:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Crear una nueva reseña para un GUÍA (Debe estar logueado como turista)
app.post('/api/guias/:id/reviews', verificarTokenUsuario, (req, res, next) => {
  const { getUploadMiddleware } = require('./middleware/upload');
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.array('fotos', 5)(req, res, next);
}, async (req, res) => {
  try {
    const { rating, comentario } = req.body;
    
    if (!rating || !comentario) {
      return res.status(400).json({ success: false, message: 'La calificación y el comentario son requeridos' });
    }

    const guia = await Guia.findById(req.params.id);
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }

    // Comprobar si el usuario ya hizo una reseña para este guía
    const existingReview = (guia.resenas || []).find(r => r.usuario.toString() === req.user._id.toString());
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Ya has escrito una opinión para este guía.' });
    }

    // Construir objetos de foto si hay archivos adjuntos
    let fotos = [];
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('./config/cloudinary');
      fotos = req.files.map(file => {
        if (cloudinaryConfigurado()) {
          return {
            filename: file.filename,
            url: file.path,
            cloudinaryId: file.filename,
            size: file.size || 0,
            uploadDate: new Date()
          };
        } else {
          return {
            filename: file.filename,
            url: `/uploads/restaurants/${file.filename}`,
            path: file.path,
            size: file.size,
            uploadDate: new Date()
          };
        }
      });
    }

    const nuevaResena = {
      usuario: req.user._id,
      nombreUsuario: req.user.nombre,
      calificacion: Number(rating),
      comentario,
      fotos
    };

    guia.resenas.push(nuevaResena);
    guia.numeroResenas = guia.resenas.length;
    guia.calificacionPromedio = guia.resenas.reduce((acc, curr) => acc + curr.calificacion, 0) / guia.numeroResenas;

    await guia.save();

    res.status(201).json({ success: true, message: 'Reseña enviada correctamente.', data: nuevaResena });
  } catch (error) {
    console.error('Error creando reseña de guía:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


// ===== RUTAS DE MODERACIÓN DE RESEÑAS (SUPER ADMIN) =====

// Obtener todas las reseñas (de todos los restaurantes) para moderar
app.get('/api/super-admin/reviews', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('userId', 'nombre email')
      .populate('restaurantId', 'nombre')
      .sort({ fechaCreacion: -1 });
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error('Error obteniendo todas las reseñas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Cambiar estado de una reseña (aprobar/rechazar)
app.patch('/api/super-admin/reviews/:id/status', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { estado } = req.body; // 'aprobada', 'rechazada' o 'pendiente'
    if (!['aprobada', 'rechazada', 'pendiente'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const review = await Review.findByIdAndUpdate(req.params.id, { estado }, { new: true });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    res.json({ success: true, message: `Reseña ${estado} exitosamente`, data: review });
  } catch (error) {
    console.error('Error actualizando estado de reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Cambiar estado "destacada" de una reseña
app.patch('/api/super-admin/reviews/:id/feature', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { destacada } = req.body;
    
    const review = await Review.findByIdAndUpdate(req.params.id, { destacada }, { new: true });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    res.json({ success: true, message: `Reseña ${destacada ? 'destacada' : 'no destacada'} exitosamente`, data: review });
  } catch (error) {
    console.error('Error destacando reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


// ===== RUTAS DE GESTIÓN DE RESTAURANTES =====

// Obtener MI restaurante
app.get('/api/restaurants/my-restaurant', verificarToken, async (req, res) => {
  try {
    console.log('🔍 Buscando restaurante para admin:', req.admin._id);
    
    const restaurant = await Restaurant.findOne({ 
      adminId: req.admin._id, 
      activo: true 
    }).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró establecimiento asociado a este administrador'
      });
    }
    
    console.log('✅ Restaurante encontrado:', restaurant.nombre);
    
    res.json({
      success: true,
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener establecimiento',
      error: error.message
    });
  }
});

// GET /api/admin/my-restaurant (ruta adicional del segundo archivo)
app.get('/api/admin/my-restaurant', verificarToken, async (req, res) => {
  try {
    console.log('🔍 Buscando restaurante para admin:', req.admin._id);
    
    const restaurant = await Restaurant.findOne({ 
      adminId: req.admin._id,
      activo: true 
    }).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró restaurante asociado a este administrador'
      });
    }
    
    console.log('✅ Restaurante encontrado:', restaurant.nombre);
    
    res.json({
      success: true,
      message: 'Restaurante obtenido exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo mi restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener restaurante',
      error: error.message
    });
  }
});

// Actualizar información básica
app.patch('/api/restaurants/my-restaurant/basic-info', verificarToken, async (req, res) => {
  try {
    const { nombre, descripcion, telefono, email, tipoComida, opcionesPago, precioPromedio } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !descripcion || !telefono || !email) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }
    
    // Traducir descripción al inglés
    const descripcionEn = await translateText(descripcion, 'EN-US');

    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        nombre: nombre.trim(),
        descripcion: {
          es: descripcion.trim(),
          en: descripcionEn.trim()
        },
        telefono: telefono.trim(),
        email: email.toLowerCase().trim(),
        tipoComida: tipoComida ? tipoComida.trim() : '',
        opcionesPago: opcionesPago || { efectivo: true, tarjeta: false, transferencia: false },
        precioPromedio: precioPromedio || 0,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Información básica actualizada:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'información básica' });
    }
    
    res.json({
      success: true,
      message: 'Información básica actualizada exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando información básica:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// Actualizar dirección
app.patch('/api/restaurants/my-restaurant/address', verificarToken, async (req, res) => {
  try {
    const { direccion } = req.body;
    
    if (!direccion || !direccion.calle || !direccion.ciudad || !direccion.codigoPostal) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de dirección son requeridos'
      });
    }
    
    const direccionUpdate = {
      calle: direccion.calle.trim(),
      ciudad: direccion.ciudad.trim(),
      codigoPostal: direccion.codigoPostal.trim()
    };

    if (direccion.lat && direccion.lng) {
      direccionUpdate.coordenadas = {
        lat: parseFloat(direccion.lat),
        lng: parseFloat(direccion.lng)
      };
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        direccion: direccionUpdate,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Dirección actualizada:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'dirección' });
    }
    
    res.json({
      success: true,
      message: 'Dirección actualizada exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando dirección:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// Actualizar horarios
app.patch('/api/restaurants/my-restaurant/schedule', verificarToken, async (req, res) => {
  try {
    const { horarios } = req.body;
    
    if (!horarios) {
      return res.status(400).json({
        success: false,
        message: 'Los horarios son requeridos'
      });
    }
    
    // Validar estructura de horarios
    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const horariosValidos = {};
    
    diasValidos.forEach(dia => {
      if (horarios[dia]) {
        horariosValidos[dia] = {
          abierto: horarios[dia].abierto !== undefined ? Boolean(horarios[dia].abierto) : false,
          apertura: horarios[dia].apertura || '',
          cierre: horarios[dia].cierre || ''
        };
      }
    });
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        horarios: horariosValidos,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Horarios actualizados:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'horarios' });
    }
    
    res.json({
      success: true,
      message: 'Horarios actualizados exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// Actualizar menú
app.patch('/api/restaurants/my-restaurant/menu', verificarToken, async (req, res) => {
  try {
    const { menu } = req.body;
    
    if (!menu || !Array.isArray(menu)) {
      return res.status(400).json({
        success: false,
        message: 'El menú debe ser un array válido'
      });
    }
    
    // Validar estructura del menú
    for (const categoria of menu) {
      if (!categoria.categoria || !categoria.items || !Array.isArray(categoria.items)) {
        return res.status(400).json({
          success: false,
          message: 'Estructura de menú inválida'
        });
      }
      
      for (const item of categoria.items) {
        if (!item.nombre || typeof item.precio !== 'number' || item.precio < 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada item del menú debe tener nombre y precio válido'
          });
        }
      }
    }
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        menu: menu,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Menú actualizado:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'menú' });
    }
    
    res.json({
      success: true,
      message: 'Menú actualizado exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// Actualizar redes sociales
app.patch('/api/restaurants/my-restaurant/social-media', verificarToken, async (req, res) => {
  try {
    const { redes } = req.body;
    
    if (!redes) {
      return res.status(400).json({
        success: false,
        message: 'Los datos de redes sociales son requeridos'
      });
    }
    
    // Validar URLs si se proporcionan
    const redesActualizadas = {};
    
    if (redes.facebook) {
      if (redes.facebook.trim() !== '') {
        try {
          new URL(redes.facebook);
          redesActualizadas.facebook = redes.facebook.trim();
        } catch {
          return res.status(400).json({
            success: false,
            message: 'La URL de Facebook no es válida'
          });
        }
      }
    }
    
    if (redes.website) {
      if (redes.website.trim() !== '') {
        try {
          new URL(redes.website);
          redesActualizadas.website = redes.website.trim();
        } catch {
          return res.status(400).json({
            success: false,
            message: 'La URL del website no es válida'
          });
        }
      }
    }
    
    if (redes.instagram) {
      redesActualizadas.instagram = redes.instagram.trim();
    }
    
    if (redes.twitter) {
      redesActualizadas.twitter = redes.twitter.trim();
    }
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        redes: redesActualizadas,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Redes sociales actualizadas:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'redes sociales' });
    }
    
    res.json({
      success: true,
      message: 'Redes sociales actualizadas exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando redes sociales:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// Actualizar servicios (amenities) de MI restaurante
app.patch('/api/restaurants/my-restaurant/amenities', verificarToken, async (req, res) => {
  try {
    const { servicios } = req.body;

    if (!servicios) {
      return res.status(400).json({
        success: false,
        message: 'Los servicios son requeridos'
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        servicios: {
          petFriendly: !!servicios.petFriendly,
          estacionamiento: !!servicios.estacionamiento,
          musicaEnVivo: !!servicios.musicaEnVivo,
          opcionesVeganas: !!servicios.opcionesVeganas,
          areaInfantil: !!servicios.areaInfantil,
          wifiGratis: !!servicios.wifiGratis
        },
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    res.json({ success: true, message: 'Servicios actualizados exitosamente', data: restaurant });
  } catch (error) {
    console.error('Error actualizando servicios:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
});

// Actualizar promociones de MI restaurante
app.patch('/api/restaurants/my-restaurant/promotions', verificarToken, async (req, res) => {
  try {
    const { promociones } = req.body;

    if (!Array.isArray(promociones)) {
      return res.status(400).json({ success: false, message: 'Las promociones deben ser un arreglo' });
    }

    // Traducir promociones y formatear
    const promostraducciones = [];
    for (const p of promociones) {
      // Extract plain string from bilingual objects to prevent nesting {es: {es: {es: ...}}}
      let tituloStr = p.titulo;
      if (typeof tituloStr === 'object' && tituloStr !== null) {
        tituloStr = tituloStr.es || tituloStr.en || JSON.stringify(tituloStr);
        // Unwrap deeply nested objects
        while (typeof tituloStr === 'object' && tituloStr !== null) {
          tituloStr = tituloStr.es || tituloStr.en || '';
        }
      }
      let descStr = p.descripcion;
      if (typeof descStr === 'object' && descStr !== null) {
        descStr = descStr.es || descStr.en || JSON.stringify(descStr);
        while (typeof descStr === 'object' && descStr !== null) {
          descStr = descStr.es || descStr.en || '';
        }
      }

      if (!tituloStr || !descStr) continue;
      
      const tituloEn = await translateText(tituloStr, 'EN-US');
      const descEn = await translateText(descStr, 'EN-US');

      promostraducciones.push({
        titulo: { es: tituloStr, en: tituloEn },
        descripcion: { es: descStr, en: descEn },
        imagen: p.imagen || null,
        fechaInicio: p.fechaInicio || new Date(),
        fechaFin: p.fechaFin || null,
        activa: p.activa !== undefined ? p.activa : true
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      {
        promociones: promostraducciones,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    res.json({ success: true, message: 'Promociones actualizadas', data: restaurant });
  } catch (error) {
    console.error('Error actualizando promociones:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
});

// Subir imagen para una promoción
app.post('/api/restaurants/my-restaurant/promotions/upload-image', verificarToken, (req, res, next) => {
  const { getUploadMiddleware } = require('./middleware/upload');
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.single('imagen')(req, res, (err) => {
    if (err) {
      console.error('Error subiendo imagen de promoción:', err);
      return res.status(400).json({ success: false, message: 'Error subiendo la imagen' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió ninguna imagen' });
    }

    const { cloudinaryConfigurado } = require('./config/cloudinary');
    let imageUrl;
    if (cloudinaryConfigurado()) {
      imageUrl = req.file.path; // Cloudinary URL
    } else {
      imageUrl = '/uploads/restaurants/' + req.file.filename;
    }

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error subiendo imagen de promoción:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Obtener Reseñas de MI restaurante (Administrador)
app.get('/api/restaurants/my-restaurant/reviews', verificarToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    let reviews;
    try {
      reviews = await Review.find({ restaurantId: restaurant._id })
        .populate('userId', 'nombre email')
        .sort({ fechaCreacion: -1 })
        .lean();
    } catch (populateError) {
      console.error('Error en populate de reseñas, intentando sin populate:', populateError.message);
      reviews = await Review.find({ restaurantId: restaurant._id })
        .sort({ fechaCreacion: -1 })
        .lean();
    }

    res.json({ success: true, data: reviews || [] });
  } catch (error) {
    console.error('Error obteniendo reseñas admin:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
});

// Responder a una Reseña
app.patch('/api/restaurants/my-restaurant/reviews/:id/reply', verificarToken, async (req, res) => {
  try {
    const { respuesta } = req.body;
    const reviewId = req.params.id;

    if (!respuesta || respuesta.trim() === '') {
      return res.status(400).json({ success: false, message: 'La respuesta no puede estar vacía' });
    }

    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, restaurantId: restaurant._id },
      {
        respuestaAdmin: respuesta.trim(),
        fechaRespuesta: new Date()
      },
      { new: true }
    ).populate('userId', 'nombre apellido avatarUrl');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada o no pertenece a tu restaurante' });
    }

    res.json({ success: true, message: 'Respuesta guardada exitosamente', data: review });
  } catch (error) {
    console.error('Error respondiendo reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Actualizar todo el restaurante (opción completa)
app.patch('/api/restaurants/my-restaurant', verificarToken, async (req, res) => {
  try {
    const updateData = req.body;
    
    // Campos permitidos para actualizar
    const allowedUpdates = [
      'nombre', 'descripcion', 'telefono', 'email', 'direccion', 
      'horarios', 'menu', 'redes'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });
    
    // Agregar fecha de actualización
    updates.fechaActualizacion = new Date();
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      updates,
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Restaurante actualizado completamente:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'actualización completa' });
    }
    
    res.json({
      success: true,
      message: 'Establecimiento actualizado exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando restaurante:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});



// ===== CONFIGURACIÓN DE SUBIDA DE IMÁGENES (MÓDULO CENTRALIZADO) =====
const fs = require('fs');

// Cargar configuración y helper de eliminación de Cloudinary
const { eliminarImagenCloudinary, cloudinaryConfigurado } = require('./config/cloudinary');

// Obtener el middleware de subida dinámico desde el nuevo archivo
const { getUploadMiddleware } = require('./middleware/upload');

if (cloudinaryConfigurado()) {
  console.log('☁️  Cloudinary configurado - imágenes se guardarán en la nube');
} else {
  console.log('💾 Usando almacenamiento local (configura Cloudinary en .env)');
}

// ===== RUTAS DE GESTIÓN DE IMÁGENES =====

// 📸 Obtener todas las imágenes del restaurante
app.get('/api/restaurants/images', verificarToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No se encontró restaurante asociado' });
    }

    const imagenes = restaurant.imagenes || [];

    // Solo filtrar imágenes locales si el archivo ya no existe
    // Las imágenes de Cloudinary (https://) siempre son válidas
    const imagenesValidas = imagenes.filter(imagen => {
      if (!imagen.url) return false;
      if (imagen.url.startsWith('http://') || imagen.url.startsWith('https://')) return true; // Cloudinary
      // Local: verificar archivo
      const urlPath = path.join(__dirname, 'public', imagen.url.replace(/^\//, ''));
      if (fs.existsSync(urlPath)) return true;
      if (imagen.path && fs.existsSync(imagen.path)) return true;
      if (imagen.filename) {
        const byFilename = path.join(__dirname, 'public', 'uploads', 'restaurants', imagen.filename);
        if (fs.existsSync(byFilename)) return true;
      }
      return false;
    });

    res.json({
      success: true,
      message: 'Imágenes obtenidas correctamente',
      data: imagenesValidas.map((img, index) => ({
        id: img._id,
        filename: img.filename,
        url: img.url,
        size: img.size,
        cloudinaryId: img.cloudinaryId,
        uploadDate: img.uploadDate,
        esPrincipal: index === 0,
        index: index
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo imágenes:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener imágenes', error: error.message });
  }
});

// 📤 Subir nuevas imágenes (Cloudinary o local según configuración)
app.post('/api/restaurants/images/upload', verificarToken, (req, res, next) => {
  // Seleccionar middleware dinámicamente
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.array('images', 10)(req, res, next);
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se enviaron archivos'
      });
    }

    const restaurant = await Restaurant.findOne({ 
      adminId: req.admin._id, 
      activo: true 
    });

    if (!restaurant) {
      // Si son locales, limpiar; si son de Cloudinary ya están en la nube
      if (!cloudinaryConfigurado()) {
        req.files.forEach(file => {
          fs.unlink(file.path, err => { if (err) console.error('Error eliminando archivo:', err); });
        });
      }
      return res.status(404).json({
        success: false,
        message: 'No se encontró restaurante asociado'
      });
    }

    // Construir objetos de imagen según el origen (Cloudinary o local)
    const nuevasImagenes = req.files.map(file => {
      if (cloudinaryConfigurado()) {
        // Cloudinary provee: path (secure_url), filename (public_id)
        return {
          filename: file.filename,        // public_id de Cloudinary
          url: file.path,                 // secure_url de Cloudinary (URL permanente)
          cloudinaryId: file.filename,    // Guardamos el public_id para poder eliminar
          size: file.size || 0,
          uploadDate: new Date()
        };
      } else {
        // Almacenamiento local
        return {
          filename: file.filename,
          url: `/uploads/restaurants/${file.filename}`,
          path: file.path,
          size: file.size,
          uploadDate: new Date()
        };
      }
    });

    if (!restaurant.imagenes) restaurant.imagenes = [];
    restaurant.imagenes.push(...nuevasImagenes);
    
    await Restaurant.updateOne(
      { _id: restaurant._id },
      { 
        $push: { imagenes: { $each: nuevasImagenes } },
        $set: { fechaActualizacion: new Date() }
      }
    );

    const origen = cloudinaryConfigurado() ? '☁️ Cloudinary' : '💾 Local';
    console.log(`✅ ${nuevasImagenes.length} imágenes subidas para ${restaurant.nombre} [${origen}]`);

    res.json({
      success: true,
      message: `${nuevasImagenes.length} imagen(es) subida(s) exitosamente`,
      data: {
        imagenesAgregadas: nuevasImagenes.length,
        totalImagenes: restaurant.imagenes.length,
        nuevasImagenes: nuevasImagenes.map((img, index) => ({
          filename: img.filename,
          url: img.url,
          size: img.size,
          esPrincipal: restaurant.imagenes.length === nuevasImagenes.length && index === 0
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo imágenes:', error);
    // Solo limpiar archivos locales en caso de error
    if (!cloudinaryConfigurado() && req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => { if (err) console.error('Error eliminando archivo:', err); });
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error del servidor al subir imágenes',
      error: error.message
    });
  }
});

// 🗑️ Eliminar imagen específica
app.delete('/api/restaurants/images/:imageId', verificarToken, async (req, res) => {
  try {
    const { imageId } = req.params;

    const restaurant = await Restaurant.findOne({ 
      adminId: req.admin._id, 
      activo: true 
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No se encontró restaurante asociado' });
    }

    if (!restaurant.imagenes || restaurant.imagenes.length === 0) {
      return res.status(404).json({ success: false, message: 'No hay imágenes para eliminar' });
    }

    const imagenIndex = restaurant.imagenes.findIndex(img => img._id.toString() === imageId);
    
    if (imagenIndex === -1) {
      return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
    }

    const imagenAEliminar = restaurant.imagenes[imagenIndex];

    // Eliminar de Cloudinary si corresponde
    if (imagenAEliminar.cloudinaryId || (cloudinaryConfigurado() && imagenAEliminar.filename)) {
      try {
        const publicId = imagenAEliminar.cloudinaryId || imagenAEliminar.filename;
        await eliminarImagenCloudinary(publicId);
      } catch (cloudErr) {
        console.error('⚠️ No se pudo eliminar de Cloudinary:', cloudErr.message);
        // Continuamos aunque falle en Cloudinary
      }
    } else if (imagenAEliminar.path && fs.existsSync(imagenAEliminar.path)) {
      // Eliminar archivo local
      fs.unlinkSync(imagenAEliminar.path);
      console.log(`🗑️ Archivo local eliminado: ${imagenAEliminar.path}`);
    }

    // Eliminar de la base de datos
    restaurant.imagenes.splice(imagenIndex, 1);
    restaurant.fechaActualizacion = new Date();
    await restaurant.save();

    console.log(`✅ Imagen eliminada de ${restaurant.nombre}`);

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente',
      data: {
        totalImagenes: restaurant.imagenes.length,
        imagenEliminada: { id: imagenAEliminar._id, filename: imagenAEliminar.filename, url: imagenAEliminar.url }
      }
    });

  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al eliminar imagen', error: error.message });
  }
});

// 📤 Subir imagen para un platillo del menú
app.post('/api/restaurants/menu/:categoryId/item/:itemId/image', verificarToken, (req, res, next) => {
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.single('image')(req, res, next);
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió ninguna imagen' });
    }

    const { categoryId, itemId } = req.params;
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });

    if (!restaurant) {
      if (!cloudinaryConfigurado() && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'No se encontró el restaurante' });
    }

    // Buscar categoría y platillo
    const categoria = restaurant.menu.id(categoryId);
    if (!categoria) {
      if (!cloudinaryConfigurado() && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    const platillo = categoria.items.id(itemId);
    if (!platillo) {
      if (!cloudinaryConfigurado() && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Platillo no encontrado' });
    }

    // Preparar objeto de imagen
    const nuevaImagen = cloudinaryConfigurado() 
      ? {
          filename: req.file.filename,
          url: req.file.path,
          cloudinaryId: req.file.filename,
          size: req.file.size || 0,
          uploadDate: new Date()
        }
      : {
          filename: req.file.filename,
          url: `/uploads/restaurants/${req.file.filename}`,
          path: req.file.path,
          size: req.file.size,
          uploadDate: new Date()
        };

    // Eliminar imagen anterior si existe
    if (platillo.imagen) {
      if (cloudinaryConfigurado() && platillo.imagen.cloudinaryId) {
        try { await eliminarImagenCloudinary(platillo.imagen.cloudinaryId); } catch(e) {}
      } else if (!cloudinaryConfigurado() && platillo.imagen.path && fs.existsSync(platillo.imagen.path)) {
        fs.unlinkSync(platillo.imagen.path);
      }
    }

    platillo.imagen = nuevaImagen;
    restaurant.fechaActualizacion = new Date();
    await restaurant.save();

    res.json({
      success: true,
      message: 'Imagen del platillo actualizada exitosamente',
      data: { imagen: nuevaImagen }
    });

  } catch (error) {
    console.error('❌ Error subiendo imagen de platillo:', error);
    if (!cloudinaryConfigurado() && req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ success: false, message: 'Error al subir la imagen' });
  }
});

// ⭐ Establecer imagen como principal
app.patch('/api/restaurants/images/:imageId/set-main', verificarToken, async (req, res) => {
  try {
    const { imageId } = req.params;

    const restaurant = await Restaurant.findOne({ 
      adminId: req.admin._id, 
      activo: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró restaurante asociado'
      });
    }

    if (!restaurant.imagenes || restaurant.imagenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay imágenes disponibles'
      });
    }

    // Buscar imagen por ID
    const imagenIndex = restaurant.imagenes.findIndex(img => img._id.toString() === imageId);
    
    if (imagenIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }

    if (imagenIndex === 0) {
      return res.json({
        success: true,
        message: 'Esta imagen ya es la principal',
        data: {
          imagenPrincipal: restaurant.imagenes[0]
        }
      });
    }

    // Mover imagen al primer lugar
    const imagenPrincipal = restaurant.imagenes.splice(imagenIndex, 1)[0];
    restaurant.imagenes.unshift(imagenPrincipal);
    restaurant.fechaActualizacion = new Date();
    
    await restaurant.save();

    console.log(`✅ Imagen principal actualizada para ${restaurant.nombre}`);

    res.json({
      success: true,
      message: 'Imagen principal actualizada exitosamente',
      data: {
        imagenPrincipal: {
          id: imagenPrincipal._id,
          filename: imagenPrincipal.filename,
          url: imagenPrincipal.url,
          size: imagenPrincipal.size
        },
        totalImagenes: restaurant.imagenes.length
      }
    });

  } catch (error) {
    console.error('❌ Error estableciendo imagen principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al establecer imagen principal',
      error: error.message
    });
  }
});

// 🌐 Obtener imagen principal (ruta pública)
app.get('/api/restaurants/:id/main-image', async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      activo: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const mainImage = restaurant.imagenes && restaurant.imagenes.length > 0 
      ? restaurant.imagenes[0] 
      : null;

    res.json({
      success: true,
      data: {
        mainImage: mainImage ? {
          url: mainImage.url,
          filename: mainImage.filename,
          size: mainImage.size
        } : null,
        totalImages: restaurant.imagenes ? restaurant.imagenes.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo imagen principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// 🛡️ Middleware de manejo de errores para multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Archivo demasiado grande. Máximo 5MB por imagen.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo 10 imágenes por vez.'
      });
    }
  }
  
  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)'
    });
  }
  
  next(error);
});



// 🧪 Ruta de prueba para verificar imágenes
app.get('/test-images', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ 
      activo: true,
      imagenes: { $exists: true, $ne: [] }
    }).limit(5);

    let html = '<h1>🖼️ Test de Imágenes</h1>';
    
    if (restaurants.length === 0) {
      html += '<p>❌ No hay restaurantes con imágenes</p>';
    } else {
      html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">';
      
      restaurants.forEach(restaurant => {
        html += `
          <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
            <h3>${restaurant.nombre}</h3>
            <p><strong>Total imágenes:</strong> ${restaurant.imagenes.length}</p>
        `;
        
        restaurant.imagenes.forEach((imagen, index) => {
          const exists = fs.existsSync(imagen.path);
          html += `
            <div style="margin: 10px 0; padding: 10px; background: ${exists ? '#f0f9ff' : '#fef2f2'};">
              <p><strong>Imagen ${index + 1}:</strong></p>
              <p>URL: <code>${imagen.url}</code></p>
              <p>Archivo: ${exists ? '✅ Existe' : '❌ No existe'}</p>
              <p>Path: <code>${imagen.path}</code></p>
              <p>Tamaño: ${imagen.size ? (imagen.size / 1024).toFixed(2) + ' KB' : 'No definido'}</p>
              ${exists ? `<img src="${imagen.url}" style="max-width: 200px; max-height: 150px; object-fit: cover;" />` : ''}
            </div>
          `;
        });
        
        html += '</div>';
      });
      
      html += '</div>';
    }
    
    html += `
      <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h3>📋 Información del Sistema</h3>
        <p><strong>Carpeta de uploads:</strong> <code>${uploadsDir}</code></p>
        <p><strong>Carpeta existe:</strong> ${fs.existsSync(uploadsDir) ? '✅ Sí' : '❌ No'}</p>
        <p><strong>Archivos en carpeta:</strong></p>
        <ul>
    `;
    
    try {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        html += `<li><code>${file}</code></li>`;
      });
    } catch (error) {
      html += `<li>❌ Error leyendo carpeta: ${error.message}</li>`;
    }
    
    html += `
        </ul>
      </div>
      <p style="margin-top: 20px;"><a href="/admin.html">← Volver al Admin</a></p>
    `;
    
    res.send(html);
    
  } catch (error) {
    res.send(`<h1>❌ Error</h1><pre>${error.message}</pre>`);
  }
});

// 🔧 Ruta para verificar imagen específica
app.get('/check-image/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(imagePath)) {
    res.json({
      success: true,
      exists: true,
      path: imagePath,
      url: `/uploads/restaurants/${filename}`,
      size: fs.statSync(imagePath).size
    });
  } else {
    res.status(404).json({
      success: false,
      exists: false,
      path: imagePath
    });
  }
});


// GET /api/reviews/gallery - Fotos recientes de viajeros (público)
app.get('/api/reviews/gallery', async (req, res) => {
  try {
    const reviews = await Review.find({
      estado: 'aprobada',
      $or: [
        { 'fotos.0': { $exists: true } },
        { imagenUrl: { $ne: null } }
      ]
    })
      .populate('userId', 'nombre')
      .populate('restaurantId', 'nombre')
      .sort({ fechaCreacion: -1 })
      .limit(20)
      .lean();

    // Flatten photos from all reviews
    const gallery = [];
    for (const r of reviews) {
      const author = r.userId?.nombre || 'Viajero';
      const place = r.restaurantId?.nombre || '';
      const rating = r.rating;
      const restaurantId = r.restaurantId?._id;

      if (r.fotos && r.fotos.length > 0) {
        for (const f of r.fotos) {
          gallery.push({
            url: f.url,
            author,
            place,
            rating,
            restaurantId
          });
          if (gallery.length >= 12) break;
        }
      } else if (r.imagenUrl) {
        gallery.push({
          url: r.imagenUrl,
          author,
          place,
          rating,
          restaurantId
        });
      }
      if (gallery.length >= 12) break;
    }

    res.json({ success: true, data: gallery });
  } catch (error) {
    console.error('Error obteniendo galería:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// @desc    Obtener estadísticas públicas
app.get('/api/restaurants/stats', async (req, res) => {
  try {
    const estadisticas = await Restaurant.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          totalRestaurantes: { $sum: 1 },
          tipoRestaurante: {
            $sum: { $cond: [{ $eq: ['$tipo', 'restaurante'] }, 1, 0] }
          },
          tipoBares: {
            $sum: { $cond: [{ $eq: ['$tipo', 'bar'] }, 1, 0] }
          },
          tipoCafeterias: {
            $sum: { $cond: [{ $eq: ['$tipo', 'cafeteria'] }, 1, 0] }
          }
        }
      }
    ]);

    const ciudades = await Restaurant.aggregate([
      { $match: { activo: true } },
      { $group: { _id: '$direccion.ciudad', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recientes = await Restaurant.find({ activo: true })
      .sort({ fechaCreacion: -1 })
      .limit(5)
      .select('nombre tipo direccion.ciudad fechaCreacion')
      .lean();

    res.json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: {
        general: estadisticas[0] || {
          totalRestaurantes: 0,
          tipoRestaurante: 0,
          tipoBares: 0,
          tipoCafeterias: 0
        },
        ciudadesPopulares: ciudades,
        recientes
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      activo: true 
    }).populate('adminId', 'nombre apellido email telefono');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Restaurante obtenido exitosamente',
      data: { restaurant }
    });

  } catch (error) {
    console.error('Error obteniendo restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/restaurants/:id/main-image', async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      activo: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const mainImage = restaurant.imagenes && restaurant.imagenes.length > 0 
      ? restaurant.imagenes[0] 
      : null;

    res.json({
      success: true,
      data: {
        mainImage: mainImage ? {
          url: mainImage.url,
          filename: mainImage.filename
        } : null,
        totalImages: restaurant.imagenes ? restaurant.imagenes.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo imagen principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// Registrar vista del perfil
app.post('/api/restaurants/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Increment the 'estadisticas.vistasPerfil' by 1
    const result = await Restaurant.updateOne(
      { _id: id, activo: true },
      { $inc: { 'estadisticas.vistasPerfil': 1 } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Vista registrada exitosamente'
    });

  } catch (error) {
    console.error('Error incrementando vistas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== REGLA IMPORTANTE =====
// 🔴 NUNCA pongas rutas con parámetros (:id, :param) antes que rutas específicas
// 🟢 SIEMPRE pon las rutas específicas primero

/*
ORDEN CORRECTO:
1. /api/restaurants/images          ← Específica
2. /api/restaurants/my-restaurant   ← Específica  
3. /api/restaurants/stats           ← Específica
4. /api/restaurants/:id             ← Con parámetro (al final)

ORDEN INCORRECTO (CAUSA ERROR):
1. /api/restaurants/:id             ← Con parámetro (intercepta todo)
2. /api/restaurants/images          ← Nunca se ejecuta
*/









// ===== RUTAS PÚBLICAS DE RESTAURANTES (del segundo archivo) =====

// Obtener todos los restaurantes (público)
// Obtener todos los restaurantes (público) - VERSIÓN CORREGIDA
app.get('/api/restaurants', async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 12, 
      tipo, 
      ciudad, 
      buscar,
      ordenar = 'fechaCreacion',
      direccion = 'desc'
    } = req.query;

    const filtros = { activo: true };
    
    if (tipo && ['restaurante', 'bar', 'cafeteria'].includes(tipo)) {
      filtros.tipo = tipo;
    }
    
    if (ciudad) {
      filtros['direccion.ciudad'] = new RegExp(ciudad, 'i');
    }
    
    if (buscar) {
      const searchRegex = new RegExp(buscar, 'i');
      filtros.$or = [
        { nombre: searchRegex },
        { 'descripcion.es': searchRegex },
        { 'descripcion.en': searchRegex }
      ];
    }

    const sortOptions = {};
    sortOptions[ordenar] = direccion === 'desc' ? -1 : 1;

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const [restaurantes, total] = await Promise.all([
      Restaurant.find(filtros)
        .populate('adminId', 'nombre apellido email telefono')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limite))
        .lean(),
      Restaurant.countDocuments(filtros)
    ]);

    const estadisticas = []; // Aggregation moved out to reduce load times

    const totalPaginas = Math.ceil(total / parseInt(limite));

    // 🖼️ PROCESAR IMÁGENES - Cloudinary URLs siempre válidas, locales se verifican
    const restaurantesConImagenes = restaurantes.map(restaurant => {
      let imagenesValidas = [];
      
      if (restaurant.imagenes && restaurant.imagenes.length > 0) {
        imagenesValidas = restaurant.imagenes.filter(imagen => {
          if (!imagen.url) return false;

          // URLs de Cloudinary son siempre válidas (https://res.cloudinary.com/...)
          if (imagen.url.startsWith('http://') || imagen.url.startsWith('https://')) {
            return true;
          }

          // Para URLs locales, verificar que el archivo existe
          // 1. Por URL relativa
          const urlPath = path.join(__dirname, 'public', imagen.url.replace(/^\//, ''));
          if (fs.existsSync(urlPath)) return true;

          // 2. Por path absoluto guardado
          if (imagen.path && fs.existsSync(imagen.path)) return true;

          // 3. Por nombre de archivo en la carpeta de uploads
          if (imagen.filename) {
            const byFilename = path.join(__dirname, 'public', 'uploads', 'restaurants', imagen.filename);
            if (fs.existsSync(byFilename)) return true;
          }

          return false;
        });
      }
      
      return {
        id: restaurant._id,
        nombre: restaurant.nombre,
        tipo: restaurant.tipo,
        descripcion: restaurant.descripcion,
        direccion: restaurant.direccion,
        telefono: restaurant.telefono,
        email: restaurant.email,
        horarios: restaurant.horarios,
        menu: restaurant.menu,
        imagenes: imagenesValidas,
        redes: restaurant.redes,
        admin: restaurant.adminId,
        googleRating: restaurant.googleReviews?.rating || 0,
        googleTotalReviews: restaurant.googleReviews?.totalReviews || 0,
        fechaCreacion: restaurant.fechaCreacion,
        fechaActualizacion: restaurant.fechaActualizacion
      };
    });

    res.json({
      success: true,
      message: 'Restaurantes obtenidos exitosamente',
      data: {
        restaurantes: restaurantesConImagenes,
        pagination: {
          total,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas,
          hasNext: parseInt(pagina) < totalPaginas,
          hasPrev: parseInt(pagina) > 1
        },
        filtros: { tipo, ciudad, buscar, ordenar, direccion },
        estadisticas: estadisticas.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== RUTAS PRIVADAS DE ADMIN (del segundo archivo) =====
app.get('/api/admin/profile', verificarToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        admin: {
          id: req.admin._id,
          nombre: req.admin.nombre,
          apellido: req.admin.apellido,
          email: req.admin.email,
          telefono: req.admin.telefono,
          rol: req.admin.rol
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo perfil'
    });
  }
});

app.get('/api/admin/my-restaurants', verificarToken, async (req, res) => {
  try {
    const restaurantes = await Restaurant.find({ adminId: req.admin._id })
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      message: 'Mis restaurantes obtenidos exitosamente',
      data: {
        restaurantes,
        total: restaurantes.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo mis restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});




// ===== RUTAS DE SUPER ADMIN =====

// Ruta para panel de super admin
app.get('/super-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'super-admin.html'));
});

// Dashboard de super admin
app.get('/api/super-admin/dashboard', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const [
      totalAdmins,
      adminActivos,
      totalRestaurantes,
      restaurantesActivos,
      totalGuias,
      guiasActivos,
      totalTours,
      toursActivos,
      estadisticasTipo,
      registrosRecientes
    ] = await Promise.all([
      Admin.countDocuments(),
      Admin.countDocuments({ activo: true }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ activo: true }),
      Guia.countDocuments(),
      Guia.countDocuments({ activo: true }),
      Tour.countDocuments(),
      Tour.countDocuments({ activo: true }),
      Restaurant.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$tipo', count: { $sum: 1 } } }
      ]),
      Admin.find().sort({ fechaCreacion: -1 }).limit(5).select('-password')
    ]);

    const estadisticasPorTipo = estadisticasTipo.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'Dashboard de super admin obtenido exitosamente',
      data: {
        resumen: {
          totalAdmins,
          adminActivos,
          adminInactivos: totalAdmins - adminActivos,
          totalRestaurantes,
          restaurantesActivos,
          restaurantesInactivos: totalRestaurantes - restaurantesActivos,
          totalGuias,
          guiasActivos,
          guiasInactivos: totalGuias - guiasActivos,
          totalTours,
          toursActivos,
          toursInactivos: totalTours - toursActivos
        },
        estadisticasTipo: estadisticasPorTipo,
        registrosRecientes
      }
    });

  } catch (error) {
    console.error('Error obteniendo dashboard super admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== GESTIÓN DE ADMINISTRADORES =====

// Obtener todos los administradores
app.get('/api/super-admin/admins', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { pagina = 1, limite = 10, buscar, rol, activo } = req.query;

    const filtros = {};
    
    if (buscar) {
      filtros.$or = [
        { nombre: { $regex: buscar, $options: 'i' } },
        { apellido: { $regex: buscar, $options: 'i' } },
        { email: { $regex: buscar, $options: 'i' } }
      ];
    }
    
    if (rol && ['admin', 'super-admin'].includes(rol)) {
      filtros.rol = rol;
    }
    
    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const [admins, total] = await Promise.all([
      Admin.find(filtros)
        .select('-password')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(parseInt(limite)),
      Admin.countDocuments(filtros)
    ]);

    const totalPaginas = Math.ceil(total / parseInt(limite));

    res.json({
      success: true,
      message: 'Administradores obtenidos exitosamente',
      data: {
        admins,
        pagination: {
          total,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas,
          hasNext: parseInt(pagina) < totalPaginas,
          hasPrev: parseInt(pagina) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo administradores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear nuevo administrador
app.post('/api/super-admin/admins', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, rol } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !password || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    // Validar rol
    if (rol && !['admin', 'super-admin'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    // Verificar si el email ya existe
    const adminExistente = await Admin.findOne({ email });
    if (adminExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un administrador con este email'
      });
    }

    // Crear nuevo admin
    const nuevoAdmin = await Admin.create({
      nombre,
      apellido,
      email,
      password,
      telefono,
      rol: rol || 'admin'
    });

    const adminResponse = await Admin.findById(nuevoAdmin._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Administrador creado exitosamente',
      data: { admin: adminResponse }
    });

  } catch (error) {
    console.error('Error creando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar administrador
app.put('/api/super-admin/admins/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, rol, activo } = req.body;

    // No permitir que se modifique a sí mismo el rol
    if (id === req.admin._id.toString() && rol !== req.admin.rol) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol'
      });
    }

    const updates = {};
    if (nombre) updates.nombre = nombre;
    if (apellido) updates.apellido = apellido;
    if (telefono) updates.telefono = telefono;
    if (rol && ['admin', 'super-admin'].includes(rol)) updates.rol = rol;
    if (activo !== undefined) updates.activo = activo;

    const adminActualizado = await Admin.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!adminActualizado) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Administrador actualizado exitosamente',
      data: { admin: adminActualizado }
    });

  } catch (error) {
    console.error('Error actualizando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Activar/Desactivar administrador
app.patch('/api/super-admin/admins/:id/toggle-status', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que se desactive a sí mismo
    if (id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio estado'
      });
    }

    const admin = await Admin.findById(id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }

    admin.activo = !admin.activo;
    await admin.save();

    res.json({
      success: true,
      message: `Administrador ${admin.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: { admin }
    });

  } catch (error) {
    console.error('Error cambiando estado del administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== GESTIÓN GLOBAL DE RESTAURANTES =====

// Obtener todos los restaurantes (super admin)
app.get('/api/super-admin/restaurants', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 10, 
      tipo, 
      ciudad, 
      buscar,
      activo,
      adminId 
    } = req.query;

    const filtros = {};
    
    if (tipo && ['restaurante', 'bar', 'cafeteria'].includes(tipo)) {
      filtros.tipo = tipo;
    }
    
    if (ciudad) {
      filtros['direccion.ciudad'] = { $regex: ciudad, $options: 'i' };
    }
    
    if (buscar) {
      filtros.$or = [
        { nombre: { $regex: buscar, $options: 'i' } },
        { descripcion: { $regex: buscar, $options: 'i' } }
      ];
    }

    if (activo !== undefined) {
      filtros.activo = activo === 'true';
    }

    if (adminId) {
      filtros.adminId = adminId;
    }

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const [restaurantes, total] = await Promise.all([
      Restaurant.find(filtros)
        .populate('adminId', 'nombre apellido email telefono rol activo')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(parseInt(limite)),
      Restaurant.countDocuments(filtros)
    ]);

    const totalPaginas = Math.ceil(total / parseInt(limite));

    res.json({
      success: true,
      message: 'Restaurantes obtenidos exitosamente',
      data: {
        restaurantes,
        pagination: {
          total,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas,
          hasNext: parseInt(pagina) < totalPaginas,
          hasPrev: parseInt(pagina) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Activar/Desactivar restaurante
app.patch('/api/super-admin/restaurants/:id/toggle-status', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id).populate('adminId', 'nombre apellido email');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const newStatus = !restaurant.activo;
    
    await Restaurant.updateOne(
        { _id: id },
        { $set: { activo: newStatus, fechaActualizacion: new Date() } }
    );
    
    // Update local object for the response
    restaurant.activo = newStatus;

    res.json({
      success: true,
      message: `Restaurante ${restaurant.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: { restaurant }
    });

  } catch (error) {
    console.error('Error cambiando estado del restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Editar restaurante (super admin)
app.put('/api/super-admin/restaurants/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Campos permitidos para actualizar
    const allowedUpdates = [
      'nombre', 'descripcion', 'telefono', 'email', 'direccion', 
      'horarios', 'menu', 'redes', 'tipo', 'googleReviewsUrl', 'instagramEmbeds'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });
    
    updates.fechaActualizacion = new Date();
    
    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Restaurante actualizado exitosamente',
      data: { restaurant }
    });
    
  } catch (error) {
    console.error('Error actualizando restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== ESTADÍSTICAS GLOBALES =====

// Estadísticas avanzadas del sistema
app.get('/api/super-admin/stats', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const [
      statsAdmins,
      statsRestaurantes,
      statsActividad,
      topCiudades,
      crecimientoMensual
    ] = await Promise.all([
      // Estadísticas de administradores
      Admin.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            activos: { $sum: { $cond: ['$activo', 1, 0] } },
            superAdmins: { $sum: { $cond: [{ $eq: ['$rol', 'super-admin'] }, 1, 0] } },
            adminsNormales: { $sum: { $cond: [{ $eq: ['$rol', 'admin'] }, 1, 0] } }
          }
        }
      ]),
      
      // Estadísticas de restaurantes
      Restaurant.aggregate([
        {
          $group: {
            _id: '$tipo',
            total: { $sum: 1 },
            activos: { $sum: { $cond: ['$activo', 1, 0] } }
          }
        }
      ]),
      
      // Actividad reciente
      Admin.aggregate([
        {
          $match: {
            ultimoAcceso: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: null,
            activosUltimaSemana: { $sum: 1 }
          }
        }
      ]),
      
      // Top ciudades
      Restaurant.aggregate([
        { $match: { activo: true } },
        {
          $group: {
            _id: '$direccion.ciudad',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Crecimiento mensual
      Restaurant.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$fechaCreacion' },
              month: { $month: '$fechaCreacion' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      message: 'Estadísticas globales obtenidas exitosamente',
      data: {
        admins: statsAdmins[0] || { total: 0, activos: 0, superAdmins: 0, adminsNormales: 0 },
        restaurantes: statsRestaurantes,
        actividad: statsActividad[0] || { activosUltimaSemana: 0 },
        topCiudades,
        crecimientoMensual
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas globales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

//<!-- PASO 4: CREAR SUPER ADMIN -->
//<!-- Agrega esta ruta especial para crear el primer super admin: -->

// Crear super admin (solo si no existe ninguno)
app.get('/create-super-admin', async (req, res) => {
  try {
    // Verificar si ya existe un super admin
    const existingSuperAdmin = await Admin.findOne({ rol: 'super-admin' });
    
    if (existingSuperAdmin) {
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 2px solid #f59e0b; border-radius: 10px; background: #fffbeb;">
          <h1 style="color: #f59e0b;">⚠️ Super Admin ya existe</h1>
          <p><strong>Email:</strong> ${existingSuperAdmin.email}</p>
          <p>Ya existe un Super Administrador en el sistema.</p>
          <a href="/login.html" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">🔐 Ir al Login</a>
        </div>
      `);
    }

    // Crear el primer super admin
    const superAdmin = new Admin({
      nombre: 'Super',
      apellido: 'Admin',
      email: 'superadmin@restauranteweb.com',
      password: 'SuperAdmin123!',
      telefono: '4441234567',
      rol: 'super-admin'
    });

    await superAdmin.save();

    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 2px solid #10b981; border-radius: 10px; background: #f0fdf4;">
        <h1 style="color: #10b981;">🎉 Super Admin creado exitosamente</h1>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> superadmin@restauranteweb.com</p>
          <p><strong>Password:</strong> SuperAdmin123!</p>
          <p><strong>Rol:</strong> super-admin</p>
        </div>
        <p style="color: #059669; font-weight: bold;">⚠️ IMPORTANTE: Cambia la contraseña después del primer login</p>
        <div style="margin-top: 20px;">
          <a href="/login.html" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">🔐 Ir al Login</a>
          <a href="/super-admin.html" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">👑 Panel Super Admin</a>
        </div>
      </div>
    `);

  } catch (error) {
    console.error('Error creando super admin:', error);
    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1 style="color: #ef4444;">❌ Error: ${error.message}</h1>
        <a href="/test">Ver diagnóstico</a>
      </div>
    `);
  }
});

// ===== ESTADÍSTICAS AVANZADAS DE PRECIOS =====

// Estadísticas detalladas de precios
app.get('/api/super-admin/price-stats', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const [
      preciosPorTipo,
      preciosPorCiudad,
      productosExtremos,
      distribucionPrecios,
      estadisticasMenus,
      topProductos
    ] = await Promise.all([
      // Precios promedio por tipo de restaurante
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $group: {
            _id: '$tipo',
            precioPromedio: { $avg: '$menu.items.precio' },
            precioMinimo: { $min: '$menu.items.precio' },
            precioMaximo: { $max: '$menu.items.precio' },
            totalProductos: { $sum: 1 },
            restaurantes: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            tipo: '$_id',
            precioPromedio: { $round: ['$precioPromedio', 2] },
            precioMinimo: '$precioMinimo',
            precioMaximo: '$precioMaximo',
            totalProductos: '$totalProductos',
            totalRestaurantes: { $size: '$restaurantes' }
          }
        }
      ]),
      
      // Precios por ciudad
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $group: {
            _id: '$direccion.ciudad',
            precioPromedio: { $avg: '$menu.items.precio' },
            precioMinimo: { $min: '$menu.items.precio' },
            precioMaximo: { $max: '$menu.items.precio' },
            totalProductos: { $sum: 1 },
            restaurantes: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            ciudad: '$_id',
            precioPromedio: { $round: ['$precioPromedio', 2] },
            precioMinimo: '$precioMinimo',
            precioMaximo: '$precioMaximo',
            totalProductos: '$totalProductos',
            totalRestaurantes: { $size: '$restaurantes' }
          }
        },
        { $sort: { precioPromedio: -1 } },
        { $limit: 10 }
      ]),
      
      // Productos más caros y más baratos
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $project: {
            restaurante: '$nombre',
            ciudad: '$direccion.ciudad',
            tipo: '$tipo',
            categoria: '$menu.categoria',
            producto: '$menu.items.nombre',
            precio: '$menu.items.precio',
            descripcion: '$menu.items.descripcion'
          }
        },
        { $sort: { precio: -1 } }
      ]),
      
      // Distribución de precios en rangos
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $bucket: {
            groupBy: '$menu.items.precio',
            boundaries: [0, 50, 100, 150, 200, 300, 500, 1000],
            default: '500+',
            output: {
              count: { $sum: 1 },
              productos: { 
                $push: {
                  nombre: '$menu.items.nombre',
                  precio: '$menu.items.precio',
                  restaurante: '$nombre'
                }
              }
            }
          }
        }
      ]),
      
      // Estadísticas generales de menús
      Restaurant.aggregate([
        { $match: { activo: true } },
        {
          $project: {
            nombre: 1,
            tipo: 1,
            ciudad: '$direccion.ciudad',
            totalCategorias: { $size: { $ifNull: ['$menu', []] } },
            totalItems: {
              $sum: {
                $map: {
                  input: { $ifNull: ['$menu', []] },
                  as: 'categoria',
                  in: { $size: { $ifNull: ['$$categoria.items', []] } }
                }
              }
            },
            preciosItems: {
              $reduce: {
                input: {
                  $reduce: {
                    input: { $ifNull: ['$menu', []] },
                    initialValue: [],
                    in: { $concatArrays: ['$$value', { $ifNull: ['$$this.items', []] }] }
                  }
                },
                initialValue: [],
                in: { $concatArrays: ['$$value', [{ $ifNull: ['$$this.precio', 0] }]] }
              }
            }
          }
        },
        {
          $project: {
            nombre: 1,
            tipo: 1,
            ciudad: 1,
            totalCategorias: 1,
            totalItems: 1,
            precioPromedio: { 
              $cond: {
                if: { $gt: [{ $size: '$preciosItems' }, 0] },
                then: { $avg: '$preciosItems' },
                else: 0
              }
            },
            precioMinimo: { 
              $cond: {
                if: { $gt: [{ $size: '$preciosItems' }, 0] },
                then: { $min: '$preciosItems' },
                else: 0
              }
            },
            precioMaximo: { 
              $cond: {
                if: { $gt: [{ $size: '$preciosItems' }, 0] },
                then: { $max: '$preciosItems' },
                else: 0
              }
            }
          }
        }
      ]),
      
      // Top productos más populares (por frecuencia de nombres similares)
      Restaurant.aggregate([
        { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
        { $unwind: '$menu' },
        { $unwind: '$menu.items' },
        {
          $group: {
            _id: { 
              $toLower: { 
                $trim: { 
                  input: '$menu.items.nombre' 
                } 
              } 
            },
            count: { $sum: 1 },
            precioPromedio: { $avg: '$menu.items.precio' },
            precioMinimo: { $min: '$menu.items.precio' },
            precioMaximo: { $max: '$menu.items.precio' },
            restaurantes: { $addToSet: '$nombre' },
            categorias: { $addToSet: '$menu.categoria' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
        {
          $project: {
            nombre: '$_id',
            frecuencia: '$count',
            precioPromedio: { $round: ['$precioPromedio', 2] },
            precioMinimo: '$precioMinimo',
            precioMaximo: '$precioMaximo',
            enRestaurantes: { $size: '$restaurantes' },
            categorias: '$categorias'
          }
        }
      ])
    ]);

    // Procesar productos extremos
    const productosCaros = productosExtremos.slice(0, 10);
    const productosBaratos = productosExtremos.slice(-10).reverse();

    // Calcular estadísticas generales de precios
    const todosLosPrecios = productosExtremos.map(p => p.precio);
    const estadisticasGenerales = {
      precioPromedio: todosLosPrecios.length > 0 ? 
        Math.round((todosLosPrecios.reduce((a, b) => a + b, 0) / todosLosPrecios.length) * 100) / 100 : 0,
      precioMinimo: todosLosPrecios.length > 0 ? Math.min(...todosLosPrecios) : 0,
      precioMaximo: todosLosPrecios.length > 0 ? Math.max(...todosLosPrecios) : 0,
      totalProductos: todosLosPrecios.length,
      mediana: todosLosPrecios.length > 0 ? 
        calcularMediana(todosLosPrecios.sort((a, b) => a - b)) : 0
    };

    res.json({
      success: true,
      message: 'Estadísticas de precios obtenidas exitosamente',
      data: {
        preciosPorTipo,
        preciosPorCiudad,
        productosCaros,
        productosBaratos,
        distribucionPrecios,
        estadisticasMenus,
        topProductos,
        estadisticasGenerales
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para calcular mediana
function calcularMediana(arr) {
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

// Comparativa de precios entre tipos y ciudades
app.get('/api/super-admin/price-comparison', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { tipo, ciudad } = req.query;

    let matchConditions = { activo: true, menu: { $exists: true, $ne: [] } };
    
    if (tipo) matchConditions.tipo = tipo;
    if (ciudad) matchConditions['direccion.ciudad'] = ciudad;

    const comparativa = await Restaurant.aggregate([
      { $match: matchConditions },
      { $unwind: '$menu' },
      { $unwind: '$menu.items' },
      {
        $group: {
          _id: {
            tipo: '$tipo',
            ciudad: '$direccion.ciudad',
            categoria: '$menu.categoria'
          },
          precioPromedio: { $avg: '$menu.items.precio' },
          precioMinimo: { $min: '$menu.items.precio' },
          precioMaximo: { $max: '$menu.items.precio' },
          totalProductos: { $sum: 1 },
          productos: {
            $push: {
              nombre: '$menu.items.nombre',
              precio: '$menu.items.precio',
              restaurante: '$nombre'
            }
          }
        }
      },
      {
        $project: {
          tipo: '$_id.tipo',
          ciudad: '$_id.ciudad',
          categoria: '$_id.categoria',
          precioPromedio: { $round: ['$precioPromedio', 2] },
          precioMinimo: '$precioMinimo',
          precioMaximo: '$precioMaximo',
          totalProductos: '$totalProductos',
          rangoPrecios: { $subtract: ['$precioMaximo', '$precioMinimo'] },
          productos: { $slice: ['$productos', 5] } // Top 5 ejemplos
        }
      },
      { $sort: { precioPromedio: -1 } }
    ]);

    res.json({
      success: true,
      data: { comparativa, filtros: { tipo, ciudad } }
    });

  } catch (error) {
    console.error('Error en comparativa de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Análisis de tendencias de precios (simulado con datos históricos)
app.get('/api/super-admin/price-trends', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Simular tendencias mensuales (en un sistema real usarías fechas reales)
    const tendenciasMensuales = await Restaurant.aggregate([
      { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
      { $unwind: '$menu' },
      { $unwind: '$menu.items' },
      {
        $group: {
          _id: {
            mes: { $month: '$fechaCreacion' },
            año: { $year: '$fechaCreacion' },
            tipo: '$tipo'
          },
          precioPromedio: { $avg: '$menu.items.precio' },
          totalProductos: { $sum: 1 }
        }
      },
      {
        $project: {
          mes: '$_id.mes',
          año: '$_id.año',
          tipo: '$_id.tipo',
          precioPromedio: { $round: ['$precioPromedio', 2] },
          totalProductos: '$totalProductos'
        }
      },
      { $sort: { año: 1, mes: 1 } }
    ]);

    // Análisis de categorías más populares
    const categoriasTendencia = await Restaurant.aggregate([
      { $match: { activo: true, menu: { $exists: true, $ne: [] } } },
      { $unwind: '$menu' },
      {
        $group: {
          _id: '$menu.categoria',
          restaurantesConCategoria: { $addToSet: '$_id' },
          totalItems: { $sum: { $size: { $ifNull: ['$menu.items', []] } } },
          precioPromedio: {
            $avg: {
              $avg: {
                $map: {
                  input: { $ifNull: ['$menu.items', []] },
                  as: 'item',
                  in: '$$item.precio'
                }
              }
            }
          }
        }
      },
      {
        $project: {
          categoria: '$_id',
          popularidad: { $size: '$restaurantesConCategoria' },
          totalItems: '$totalItems',
          precioPromedio: { $round: ['$precioPromedio', 2] }
        }
      },
      { $sort: { popularidad: -1 } },
      { $limit: 15 }
    ]);

    res.json({
      success: true,
      data: {
        tendenciasMensuales,
        categoriasTendencia
      }
    });

  } catch (error) {
    console.error('Error obteniendo tendencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== AGREGAR ESTAS RUTAS A TU server.js =====
// Agregar después de las rutas existentes de super-admin

// Crear nuevo administrador (super admin)
app.post('/api/super-admin/admins', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, rol = 'admin' } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !password || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    // Validar rol
    if (rol && !['admin', 'super-admin'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    // Verificar que el email no existe
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un administrador con este email'
      });
    }

    // Crear nuevo administrador
    const admin = new Admin({
      nombre,
      apellido,
      email,
      password,
      telefono,
      rol,
      activo: true
    });

    await admin.save();

    // Responder sin la contraseña
    const adminResponse = await Admin.findById(admin._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Administrador creado exitosamente',
      data: { admin: adminResponse }
    });

  } catch (error) {
    console.error('Error creando administrador:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está en uso'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear nuevo restaurante con administrador (super admin)
app.post('/api/super-admin/restaurants', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { 
      // Datos del restaurante
      nombre, 
      tipo, 
      descripcion, 
      telefono, 
      email, 
      direccion, 
      redes,
      googleReviewsUrl,
      instagramEmbeds,
      // Administrador (existente o nuevo)
      adminId,
      newAdmin
    } = req.body;

    // Validar campos requeridos del restaurante
    const isObrador = tipo === 'obrador-artesanal';
    
    if (!nombre || !tipo || !descripcion || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'Los campos básicos del restaurante son obligatorios'
      });
    }

    // Teléfono y email son obligatorios excepto para obradores artesanales
    if (!isObrador && (!telefono || !email)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono y email son obligatorios para este tipo de establecimiento'
      });
    }

    // Validar dirección
    if (!direccion.calle || !direccion.ciudad || !direccion.codigoPostal) {
      return res.status(400).json({
        success: false,
        message: 'La dirección completa es obligatoria'
      });
    }

    let finalAdminId = adminId;

    // Para obradores artesanales NO se requiere administrador
    if (isObrador) {
      finalAdminId = null;
    } else {
      // Si se va a crear un nuevo administrador
      if (newAdmin && !adminId) {
        const { nombre: adminNombre, apellido, email: adminEmail, password, telefono: adminTelefono } = newAdmin;

        // Validar campos del nuevo admin
        if (!adminNombre || !apellido || !adminEmail || !password || !adminTelefono) {
          return res.status(400).json({
            success: false,
            message: 'Todos los campos del administrador son obligatorios'
          });
        }

        // Verificar que el email del admin no existe
        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un administrador con este email'
          });
        }

        // Crear el nuevo administrador
        const admin = new Admin({
          nombre: adminNombre,
          apellido,
          email: adminEmail,
          password,
          telefono: adminTelefono,
          rol: 'admin',
          activo: true
        });

        await admin.save();
        finalAdminId = admin._id;

        console.log('✅ Nuevo administrador creado:', adminEmail);
      }

      // Verificar que el administrador existe
      if (!finalAdminId) {
        return res.status(400).json({
          success: false,
          message: 'Debe seleccionar un administrador o crear uno nuevo'
        });
      }

      const admin = await Admin.findById(finalAdminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }

      // Verificar que el admin no tenga ya un restaurante activo
      const existingRestaurant = await Restaurant.findOne({ 
        adminId: finalAdminId, 
        activo: true 
      });

      if (existingRestaurant) {
        return res.status(400).json({
          success: false,
          message: `El administrador ${admin.nombre} ${admin.apellido} ya tiene un restaurante activo: ${existingRestaurant.nombre}`
        });
      }
    }

    // Verificar que no existe un restaurante con el mismo email (solo si tiene email)
    if (email) {
      const existingRestaurantByEmail = await Restaurant.findOne({ email });
      if (existingRestaurantByEmail) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un restaurante con este email'
        });
      }
    }

    // Crear el restaurante
    const restaurant = new Restaurant({
      nombre,
      tipo,
      descripcion,
      telefono,
      email,
      direccion: {
        calle: direccion.calle,
        ciudad: direccion.ciudad,
        codigoPostal: direccion.codigoPostal,
        coordenadas: direccion.coordenadas || {}
      },
      redes: redes || {},
      googleReviewsUrl: googleReviewsUrl || null,
      instagramEmbeds: Array.isArray(instagramEmbeds) ? instagramEmbeds : [],
      adminId: finalAdminId,
      activo: true,
      // Horarios por defecto
      horarios: {
        lunes: { abierto: true, apertura: '09:00', cierre: '22:00' },
        martes: { abierto: true, apertura: '09:00', cierre: '22:00' },
        miercoles: { abierto: true, apertura: '09:00', cierre: '22:00' },
        jueves: { abierto: true, apertura: '09:00', cierre: '22:00' },
        viernes: { abierto: true, apertura: '09:00', cierre: '22:00' },
        sabado: { abierto: true, apertura: '09:00', cierre: '22:00' },
        domingo: { abierto: false, apertura: '09:00', cierre: '22:00' }
      },
      menu: [] // Menú vacío inicial
    });

    await restaurant.save();

    // Poblar con datos del administrador para la respuesta
    const restaurantPopulated = await Restaurant.findById(restaurant._id)
      .populate('adminId', 'nombre apellido email telefono rol activo');

    console.log('✅ Restaurante creado exitosamente:', nombre);

    res.status(201).json({
      success: true,
      message: 'Restaurante creado exitosamente',
      data: { 
        restaurant: restaurantPopulated,
        ...(newAdmin && { newAdminCreated: true })
      }
    });

  } catch (error) {
    console.error('Error creando restaurante:', error);
    
    if (error.code === 11000) {
      // Error de duplicado
      if (error.keyPattern.email) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un restaurante con este email'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Error de duplicado en los datos'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Editar restaurante (super admin)
app.put('/api/super-admin/restaurants/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, tipo, descripcion, telefono, email,
      direccion, redes, googleReviewsUrl, instagramEmbeds
    } = req.body;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    // Update fields
    if (nombre) restaurant.nombre = nombre;
    if (tipo) restaurant.tipo = tipo;
    if (descripcion) restaurant.descripcion = descripcion;
    if (telefono !== undefined) restaurant.telefono = telefono;
    if (email !== undefined) restaurant.email = email;

    if (direccion) {
      if (direccion.calle) restaurant.direccion.calle = direccion.calle;
      if (direccion.ciudad) restaurant.direccion.ciudad = direccion.ciudad;
      if (direccion.codigoPostal) restaurant.direccion.codigoPostal = direccion.codigoPostal;
      if (direccion.coordenadas) {
        restaurant.direccion.coordenadas = direccion.coordenadas;
      }
    }

    if (redes) {
      restaurant.redes = { ...restaurant.redes?.toObject?.() || {}, ...redes };
    }

    if (googleReviewsUrl !== undefined) restaurant.googleReviewsUrl = googleReviewsUrl;
    if (instagramEmbeds !== undefined) restaurant.instagramEmbeds = instagramEmbeds;

    await restaurant.save();

    const updated = await Restaurant.findById(id).populate('adminId', 'nombre apellido email');

    res.json({
      success: true,
      message: 'Restaurante actualizado exitosamente',
      data: { restaurant: updated }
    });

  } catch (error) {
    console.error('Error actualizando restaurante:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Editar administrador (super admin)
app.put('/api/super-admin/admins/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, rol, activo } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Los campos básicos son obligatorios'
      });
    }

    // Validar rol
    if (rol && !['admin', 'super-admin'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }

    // Verificar que el email no esté en uso por otro admin
    if (email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email, _id: { $ne: id } });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso por otro administrador'
        });
      }
    }

    // Actualizar administrador
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      {
        nombre,
        apellido,
        email,
        telefono,
        ...(rol && { rol }),
        ...(activo !== undefined && { activo })
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Administrador actualizado exitosamente',
      data: { admin: updatedAdmin }
    });

  } catch (error) {
    console.error('Error actualizando administrador:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está en uso'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener administradores disponibles (sin restaurante asignado)
app.get('/api/super-admin/available-admins', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Obtener todos los administradores activos
    const allAdmins = await Admin.find({ 
      activo: true,
      rol: 'admin' // Solo admins normales, no super-admins
    }).select('_id nombre apellido email telefono');

    // Obtener IDs de admins que ya tienen restaurante
    const adminsWithRestaurant = await Restaurant.find({ 
      activo: true 
    }).distinct('adminId');

    // Filtrar admins disponibles
    const availableAdmins = allAdmins.filter(admin => 
      !adminsWithRestaurant.some(adminId => adminId.equals(admin._id))
    );

    res.json({
      success: true,
      message: 'Administradores disponibles obtenidos exitosamente',
      data: {
        admins: availableAdmins,
        total: availableAdmins.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo administradores disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===== FUNCIONES DE UTILIDAD =====

// Función para validar URL (puedes agregar esto si no existe)
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Función para limpiar datos de redes sociales
function cleanSocialMediaData(redes) {
  const cleaned = {};
  
  if (redes.facebook && redes.facebook.trim()) {
    const fb = redes.facebook.trim();
    if (isValidUrl(fb) && fb.includes('facebook.com')) {
      cleaned.facebook = fb;
    }
  }
  
  if (redes.instagram && redes.instagram.trim()) {
    cleaned.instagram = redes.instagram.trim();
  }
  
  if (redes.twitter && redes.twitter.trim()) {
    cleaned.twitter = redes.twitter.trim();
  }
  
  if (redes.website && redes.website.trim()) {
    const website = redes.website.trim();
    if (isValidUrl(website)) {
      cleaned.website = website;
    }
  }
  
  return cleaned;
}

console.log('✅ Rutas de Super Admin para creación de restaurantes agregadas');



// ===== AGREGAR ESTAS RUTAS A TU server.js =====
// Colocar después de las rutas existentes de super-admin

// 🗑️ ELIMINAR ADMINISTRADOR PERMANENTEMENTE
app.delete('/api/super-admin/admins/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Verificar que no sea el mismo super admin
    if (id === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminarte a ti mismo'
      });
    }

    // ✅ Buscar el administrador
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }

    // ✅ Prevenir eliminación del último super admin
    if (admin.rol === 'super-admin') {
      const totalSuperAdmins = await Admin.countDocuments({ 
        rol: 'super-admin', 
        activo: true,
        _id: { $ne: id } 
      });
      
      if (totalSuperAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar el último Super Administrador del sistema'
        });
      }
    }

    // ✅ Buscar restaurantes asociados
    const restaurantesAsociados = await Restaurant.find({ adminId: id });
    let imagenesEliminadas = 0;
    
    // ✅ Eliminar imágenes físicas de los restaurantes
    if (restaurantesAsociados.length > 0) {
      for (const restaurant of restaurantesAsociados) {
        if (restaurant.imagenes && restaurant.imagenes.length > 0) {
          restaurant.imagenes.forEach(imagen => {
            if (fs.existsSync(imagen.path)) {
              try {
                fs.unlinkSync(imagen.path);
                imagenesEliminadas++;
                console.log(`🗑️ Imagen eliminada: ${imagen.path}`);
              } catch (err) {
                console.error(`❌ Error eliminando imagen: ${imagen.path}`, err);
              }
            }
          });
        }
      }
      
      // ✅ Eliminar restaurantes de la base de datos
      await Restaurant.deleteMany({ adminId: id });
    }

    // ✅ Eliminar el administrador
    await Admin.findByIdAndDelete(id);

    // ✅ Log de auditoría
    console.log(`🔥 ELIMINACIÓN PERMANENTE - Admin: ${admin.email} por Super Admin: ${req.admin.email}`);

    res.json({
      success: true,
      message: `Administrador "${admin.nombre} ${admin.apellido}" eliminado permanentemente. Se eliminaron ${restaurantesAsociados.length} restaurante(s) y ${imagenesEliminadas} imagen(es).`,
      data: {
        adminEliminado: {
          id: admin._id,
          nombre: admin.nombre,
          apellido: admin.apellido,
          email: admin.email,
          rol: admin.rol
        },
        restaurantesEliminados: restaurantesAsociados.length,
        imagenesEliminadas: imagenesEliminadas
      }
    });

  } catch (error) {
    console.error('❌ Error eliminando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar administrador'
    });
  }
});

// 🗑️ ELIMINAR RESTAURANTE PERMANENTEMENTE
app.delete('/api/super-admin/restaurants/:id', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Buscar el restaurante con información del admin
    const restaurant = await Restaurant.findById(id).populate('adminId', 'nombre apellido email');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    let imagenesEliminadas = 0;

    // ✅ Eliminar imágenes físicas
    if (restaurant.imagenes && restaurant.imagenes.length > 0) {
      restaurant.imagenes.forEach(imagen => {
        if (fs.existsSync(imagen.path)) {
          try {
            fs.unlinkSync(imagen.path);
            imagenesEliminadas++;
            console.log(`🗑️ Imagen eliminada: ${imagen.path}`);
          } catch (err) {
            console.error(`❌ Error eliminando imagen: ${imagen.path}`, err);
          }
        }
      });
    }

    // ✅ Guardar información antes de eliminar
    const restauranteInfo = {
      id: restaurant._id,
      nombre: restaurant.nombre,
      tipo: restaurant.tipo,
      ciudad: restaurant.direccion?.ciudad || 'N/A',
      administrador: restaurant.adminId ? 
        `${restaurant.adminId.nombre} ${restaurant.adminId.apellido} (${restaurant.adminId.email})` : 
        'Administrador no encontrado'
    };

    // ✅ Eliminar de la base de datos
    await Restaurant.findByIdAndDelete(id);

    // ✅ Log de auditoría
    console.log(`🔥 ELIMINACIÓN PERMANENTE - Restaurante: ${restaurant.nombre} por Super Admin: ${req.admin.email}`);

    res.json({
      success: true,
      message: `Restaurante "${restaurant.nombre}" eliminado permanentemente. Se eliminaron ${imagenesEliminadas} imagen(es).`,
      data: {
        restauranteEliminado: restauranteInfo,
        imagenesEliminadas: imagenesEliminadas
      }
    });

  } catch (error) {
    console.error('❌ Error eliminando restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar restaurante'
    });
  }
});

// 📊 OBTENER ESTADÍSTICAS DE ELIMINACIONES (OPCIONAL)
app.get('/api/super-admin/deletion-stats', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    // Si implementas eliminación suave, puedes obtener estadísticas
    const stats = {
      // Estas serían las estadísticas si usaras eliminación suave
      adminsEliminados: 0, // await Admin.countDocuments({ eliminado: true })
      restaurantesEliminados: 0, // await Restaurant.countDocuments({ eliminado: true })
      // Con eliminación permanente, estas estadísticas no están disponibles
      message: 'Estadísticas de eliminación no disponibles con eliminación permanente'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// 🔍 BUSCAR ANTES DE ELIMINAR (Función de ayuda)
app.get('/api/super-admin/admins/:id/deletion-impact', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }

    const restaurantesAsociados = await Restaurant.find({ adminId: id });
    let totalImagenes = 0;

    restaurantesAsociados.forEach(restaurant => {
      if (restaurant.imagenes) {
        totalImagenes += restaurant.imagenes.length;
      }
    });

    res.json({
      success: true,
      message: 'Impacto de eliminación calculado',
      data: {
        admin: {
          nombre: `${admin.nombre} ${admin.apellido}`,
          email: admin.email,
          rol: admin.rol
        },
        impacto: {
          restaurantesAfectados: restaurantesAsociados.length,
          imagenesAfectadas: totalImagenes,
          restaurantes: restaurantesAsociados.map(r => ({
            nombre: r.nombre,
            tipo: r.tipo,
            imagenes: r.imagenes ? r.imagenes.length : 0
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error calculando impacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// 🚨 ELIMINACIÓN MASIVA (CUIDADO - Solo para emergencias)
app.delete('/api/super-admin/admins/bulk-delete', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { adminIds, confirmPhrase } = req.body;
    
    // ✅ Verificación de seguridad
    if (confirmPhrase !== 'ELIMINAR PERMANENTEMENTE') {
      return res.status(400).json({
        success: false,
        message: 'Frase de confirmación incorrecta'
      });
    }

    if (!Array.isArray(adminIds) || adminIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una lista válida de IDs'
      });
    }

    // ✅ Verificar que no incluya al admin actual
    if (adminIds.includes(req.admin.id)) {
      return res.status(400).json({
        success: false,
        message: 'No puedes incluirte en la eliminación masiva'
      });
    }

    let resultados = {
      adminsEliminados: 0,
      restaurantesEliminados: 0,
      imagenesEliminadas: 0,
      errores: []
    };

    for (const adminId of adminIds) {
      try {
        const admin = await Admin.findById(adminId);
        if (!admin) {
          resultados.errores.push(`Admin ${adminId} no encontrado`);
          continue;
        }

        // Eliminar restaurantes y sus imágenes
        const restaurantes = await Restaurant.find({ adminId });
        for (const restaurant of restaurantes) {
          if (restaurant.imagenes) {
            restaurant.imagenes.forEach(imagen => {
              if (fs.existsSync(imagen.path)) {
                fs.unlinkSync(imagen.path);
                resultados.imagenesEliminadas++;
              }
            });
          }
        }

        await Restaurant.deleteMany({ adminId });
        resultados.restaurantesEliminados += restaurantes.length;

        await Admin.findByIdAndDelete(adminId);
        resultados.adminsEliminados++;

      } catch (error) {
        resultados.errores.push(`Error eliminando admin ${adminId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Eliminación masiva completada. ${resultados.adminsEliminados} admins eliminados.`,
      data: resultados
    });

  } catch (error) {
    console.error('Error en eliminación masiva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



// ===== RUTAS DE ITINERARIOS (FAVORITOS AVANZADOS) =====
const Itinerario = require('./models/Itinerario');

// 1. Crear nuevo itinerario
app.post('/api/itinerarios', verificarToken, async (req, res) => {
  try {
    const { nombre, descripcion, dias } = req.body;
    
    // Obtener el ID del usuario. Dependiendo de si es admin o turista, verificarToken puede dejar req.admin o req.turista o req.user
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre del itinerario es obligatorio' });
    }

    const nuevoItinerario = new Itinerario({
      usuario: userId,
      nombre,
      descripcion,
      dias: dias || [{ nombreDia: 'Día 1' }]
    });

    await nuevoItinerario.save();
    
    res.status(201).json({
      success: true,
      data: nuevoItinerario
    });
  } catch (error) {
    console.error('Error creando itinerario:', error);
    res.status(500).json({ success: false, message: 'Error al crear itinerario' });
  }
});

// 2. Obtener mis itinerarios
app.get('/api/itinerarios/me', verificarToken, async (req, res) => {
  try {
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const itinerarios = await Itinerario.find({ usuario: userId }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: itinerarios
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener itinerarios' });
  }
});

// 3. Obtener detalle de itinerario (con populación básica)
app.get('/api/itinerarios/:id', verificarToken, async (req, res) => {
  try {
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);
    const itinerario = await Itinerario.findOne({ _id: req.params.id, usuario: userId });
    
    if (!itinerario) {
      return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    }
    
    // Populación nativa no es tan directa por refs mixtos, pero devolvemos la estructura
    res.json({ success: true, data: itinerario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener detalle de itinerario' });
  }
});

// 4. Agregar actividad a un día
app.post('/api/itinerarios/:id/actividad', verificarToken, async (req, res) => {
  try {
    const { diaId, hora, tipoLugar, lugarId, notas } = req.body;
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);
    
    const itinerario = await Itinerario.findOne({ _id: req.params.id, usuario: userId });
    if (!itinerario) return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    
    // Buscar el día
    let diaIndex = itinerario.dias.findIndex(d => d._id.toString() === diaId);
    
    // Si no mandan diaId, agregar al primer día por defecto
    if (diaIndex === -1 && itinerario.dias.length > 0) {
      diaIndex = 0;
    } else if (diaIndex === -1 && itinerario.dias.length === 0) {
      // Si no hay días, creamos uno
      itinerario.dias.push({ nombreDia: 'Día 1' });
      diaIndex = 0;
    }
    
    itinerario.dias[diaIndex].actividades.push({
      hora,
      tipoLugar,
      lugarId,
      notas
    });
    
    await itinerario.save();
    res.json({ success: true, message: 'Actividad agregada', data: itinerario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al agregar actividad' });
  }
});

// 5. Eliminar actividad
app.delete('/api/itinerarios/:id/actividad/:actividadId', verificarToken, async (req, res) => {
  try {
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);
    const itinerario = await Itinerario.findOne({ _id: req.params.id, usuario: userId });
    
    if (!itinerario) return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    
    let eliminada = false;
    for (let dia of itinerario.dias) {
      const actIndex = dia.actividades.findIndex(a => a._id.toString() === req.params.actividadId);
      if (actIndex !== -1) {
        dia.actividades.splice(actIndex, 1);
        eliminada = true;
        break;
      }
    }
    
    if (!eliminada) return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
    
    await itinerario.save();
    res.json({ success: true, message: 'Actividad eliminada', data: itinerario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar actividad' });
  }
});

// 6. Eliminar itinerario
app.delete('/api/itinerarios/:id', verificarToken, async (req, res) => {
  try {
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);
    const result = await Itinerario.findOneAndDelete({ _id: req.params.id, usuario: userId });
    
    if (!result) return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    
    res.json({ success: true, message: 'Itinerario eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar itinerario' });
  }
});

// ===== MANEJO DE ERRORES =====
app.use('*', (req, res) => {
  // Si es una petición de navegador, mostrar página 404 bonita
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
  // Para peticiones API, responder con JSON
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// ===== INICIALIZAR WEBSOCKET Y SERVIDOR =====
let wsServer = null;

try {
  // Intentar importar el WebSocket Server
  const WebSocketServer = require('./websocket/websocketServer');
  const server = http.createServer(app);
  wsServer = new WebSocketServer(server);
  global.wsServer = wsServer;
  
  server.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO CON WEBSOCKET =====');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectada' : 'Desconectada'}`);
    console.log('============================================\n');
  });
} catch (error) {
  console.log('⚠️  WebSocket no disponible, iniciando servidor básico...');
  app.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO =====');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectada' : 'Desconectada'}`);
    console.log('===============================\n');
  });
}

// ===== MANEJO GRACEFUL DE CIERRE =====
process.on('SIGTERM', () => {
  console.log('🔄 Cerrando servidor...');
  mongoose.connection.close(false, () => {
    console.log('✅ Conexión MongoDB cerrada');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  mongoose.connection.close(false, () => {
    console.log('✅ Conexión MongoDB cerrada');
    process.exit(0);
  });
});

module.exports = app;