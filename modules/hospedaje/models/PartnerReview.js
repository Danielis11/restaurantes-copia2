const mongoose = require('mongoose');
const partnerDb = require('../config/partnerDb');

const ReviewSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PartnerRestaurant'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tourist'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    comentario: String,
    imagenUrl: String,
    fotos: [{
        url: String,
        filename: String,
        cloudinaryId: String,
        size: Number
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
    fechaCreacion: Date
}, {
    timestamps: true
});

// Conectar al partner DB, colección 'reviews'
const PartnerReview = partnerDb.model('PartnerReview', ReviewSchema, 'reviews');

module.exports = PartnerReview;
