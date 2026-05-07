const mongoose = require('mongoose');

const BolsaTrabajoSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  titulo: {
    type: String,
    required: [true, 'El título de la vacante es obligatorio'],
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción o requisitos son obligatorios'],
    trim: true,
    maxlength: 500
  },
  sueldo: {
    type: String, // String para permitir texto como "$1500 semanales más propinas"
    trim: true,
    default: ''
  },
  contacto: {
    type: String,
    required: [true, 'Un método de contacto o instrucción es obligatorio'],
    trim: true,
    maxlength: 200
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BolsaTrabajo', BolsaTrabajoSchema);
