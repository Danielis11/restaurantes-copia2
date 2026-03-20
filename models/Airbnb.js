const mongoose = require('mongoose');
const hospedajesDb = require('../config/hospedajesDb');

// Modelo ligero para leer la colección 'airbnbs' de la base de datos compartida
const AirbnbSchema = new mongoose.Schema({
    nombre: String,
    descripcion: mongoose.Schema.Types.Mixed,
    precioPorNoche: Number,
    imagenes: [{
        url: String,
        public_id: String
    }],
    ubicacion: {
        direccion: String,
        ciudad: String,
        estado: String,
        codigoPostal: String,
        coordenadas: {
            lat: Number,
            lng: Number
        }
    },
    coordenadas: {
        latitud: Number,
        longitud: Number
    },
    latitud: Number,
    longitud: Number,
    tipoPropiedad: String,
    contacto: {
        telefono: String,
        email: String,
        whatsapp: String
    },
    calificacion: {
        promedio: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 }
    },
    activo: { type: Boolean, default: true }
}, { 
    collection: 'airbnbs',
    strict: false,
    timestamps: true
});

module.exports = hospedajesDb.model('Airbnb', AirbnbSchema);
