const mongoose = require('mongoose');

const OfertaFlashSchema = new mongoose.Schema({
  restaurante: {
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
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: 120
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 300
  },
  fechaInicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria']
  },
  fechaFin: {
    type: Date,
    required: [true, 'La fecha de fin es obligatoria']
  },
  horaInicio: {
    type: String, // "18:00"
    default: ''
  },
  horaFin: {
    type: String, // "20:00"
    default: ''
  },
  activa: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#ef4444'
  }
}, {
  timestamps: true
});

// Index para consultas de ofertas activas
OfertaFlashSchema.index({ fechaInicio: 1, fechaFin: 1, activa: 1 });

module.exports = mongoose.model('OfertaFlash', OfertaFlashSchema);
