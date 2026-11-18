const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const TourOperadoraSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la tour operadora es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    maxlength: [1000, 'La descripción no puede tener más de 1000 caracteres']
  },
  imagenes: [{
    type: String
  }],
  propietario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ubicacion: {
    direccion: String,
    ciudad: String,
    estado: String,
    codigoPostal: String,
    pais: {
      type: String,
      default: 'México'
    }
  },
  tours: [{
    nombre: {
      type: String,
      required: true
    },
    descripcion: String,
    duracion: {
      horas: Number,
      dias: Number
    },
    precio: {
      type: Number,
      required: true,
      min: 0
    },
    capacidadMaxima: Number,
    incluye: [String], // ["transporte", "comida", "guía", "entradas"]
    dificultad: {
      type: String,
      enum: ['facil', 'moderado', 'dificil', 'extremo'],
      default: 'facil'
    },
    tipoTour: {
      type: String,
      enum: ['aventura', 'cultural', 'gastronomico', 'naturaleza', 'historico', 'deportivo', 'fotografico', 'religioso'],
      required: true
    },
    fechasDisponibles: [Date],
    activo: {
      type: Boolean,
      default: true
    }
  }],
  servicios: [{
    type: String,
    enum: [
      'transporte_incluido',
      'guia_certificado', 
      'equipo_incluido',
      'seguro_viaje',
      'comidas_incluidas',
      'hotel_incluido',
      'grupos_privados',
      'tours_personalizados',
      'pickup_hotel',
      'multiidioma'
    ]
  }],
  contacto: {
    telefono: {
      type: String,
      match: [/^\d{10}$/, 'El teléfono debe tener 10 dígitos']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    sitioWeb: String,
    whatsapp: String,
    redesSociales: {
      facebook: String,
      instagram: String,
      twitter: String
    }
  },
  certificaciones: [{
    nombre: String,
    numero: String,
    vigencia: Date,
    entidadCertificadora: String
  }],
  politicas: {
    cancelacion: {
      type: String,
      enum: ['flexible', 'moderada', 'estricta'],
      default: 'moderada'
    },
    anticipacionReserva: {
      type: Number,
      default: 24 // horas
    },
    edadMinima: Number,
    restricciones: [String]
  },
  calificacion: {
    promedio: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    categorias: {
      organizacion: { type: Number, min: 0, max: 5, default: 0 },
      guias: { type: Number, min: 0, max: 5, default: 0 },
      valor: { type: Number, min: 0, max: 5, default: 0 },
      seguridad: { type: Number, min: 0, max: 5, default: 0 }
    }
  },
  verificada: {
    type: Boolean,
    default: false
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
TourOperadoraSchema.index({ 'ubicacion.ciudad': 1 });
TourOperadoraSchema.index({ 'tours.tipoTour': 1 });
TourOperadoraSchema.index({ 'tours.precio': 1 });
TourOperadoraSchema.index({ 'calificacion.promedio': -1 });

module.exports = conexion.model('TourOperadora', TourOperadoraSchema);