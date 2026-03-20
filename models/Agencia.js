const mongoose = require('mongoose');

const AgenciaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    filename: String,
    url: String,
    public_id: String // For Cloudinary
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  rnt: { // Registro Nacional de Turismo
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String
  },
  redesSociales: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    youtube: { type: String, trim: true },
    tiktok: { type: String, trim: true }
  },
  paginaWeb: {
    type: String,
    trim: true
  },
  horariosAtencion: {
    type: String,
    trim: true
  },
  idiomas: [{
    type: String,
    trim: true
  }],
  especialidades: [{
    type: String,
    trim: true
  }],
  serviciosDefecto: [{
    type: String,
    trim: true
  }],
  galeria: [{
    filename: String,
    url: String,
    public_id: String
  }],
  resenas: [{
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombreUsuario: { type: String, required: true },
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, required: true, maxlength: 1000 },
    fecha: { type: Date, default: Date.now },
    fotos: [{
      url: String,
      public_id: String
    }]
  }],
  calificacionPromedio: { type: Number, default: 0, min: 0, max: 5 },
  numeroResenas: { type: Number, default: 0 },
  coordenadas: {
    lat: { type: Number },
    lng: { type: Number }
  },
  estado: {
    type: String,
    enum: ['activo', 'pendiente', 'inactivo'],
    default: 'activo'
  }
}, { timestamps: true });

module.exports = mongoose.model('Agencia', AgenciaSchema);
