const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  // Verificación de correo. Las cuentas viejas (sin el campo) y las de Google cuentan como verificadas;
  // las nuevas con contraseña se crean en false hasta que escriben el código que les llega.
  emailVerificado: { type: Boolean, default: true },
  codigoVerificacion: { type: String, select: false },          // guardado con hash
  codigoVerificacionExpira: { type: Date, select: false },
  codigoVerificacionEnviado: { type: Date, select: false },
  intentosVerificacion: { type: Number, default: 0, select: false },
  favoritos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  experienciasFavoritas: [{
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: true
    },
    tipoMeGusta: {
      type: String,
      enum: ['Me encantó', 'Para ir en familia', 'Aventura pendiente', 'Favorito general'],
      default: 'Favorito general'
    },
    fechaGuardado: {
      type: Date,
      default: Date.now
    }
  }],
  agenciasFavoritas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agencia'
  }],
  notificaciones: [{
    mensaje: String,
    leida: {
      type: Boolean,
      default: false
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    tipo: {
      type: String, // ej. 'recordatorio-reseña'
      default: 'info'
    }
  }],
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.compararPassword = async function(passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

// Método para generar código de recuperación
userSchema.methods.crearResetToken = function() {
  const code = require('crypto').randomInt(100000, 1000000).toString(); // código de 6 dígitos
  this.resetPasswordToken = code;
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutos
  return code;
};

// Crea un código de 6 dígitos para confirmar el correo (se guarda con hash, vence en 30 min)
userSchema.methods.crearCodigoVerificacion = function() {
  const crypto = require('crypto');
  const codigo = crypto.randomInt(100000, 1000000).toString();
  this.codigoVerificacion = crypto.createHash('sha256').update(codigo).digest('hex');
  this.codigoVerificacionExpira = new Date(Date.now() + 30 * 60 * 1000);
  this.codigoVerificacionEnviado = new Date();
  this.intentosVerificacion = 0;
  return codigo;
};

// Revisa un código escrito por el usuario
userSchema.methods.codigoVerificacionValido = function(codigo) {
  const crypto = require('crypto');
  if (!this.codigoVerificacion || !this.codigoVerificacionExpira || this.codigoVerificacionExpira < new Date()) return false;
  const hash = crypto.createHash('sha256').update(String(codigo || '').trim()).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(this.codigoVerificacion));
};

const User = mongoose.model('User', userSchema);
module.exports = User;
