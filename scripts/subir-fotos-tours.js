// Sube a Cloudinary fotos de experiencias que aún no tienen imagen y las guarda en la BD.
// Solo toca tours SIN imágenes (no sobrescribe nada). Uso:
//   node scripts/subir-fotos-tours.js           -> muestra qué haría
//   node scripts/subir-fotos-tours.js --aplicar -> sube y guarda
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Tour = require('../models/Tour');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMG = path.join(__dirname, '..', 'public', 'images');
const WM = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';

// Fotos de Wikimedia Commons: el public_id empieza con "commons_" para poder mostrar el crédito.
const FOTOS = {
  presa1: { src: path.join(IMG, 'Kayak en la Presa-124.jpg'), id: 'jalpan_presa_kayak_1' },
  presa2: { src: path.join(IMG, 'Kayak en la Presa-103.jpg'), id: 'jalpan_presa_kayak_2' },
  presa3: { src: path.join(IMG, 'Kayak en la Presa-109.jpg'), id: 'jalpan_presa_kayak_3' },
  presa4: { src: path.join(IMG, 'Kayak en la Presa-118.jpg'), id: 'jalpan_presa_kayak_4' },
  misionJalpan: { src: path.join(IMG, 'jalpan', 'mision-crepusculo-1920.webp'), id: 'jalpan_mision_santiago' },
  misionAtardecer: { src: path.join(IMG, 'jalpan', 'mision-atardecer-1920.webp'), id: 'jalpan_mision_atardecer' },
  kioscoMision: { src: path.join(IMG, 'jalpan', 'kiosco-mision-1920.webp'), id: 'jalpan_kiosco_mision' },
  landa: { src: WM + '7/7c/Fachada_de_la_Misi%C3%B3n_en_Landa.jpg/960px-Fachada_de_la_Misi%C3%B3n_en_Landa.jpg', id: 'commons_mision_landa' },
  tancoyol: { src: WM + 'b/b0/Tancoyol%2C_Queretaro%2C_M%C3%A9xico.jpg/960px-Tancoyol%2C_Queretaro%2C_M%C3%A9xico.jpg', id: 'commons_mision_tancoyol' },
  tancoyol2: { src: WM + '0/0b/MissionTanyocol2.JPG/960px-MissionTanyocol2.JPG', id: 'commons_mision_tancoyol_2' },
  conca: { src: WM + 'f/fe/Foto_Vertical_de_la_Misi%C3%B3n_de_San_Miguel_de_Conc%C3%A1%2C_Arroyo_Seco_-_Conc%C3%A1%2C_Qro_-_Mx.jpg/960px-Foto_Vertical_de_la_Misi%C3%B3n_de_San_Miguel_de_Conc%C3%A1%2C_Arroyo_Seco_-_Conc%C3%A1%2C_Qro_-_Mx.jpg', id: 'commons_mision_conca' },
  tilaco: { src: WM + '8/84/Misi%C3%B3n_de_Tilaco.JPG/960px-Misi%C3%B3n_de_Tilaco.JPG', id: 'commons_mision_tilaco' },
  tancama: { src: WM + '6/6c/Zona_Arqueol%C3%B3gica_Tancama%2C_Sierra_Gorda%2C_Quer%C3%A9taro-_Tacama_Arqueologic_Zone_%2C_Quer%C3%A9taro_%2824516055556%29.jpg/960px-Zona_Arqueol%C3%B3gica_Tancama%2C_Sierra_Gorda%2C_Quer%C3%A9taro-_Tacama_Arqueologic_Zone_%2C_Quer%C3%A9taro_%2824516055556%29.jpg', id: 'commons_tancama' },
  tancama2: { src: WM + '0/02/Ruinas_de_Tancama.JPG/960px-Ruinas_de_Tancama.JPG', id: 'commons_tancama_2' },
};

