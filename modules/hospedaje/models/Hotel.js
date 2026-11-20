const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const HotelSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del hotel es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
  },
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  imagenes: [{
    type: String // URLs de las imágenes
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
    lat: Number,
    lng: Number
  },
  servicios: [{
    type: String,
    enum: ['wifi', 'piscina', 'gym', 'spa', 'restaurante', 'bar', 'estacionamiento', 'aireacondicionado', 'television', 'desayuno']
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
    redesSociales: {
      facebook: String,
      instagram: String,
      twitter: String,
      tiktok: String
    }
  },
  capacidad: {
    habitaciones: Number,
    personasMax: Number
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
    }
  },
  // Descripción detallada de habitaciones
  descripcionHabitaciones: {
    type: String,
    maxlength: [1000, 'La descripción de habitaciones no puede tener más de 1000 caracteres']
  },
  // Métodos de Reservación
  reservaciones: {
    whatsapp: String,
    telefono: String,
    url: String, // Link a Booking, Airbnb, o sitio web directo
    indicaciones: String // Ej: "Mandar mensaje de texto con fechas"
  },
  // Políticas del hospedaje
  politicas: {
    checkIn: { type: String, default: '15:00' },
    checkOut: { type: String, default: '12:00' },
    cancelacion: {
      type: String,
      enum: ['flexible', 'moderada', 'estricta'],
      default: 'moderada'
    },
    reglasAdicionales: [String],
    recepcion: { type: String, default: '24 horas' }
  },
  // Instalaciones disponibles
  instalaciones: [{
    type: String,
    enum: ['piscina', 'areas_verdes', 'asadores', 'gimnasio', 'sala_estar', 'terraza', 'jardin', 'area_juegos', 'salon_eventos', 'lavanderia', 'zona_camping']
  }],
  // Accesibilidad
  accesibilidad: {
    rampas: { type: Boolean, default: false },
    plantaBaja: { type: Boolean, default: false },
    banoAdaptado: { type: Boolean, default: false },
    elevador: { type: Boolean, default: false },
    senalizacionBraille: { type: Boolean, default: false }
  },
  // Comodidades personalizadas dinámicas
  comodidadesExtra: [{
    type: String
  }],
  // Distancias a puntos clave
  distancias: {
    centroHistorico: String,
    terminalAutobuses: String,
    aeropuerto: String,
    zonaTuristica: String,
    misiones: String,
    naturaleza: String,
    puntosExtra: [{
      nombre: String,
      distancia: String
    }]
  },
  // Métodos de pago
  metodosPago: [{
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta']
  }],
  // Reseñas de turistas
  reviews: [{
    // Moderación: las nuevas llegan pendientes; las viejas (sin estado) cuentan como aprobadas
    estado: { type: String, enum: ['pendiente', 'aprobada', 'rechazada'], default: 'aprobada' },
    // Respuesta pública del establecimiento
    respuesta: { type: String, trim: true, maxlength: 1000 },
    fechaRespuesta: Date,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nombreUsuario: {
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
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  // Promociones y anuncios (carrusel)
  promociones: [{
    titulo: { type: String, trim: true },
    descripcion: { type: String, maxlength: 500 },
    imagen: String, // URL o string Base64
    fechaInicio: Date,
    fechaFin: Date,
    activo: { type: Boolean, default: true }
  }],
  // 🌿 NUEVO CAMPO: Etiqueta de alojamiento ecológico
  esEcologico: {
    type: Boolean,
    default: false,
    index: true // Índice para búsquedas rápidas por este filtro
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice para búsquedas por ubicación
HotelSchema.index({ 'ubicacion.ciudad': 1 });
HotelSchema.index({ precio: 1 });
HotelSchema.index({ calificacion: -1 });
// Nuevo índice para filtrar hoteles ecológicos
HotelSchema.index({ esEcologico: 1 });

// Al público solo salen las reseñas aprobadas (las pendientes las ve el super admin)
HotelSchema.set('toJSON', {
  transform(doc, ret) {
    if (Array.isArray(ret.reviews)) ret.reviews = ret.reviews.filter((r) => !r.estado || r.estado === 'aprobada');
    return ret;
  }
});

module.exports = conexion.model('Hotel', HotelSchema);