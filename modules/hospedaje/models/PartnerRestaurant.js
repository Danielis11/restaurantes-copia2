const mongoose = require('mongoose');
const partnerDb = require('../config/partnerDb');

const PartnerRestaurantSchema = new mongoose.Schema({
    nombre: String,
    tipo: String,
    descripcion: String,
    direccion: {
        calle: String,
        colonia: String,
        ciudad: String,
        estado: String,
        codigoPostal: String
    },
    imagenes: [{
        url: String,
        filename: String
    }]
}, {
    timestamps: true,
    strict: false // Permitir campos extra sin error
});

const PartnerRestaurant = partnerDb.model('PartnerRestaurant', PartnerRestaurantSchema, 'restaurants');

module.exports = PartnerRestaurant;
