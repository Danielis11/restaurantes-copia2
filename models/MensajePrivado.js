const mongoose = require('mongoose');

const mensajePrivadoSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  nombre: {
    type: String,
    trim: true,
    default: 'Anónimo'
  },
  contacto: {
    type: String,
    trim: true // Opcional, por si el gerente le quiere regresar la llamada
  },
  mensaje: {
    type: String,
    required: true,
    trim: true
  },
  esQueja: {
    type: Boolean,
    default: true
  },
  leido: {
    type: Boolean,
    default: false
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MensajePrivado', mensajePrivadoSchema);
