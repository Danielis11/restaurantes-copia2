const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'El ID del restaurante es obligatorio']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio']
  },
  rating: {
    type: Number,
    required: [true, 'La calificación es obligatoria'],
    min: [1, 'La calificación mínima es 1'],
    max: [5, 'La calificación máxima es 5']
  },
  comentario: {
    type: String,
    required: [true, 'El comentario es obligatorio'],
    trim: true,
    maxlength: [1000, 'El comentario no puede exceder 1000 caracteres']
  },
  imagenUrl: {
    type: String,
    trim: true,
    default: null
  },
  fotos: [{
    url: { type: String, required: true },
    filename: { type: String },
    cloudinaryId: { type: String },
    size: { type: Number, default: 0 }
  }],
  estado: {
    type: String,
    enum: ['pendiente', 'aprobada', 'rechazada'],
    default: 'pendiente'
  },
  destacada: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  respuestaAdmin: {
    type: String,
    trim: true,
    default: null
  },
  fechaRespuesta: {
    type: Date,
    default: null
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para optimizar búsquedas comunes
reviewSchema.index({ restaurantId: 1, estado: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ estado: 1 });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
