const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const AirbnbSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del alojamiento es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    maxlength: [1000, 'La descripción no puede tener más de 1000 caracteres']
  },
  precioPorNoche: {
    type: Number,
    required: [true, 'El precio por noche es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
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
    coordenadas: {
      latitud: Number,
      longitud: Number
    }
  },
  tipoPropiedad: {
    type: String,
    // ✅ CORRECCIÓN: Solo las 3 opciones que quieres
    enum: ['cabaña', 'casa', 'zona_camping'],
    required: true
  },
  servicios: [{
    type: String,
    enum: [
      'wifi',
      'cocina',
      'lavadora',
      'aire_acondicionado',
      'calefaccion',
      'tv',
      'estacionamiento',
      'piscina',
      'gym',
      'balcon_terraza',
      'jardin',
      'bbq',
      'chimenea',
      'jacuzzi',
      'mascotas_permitidas',
      'acceso_discapacitados',
      'entrada_independiente',
      'espacio_trabajo',
      'restaurante',
      'spa',
      'desayuno',
      'servicio_transporte',
      'salon_eventos'
    ]
  }],

  metodosPago: [{
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta'],
    required: false
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
    huespedes: {
      type: Number,
      required: true,
      min: 1
    },
    habitaciones: Number,
    camas: Number,
    banos: Number
  },
  caracteristicas: {
    metrosCuadrados: Number,
    piso: Number,
    tieneElevador: Boolean,
    amoblado: {
      type: Boolean,
      default: true
    },
    nuevaConstruccion: Boolean
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

  politicas: {
    checkIn: mongoose.Schema.Types.Mixed, // Can be string "15:00" or {desde, hasta}
    checkOut: String, // "12:00"
    estanciaMinima: {
      type: Number,
      default: 1
    },
    estanciaMaxima: Number,
    cancelacion: {
      type: String,
      enum: ['flexible', 'moderada', 'estricta'],
      default: 'moderada'
    },
    recepcion: String,
    reglasAdicionales: [String]
  },
  instalaciones: [String],
  accesibilidad: {
    rampas: { type: Boolean, default: false },
    plantaBaja: { type: Boolean, default: false },
    banoAdaptado: { type: Boolean, default: false },
    elevador: { type: Boolean, default: false },
    senalizacionBraille: { type: Boolean, default: false }
  },
  comodidadesExtra: [{
    type: String
  }],
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
  disponibilidad: {
    fechaInicio: Date,
    fechaFin: Date,
    diasBloqueados: [Date],
    disponible: {
      type: Boolean,
      default: true
    }
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
      limpieza: { type: Number, min: 0, max: 5, default: 0 },
      comunicacion: { type: Number, min: 0, max: 5, default: 0 },
      llegada: { type: Number, min: 0, max: 5, default: 0 },
      precision: { type: Number, min: 0, max: 5, default: 0 },
      ubicacion: { type: Number, min: 0, max: 5, default: 0 },
      relacion_precio_calidad: { type: Number, min: 0, max: 5, default: 0 }
    }
  },
  verificado: {
    type: Boolean,
    default: false
  },
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
    index: true
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas optimizadas
AirbnbSchema.index({ 'ubicacion.ciudad': 1 });
AirbnbSchema.index({ precioPorNoche: 1 });
AirbnbSchema.index({ 'capacidad.huespedes': 1 });
AirbnbSchema.index({ tipoPropiedad: 1 });
AirbnbSchema.index({ 'calificacion.promedio': -1 });
AirbnbSchema.index({ esEcologico: 1 });

// Al público solo salen las reseñas aprobadas (las pendientes las ve el super admin)
AirbnbSchema.set('toJSON', {
  transform(doc, ret) {
    if (Array.isArray(ret.reviews)) ret.reviews = ret.reviews.filter((r) => !r.estado || r.estado === 'aprobada');
    return ret;
  }
});

// Visitas y clics (ocultos en las respuestas públicas)
AirbnbSchema.add(require('../utils/estadisticas').camposEstadisticas);

module.exports = conexion.model('Airbnb', AirbnbSchema);