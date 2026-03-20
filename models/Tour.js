const mongoose = require('mongoose');

// Sub-schema para bilingüe
const bilingueSchema = {
  es: { type: String, default: '' },
  en: { type: String, default: '' },
  fr: { type: String, default: '' }
};

const bilingueItemSchema = new mongoose.Schema({
  es: { type: String, default: '' },
  en: { type: String, default: '' },
  fr: { type: String, default: '' }
}, { _id: false });

// Reutilizando el estándar de imágenes del proyecto
const imagenSchema = new mongoose.Schema({
  filename: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  size: { type: Number, required: false, min: 0, default: 0 },
  uploadDate: { type: Date, default: Date.now },
  path: { type: String, required: false },
  cloudinaryId: { type: String, required: false }
}, { _id: true });

const tourSchema = new mongoose.Schema({
  nombre: {
    type: bilingueItemSchema,
    required: [true, 'El nombre del tour es obligatorio'],
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true
  },
  descripcion: {
    type: bilingueItemSchema,
    required: [true, 'La descripción es obligatoria'],
  },
  descripcionCorta: {
    type: bilingueItemSchema,
    required: [true, 'La descripción corta es obligatoria'],
  },
  itinerarioBasico: {
    type: bilingueItemSchema,
    default: () => ({ es: '', en: '', fr: '' })
  },
  puntoEncuentro: {
    type: bilingueItemSchema,
    default: () => ({ es: '', en: '', fr: '' })
  },
  politicasCancelacion: {
    type: bilingueItemSchema,
    default: () => ({ es: '', en: '', fr: '' })
  },
  restricciones: {
    type: bilingueItemSchema,
    default: () => ({ es: '', en: '', fr: '' })
  },
  tipo: {
    type: String,
    required: true,
    enum: ['Turismo Convencional', 'Turismo Comunitario', 'Turismo Religioso/Espiritual'],
    default: 'Turismo Convencional'
  },
  categoria: {
    type: String,
    required: true,
    enum: [
      'Espeleismo',
      'Senderismo',
      'Trail Running',
      'MTB y Gravel',
      'RZR',
      'Transporte Turístico',
      'Aviturismo',
      'Kayak',
      'Turismo Cultural',
      'Ciclismo de Montaña',
      'Rutas Bioculturales',
      'Ruta Herbolaria',
      'Ruta del Agua',
      'Ruta del Pulque'
    ]
  },
  imagenPrincipal: {
    type: imagenSchema
  },
  imagenes: [imagenSchema],
  duracion: {
    horas: {
      type: Number,
      required: true
    },
    descripcion: String
  },
  dificultad: {
    type: String,
    enum: ['Fácil', 'Moderado', 'Difícil', 'Extremo'],
    required: true
  },
  precio: {
    amount: {
      type: Number,
      required: [true, 'El precio es obligatorio']
    },
    moneda: {
      type: String,
      default: 'MXN'
    }
  },
  incluye: [bilingueItemSchema],
  noIncluye: [bilingueItemSchema],
  queTraer: [bilingueItemSchema],
  requisitos: [bilingueItemSchema],
  direccion: {
    calle: String,
    ciudad: String,
    codigoPostal: String,
    coordenadas: {
      lat: Number,
      lng: Number
    }
  },
  disponibilidad: {
    todoElAnio: {
      type: Boolean,
      default: true
    },
    temporada: {
      inicio: Date,
      fin: Date
    },
    diasSemana: [{
      type: String,
      enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    }]
  },
  telefonoWhatsApp: {
    type: String,
    trim: true,
    default: ''
  },
  capacidad: {
    minima: { type: Number, default: 1 },
    maxima: { type: Number, required: true }
  },
  guiaReferencia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guia'
  },
  guiasAsignados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guia'
  }],
  agenciaRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agencia',
    default: null
  },
  rutas: [{
    titulo: { type: bilingueItemSchema, required: true },
    descripcion: { type: bilingueItemSchema, required: true },
    dificultad: { type: String, enum: ['Fácil', 'Moderado', 'Difícil', 'Extremo'] },
    duracion: { type: String },
    kilometros: { type: String },
    imagen: imagenSchema
  }],
  activo: {
    type: Boolean,
    default: true
  },
  destacado: {
    type: Boolean,
    default: false
  },
  resenas: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    nombreUsuario: {
      type: String,
      required: true
    },
    calificacion: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comentario: {
      type: String,
      required: true
    },
    fotos: {
      type: [imagenSchema],
      default: [],
      validate: {
        validator: function(v) { return v.length <= 5; },
        message: 'Máximo 5 fotos por reseña'
      }
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  estadisticas: {
    likesTotales: { type: Number, default: 0 }
  },
  calificacionPromedio: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numeroResenas: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Crear slug automáticamente
tourSchema.pre('save', function (next) {
  const nombreEs = this.nombre && this.nombre.es ? this.nombre.es : '';
  if (this.isModified('nombre') && nombreEs) {
    this.slug = nombreEs
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Tour', tourSchema);