// Solo lugares cuyas fotos muestran el sitio real de la experiencia.
const PLAN = [
  { id: '699e6a1626754bf4e131de81', nombre: 'Presa Jalpan en Kayak', fotos: ['presa1', 'presa2', 'presa3', 'presa4'] },
  { id: '699e6a1626754bf4e131de77', nombre: 'Misiones Franciscanas', fotos: ['misionJalpan', 'landa', 'tancoyol', 'conca', 'tilaco'] },
  { id: '699e6a1626754bf4e131de9a', nombre: 'Tancoyol Cultural', fotos: ['tancoyol', 'tancoyol2'] },
  { id: '699e6a1626754bf4e131de6d', nombre: 'Zona Arqueológica de Tancama', fotos: ['tancama', 'tancama2'] },
  { id: '69b1eab3fc4f8d0ba7805e70', nombre: 'Camino Iniciatico de Santiago', fotos: ['misionAtardecer', 'kioscoMision'] },
  // Misma ficha en versión comunitaria: se copian sus fotos (sin cloudinaryId para no borrarlas por error)
  { id: '699e6a1626754bf4e131de8b', nombre: 'Mirador de la Peña Blanca', copiarDe: '699e6a20dacb8809b51b2142' },
];

const aplicar = process.argv.includes('--aplicar');
const subidas = {};

async function subir(clave) {
  if (subidas[clave]) return subidas[clave];
  const f = FOTOS[clave];
  let src = f.src;
  // Si ya se subió antes (o desde el navegador), se reutiliza
  try {
    const ya = await cloudinary.api.resource(`restaurantes-jalpan/tours/${f.id}`);
    subidas[clave] = { filename: ya.public_id, url: ya.secure_url, size: ya.bytes, path: ya.secure_url, cloudinaryId: ya.public_id };
    return subidas[clave];
  } catch (e) { /* no existe todavía */ }
  if (/^https?:/.test(src)) {
    // Wikimedia rechaza descargas sin identificación: se baja aquí y se sube como datos
    let resp;
    for (let intento = 0; intento < 7; intento++) {
      resp = await fetch(src, { headers: { 'User-Agent': 'JalpanTurismoBot/1.0 (subida de fotos de experiencias)' } });
      if (resp.status !== 429) break;
      await new Promise(r => setTimeout(r, 10000 * (intento + 1)));
    }
    if (!resp.ok) throw new Error(`No se pudo descargar ${clave}: ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    src = `data:${resp.headers.get('content-type') || 'image/jpeg'};base64,${buf.toString('base64')}`;
    await new Promise(r => setTimeout(r, 5000));
  }
  const r = await cloudinary.uploader.upload(src, {
    folder: 'restaurantes-jalpan/tours',
    public_id: f.id,
    overwrite: false,
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto:good' }],
  });
  subidas[clave] = { filename: r.public_id, url: r.secure_url, size: r.bytes, path: r.secure_url, cloudinaryId: r.public_id };
  return subidas[clave];
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const p of PLAN) {
    const tour = await Tour.findById(p.id);
    if (!tour) { console.log('No existe:', p.nombre); continue; }
    if (tour.imagenes && tour.imagenes.length) { console.log('Ya tiene fotos, se omite:', p.nombre); continue; }
    if (!aplicar) { console.log('Agregaría', p.copiarDe ? 'fotos copiadas' : p.fotos.length + ' fotos', 'a', p.nombre); continue; }
    let imagenes;
    if (p.copiarDe) {
      const origen = await Tour.findById(p.copiarDe).lean();
      imagenes = (origen?.imagenes || []).map(({ _id, ...i }) => ({ ...i, cloudinaryId: null, uploadDate: new Date() }));
    } else {
      imagenes = [];
      for (const k of p.fotos) imagenes.push({ ...(await subir(k)), uploadDate: new Date() });
    }
    await Tour.updateOne({ _id: p.id, $or: [{ imagenes: { $size: 0 } }, { imagenes: { $exists: false } }] }, { $set: { imagenes } });
    console.log('Listo:', p.nombre, '→', imagenes.length, 'fotos');
  }
  await mongoose.disconnect();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
