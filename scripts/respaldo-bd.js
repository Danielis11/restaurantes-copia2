// Respaldo completo de la base de datos (todas las colecciones) en archivos JSON.
// Uso:  npm run respaldo            → crea respaldos/AAAA-MM-DD_HH-MM/<coleccion>.json
//       RESPALDOS_MAXIMOS=14 npm run respaldo   (cuántos respaldos guardar; los más viejos se borran)
// Solo lee de la base de datos. Para restaurar una colección:
//       mongoimport --uri "$MONGODB_URI" --collection <nombre> --file respaldos/<fecha>/<nombre>.json --jsonArray
// (el formato es Extended JSON, compatible con mongoimport).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

const CARPETA = path.join(__dirname, '..', 'respaldos');
const MAXIMOS = parseInt(process.env.RESPALDOS_MAXIMOS, 10) || 14;

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en el .env');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const ahora = new Date();
  const nombre = ahora.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const destino = path.join(CARPETA, nombre);
  fs.mkdirSync(destino, { recursive: true });

  const colecciones = await db.listCollections({}, { nameOnly: true }).toArray();
  let totalDocs = 0;
  for (const { name } of colecciones) {
    if (name.startsWith('system.')) continue;
    const salida = fs.createWriteStream(path.join(destino, name + '.json'));
    salida.write('[\n');
    let primero = true;
    let n = 0;
    for await (const doc of db.collection(name).find({})) {
      salida.write((primero ? '' : ',\n') + EJSON.stringify(doc, { relaxed: false }));
      primero = false;
      n++;
    }
    salida.write('\n]\n');
    await new Promise((ok) => salida.end(ok));
    totalDocs += n;
    console.log(`  ${name}: ${n}`);
  }
  console.log(`✅ Respaldo listo en ${destino} (${colecciones.length} colecciones, ${totalDocs} documentos)`);

  // Conservar solo los más recientes
  const viejos = fs.readdirSync(CARPETA).filter((d) => fs.statSync(path.join(CARPETA, d)).isDirectory()).sort().reverse().slice(MAXIMOS);
  for (const d of viejos) {
    fs.rmSync(path.join(CARPETA, d), { recursive: true, force: true });
    console.log(`  (borrado respaldo viejo ${d})`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Error en el respaldo:', e.message);
  process.exit(1);
});
