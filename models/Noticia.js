const mongoose = require('mongoose');

const NoticiaSchema = new mongoose.Schema({
    titulo: {
        es: { type: String, required: true },
        en: { type: String, default: '' },
        fr: { type: String, default: '' }
    },
    descripcion: {
        es: { type: String, required: true },
        en: { type: String, default: '' },
        fr: { type: String, default: '' }
    },
    imagen: {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    activo: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Noticia', NoticiaSchema);
