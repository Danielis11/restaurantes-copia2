// Agrega una foto de referencia a los establecimientos de comida que no tienen ninguna imagen.
// Son fotos libres (CC0 / dominio público) de Wikimedia Commons del tipo de comida que sirve cada lugar;
// NO son fotos del local. Su public_id empieza con "referencia_" para identificarlas, y el dueño puede
// borrarlas desde su panel cuando suba fotos propias. Solo toca locales SIN imágenes. Uso:
//   node scripts/subir-fotos-restaurantes.js           -> muestra qué haría
//   node scripts/subir-fotos-restaurantes.js --aplicar -> sube y guarda
require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Restaurant = require('../models/Restaurant');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const WM = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
const FOTOS = {
  enchiladasMoleRosa: WM + '7/76/Enchiladas_de_mole_rosa.jpg/960px-Enchiladas_de_mole_rosa.jpg',
  moleConPollo: WM + '6/6c/Mole_con_pollo_2008-10-31.JPG/960px-Mole_con_pollo_2008-10-31.JPG',
  moleEjecutivo: WM + '6/63/Mole_ejecutivo%2C_Mazatl%C3%A1n%2C_28_de_marzo_de_2023.jpg/960px-Mole_ejecutivo%2C_Mazatl%C3%A1n%2C_28_de_marzo_de_2023.jpg',
  tacos: WM + '2/22/Tacos_in_a_soft_tortilla_6.jpg/960px-Tacos_in_a_soft_tortilla_6.jpg',
  tacosCamaron: WM + '7/7d/151_Dos_Tacos_de_Camarone.jpg/960px-151_Dos_Tacos_de_Camarone.jpg',
  gordita: WM + '8/89/Gordita1.JPG/960px-Gordita1.JPG',
  huevosRancheros: WM + 'b/b2/Huevos_rancheros_-_Pescadero.jpg/960px-Huevos_rancheros_-_Pescadero.jpg',
  huevosRancheros2: WM + '0/01/Huevos_rancheros_-_Pasadena%2C_CA.jpg/960px-Huevos_rancheros_-_Pasadena%2C_CA.jpg',
  enchiladas: WM + 'e/ec/Enchilada_Rice_Beans.jpg/960px-Enchilada_Rice_Beans.jpg',
  enchiladasQueso: WM + '6/6f/Enchiladas.jpg/960px-Enchiladas.jpg',
  coctelCamaron: WM + 'c/cf/Shrimp_cocktail_lemons_lettuce_seafood.jpg/960px-Shrimp_cocktail_lemons_lettuce_seafood.jpg',
  pescadoFrito: WM + '0/08/Ocean_bays_food_fried_clamari_fish_rice_plate_%281%29.jpg/960px-Ocean_bays_food_fried_clamari_fish_rice_plate_%281%29.jpg',
  comidaChina: WM + '5/53/Chinese_food_set_lunch_near_Yoyogi_Hachiman.jpg/960px-Chinese_food_set_lunch_near_Yoyogi_Hachiman.jpg',
  alitas: WM + '4/4e/Chicken_wings_and_vegan_nuggets_-_Lost_Boys_Chicken_2023-11-12.jpg/960px-Chicken_wings_and_vegan_nuggets_-_Lost_Boys_Chicken_2023-11-12.jpg',
  alitasBar: WM + '7/74/Golden_Salted_Egg_Chicken_Wings_-_Aberdeen_Seafood_2026-01-05.jpg/960px-Golden_Salted_Egg_Chicken_Wings_-_Aberdeen_Seafood_2026-01-05.jpg',
  hamburguesa: WM + '5/58/Hamburger_%288%29.jpg/960px-Hamburger_%288%29.jpg',
  capuchino: WM + 'a/ab/Cappuccino%2C_cookies%2C_flowers_in_glass.jpg/960px-Cappuccino%2C_cookies%2C_flowers_in_glass.jpg',
  capuchino2: WM + '2/27/Cappuccino_-_Wai_Kika_Moo_Kau_2024-01-13.jpg/960px-Cappuccino_-_Wai_Kika_Moo_Kau_2024-01-13.jpg',
  crepa: WM + '8/8e/Strawberry_crepe_roll_-_Jazz_Kissa_Lazy_Bird_2025-04-19.jpg/960px-Strawberry_crepe_roll_-_Jazz_Kissa_Lazy_Bird_2025-04-19.jpg',
  panDulce: WM + '3/3e/Pan_dulce_cabinet_on_Los_Bisquets_Obregon.jpg/960px-Pan_dulce_cabinet_on_Los_Bisquets_Obregon.jpg',
  cuerno: WM + 'd/db/Cuerno_%28pan_dulce_mexicano%29_-_2.jpg/960px-Cuerno_%28pan_dulce_mexicano%29_-_2.jpg',
  nieve: WM + '5/50/Ice_cream_and_sherbet_at_Fentons_Creamery.jpg/960px-Ice_cream_and_sherbet_at_Fentons_Creamery.jpg',
  pastel: WM + 'e/e3/Chocolate_cake_on_white_plate.jpg/960px-Chocolate_cake_on_white_plate.jpg',
};

