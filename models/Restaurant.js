const mongoose = require('mongoose');

// Sub-schema para bilingüe
const bilingueSchema = {
  es: { type: String, default: '' },
  en: { type: String, default: '' },
  fr: { type: String, default: '' }
};

// Schema para imágenes - Soporta Cloudinary y almacenamiento local
const imagenSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: false,  // Cloudinary puede no devolver el tamaño exacto
    min: 0,
    default: 0
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  path: {
    type: String,
    required: false   // ← Solo para imágenes locales; Cloudinary no usa esto
  },
  cloudinaryId: {
    type: String,
    required: false   // ← public_id de Cloudinary para poder eliminar la imagen
  }
}, { _id: true });

// Schema para elementos del menú
const menuItemSchema = new mongoose.Schema({
  nombre: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  descripcion: {
    type: mongoose.Schema.Types.Mixed
  },
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  imagen: {
    type: imagenSchema,
    required: false
  },
  esEspecialidad: {
    type: Boolean,
    default: false
  }
}, { _id: true });

// Schema para categorías del menú
const menuCategorySchema = new mongoose.Schema({
  categoria: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  items: [menuItemSchema]
}, { _id: true });

// Schema para horarios
const horariosSchema = new mongoose.Schema({
  lunes: {
    abierto: { type: Boolean, default: true },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  },
  martes: {
    abierto: { type: Boolean, default: true },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  },
  miercoles: {
    abierto: { type: Boolean, default: true },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  },
  jueves: {
    abierto: { type: Boolean, default: true },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  },
  viernes: {
    abierto: { type: Boolean, default: true },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  },
  sabado: {
    abierto: { type: Boolean, default: true },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  },
  domingo: {
    abierto: { type: Boolean, default: false },
    apertura: { type: String, default: '09:00' },
    cierre: { type: String, default: '22:00' }
  }
}, { _id: false });

// Schema para dirección
const direccionSchema = new mongoose.Schema({
  calle: {
    type: String,
    required: true,
    trim: true
  },
  ciudad: {
    type: String,
    required: true,
    trim: true
  },
  codigoPostal: {
    type: String,
    required: true,
    trim: true
  },
  coordenadas: {
    lat: {
      type: Number,
      required: false
    },
    lng: {
      type: Number,
      required: false
    }
  }
}, { _id: false });

// Schema para promociones
const promocionSchema = new mongoose.Schema({
  titulo: {
    type: mongoose.Schema.Types.Mixed, // para bilingue
    required: true
  },
  descripcion: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  imagen: {
    type: String,
    trim: true,
    default: null
  },
  fechaInicio: {
    type: Date,
    default: Date.now
  },
  fechaFin: {
    type: Date,
    required: false
  },
  activa: {
    type: Boolean,
    default: true
  }
}, { _id: true });

// Schema para redes sociales
const redesSchema = new mongoose.Schema({
  facebook: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(www\.)?facebook\.com\/.+/.test(v);
      },
      message: 'URL de Facebook no válida'
    }
  },
  instagram: {
    type: String,
    trim: true
  },
  twitter: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL del website no válida'
    }
  }
}, { _id: false });


