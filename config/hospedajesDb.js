const mongoose = require('mongoose');
require('dotenv').config();

// Crear conexión secundaria al cluster de la compañera
const uri = process.env.MONGODB_URI_HOSPEDAJES;

if (!uri) {
    console.error('❌ MONGODB_URI_HOSPEDAJES no está definida en .env');
}

const hospedajesDb = mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

hospedajesDb.on('connected', () => {
    console.log('✅ Conectado a la BD de Hospedajes (TurismoApp)');
});

hospedajesDb.on('error', (err) => {
    console.error('❌ Error en conexión a BD de Hospedajes:', err);
});

module.exports = hospedajesDb;
