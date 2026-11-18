const mongoose = require('mongoose');
const conexion = require('../config/conexion');

const ignoredWordSchema = new mongoose.Schema({
    word: {
        type: String,
        required: [true, 'La palabra es obligatoria'],
        unique: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = conexion.model('IgnoredWord', ignoredWordSchema);
