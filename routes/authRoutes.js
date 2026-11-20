// Autenticación de administradores: login, Google, registro, perfil y recuperación de contraseña
// (Movido desde server.js sin cambios de lógica)
const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { verificarToken, generarToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimits');

const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

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

// POST /api/auth/google
router.post('/api/auth/google', async (req, res) => {
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
router.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Intento de login:', typeof req.body.email === 'string' ? req.body.email : '(email inválido)');
    
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
router.post('/api/auth/register', async (req, res) => {
  // Antes cualquiera podía crearse una cuenta de ADMIN y publicar un restaurante.
  // Ahora los admins los crea el super-admin desde su panel, salvo que se active explícitamente.
  if (process.env.ALLOW_ADMIN_SELF_REGISTER !== 'true') {
    return res.status(403).json({
      success: false,
      message: 'El registro de administradores está deshabilitado. Contacta al administrador del sitio.'
    });
  }
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
router.get('/api/auth/profile', verificarToken, async (req, res) => {
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
router.get('/api/auth/verify-token', verificarToken, async (req, res) => {
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
router.put('/api/auth/profile', verificarToken, async (req, res) => {
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
router.put('/api/auth/change-password', verificarToken, async (req, res) => {
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

// POST /api/auth/forgot-password - Solicitar código de recuperación
router.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
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
      resetCode = require('crypto').randomInt(100000, 1000000).toString();
      user.resetPasswordToken = resetCode;
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    }
    await user.save({ validateBeforeSave: false });

    // Enviar email con el código
    const mailOptions = {
      from: `"Turismo Jalpan de Serra" <${process.env.EMAIL_USER}>`,
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
router.post('/api/auth/reset-password', authLimiter, async (req, res) => {
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

module.exports = router;
