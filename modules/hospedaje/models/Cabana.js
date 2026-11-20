const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const CabanaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la cabaña es obligatorio'],
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
    lat: Number,
    lng: Number
  },

  // ✅ SERVICIOS COMO ARRAY (igual que Airbnb exitoso)
  servicios: [{
    type: String,
    enum: [
      'wifi',
      'estacionamiento',
      'aireacondicionado',
      'restaurante',
      'piscina',
      'mascotas',
      'transporte',
      'accesibilidad',
      'television',
      'eventos',
      'gimnasio',
      'spa',
      'desayuno',
      // Servicios específicos de cabañas
      'cocina',
      'chimenea',
      'bbq',
      'calefaccion',
      'jardin',
      'terraza'
    ]
  }],

  // ✅ NUEVO: MÉTODOS DE PAGO (igual que Airbnb y Hoteles)
  metodosPago: [{
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta']
  }],

  contacto: {
    telefono: {
      type: String,
      match: [/^\d{10}$/, 'El teléfono debe tener 10 dígitos']
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Email no válido']
    },
    sitioWeb: String,
    horario: String,
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
      min: [1, 'Debe haber al menos 1 huésped']
    },
    habitaciones: {
      type: Number,
      required: true,
      min: [1, 'Debe haber al menos 1 habitación']
    },
    camas: {
      type: Number,
      min: [0, 'El número de camas no puede ser negativo']
    }
  },
  caracteristicas: {
    metrosCuadrados: {
      type: Number,
      min: [0, 'Los metros cuadrados no pueden ser negativos']
    },
    tipoPropiedad: {
      type: String,
      enum: ['cabana', 'casa_rural', 'chalet', 'bungalow']
    },
    esConjunto: {
      type: Boolean,
      default: false
    }
  },

  // Detalles de cabañas individuales si es un conjunto
  detallesCabanas: [{
    nombre: {
      type: String,
      trim: true
    },
    descripcion: {
      type: String,
      maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
    },
    imagen: {
      type: String
    },
    capacidad: {
      huespedes: {
        type: Number,
        min: [1, 'Al menos 1 huésped']
      },
      camas: {
        type: Number,
        min: [0, 'Camas no pueden ser negativas']
      },
      habitaciones: {
        type: Number,
        min: [1, 'Al menos 1 habitación']
      }
    }
  }],

  // Disponibilidad para conjuntos
  conjunto: {
    totalCabanas: {
      type: Number,
      min: 1,
      default: 1
    },
    cabanasDisponibles: {
      type: Number,
      min: 0,
      default: function () {
        return this.conjunto?.totalCabanas || 1;
      }
    }
  },

  // Disponibilidad individual
  individual: {
    disponible: {
      type: Boolean,
      default: true
    }
  },

  calificacion: {
    promedio: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    numeroReviews: {
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
    recepcion: { type: String, default: 'Horario limitado' }
  },
  // Instalaciones disponibles
  instalaciones: [{
    type: String,
    enum: ['piscina', 'areas_verdes', 'asadores', 'gimnasio', 'sala_estar', 'terraza', 'jardin', 'area_juegos', 'salon_eventos', 'lavanderia', 'zona_camping', 'mirador']
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

// Índices para optimización
CabanaSchema.index({ 'ubicacion.ciudad': 1 });
CabanaSchema.index({ precio: 1 });
CabanaSchema.index({ 'calificacion.promedio': -1 });
CabanaSchema.index({ esEcologico: 1 });
CabanaSchema.index({ 'caracteristicas.esConjunto': 1 });
CabanaSchema.index({ 'conjunto.cabanasDisponibles': 1 });
CabanaSchema.index({ 'individual.disponible': 1 });

// Método virtual para disponibilidad
CabanaSchema.virtual('disponibilidad').get(function () {
  if (this.caracteristicas.esConjunto) {
    return {
      tipo: 'conjunto',
      total: this.conjunto.totalCabanas,
      disponibles: this.conjunto.cabanasDisponibles,
      ocupadas: this.conjunto.totalCabanas - this.conjunto.cabanasDisponibles
    };
  } else {
    return {
      tipo: 'individual',
      disponible: this.individual.disponible
    };
  }
});

// Método para actualizar disponibilidad
CabanaSchema.methods.actualizarDisponibilidad = function (nuevaDisponibilidad) {
  if (this.caracteristicas.esConjunto) {
    this.conjunto.cabanasDisponibles = Math.max(0, Math.min(nuevaDisponibilidad, this.conjunto.totalCabanas));
  } else {
    this.individual.disponible = Boolean(nuevaDisponibilidad);
  }
  return this.save();
};

// Al público solo salen las reseñas aprobadas (las pendientes las ve el super admin)
CabanaSchema.set('toJSON', {
  transform(doc, ret) {
    if (Array.isArray(ret.reviews)) ret.reviews = ret.reviews.filter((r) => !r.estado || r.estado === 'aprobada');
    return ret;
  }
});

module.exports = conexion.model('Cabana', CabanaSchema);