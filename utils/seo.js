// ===== utils/seo.js =====
// SEO del lado del servidor:
//  - sitemap.xml dinámico con todos los restaurantes, tours, guías y agencias
//  - título, descripción, vista previa (Open Graph / Twitter) y canonical
//    escritos directamente en el HTML de cada ficha, porque Google, WhatsApp
//    y Facebook no esperan a que el JavaScript del navegador los llene
//  - datos estructurados Schema.org (JSON-LD) para resultados enriquecidos
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Restaurant = require('../models/Restaurant');
const Tour = require('../models/Tour');
const Guia = require('../models/Guia');
const Agencia = require('../models/Agencia');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SITE_NAME = 'Jalpan de Serra';
const LOGO = '/images/PueblosMágicos.svg.png';
const IS_PROD = process.env.NODE_ENV === 'production';

// Páginas públicas fijas que van al sitemap
const PAGINAS_FIJAS = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/mapa.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/experiencias.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/jalpan-de-serra.html', priority: '0.7', changefreq: 'monthly' },
  { loc: '/Tradiciones.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/Contactos.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/privacidad.html', priority: '0.2', changefreq: 'yearly' },
  { loc: '/terminos.html', priority: '0.2', changefreq: 'yearly' }
];

// ---------- utilidades ----------
const siteUrl = (req) => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Campos bilingües { es, en, fr } o texto plano
const txt = (v) => (v && typeof v === 'object' ? (v.es || v.en || v.fr || '') : (v || ''));

const recortar = (s, max = 160) => {
  const limpio = String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio.length > max ? limpio.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : limpio;
};

const absoluta = (url, base) => {
  if (!url) return base + encodeURI(LOGO);
  if (/^https?:\/\//i.test(url)) return url;
  return base + (url.startsWith('/') ? '' : '/') + encodeURI(decodeURI(url));
};

// Imagen 1200x630 recortada (tamaño ideal para vistas previas) si viene de Cloudinary
const imagenPreview = (url, base) => {
  const abs = absoluta(url, base);
  return abs.replace(/\/image\/upload\/(?![a-z]{1,3}_[^/]*\/)/, '/image/upload/w_1200,h_630,c_fill,q_auto,f_jpg/');
};

const esObjectId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id);

const paginaRestaurante = (tipo) => (tipo === 'bar' ? '/bar.html' : tipo === 'cafeteria' ? '/cafeteria.html' : '/restaurante.html');

// ---------- plantillas HTML (en producción se cachean en memoria) ----------
const cachePlantillas = new Map();
async function leerPlantilla(archivo) {
  if (IS_PROD && cachePlantillas.has(archivo)) return cachePlantillas.get(archivo);
  const html = await fs.promises.readFile(path.join(PUBLIC_DIR, archivo), 'utf8');
  if (IS_PROD) cachePlantillas.set(archivo, html);
  return html;
}

