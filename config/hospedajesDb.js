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

// Si la BD de hospedajes no responde, NO tumbar todo el servidor (antes era un rechazo sin manejar)
hospedajesDb.asPromise().catch((err) => {
    console.error('⚠️  BD de Hospedajes no disponible, el resto del sitio sigue funcionando:', err.message);
});
