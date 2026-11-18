const mongoose = require('mongoose');
const partnerDb = require('../config/partnerDb');

const PartnerTourSchema = new mongoose.Schema({
    nombre: {
        es: String,
        en: String,
        fr: String
    },
    slug: String,
    descripcionCorta: {
        es: String,
        en: String,
        fr: String
    },
    tipo: String,
    categoria: String,
    imagenPrincipal: {
        url: String,
        filename: String
    },
    imagenes: [{
        url: String,
        filename: String
    }],
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    strict: false
});

const PartnerTour = partnerDb.model('PartnerTour', PartnerTourSchema, 'tours');

module.exports = PartnerTour;