// Reemplaza el content de un <meta> existente o lo agrega antes de </head>
// (se conservan los id="og-title" etc. que usa el JavaScript del navegador)
function upsertMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\b[^>]*\\b${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  const m = html.match(re);
  if (m) {
    const nuevo = /\bcontent=/i.test(m[0])
      ? m[0].replace(/\bcontent=(["'])[\s\S]*?\1/i, `content="${esc(value)}"`)
      : m[0].replace(/\s*\/?>$/, ` content="${esc(value)}">`);
    return html.replace(m[0], nuevo);
  }
  return html.replace(/<\/head>/i, `    <meta ${attr}="${key}" content="${esc(value)}">\n</head>`);
}

function aplicarSeo(html, seo) {
  // Título
  html = /<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/(<title\b[^>]*>)[\s\S]*?(<\/title>)/i, `$1${esc(seo.title)}$2`)
    : html.replace(/<\/head>/i, `    <title>${esc(seo.title)}</title>\n</head>`);

  html = upsertMeta(html, 'name', 'description', seo.description);
  html = upsertMeta(html, 'property', 'og:type', seo.ogType || 'website');
  html = upsertMeta(html, 'property', 'og:title', seo.title);
  html = upsertMeta(html, 'property', 'og:description', seo.description);
  html = upsertMeta(html, 'property', 'og:image', seo.image);
  html = upsertMeta(html, 'property', 'og:url', seo.url);
  html = upsertMeta(html, 'property', 'og:site_name', SITE_NAME);
  html = upsertMeta(html, 'property', 'og:locale', 'es_MX');
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', seo.title);
  html = upsertMeta(html, 'name', 'twitter:description', seo.description);
  html = upsertMeta(html, 'name', 'twitter:image', seo.image);

  // Canonical: una sola URL oficial por ficha (evita contenido duplicado)
  const canonical = `<link rel="canonical" href="${esc(seo.url)}">`;
  html = /<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(html)
    ? html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i, canonical)
    : html.replace(/<\/head>/i, `    ${canonical}\n</head>`);

  if (seo.jsonLd) {
    // "<" escapado para que el texto de los usuarios no pueda cerrar el <script>
    const json = JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c');
    html = html.replace(/<\/head>/i, `    <script type="application/ld+json">${json}</script>\n</head>`);
  }
  return html;
}

// ---------- datos de cada tipo de ficha ----------
async function seoRestaurante(id, base) {
  const r = await Restaurant.findOne({ _id: id, activo: { $ne: false } })
    .select('nombre tipo descripcion direccion telefono imagenes precioPromedio rangoPrecio tipoComida googleReviews horarios')
    .lean();
  if (!r) return null;
  const tipoTxt = { restaurante: 'Restaurante', bar: 'Bar', cafeteria: 'Cafetería' }[r.tipo] || 'Restaurante';
  const ciudad = (r.direccion && r.direccion.ciudad) || 'Jalpan de Serra';
  const principal = (r.imagenes || []).find((i) => i.esPrincipal) || (r.imagenes || [])[0];
  const url = `${base}${paginaRestaurante(r.tipo)}?id=${r._id}`;
  const description = recortar(txt(r.descripcion)) ||
    `${tipoTxt} en ${ciudad}, Querétaro. Consulta menú, horarios, fotos y reseñas.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': r.tipo === 'bar' ? 'BarOrPub' : r.tipo === 'cafeteria' ? 'CafeOrCoffeeShop' : 'Restaurant',
    name: r.nombre,
    description,
    url,
    image: principal ? absoluta(principal.url, base) : undefined,
    telephone: r.telefono || undefined,
    servesCuisine: r.tipoComida || undefined,
    priceRange: r.rangoPrecio || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: (r.direccion && r.direccion.calle) || undefined,
      addressLocality: ciudad,
      postalCode: (r.direccion && r.direccion.codigoPostal) || undefined,
      addressRegion: 'Querétaro',
      addressCountry: 'MX'
    }
  };
  const coords = r.direccion && r.direccion.coordenadas;
  if (coords && coords.lat && coords.lng) {
    jsonLd.geo = { '@type': 'GeoCoordinates', latitude: coords.lat, longitude: coords.lng };
  }
  if (r.googleReviews && r.googleReviews.rating > 0 && r.googleReviews.totalReviews > 0) {
    jsonLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: r.googleReviews.rating, reviewCount: r.googleReviews.totalReviews };
  }

  return {
    title: /jalpan/i.test(ciudad) ? `${r.nombre} - ${tipoTxt} | ${SITE_NAME}, Pueblo Mágico` : `${r.nombre} - ${tipoTxt} en ${ciudad} | ${SITE_NAME}`,
    description,
    image: imagenPreview(principal && principal.url, base),
    url,
    ogType: 'restaurant',
    jsonLd
  };
}

async function seoTour(id, base) {
  const t = await Tour.findOne({ _id: id, activo: { $ne: false } })
    .select('nombre descripcionCorta descripcion imagenPrincipal imagenes precio duracion')
    .lean();
  if (!t) return null;
  const nombre = txt(t.nombre);
  const img = (t.imagenPrincipal && t.imagenPrincipal.url) || ((t.imagenes || [])[0] || {}).url;
  const url = `${base}/experiencia.html?id=${t._id}`;
  const description = recortar(txt(t.descripcionCorta) || txt(t.descripcion)) ||
    'Vive esta experiencia en la Sierra Gorda de Querétaro.';
  const precio = t.precio && (typeof t.precio === 'object' ? (t.precio.adulto || t.precio.base || t.precio.monto) : t.precio);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: nombre,
    description,
    url,
    image: img ? absoluta(img, base) : undefined,
    touristType: 'Turismo de naturaleza y aventura',
    offers: typeof precio === 'number' && precio > 0
      ? { '@type': 'Offer', price: precio, priceCurrency: 'MXN', url }
      : undefined
  };
  return {
    title: `${nombre} - Experiencia | ${SITE_NAME}, Pueblo Mágico`,
    description,
    image: imagenPreview(img, base),
    url,
    jsonLd
  };
}

async function seoGuia(id, base) {
  const g = await Guia.findOne({ _id: id, activo: { $ne: false }, estado: 'activo' })
    .select('nombreCompleto biografia fotoPerfil idiomas especialidades')
    .lean();
  if (!g) return null;
  const url = `${base}/guia.html?id=${g._id}`;
  const description = recortar(txt(g.biografia)) ||
    `${g.nombreCompleto}, guía de turistas certificado en Jalpan de Serra y la Sierra Gorda.`;
  return {
    title: `${g.nombreCompleto} - Guía de turistas | ${SITE_NAME}, Pueblo Mágico`,
    description,
    image: imagenPreview(g.fotoPerfil && g.fotoPerfil.url, base),
    url,
    ogType: 'profile',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: g.nombreCompleto,
      description,
      url,
      image: g.fotoPerfil && g.fotoPerfil.url ? absoluta(g.fotoPerfil.url, base) : undefined,
      jobTitle: 'Guía de turistas',
      knowsLanguage: Array.isArray(g.idiomas) && g.idiomas.length ? g.idiomas.map(String) : undefined
    }
  };
}

async function seoAgencia(id, base) {
  const a = await Agencia.findOne({ _id: id, estado: { $ne: 'inactivo' } })
    .select('nombre descripcion logo telefono direccion paginaWeb calificacionPromedio numeroResenas')
    .lean();
  if (!a) return null;
  const url = `${base}/agencia.html?id=${a._id}`;
  const description = recortar(a.descripcion) ||
    `${a.nombre}, agencia de turismo local en Jalpan de Serra. Tours y experiencias en la Sierra Gorda.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: a.nombre,
    description,
    url,
    image: a.logo && a.logo.url ? absoluta(a.logo.url, base) : undefined,
    telephone: a.telefono || undefined,
    address: { '@type': 'PostalAddress', addressLocality: 'Jalpan de Serra', addressRegion: 'Querétaro', addressCountry: 'MX' }
  };
  if (a.calificacionPromedio > 0 && a.numeroResenas > 0) {
    jsonLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: a.calificacionPromedio, reviewCount: a.numeroResenas };
  }
  return {
    title: `${a.nombre} - Agencia de turismo | ${SITE_NAME}, Pueblo Mágico`,
    description,
    image: imagenPreview(a.logo && a.logo.url, base),
    url,
    jsonLd
  };
}