// id del local -> foto según lo que sirve
const PLAN = {
  '6999e2b8bef623dfa84a542f': 'pescadoFrito',       // Palapa La Presa
  '6999e2b6bef623dfa84a540f': 'moleConPollo',       // Comedor Meztli
  '6999e2c6bef623dfa84a54df': 'crepa',              // Josefa Cocina y Café (crepas y café)
  '6999e2b6bef623dfa84a5417': 'enchiladas',         // El Naranjito
  '6999e2b4bef623dfa84a53f7': 'gordita',            // Fonda Doña Chila
  '6999e2bbbef623dfa84a5457': 'alitas',             // Sporting Wings
  '6999e2bebef623dfa84a5477': 'moleEjecutivo',      // Restaurante Trogón
  '6999e2afbef623dfa84a53af': 'comidaChina',        // A Ling Comida China
  '6999e2bbbef623dfa84a544f': 'huevosRancheros',    // Sierra Bonita
  '6999e2babef623dfa84a543f': 'coctelCamaron',      // Richard Restaurante de Mariscos
  '6999e2c8bef623dfa84a54f7': 'capuchino',          // Priscilla's Café
  '6999e2c5bef623dfa84a54d7': 'panDulce',           // La Francesa
  '6999e2b1bef623dfa84a53cf': 'hamburguesa',        // La Burguesería
  '6999e2b7bef623dfa84a5427': 'enchiladasMoleRosa', // Las Orquídeas
  '6999e2b5bef623dfa84a5407': 'moleConPollo',       // Mesón de Caporales
  '6999e2b0bef623dfa84a53bf': 'alitasBar',          // Casa Arriaga Restaurant - Bar
  '69bf20ab3d7c1e937de13878': 'tacos',              // Antojitos Mexicanos la Azteca (restaurante)
  '6999e2c9bef623dfa84a5507': 'tacos',              // Antojitos Mexicanos la Azteca (cafetería)
  '6999e2babef623dfa84a5447': 'comidaChina',        // Shanghai Express Comida China
  '6999e2c3bef623dfa84a54b7': 'nieve',              // Nievex Jalpan
  '6999e2b4bef623dfa84a53ef': 'tacosCamaron',       // Crustáceo Cascarudo
  '6999e2c6bef623dfa84a54e7': 'capuchino2',         // Kawa Coffee Shop
  '6999e2b5bef623dfa84a53ff': 'huevosRancheros2',   // Restaurant Karina
  '6999e2c7bef623dfa84a54ef': 'cuerno',             // Pao's Cafetería
  '6999e2c5bef623dfa84a54cf': 'capuchino2',         // La Estación Cafetería
  '6999e2c3bef623dfa84a54bf': 'pastel',             // Cacao Pastelería y Tapiocas
  '6999e2c4bef623dfa84a54c7': 'capuchino',          // Café de las Aves
  '6999e2b3bef623dfa84a53e7': 'enchiladasQueso',    // Comedor Conchita
  '6999e2b1bef623dfa84a53c7': 'gordita',            // Fonda Doña Chole
};

const aplicar = process.argv.includes('--aplicar');
const subidas = {};
const CARPETA = 'restaurantes-jalpan/restaurantes/referencia';

async function subir(clave) {
  if (subidas[clave]) return subidas[clave];
  const id = `referencia_${clave}`;
  const datos = (r) => ({ filename: r.public_id, url: r.secure_url, size: r.bytes, path: r.secure_url, cloudinaryId: r.public_id });
  try {
    subidas[clave] = datos(await cloudinary.api.resource(`${CARPETA}/${id}`));
    return subidas[clave];
  } catch (e) { /* no existe todavía */ }
  const opciones = {
    folder: CARPETA,
    public_id: id,
    overwrite: false,
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto:good' }],
  };
  // Primero se pide a Cloudinary que la descargue directamente
  try {
    subidas[clave] = datos(await cloudinary.uploader.upload(FOTOS[clave], opciones));
    return subidas[clave];
  } catch (e) { /* si Wikimedia la rechaza, se baja aquí */ }
  // Wikimedia rechaza descargas sin identificación: se baja aquí y se sube como datos
  let resp;
  for (let intento = 0; intento < 7; intento++) {
    resp = await fetch(FOTOS[clave], { headers: { 'User-Agent': 'JalpanRestaurantesBot/1.0 (fotos de referencia)' } });
    if (resp.status !== 429) break;
    await new Promise(r => setTimeout(r, 10000 * (intento + 1)));
  }
  if (!resp.ok) throw new Error(`No se pudo descargar ${clave}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const r = await cloudinary.uploader.upload(`data:${resp.headers.get('content-type') || 'image/jpeg'};base64,${buf.toString('base64')}`, opciones);
  await new Promise(r => setTimeout(r, 3000));
  subidas[clave] = datos(r);
  return subidas[clave];
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const [id, clave] of Object.entries(PLAN)) {
    const r = await Restaurant.findById(id).select('nombre imagenes').lean();
    if (!r) { console.log('No existe:', id); continue; }
    if ((r.imagenes || []).some(i => i && i.url)) { console.log('Ya tiene fotos, se omite:', r.nombre); continue; }
    if (!aplicar) { console.log('Agregaría', clave, 'a', r.nombre); continue; }
    // Sin cloudinaryId: si el dueño borra la foto de su local no se elimina de Cloudinary (la comparten varios)
    const { cloudinaryId, ...img } = await subir(clave);
    await Restaurant.updateOne(
      { _id: id, $or: [{ imagenes: { $size: 0 } }, { imagenes: { $exists: false } }] },
      { $set: { imagenes: [{ ...img, _id: new mongoose.Types.ObjectId(), uploadDate: new Date() }] } }
    );
    console.log('Listo:', r.nombre, '→', clave);
  }
  await mongoose.disconnect();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
