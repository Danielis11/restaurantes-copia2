const mongoose = require('mongoose');
const hospedajesDb = require('../config/hospedajesDb');

// ===== Modelo Review en turismo-db =====
// Las reseñas usan el userId del cluster LOCAL (restaurant_db),
// y referencian hospedajes por hospedajeId + tipoHospedaje
const ReviewTurismoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId }, // ID del usuario LOCAL
  nombreUsuario: String,
  hospedajeId: { type: mongoose.Schema.Types.ObjectId },
  tipoHospedaje: String, // 'hotel', 'cabana', 'airbnb'
  nombreHospedaje: String,
  rating: Number,
  comentario: String,
  fecha: Date
}, { strict: false, collection: 'reviews' });

// ===== Modelo Hotel en turismo-db =====
const HotelTurismoSchema = new mongoose.Schema({
  nombre: String,
  imagenes: [mongoose.Schema.Types.Mixed],
  ubicacion: mongoose.Schema.Types.Mixed,
  reviews: [mongoose.Schema.Types.Mixed]
}, { strict: false, collection: 'hotels' });

// ===== Modelo Airbnb en turismo-db =====
const AirbnbTurismoSchema = new mongoose.Schema({
  nombre: String,
  imagenes: [mongoose.Schema.Types.Mixed],
  ubicacion: mongoose.Schema.Types.Mixed,
  reviews: [mongoose.Schema.Types.Mixed]
}, { strict: false, collection: 'airbnbs' });

// ===== Modelo Cabaña en turismo-db =====
const CabanaTurismoSchema = new mongoose.Schema({
  nombre: String,
  imagenes: [mongoose.Schema.Types.Mixed],
  ubicacion: mongoose.Schema.Types.Mixed,
  reviews: [mongoose.Schema.Types.Mixed]
}, { strict: false, collection: 'cabanas' });

module.exports = {
  ReviewTurismo: hospedajesDb.model('ReviewTurismo', ReviewTurismoSchema),
  HotelTurismo: hospedajesDb.model('HotelTurismo', HotelTurismoSchema),
  AirbnbTurismo: hospedajesDb.model('AirbnbTurismo', AirbnbTurismoSchema),
  CabanaTurismo: hospedajesDb.model('CabanaTurismo', CabanaTurismoSchema)
};
