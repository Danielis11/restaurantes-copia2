const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const partnerDb = require('../config/partnerDb');

const TouristSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un email válido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        select: false
    },
    // Añadimos role virtualmente si lo necesitamos para compatibilidad con el front, pero
    // no es necesario guardarlo en su base de datos si ellos no lo usan.
    role: {
        type: String,
        default: 'user'
    },
    // 🔥 Campo favoritos del turista
    favorites: [{
        hospedajeId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        tipoHospedaje: {
            type: String,
            enum: ['hotel', 'cabana', 'airbnb'],
            required: true
        },
        nombreHospedaje: {
            type: String
        },
        fechaAgregado: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true 
});

// Cifrar contraseña antes de guardar
TouristSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Método para comparar contraseñas
TouristSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// COMPATIBILIDAD CON TU SISTEMA DE ADMINS LOCALES
// Los usuarios de la DB del compañero nunca serán super-administradores en tu sistema.
TouristSchema.methods.isSuperAdministrator = function () {
    return false;
};
TouristSchema.methods.getDashboardType = function () {
    return 'user';
};

// 🔥 IMPORTANTE: Conectamos este modelo a la DB del compañero usando partnerDb,
// y especificamos que la colección se llama 'users' tal como lo vimos en su DB.
const Tourist = partnerDb.model('Tourist', TouristSchema, 'users');

module.exports = Tourist;