const FICHAS = {
  '/restaurante.html': seoRestaurante,
  '/bar.html': seoRestaurante,
  '/cafeteria.html': seoRestaurante,
  '/experiencia.html': seoTour,
  '/guia.html': seoGuia,
  '/agencia.html': seoAgencia
};

// Páginas fijas: solo se completan imagen/URL absolutas y canonical
const PAGINAS_SIMPLES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/mapa.html': 'mapa.html',
  '/experiencias.html': 'experiencias.html',
  '/jalpan-de-serra.html': 'jalpan-de-serra.html',
  '/Tradiciones.html': 'Tradiciones.html',
  '/Contactos.html': 'Contactos.html'
};

// ---------- middlewares ----------
function seoMiddleware(req, res, next) {
  if (req.method !== 'GET') return next();
  const generador = FICHAS[req.path];
  const simple = PAGINAS_SIMPLES[req.path];
  if (!generador && !simple) return next();

  (async () => {
    const base = siteUrl(req);
    let seo = null;
    let archivo = simple;

    if (generador) {
      const id = req.query.id;
      if (!esObjectId(id) || mongoose.connection.readyState !== 1) return next();
      seo = await generador(id, base);
      if (!seo) return next(); // no existe: que el HTML normal muestre su mensaje
      archivo = req.path.slice(1);
    } else {
      const html0 = await leerPlantilla(archivo);
      const titulo = (html0.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || SITE_NAME;
      const desc = (html0.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
      seo = {
        title: titulo.trim(),
        description: desc.replace(/\s+/g, ' ').trim(),
        image: base + encodeURI(req.path === '/' || req.path === '/index.html' ? '/images/Kayak en la Presa-103.jpg' : LOGO),
        url: base + (req.path === '/index.html' ? '/' : req.path)
      };
    }

    const html = aplicarSeo(await leerPlantilla(archivo), seo);
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(html);
  })().catch((err) => {
    console.error('SEO: no se pudo preparar la página', req.path, err.message);
    next();
  });
}

async function sitemapHandler(req, res) {
  const base = siteUrl(req);
  const urls = PAGINAS_FIJAS.map((p) => ({ ...p, loc: base + p.loc }));
  try {
    if (mongoose.connection.readyState === 1) {
      const [restaurantes, tours, guias, agencias] = await Promise.all([
        Restaurant.find({ activo: { $ne: false } }).select('tipo updatedAt').lean(),
        Tour.find({ activo: { $ne: false } }).select('updatedAt').lean(),
        Guia.find({ activo: { $ne: false }, estado: 'activo' }).select('updatedAt').lean(),
        Agencia.find({ estado: { $ne: 'inactivo' } }).select('updatedAt').lean()
      ]);
      const fecha = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
      restaurantes.forEach((r) => urls.push({ loc: `${base}${paginaRestaurante(r.tipo)}?id=${r._id}`, lastmod: fecha(r.updatedAt), priority: '0.9', changefreq: 'weekly' }));
      tours.forEach((t) => urls.push({ loc: `${base}/experiencia.html?id=${t._id}`, lastmod: fecha(t.updatedAt), priority: '0.8', changefreq: 'weekly' }));
      agencias.forEach((a) => urls.push({ loc: `${base}/agencia.html?id=${a._id}`, lastmod: fecha(a.updatedAt), priority: '0.7', changefreq: 'monthly' }));
      guias.forEach((g) => urls.push({ loc: `${base}/guia.html?id=${g._id}`, lastmod: fecha(g.updatedAt), priority: '0.6', changefreq: 'monthly' }));
    }
  } catch (err) {
    console.error('Sitemap: error leyendo la base de datos', err.message);
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url>\n' +
      `    <loc>${esc(u.loc)}</loc>\n` +
      (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
      `    <changefreq>${u.changefreq}</changefreq>\n` +
      `    <priority>${u.priority}</priority>\n` +
      '  </url>').join('\n') +
    '\n</urlset>\n';

  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/xml').send(xml);
}

function robotsHandler(req, res) {
  const base = siteUrl(req);
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /admin.html',
    'Disallow: /admin-turismo.html',
    'Disallow: /admin-gobierno.html',
    'Disallow: /admin-ranking.html',
    'Disallow: /super-admin.html',
    'Disallow: /manage-restaurant.html',
    'Disallow: /manage-images.html',
    'Disallow: /estadisticas.html',
    'Disallow: /mi-perfil.html',
    'Disallow: /user-panel.html',
    'Disallow: /login.html',
    'Disallow: /register.html',
    'Disallow: /recuperar-password.html',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    ''
  ].join('\n'));
}

module.exports = { seoMiddleware, sitemapHandler, robotsHandler };
