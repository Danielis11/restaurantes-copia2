const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const ReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nombreUsuario: {
    type: String,
    required: true
  },
  hospedajeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  tipoHospedaje: {
    type: String,
    enum: ['hotel', 'cabana', 'airbnb'],
    required: true
  },
  nombreHospedaje: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comentario: {
    type: String,
    required: true
  },
  // Moderación (las viejas sin estado cuentan como aprobadas)
  estado: {
    type: String,
    enum: ['pendiente', 'aprobada', 'rechazada'],
    default: 'aprobada'
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para consultas comunes
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ hospedajeId: 1 });
ReviewSchema.index({ tipoHospedaje: 1 });

module.exports = conexion.model('Review', ReviewSchema, 'resenashospedaje');
