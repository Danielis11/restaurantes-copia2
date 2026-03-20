const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true,
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
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
    select: false // No incluir en consultas por defecto
  },
  passwordPlano: {
    type: String,
    select: false // Solo disponible para super-admin
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Formato de teléfono inválido']
  },
  rol: {
    type: String,
    enum: ['admin', 'super-admin', 'admin-turismo'],
    default: 'admin'
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  ultimoAcceso: {
    type: Date,
    default: Date.now
  },
  configuracion: {
    notificaciones: {
      type: Boolean,
      default: true
    },
    tema: {
      type: String,
      enum: ['claro', 'oscuro'],
      default: 'claro'
    }
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
});

// Middleware para hashear la contraseña antes de guardar
adminSchema.pre('save', async function(next) {
  // Solo hashear si la contraseña fue modificada
  if (!this.isModified('password')) return next();
  
  try {
    // Guardar contraseña en texto plano para referencia del super-admin
    this.passwordPlano = this.password;
    // Hashear contraseña con costo de 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
adminSchema.methods.compararPassword = async function(passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

// Método para actualizar último acceso
adminSchema.methods.actualizarUltimoAcceso = function() {
  this.ultimoAcceso = Date.now();
  return this.save({ validateBeforeSave: false });
};

// Método para obtener nombre completo
adminSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

// Asegurar que los virtuales se incluyan en JSON
adminSchema.set('toJSON', { virtuals: true });
adminSchema.set('toObject', { virtuals: true });

// Índices
adminSchema.index({ email: 1 });
adminSchema.index({ activo: 1 });

module.exports = mongoose.model('Admin', adminSchema);