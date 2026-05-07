const mongoose = require('mongoose');

const contactoCRMSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  telefono: {
    type: String,
    trim: true
  },
  cumpleanos: {
    type: String, // ej. "MM-DD" o "YYYY-MM-DD"
    trim: true
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ContactoCRM', contactoCRMSchema);
