const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Modelo Tour
const Tour = require('./models/Tour');

// Conectar a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jalpan-turismo');
    console.log('✅ MongoDB conectado correctamente');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Traduce y prepara un tour para insertar en la BD.
 * Convierte strings planos en { es, en } usando DeepL.
 */
async function prepararTour(tourPlano) {
  const imagenObj = {
    filename: tourPlano.slug || 'default',
    url: tourPlano.imagenPrincipal || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000'
  };

  return {
    ...tourPlano,
    nombre: { es: tourPlano.nombre, en: tourPlano.nombre },
    descripcion: { es: tourPlano.descripcion, en: tourPlano.descripcion },
    descripcionCorta: { es: tourPlano.descripcionCorta, en: tourPlano.descripcionCorta },
    imagenPrincipal: imagenObj,
    incluye: (tourPlano.incluye || []).map(item => ({ es: item, en: item })),
    noIncluye: (tourPlano.noIncluye || []).map(item => ({ es: item, en: item })),
    queTraer: (tourPlano.queTraer || []).map(item => ({ es: item, en: item })),
    requisitos: (tourPlano.requisitos || []).map(item => ({ es: item, en: item })),
    restricciones: (tourPlano.restricciones || []).map(item => ({ es: item, en: item }))
  };
}

// ============================================
// DESTINOS TURÍSTICOS (13 tours originales)
// ============================================
const destinosTuristicos = [
  {
    nombre: 'Gruta Jalpan',
    slug: 'gruta-jalpan',
    descripcion: 'Ruta de espeleología en la cueva del Puente de Dios ubicada en Jalpan. Esta impresionante formación natural te permitirá adentrarte en el corazón de la Sierra Gorda. El recorrido incluye la exploración de diferentes salas de la cueva, con formaciones rocosas milenarias, estalactitas y estalagmitas.',
    descripcionCorta: 'Explora la impresionante cueva del Puente de Dios',
    tipo: 'Experiencia Turística',
    categoria: 'Espeleismo',
    duracion: { horas: 4, descripcion: 'Media jornada' },
    dificultad: 'Moderado',
    precio: { amount: 800, moneda: 'MXN' },
    incluye: ['Equipo de espeleología', 'Guía certificado', 'Seguro'],
    noIncluye: ['Transporte', 'Alimentos'],
    queTraer: ['Ropa cómoda que pueda ensuciarse', 'Calzado cerrado', 'Agua', 'Cambio de ropa'],
    capacidad: { minima: 4, maxima: 12 },
    requisitos: ['Condición física moderada', 'No claustrofobia'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/gruta-jalpan.jpg'
  },
  {
    nombre: 'Zona Arqueológica de Tancama',
    slug: 'zona-arqueologica-tancama',
    descripcion: 'Excursión por el sitio arqueológico de origen huasteco. El traslado puede realizarse en automóvil, en RZR, bici o senderismo. Aprenderás sobre la cosmovisión huasteca y su historia.',
    descripcionCorta: 'Descubre la historia huasteca de la región',
    tipo: 'Experiencia Turística',
    categoria: 'Turismo Cultural',
    duracion: { horas: 3, descripcion: 'Medio día' },
    dificultad: 'Fácil',
    precio: { amount: 500, moneda: 'MXN' },
    incluye: ['Guía certificado', 'Entrada al sitio', 'Transporte opcional'],
    noIncluye: ['Alimentos', 'Bebidas'],
    queTraer: ['Ropa cómoda', 'Calzado adecuado', 'Protector solar', 'Gorra', 'Agua'],
    capacidad: { minima: 2, maxima: 20 },
    requisitos: ['Interés en historia y cultura'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/tancama.jpg'
  },
  {
    nombre: 'Observación de Aves',
    slug: 'observacion-de-aves',
    descripcion: 'Embárcate en un emocionante recorrido para apreciar la diversidad de aves residentes y migratorias en las inmediaciones de la presa Jalpan. Una experiencia inolvidable para conectar con la naturaleza.',
    descripcionCorta: 'Avistamiento de aves en la Presa Jalpan',
    tipo: 'Experiencia Turística',
    categoria: 'Aviturismo',
    duracion: { horas: 3, descripcion: 'Mañana completa' },
    dificultad: 'Fácil',
    precio: { amount: 600, moneda: 'MXN' },
    incluye: ['Guía especializado', 'Binoculares', 'Guía de aves'],
    noIncluye: ['Transporte', 'Alimentos'],
    queTraer: ['Ropa cómoda en colores neutros', 'Calzado cómodo', 'Agua', 'Cámara fotográfica'],
    capacidad: { minima: 2, maxima: 10 },
    requisitos: ['Paciencia', 'Silencio durante la observación'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/aves.jpg'
  },
  {
    nombre: 'Misiones Franciscanas',
    slug: 'misiones-franciscanas',
    descripcion: 'Explora joyas virreinales entre montañas. Cinco misiones Patrimonio UNESCO te esperan en la Sierra Gorda de Querétaro. Un viaje histórico y cultural inigualable.',
    descripcionCorta: 'Tour por las misiones Patrimonio UNESCO',
    tipo: 'Experiencia Turística',
    categoria: 'Turismo Cultural',
    duracion: { horas: 8, descripcion: 'Día completo' },
    dificultad: 'Fácil',
    precio: { amount: 1200, moneda: 'MXN' },
    incluye: ['Transporte', 'Guía certificado', 'Entradas', 'Comida'],
    noIncluye: ['Propinas', 'Compras personales'],
    queTraer: ['Ropa cómoda', 'Calzado cómodo', 'Cámara fotográfica', 'Agua'],
    capacidad: { minima: 4, maxima: 15 },
    requisitos: ['Respeto a los sitios religiosos'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/misiones.jpg'
  },
  {
    nombre: 'Poza La Cazuela',
    slug: 'poza-la-cazuela',
    descripcion: 'Después de un recorrido corto de senderismo llegamos a esta impresionante poza de agua cristalina sobre el Río Jalpan. Disponible únicamente en temporada de lluvias.',
    descripcionCorta: 'Poza de agua cristalina en el Río Jalpan',
    tipo: 'Experiencia Turística',
    categoria: 'Senderismo',
    duracion: { horas: 5, descripcion: 'Media jornada' },
    dificultad: 'Moderado',
    precio: { amount: 700, moneda: 'MXN' },
    incluye: ['Guía certificado', 'Seguro'],
    noIncluye: ['Transporte', 'Alimentos', 'Equipo de natación'],
    queTraer: ['Traje de baño', 'Toalla', 'Cambio de ropa', 'Calzado que pueda mojarse', 'Agua', 'Snacks'],
    capacidad: { minima: 4, maxima: 12 },
    requisitos: ['Saber nadar', 'Disponible solo en temporada de lluvias (junio-octubre)'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/poza-cazuela.jpg'
  },
  {
    nombre: 'Presa Jalpan en Kayak',
    slug: 'presa-jalpan-kayak',
    descripcion: 'Rema en las aguas tranquilas de la Presa Jalpan. Disfruta de un emocionante recorrido en kayak, rodeado de paisajes impresionantes y la vida silvestre local.',
    descripcionCorta: 'Recorrido en kayak por la Presa Jalpan',
    tipo: 'Experiencia Turística',
    categoria: 'Kayak',
    duracion: { horas: 3, descripcion: 'Medio día' },
    dificultad: 'Fácil',
    precio: { amount: 650, moneda: 'MXN' },
    incluye: ['Kayak', 'Chaleco salvavidas', 'Guía', 'Seguro'],
    noIncluye: ['Transporte', 'Alimentos'],
    queTraer: ['Ropa que pueda mojarse', 'Cambio de ropa', 'Protector solar', 'Gorra', 'Agua'],
    capacidad: { minima: 2, maxima: 10 },
    requisitos: ['Saber nadar'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/kayak.jpg'
  },
  {
    nombre: 'Casa de los Duendes',
    slug: 'casa-de-los-duendes',
    descripcion: 'Atrévete a vivir una experiencia espeluznante al caer la noche en este rincón abandonado cerca de Jalpan. Incluye apreciación celestial y avistamiento de fauna silvestre.',
    descripcionCorta: 'Experiencia nocturna y observación de estrellas',
    tipo: 'Experiencia Turística',
    categoria: 'RZR',
    duracion: { horas: 4, descripcion: 'Noche' },
    dificultad: 'Moderado',
    precio: { amount: 900, moneda: 'MXN' },
    incluye: ['Transporte en RZR', 'Guía', 'Seguro'],
    noIncluye: ['Alimentos', 'Bebidas'],
    queTraer: ['Ropa abrigadora', 'Linterna', 'Agua', 'Snacks'],
    capacidad: { minima: 4, maxima: 8 },
    requisitos: ['Mayor de 12 años'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/duendes.jpg'
  },
  {
    nombre: 'Mirador de la Peña Blanca',
    slug: 'mirador-pena-blanca-destino',
    descripcion: 'Recorrido de senderismo entre los bosques templados de Jalpan. Un paisaje de ensueño con aire fresco y vistas panorámicas.',
    descripcionCorta: 'Senderismo con vistas panorámicas',
    tipo: 'Experiencia Turística',
    categoria: 'Senderismo',
    duracion: { horas: 4, descripcion: 'Media jornada' },
    dificultad: 'Moderado',
    precio: { amount: 550, moneda: 'MXN' },
    incluye: ['Guía certificado', 'Bastones de senderismo', 'Agua'],
    noIncluye: ['Transporte', 'Alimentos'],
    queTraer: ['Calzado de senderismo', 'Ropa en capas', 'Snacks', 'Cámara fotográfica'],
    capacidad: { minima: 2, maxima: 15 },
    requisitos: ['Condición física moderada'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/pena-blanca.jpg'
  },
  {
    nombre: 'Mirador de la Joya',
    slug: 'mirador-la-joya',
    descripcion: 'Conexión total con la naturaleza bajo la sombra de pinos, liquidámbares y encinos, hasta llegar a este majestuoso mirador en medio de las montañas.',
    descripcionCorta: 'Mirador panorámico en las montañas',
    tipo: 'Experiencia Turística',
    categoria: 'Senderismo',
    duracion: { horas: 5, descripcion: 'Media jornada' },
    dificultad: 'Moderado',
    precio: { amount: 600, moneda: 'MXN' },
    incluye: ['Guía certificado', 'Snack', 'Agua'],
    noIncluye: ['Transporte', 'Comida completa'],
    queTraer: ['Calzado de senderismo', 'Ropa cómoda', 'Hidratación extra', 'Cámara'],
    capacidad: { minima: 3, maxima: 12 },
    requisitos: ['Condición física moderada'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/la-joya.jpg'
  },
  {
    nombre: 'Cueva de la Diosa Cachum',
    slug: 'cueva-diosa-cachum',
    descripcion: 'Aventura por senderos entre vegetación hasta la enigmática Cueva de la Diosa Cachum, con formaciones rocosas milenarias. Conecta con la antigua cosmovisión de la región.',
    descripcionCorta: 'Espeleología y cultura ancestral',
    tipo: 'Experiencia Turística',
    categoria: 'Espeleismo',
    duracion: { horas: 6, descripcion: 'Día completo' },
    dificultad: 'Difícil',
    precio: { amount: 950, moneda: 'MXN' },
    incluye: ['Equipo de espeleología', 'Guía especializado', 'Seguro', 'Lunch'],
    noIncluye: ['Transporte', 'Bebidas'],
    queTraer: ['Ropa que pueda ensuciarse', 'Calzado cerrado', 'Cambio de ropa', 'Agua extra'],
    capacidad: { minima: 4, maxima: 10 },
    requisitos: ['Buena condición física', 'No claustrofobia'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/cachum.jpg'
  },
  {
    nombre: 'Tancoyol Cultural',
    slug: 'tancoyol-cultural',
    descripcion: 'Sumérgete en la riqueza cultural visitando la Misión Franciscana, el museo comunitario Xi\'ioi y observa la elaboración de artesanías de palma por comunidades indígenas locales.',
    descripcionCorta: 'Turismo cultural en Tancoyol',
    tipo: 'Experiencia Turística',
    categoria: 'Turismo Cultural',
    duracion: { horas: 5, descripcion: 'Día completo' },
    dificultad: 'Fácil',
    precio: { amount: 750, moneda: 'MXN' },
    incluye: ['Transporte', 'Guía', 'Entradas', 'Comida típica'],
    noIncluye: ['Compra de artesanías', 'Propinas'],
    queTraer: ['Ropa cómoda', 'Calzado cómodo', 'Cámara fotográfica', 'Efectivo para artesanías'],
    capacidad: { minima: 4, maxima: 20 },
    requisitos: ['Respeto a las tradiciones locales'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/tancoyol.jpg'
  },
  {
    nombre: 'Ex Hacienda San Francisco',
    slug: 'ex-hacienda-san-francisco',
    descripcion: 'Adéntrate en la historia de la Sierra Gorda visitando la Ex Hacienda San Francisco. Descubre los vestigios de su arquitectura colonial.',
    descripcionCorta: 'Recorrido histórico por arquitectura colonial',
    tipo: 'Experiencia Turística',
    categoria: 'Turismo Cultural',
    duracion: { horas: 3, descripcion: 'Medio día' },
    dificultad: 'Fácil',
    precio: { amount: 450, moneda: 'MXN' },
    incluye: ['Guía certificado', 'Entrada'],
    noIncluye: ['Transporte', 'Alimentos'],
    queTraer: ['Ropa cómoda', 'Calzado cómodo', 'Cámara fotográfica', 'Agua'],
    capacidad: { minima: 2, maxima: 25 },
    requisitos: ['Ninguno especial'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/hacienda.jpg'
  },
  {
    nombre: 'Rancho Arriaga',
    slug: 'rancho-arriaga',
    descripcion: 'Fusión de gastronomía, naturaleza y cultura en un restaurante único rodeado de plantaciones de agave. Degusta platillos regionales con ingredientes frescos.',
    descripcionCorta: 'Experiencia gastronómica y cultural',
    tipo: 'Experiencia Turística',
    categoria: 'RZR',
    duracion: { horas: 4, descripcion: 'Medio día' },
    dificultad: 'Fácil',
    precio: { amount: 850, moneda: 'MXN' },
    incluye: ['Transporte', 'Comida', 'Guía', 'Degustación'],
    noIncluye: ['Bebidas alcohólicas', 'Propinas'],
    queTraer: ['Ropa cómoda', 'Cámara fotográfica', 'Apetito'],
    capacidad: { minima: 4, maxima: 15 },
    requisitos: ['Ninguno especial'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/destinos/arriaga.jpg'
  }
];

// ============================================
// TURISMO COMUNITARIO (8 experiencias)
// ============================================
const turismoComunitario = [
  {
    nombre: 'Ruta del Pulque',
    slug: 'ruta-del-pulque',
    descripcion: 'Senderismo por la ruta tradicional del pulque en comunidades rurales de Jalpan. Experiencia que combina naturaleza, cultura y gastronomía local.',
    descripcionCorta: 'Senderismo cultural por la ruta del pulque con beneficio directo a comunidades locales',
    tipo: 'Turismo Comunitario',
    categoria: 'Senderismo',
    duracion: { horas: 5, descripcion: 'De 3 a 8 horas' },
    dificultad: 'Moderado',
    precio: { amount: 2050, moneda: 'MXN' },
    incluye: ['Guía comunitario local', 'Degustación de pulque', 'Comida tradicional', 'Interacción con comunidades'],
    noIncluye: ['Transporte al punto de inicio', 'Seguro de viajero', 'Propinas'],
    queTraer: ['Calzado adecuado para senderismo', 'Ropa adecuada', 'Hidratación', 'Snacks', 'Protector solar', 'Gorra o sombrero'],
    capacidad: { minima: 2, maxima: 15 },
    requisitos: ['Condición física moderada', 'Respeto a las comunidades locales', 'Disposición para caminar 5-20 km'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/ruta-pulque.jpg'
  },
  {
    nombre: 'Ruta Herbolaria',
    slug: 'ruta-herbolaria',
    descripcion: 'Recorrido por senderos donde aprenderás sobre plantas medicinales y herbolaria tradicional de la Sierra Gorda, guiado por conocedores locales.',
    descripcionCorta: 'Senderismo educativo sobre plantas medicinales con guías comunitarios',
    tipo: 'Turismo Comunitario',
    categoria: 'Ruta Herbolaria',
    duracion: { horas: 5, descripcion: 'De 3 a 8 horas' },
    dificultad: 'Fácil',
    precio: { amount: 1870, moneda: 'MXN' },
    incluye: ['Guía herbolario local', 'Talleres de herbolaria', 'Comida tradicional', 'Material didáctico'],
    noIncluye: ['Transporte', 'Seguro de viajero'],
    queTraer: ['Calzado adecuado', 'Ropa cómoda', 'Hidratación', 'Snacks', 'Libreta y pluma (opcional)'],
    capacidad: { minima: 2, maxima: 12 },
    requisitos: ['Interés en herbolaria tradicional', 'Disposición para caminar 5-10 km'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/ruta-herbolaria.jpg'
  },
  {
    nombre: 'Ruta del Agua',
    slug: 'ruta-del-agua',
    descripcion: 'Explora manantiales, arroyos y cascadas de la región mientras aprendes sobre la gestión comunitaria del agua y su importancia en la cultura local.',
    descripcionCorta: 'Senderismo acuático por manantiales y cascadas con comunidades locales',
    tipo: 'Turismo Comunitario',
    categoria: 'Ruta del Agua',
    duracion: { horas: 6, descripcion: 'Varía según la ruta elegida' },
    dificultad: 'Moderado',
    precio: { amount: 1880, moneda: 'MXN' },
    incluye: ['Guía local', 'Acceso a manantiales', 'Comida regional', 'Pláticas sobre conservación del agua'],
    noIncluye: ['Transporte', 'Equipo de natación'],
    queTraer: ['Calzado adecuado (puede mojarse)', 'Ropa de cambio', 'Traje de baño', 'Hidratación', 'Snacks', 'Toalla'],
    capacidad: { minima: 2, maxima: 15 },
    requisitos: ['Saber nadar (opcional)', 'Disposición para caminar 5-15 km'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/ruta-agua.jpg'
  },
  {
    nombre: 'Ruta Pachol - Ciclismo de Montaña',
    slug: 'ruta-pachol-mtb',
    descripcion: 'Circuito de ciclismo de montaña a través de caminos rurales, bosques y comunidades de la Sierra Gorda. Una experiencia única para amantes del MTB y Gravel.',
    descripcionCorta: 'Ciclismo de montaña en caminos rurales con apoyo comunitario',
    tipo: 'Turismo Comunitario',
    categoria: 'Ciclismo de Montaña',
    duracion: { horas: 4, descripcion: 'De 3 a 5 horas' },
    dificultad: 'Difícil',
    precio: { amount: 1775, moneda: 'MXN' },
    incluye: ['Guía ciclista', 'Apoyo mecánico básico', 'Comida local', 'Hidratación durante el recorrido'],
    noIncluye: ['Bicicleta (se requiere MTB o Gravel propia)', 'Equipo de protección', 'Transporte', 'Seguro'],
    queTraer: ['Bicicleta MTB o Gravel en buen estado', 'Casco (obligatorio)', 'Ropa deportiva adecuada', 'Hidratación extra', 'Herramientas básicas de bicicleta'],
    capacidad: { minima: 3, maxima: 10 },
    requisitos: ['Experiencia en ciclismo de montaña', 'Bicicleta en buen estado', 'Condición física buena', 'Disposición para recorrer 30-40 km'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/ruta-pachol.jpg'
  },
  {
    nombre: 'Mirador de la Peña Blanca',
    slug: 'mirador-pena-blanca',
    descripcion: 'Caminata hasta uno de los miradores más espectaculares de la Sierra Gorda. Vistas panorámicas impresionantes y contacto directo con la naturaleza.',
    descripcionCorta: 'Senderismo a mirador panorámico con vistas espectaculares',
    tipo: 'Turismo Comunitario',
    categoria: 'Senderismo',
    duracion: { horas: 4, descripcion: 'De 3 a 6 horas' },
    dificultad: 'Difícil',
    precio: { amount: 2650, moneda: 'MXN' },
    incluye: ['Guía local experto', 'Comida en mirador', 'Explicación de la biodiversidad local', 'Fotografías del recorrido'],
    noIncluye: ['Transporte', 'Equipo especializado'],
    queTraer: ['Calzado de senderismo', 'Ropa adecuada en capas', 'Hidratación abundante', 'Snacks energéticos', 'Cámara fotográfica', 'Bastones de senderismo (opcional)'],
    capacidad: { minima: 2, maxima: 12 },
    requisitos: ['Excelente condición física', 'No tener vértigo', 'Experiencia previa en senderismo de montaña'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/pena-blanca.jpg'
  },
  {
    nombre: 'Mirador Los Charcos',
    slug: 'mirador-los-charcos',
    descripcion: 'Ruta de senderismo flexible que puede adaptarse desde caminatas cortas hasta expediciones de día completo. Ideal para todos los niveles.',
    descripcionCorta: 'Senderismo flexible a mirador natural con múltiples opciones de ruta',
    tipo: 'Turismo Comunitario',
    categoria: 'Senderismo',
    duracion: { horas: 10, descripcion: 'De 2 a 20 horas según ruta elegida' },
    dificultad: 'Moderado',
    precio: { amount: 1755, moneda: 'MXN' },
    incluye: ['Guía comunitario', 'Comida (en rutas largas)', 'Acceso a miradores', 'Explicación de flora y fauna'],
    noIncluye: ['Transporte', 'Equipo de camping (rutas largas)'],
    queTraer: ['Calzado adecuado', 'Ropa cómoda', 'Hidratación', 'Snacks', 'Linterna (rutas largas)', 'Equipo de camping (si aplica)'],
    capacidad: { minima: 2, maxima: 15 },
    requisitos: ['Disposición para caminar 4-20 km', 'Adaptabilidad a diferentes condiciones'],
    activo: true,
    destacado: false,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/los-charcos.jpg'
  },
  {
    nombre: 'Ruta Xi\'iui - La Palma / La Misión',
    slug: 'ruta-xiiui',
    descripcion: 'Expedición de senderismo de 1 a 2 días por la ruta Xi\'iui, conectando las comunidades de La Palma y La Misión. Una experiencia inmersiva en la cultura y naturaleza de la Sierra Gorda.',
    descripcionCorta: 'Expedición de senderismo de 1-2 días entre comunidades serranas',
    tipo: 'Turismo Comunitario',
    categoria: 'Senderismo',
    duracion: { horas: 11, descripcion: 'De 8 a 14 horas, 1-2 días' },
    dificultad: 'Extremo',
    precio: { amount: 2350, moneda: 'MXN' },
    incluye: ['Guía experto local', 'Todas las comidas', 'Hospedaje (ruta de 2 días)', 'Traslados entre comunidades', 'Interacción cultural'],
    noIncluye: ['Transporte al punto de inicio', 'Equipo de camping especializado', 'Seguro de montaña'],
    queTraer: ['Calzado de montaña', 'Ropa en capas', 'Hidratación abundante', 'Comida y snacks extra', 'Saco de dormir (ruta de 2 días)', 'Linterna frontal', 'Botiquín personal'],
    capacidad: { minima: 4, maxima: 10 },
    requisitos: ['Excelente condición física', 'Experiencia en senderismo de larga distancia', 'Preparación previa', 'Disposición para caminar 20 km'],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/xiiui.jpg'
  },
  {
    nombre: 'Corredor Yatshu - "Hogar de tierra verde"',
    slug: 'corredor-yatshu',
    descripcion: 'Corredor biocultural de 45 kilómetros que recorre 10 comunidades al norte de Jalpan. Conservación de bosques, tradiciones y hogar del jaguar en Querétaro. Incluye múltiples actividades en contacto con la naturaleza.',
    descripcionCorta: 'Corredor biocultural con actividades múltiples en 10 comunidades',
    tipo: 'Turismo Comunitario',
    categoria: 'Rutas Bioculturales',
    duracion: { horas: 8, descripcion: 'Varía según actividades elegidas' },
    dificultad: 'Moderado',
    precio: { amount: 2200, moneda: 'MXN' },
    incluye: ['Guías comunitarios', 'Talleres de artesanías (barba de pino, barro, madera)', 'Visita a producción de miel', 'Comida a la leña', 'Tortillas hechas a mano', 'Recorridos por comunidades'],
    noIncluye: ['Transporte entre comunidades', 'Compra de artesanías', 'Actividades especializadas extra'],
    queTraer: ['Ropa cómoda', 'Calzado adecuado', 'Hidratación', 'Cámara fotográfica', 'Disposición para aprender'],
    capacidad: { minima: 3, maxima: 20 },
    requisitos: ['Respeto a las tradiciones locales', 'Interés en conservación ambiental', 'Disposición para actividades variadas'],
    puntosInteres: [
      { nombre: 'Talleres artesanales', descripcion: 'Barba de pino, barro, madera' },
      { nombre: 'Producción de miel', descripcion: 'Conoce el proceso apícola local' },
      { nombre: 'Bosques conservados', descripcion: 'Hogar del jaguar en Querétaro' }
    ],
    activo: true,
    destacado: true,
    imagenPrincipal: 'https://res.cloudinary.com/default/turismo-comunitario/corredor-yatshu.jpg'
  }
];

// Función para importar TODOS los datos
const importData = async () => {
  try {
    await connectDB();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   IMPORTANDO TODAS LAS EXPERIENCIAS   ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Eliminar todos los tours existentes
    console.log('🗑️  Eliminando tours existentes...');
    await Tour.deleteMany({});

    // ── Traducir y preparar Destinos Turísticos ──────────────────────
    console.log('\n🌐 Traduciendo Destinos Turísticos con DeepL...');
    const destinosPreparados = [];
    for (const tour of destinosTuristicos) {
      const preparado = await prepararTour(tour);
      destinosPreparados.push(preparado);
    }

    console.log('\n📝 Insertando Destinos Turísticos...');
    const destinosCreados = await Tour.insertMany(destinosPreparados);
    console.log(`✅ ${destinosCreados.length} Destinos Turísticos creados!`);
    destinosCreados.forEach(tour => {
      console.log(`   - ${tour.nombre.es} → ${tour.nombre.en}`);
    });

    // ── Traducir y preparar Turismo Comunitario ──────────────────────
    console.log('\n🌐 Traduciendo Turismo Comunitario con DeepL...');
    const comunitarioPreparados = [];
    for (const tour of turismoComunitario) {
      const preparado = await prepararTour(tour);
      comunitarioPreparados.push(preparado);
    }

    console.log('\n📝 Insertando Turismo Comunitario...');
    const comunitarioCreados = await Tour.insertMany(comunitarioPreparados);
    console.log(`✅ ${comunitarioCreados.length} experiencias de Turismo Comunitario creadas!`);
    comunitarioCreados.forEach(tour => {
      console.log(`   - ${tour.nombre.es} → ${tour.nombre.en}`);
    });

    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║   ✓ TOTAL: ${destinosCreados.length + comunitarioCreados.length} EXPERIENCIAS CREADAS      ║`);
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al importar datos:', error);
    process.exit(1);
  }
};

// Función para eliminar datos
const deleteData = async () => {
  try {
    await connectDB();
    console.log('🗑️  Eliminando todas las experiencias...');
    await Tour.deleteMany({});
    console.log('✅ Datos eliminados exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al eliminar datos:', error);
    process.exit(1);
  }
};

// Ejecutar según argumento
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Uso:');
  console.log('  node seederExperiencias.js -i  (importar todos los datos)');
  console.log('  node seederExperiencias.js -d  (eliminar todos los datos)');
  process.exit(0);
}