// Schema principal del restaurante
const restaurantSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del restaurante es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  tipo: {
    type: String,
    required: [true, 'El tipo de establecimiento es obligatorio'],
    enum: {
      values: ['restaurante', 'bar', 'cafeteria', 'comida-rapida', 'panaderia', 'obrador-artesanal', 'otro'],
      message: 'Tipo de establecimiento no válido'
    }
  },
  tipoComida: {
    type: String,
    trim: true,
    default: ''
  },
  opcionesPago: {
    efectivo: { type: Boolean, default: true },
    tarjeta: { type: Boolean, default: false },
    transferencia: { type: Boolean, default: false }
  },
  precioPromedio: {
    type: Number,
    min: 0,
    default: 0
  },
  descripcion: {
    type: bilingueSchema,
    required: [true, 'La descripción es obligatoria']
  },
  direccion: {
    type: direccionSchema,
    required: [true, 'La dirección es obligatoria']
  },
  telefono: {
    type: String,
    required: [function() { return this.tipo !== 'obrador-artesanal'; }, 'El teléfono es obligatorio'],
    trim: true,
    validate: {
      validator: function(v) {
        if (!v && this.tipo === 'obrador-artesanal') return true;
        return /^\+?[\d\s\-\(\)]{8,20}$/.test(v);
      },
      message: 'Formato de teléfono no válido'
    }
  },
  email: {
    type: String,
    required: [function() { return this.tipo !== 'obrador-artesanal'; }, 'El email es obligatorio'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v && this.tipo === 'obrador-artesanal') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Formato de email no válido'
    }
  },
  whatsappPedidos: {
    type: String,
    trim: true,
    default: null
  },
  servicios: {
    petFriendly: { type: Boolean, default: false },
    estacionamiento: { type: Boolean, default: false },
    musicaEnVivo: { type: Boolean, default: false },
    opcionesVeganas: { type: Boolean, default: false },
    areaInfantil: { type: Boolean, default: false },
    wifiGratis: { type: Boolean, default: false }
  },
  promociones: {
    type: [promocionSchema],
    default: []
  },
  horarios: {
    type: horariosSchema,
    default: () => ({})
  },
  menu: {
    type: [menuCategorySchema],
    default: []
  },
  imagenes: {
    type: [imagenSchema],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 20; // Máximo 20 imágenes
      },
      message: 'No se pueden tener más de 20 imágenes'
    }
  },
  redes: {
    type: redesSchema,
    default: () => ({})
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [function() { return this.tipo !== 'obrador-artesanal'; }, 'El administrador es obligatorio'],
    index: true,
    default: null
  },
  // ===== GOOGLE PLACES INTEGRATION =====
  googlePlaceId: {
    type: String,
    trim: true,
    default: null
  },
  // ===== WIDGETS DE OPINIONES Y FOTOS =====
  googleReviewsUrl: {
    type: String,
    trim: true,
    default: null
  },
  instagramEmbeds: {
    type: [String],
    default: []
  },
  googleReviews: {
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    reviews: [{
      authorName: String,
      authorPhoto: String,
      rating: Number,
      text: String,
      relativeTime: String,
      time: Date
    }],
    photos: [{
      url: String,
      width: Number,
      height: Number,
      htmlAttributions: [String]
    }],
    lastFetched: { type: Date, default: null }
  },
  estadisticas: {
    vistasPerfil: { type: Number, default: 0 },
    clicsMapa: { type: Number, default: 0 },
    clicsWhatsapp: { type: Number, default: 0 }
  },
  estadisticasMensuales: [{
    fecha: { type: String, required: true }, // Formato: "YYYY-MM"
    vistas: { type: Number, default: 0 },
    clicsWhatsapp: { type: Number, default: 0 },
    clicsMapa: { type: Number, default: 0 }
  }],
  activo: {
    type: Boolean,
    default: true,
    index: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indices para optimizar consultas
restaurantSchema.index({ adminId: 1, activo: 1 });
restaurantSchema.index({ tipo: 1, activo: 1 });
restaurantSchema.index({ 'direccion.ciudad': 1, activo: 1 });

// Virtual para obtener la imagen principal
restaurantSchema.virtual('imagenPrincipal').get(function() {
  return this.imagenes && this.imagenes.length > 0 ? this.imagenes[0] : null;
});

// Virtual para contar total de imágenes
restaurantSchema.virtual('totalImagenes').get(function() {
  return this.imagenes ? this.imagenes.length : 0;
});

// Middleware pre-save para actualizar fechaActualizacion
restaurantSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.fechaActualizacion = new Date();
  }
  next();
});

// Método para agregar imagen
restaurantSchema.methods.agregarImagen = async function(imagenData) {
  if (!imagenData._id) {
    const mongoose = require('mongoose');
    imagenData._id = new mongoose.Types.ObjectId();
  }
  
  await this.model('Restaurant').updateOne(
    { _id: this._id },
    { 
      $push: { imagenes: imagenData },
      $set: { fechaActualizacion: new Date() }
    }
  );

  if (!this.imagenes) {
    this.imagenes = [];
  }
  this.imagenes.push(imagenData);
  return this;
};

// Método para eliminar imagen
restaurantSchema.methods.eliminarImagen = async function(imageId) {
  if (!this.imagenes) return this;
  
  await this.model('Restaurant').updateOne(
    { _id: this._id },
    { 
      $pull: { imagenes: { _id: imageId } },
      $set: { fechaActualizacion: new Date() }
    }
  );
  
  this.imagenes = this.imagenes.filter(img => img._id.toString() !== imageId);
  return this;
};

// Método para establecer imagen principal
restaurantSchema.methods.establecerImagenPrincipal = async function(imageId) {
  if (!this.imagenes || this.imagenes.length === 0) return this;
  
  const imageIndex = this.imagenes.findIndex(img => img._id.toString() === imageId);
  if (imageIndex === -1 || imageIndex === 0) return this;
  
  const [selectedImage] = this.imagenes.splice(imageIndex, 1);
  this.imagenes.unshift(selectedImage);
  
  await this.model('Restaurant').updateOne(
    { _id: this._id },
    { 
      $set: { 
        imagenes: this.imagenes,
        fechaActualizacion: new Date() 
      }
    }
  );
  
  return this;
};

// Método para obtener horario del día actual
restaurantSchema.methods.getHorarioHoy = function() {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const hoy = dias[new Date().getDay()];
  return this.horarios[hoy] || { abierto: false };
};

// Método para verificar si está abierto ahora
restaurantSchema.methods.estaAbiertoAhora = function() {
  const horarioHoy = this.getHorarioHoy();
  if (!horarioHoy.abierto) return false;
  
  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  const [aperturaHora, aperturaMin] = horarioHoy.apertura.split(':').map(Number);
  const [cierreHora, cierreMin] = horarioHoy.cierre.split(':').map(Number);
  
  const apertura = aperturaHora * 60 + aperturaMin;
  const cierre = cierreHora * 60 + cierreMin;
  
  return horaActual >= apertura && horaActual <= cierre;
};

module.exports = mongoose.model('Restaurant', restaurantSchema);