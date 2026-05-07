const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  titulo: {
    type: String,
    required: [true, 'El título del evento es obligatorio'],
    trim: true,
    maxlength: [120, 'El título no puede exceder 120 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  tipo: {
    type: String,
    enum: ['musica-en-vivo', 'noche-tematica', 'degustacion', 'happy-hour', 'karaoke', 'taller', 'especial', 'otro'],
    default: 'especial'
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha del evento es obligatoria']
  },
  horaInicio: {
    type: String,
    required: [true, 'La hora de inicio es obligatoria']
  },
  horaFin: {
    type: String,
    default: ''
  },
  recurrente: {
    type: Boolean,
    default: false
  },
  diasRecurrencia: {
    type: [String],
    enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
    default: []
  },
  imagen: {
    url: { type: String, default: '' },
    cloudinaryId: { type: String, default: '' }
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

eventoSchema.index({ restaurantId: 1, fecha: 1 });
eventoSchema.index({ fecha: 1, activo: 1 });

module.exports = mongoose.model('Evento', eventoSchema);
