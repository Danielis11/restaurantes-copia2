// Conexión del módulo de hospedaje.
// Usa la MISMA base de datos que el resto del sitio (MONGODB_URI), pero con un registro
// de modelos propio: así sus modelos «Hotel», «User», «Review»... no chocan con los nuestros.
const mongoose = require('mongoose');

function nombreBaseDatos() {
  const uri = process.env.MONGODB_URI || '';
  const m = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : 'test';
}

module.exports = mongoose.connection.useDb(nombreBaseDatos(), { useCache: true });
