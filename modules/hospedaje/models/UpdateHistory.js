const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const UpdateHistorySchema = new mongoose.Schema({
  hospedajeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  nombreHospedaje: {
    type: String,
    required: true
  },
  tipoHospedaje: {
    type: String,
    enum: ['hotel', 'cabana', 'airbnb'],
    required: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nombreUsuario: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now,
    index: true
  },
  camposModificados: [{
    type: String
  }]
}, {
  timestamps: true
});

// Índice compuesto para búsquedas rápidas en el dashboard admin
UpdateHistorySchema.index({ fecha: -1, tipoHospedaje: 1 });

module.exports = conexion.model('UpdateHistory', UpdateHistorySchema);
