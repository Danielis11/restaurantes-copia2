const mongoose = require('mongoose');

// Schema para imágenes - Reutilizando el estándar del proyecto
const imagenSchema = new mongoose.Schema({
  filename: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  size: { type: Number, required: false, min: 0, default: 0 },
  uploadDate: { type: Date, default: Date.now },
  path: { type: String, required: false },
  cloudinaryId: { type: String, required: false }
}, { _id: true });

// Sub-schema para bilingüe
const bilingueSchema = {
  es: { type: String, default: '' },
  en: { type: String, default: '' },
  fr: { type: String, default: '' }
};

const guiaSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false // Puede ser gestionado por super-admin o un admin específico
  },
  nombreCompleto: {
    type: String,
    required: [true, 'El nombre completo es obligatorio'],
    trim: true
  },
  credencialSECTUR: {
    type: String,
    required: [true, 'La credencial SECTUR es obligatoria'],
    unique: true,
    trim: true
  },
  autorizacionCONANP: {
    type: String,
    trim: true
  },
  rnt: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  fotoPerfil: {
    type: imagenSchema,
    required: false
  },
  galeria: [{
    type: imagenSchema
  }],
  redesSociales: {
    facebook: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    tiktok: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' }
  },
  aniosExperiencia: {
    type: Number,
    default: 0,
    min: 0
  },
  zonasOperacion: [{
    type: String,
    trim: true
  }],
  especialidades: [{
    type: String,
    enum: [
      'Espeleismo',
      'Senderismo',
      'Trail Running',
      'MTB y Gravel',
      'RZR',
      'Turismo Cultural'
    ]
  }],
  biografia: {
    type: bilingueSchema
  },
  idiomas: [{
    type: String,
    default: ['Español']
  }],
  certificaciones: [{
    nombre: String,
    institucion: String,
    fechaObtencion: Date,
    vigencia: Date
  }],
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'pendiente'],
    default: 'pendiente'
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
  calificacionPromedio: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numeroResenas: {
    type: Number,
    default: 0
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Guia', guiaSchema);
