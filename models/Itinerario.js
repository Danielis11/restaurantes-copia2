const mongoose = require('mongoose');

const ActividadSchema = new mongoose.Schema({
  hora: {
    type: String, // ej. "10:00 AM" o "14:30"
    default: ""
  },
  tipoLugar: {
    type: String,
    enum: ['restaurante', 'agencia', 'hotel', 'cabana', 'airbnb', 'tour', 'otro'],
    required: true
  },
  lugarId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // No usamos ref estricto aquí porque puede apuntar a distintas colecciones
    // La lógica de populación (populate) la manejaremos en el controlador o usando refPath si fuera necesario.
  },
  notas: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

const DiaSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: false
  },
  nombreDia: {
    type: String, // ej. "Día 1", "Sábado", etc.
    required: true
  },
  actividades: [ActividadSchema]
});

const ItinerarioSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del itinerario es obligatorio'],
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 500
  },
  estado: {
    type: String,
    enum: ['borrador', 'planeado', 'completado'],
    default: 'borrador'
  },
  dias: [DiaSchema],
  compartido: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Itinerario = mongoose.model('Itinerario', ItinerarioSchema);

module.exports = Itinerario;
