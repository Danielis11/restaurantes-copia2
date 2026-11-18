// Antes era una conexión aparte al cluster de turismo-app.
// Desde que se juntaron las bases, hoteles, cabañas y airbnb viven en la base principal,
// así que se usa la misma conexión de todo el sitio (MONGODB_URI_HOSPEDAJES ya no hace falta).
const mongoose = require('mongoose');

module.exports = mongoose.connection;
