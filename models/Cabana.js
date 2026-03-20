const mongoose = require('mongoose');
const hospedajesDb = require('../config/hospedajesDb');

// Modelo ligero para leer la colección 'cabanas' de la base de datos compartida
const CabanaSchema = new mongoose.Schema({
    nombre: String,
    descripcion: mongoose.Schema.Types.Mixed,
    precio: Number,
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
    collection: 'cabanas',
    strict: false,
    timestamps: true
});

module.exports = hospedajesDb.model('Cabana', CabanaSchema);
