// Indicadores para el perfil gubernamental: solo números reales, listos para informes.
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const User = require('../models/User');
const Guia = require('../models/Guia');
const Tour = require('../models/Tour');
const Agencia = require('../models/Agencia');
const Itinerario = require('../models/Itinerario');
const Hotel = require('../modules/hospedaje/models/Hotel');
const Cabana = require('../modules/hospedaje/models/Cabana');
const Airbnb = require('../modules/hospedaje/models/Airbnb');
const ResenaHospedaje = require('../modules/hospedaje/models/Review');

const MESES_TXT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const TIPOS_HOSP = { hotel: Hotel, cabana: Cabana, airbnb: Airbnb };
const ETIQUETA = { restaurante: 'Restaurante', bar: 'Bar', cafeteria: 'Cafetería', 'obrador-artesanal': 'Obrador artesanal', hotel: 'Hotel', cabana: 'Cabaña', airbnb: 'Airbnb' };

const seguro = async (fn, porDefecto) => { try { return await fn(); } catch (e) { console.warn('Indicador no disponible:', e.message); return porDefecto; } };
const clave = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const redondear = (n, d = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : 0);
const promedio = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

function listaMeses(n) {
  const hoy = new Date();
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push({ clave: clave(d), texto: MESES_TXT[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) });
  }
  return lista;
}

// Cuenta documentos por mes de un campo fecha
async function porMes(Modelo, campo, desde, filtro = {}) {
  const filas = await Modelo.aggregate([
    { $match: Object.assign({ [campo]: { $gte: desde } }, filtro) },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$' + campo, timezone: 'America/Mexico_City' } }, n: { $sum: 1 } } }
  ]);
  const m = {};
  filas.forEach((f) => { m[f._id] = f.n; });
  return m;
}

function precioHospedaje(h) {
  const precios = [];
  [h.precio, h.precioPorNoche].forEach((p) => { if (Number(p) > 0) precios.push(Number(p)); });
  if (Array.isArray(h.habitaciones)) h.habitaciones.forEach((x) => { if (Number(x && x.precio) > 0) precios.push(Number(x.precio)); });
  return precios.length ? Math.min(...precios) : 0;
}

function capacidadHospedaje(h) {
  const c = h.capacidad || {};
  let huespedes = Number(c.huespedes || c.personasMax) || 0;
  let cuartos = Number(c.habitaciones) || 0;
  if (Array.isArray(h.habitaciones) && h.habitaciones.length) {
    const sumaH = h.habitaciones.reduce((s, x) => s + (Number(x && x.cantidad) || 1), 0);
    const sumaP = h.habitaciones.reduce((s, x) => s + (Number(x && x.capacidad && (x.capacidad.huespedes || x.capacidad.personasMax)) || 0) * (Number(x && x.cantidad) || 1), 0);
    cuartos = Math.max(cuartos, sumaH);
    huespedes = Math.max(huespedes, sumaP);
  }
  return { huespedes, cuartos };
}

exports.getIndicadores = async (req, res) => {
  try {
    const n = [6, 12, 24].includes(Number(req.query.meses)) ? Number(req.query.meses) : 12;
    const meses = listaMeses(n);
    const desde = new Date(new Date().getFullYear(), new Date().getMonth() - (n - 1), 1);
    const mesHoy = meses[meses.length - 1].clave;
    const mesAntes = meses[meses.length - 2].clave;

    // ---------- Oferta: comida ----------
    const restaurantes = await Restaurant.find({})
      .select('nombre tipo activo estadisticas estadisticasMensuales createdAt direccion.colonia direccion.ciudad')
      .lean();
    const resenasComida = await seguro(() => Review.aggregate([
      { $match: { estado: { $nin: ['rechazada', 'pendiente'] } } },
      { $group: { _id: '$restaurantId', prom: { $avg: '$rating' }, n: { $sum: 1 } } }
    ]), []);
    const calComida = {};
    resenasComida.forEach((r) => { if (r._id) calComida[String(r._id)] = r; });

    // ---------- Oferta: hospedaje ----------
    const hospedajes = [];
    for (const [tipo, Modelo] of Object.entries(TIPOS_HOSP)) {
      const lista = await seguro(() => Modelo.find({})
        .select('+estadisticas +estadisticasMensuales nombre activo precio precioPorNoche habitaciones capacidad calificacion createdAt ubicacion.direccion')
        .lean(), []);
      lista.forEach((h) => hospedajes.push(Object.assign(h, { tipo })));
    }

    // ---------- Experiencias y servicios ----------
    const [tours, totalGuias, guiasCertificados, totalAgencias] = await Promise.all([
      seguro(() => Tour.find({}).select('nombre categoria precio activo calificacionPromedio').lean(), []),
      seguro(() => Guia.countDocuments({}), 0),
      seguro(() => Guia.countDocuments({ credencialSECTUR: { $exists: true, $ne: '' } }), 0),
      seguro(() => Agencia.countDocuments({}), 0)
    ]);

    // ---------- Viajeros ----------
    const [totalViajeros, viajerosMes, itinerarios, favoritosAgg] = await Promise.all([
      seguro(() => User.countDocuments({}), 0),
      seguro(() => porMes(User, 'createdAt', desde), {}),
      seguro(() => Itinerario.countDocuments({}), 0),
      seguro(() => User.aggregate([{ $project: { f: { $add: [{ $size: { $ifNull: ['$favoritos', []] } }, { $size: { $ifNull: ['$experienciasFavoritas', []] } }] } } }, { $group: { _id: null, t: { $sum: '$f' } } }]), [])
    ]);

    // ---------- Opiniones ----------
    const [opComidaMes, opHospMes, distComida, distHosp] = await Promise.all([
      seguro(() => porMes(Review, 'createdAt', desde, { estado: { $ne: 'rechazada' } }), {}),
      seguro(() => porMes(ResenaHospedaje, 'createdAt', desde, { estado: { $ne: 'rechazada' } }), {}),
      seguro(() => Review.aggregate([{ $match: { estado: { $nin: ['rechazada', 'pendiente'] } } }, { $group: { _id: { $round: ['$rating', 0] }, n: { $sum: 1 } } }]), []),
      seguro(() => ResenaHospedaje.aggregate([{ $match: { estado: { $nin: ['rechazada', 'pendiente'] } } }, { $group: { _id: { $round: ['$rating', 0] }, n: { $sum: 1 } } }]), [])
    ]);
    const distribucion = [1, 2, 3, 4, 5].map((e) => ({
      estrellas: e,
      n: (distComida.find((x) => x._id === e)?.n || 0) + (distHosp.find((x) => x._id === e)?.n || 0)
    }));
    const totalOpiniones = distribucion.reduce((s, x) => s + x.n, 0);
    const positivas = distribucion.filter((x) => x.estrellas >= 4).reduce((s, x) => s + x.n, 0);
    const negativas = distribucion.filter((x) => x.estrellas <= 2).reduce((s, x) => s + x.n, 0);
    const calificacionGeneral = totalOpiniones ? distribucion.reduce((s, x) => s + x.estrellas * x.n, 0) / totalOpiniones : 0;

    // ---------- Interés (visitas a fichas y clics de contacto) ----------
    const serie = {};
    meses.forEach((m) => { serie[m.clave] = { vistas: 0, contacto: 0 }; });
    restaurantes.forEach((r) => (r.estadisticasMensuales || []).forEach((e) => {
      if (serie[e.fecha]) { serie[e.fecha].vistas += e.vistas || 0; serie[e.fecha].contacto += (e.clicsWhatsapp || 0) + (e.clicsMapa || 0); }
    }));
    hospedajes.forEach((h) => (h.estadisticasMensuales || []).forEach((e) => {
      if (serie[e.mes]) { serie[e.mes].vistas += e.vistas || 0; serie[e.mes].contacto += (e.whatsapp || 0) + (e.telefono || 0) + (e.mapa || 0) + (e.web || 0); }
    }));

    const mesDe = (lista, campoMes, mes) => (lista || []).find((e) => e[campoMes] === mes) || {};

    // ---------- Tabla de establecimientos (para exportar) ----------
    const establecimientos = [];
    restaurantes.forEach((r) => {
      const c = calComida[String(r._id)];
      const m = mesDe(r.estadisticasMensuales, 'fecha', mesHoy);
      establecimientos.push({
        sector: 'Alimentos', tipo: ETIQUETA[r.tipo] || r.tipo || 'Restaurante', nombre: r.nombre,
        activo: r.activo !== false, calificacion: c ? redondear(c.prom) : 0, opiniones: c ? c.n : 0,
        vistasMes: m.vistas || 0, vistasTotal: (r.estadisticas && r.estadisticas.vistasPerfil) || 0,
        contactoMes: (m.clicsWhatsapp || 0) + (m.clicsMapa || 0), precio: '', capacidad: '',
        alta: r.createdAt || null
      });
    });
    hospedajes.forEach((h) => {
      const m = mesDe(h.estadisticasMensuales, 'mes', mesHoy);
      const cap = capacidadHospedaje(h);
      establecimientos.push({
        sector: 'Hospedaje', tipo: ETIQUETA[h.tipo], nombre: h.nombre, activo: h.activo !== false,
        calificacion: redondear((h.calificacion && h.calificacion.promedio) || 0),
        opiniones: (h.calificacion && (h.calificacion.totalReviews || h.calificacion.total)) || 0,
        vistasMes: m.vistas || 0, vistasTotal: (h.estadisticas && h.estadisticas.vistas) || 0,
        contactoMes: (m.whatsapp || 0) + (m.telefono || 0) + (m.mapa || 0) + (m.web || 0),
        precio: precioHospedaje(h) || '', capacidad: cap.huespedes || '', alta: h.createdAt || null
      });
    });
    establecimientos.sort((a, b) => b.vistasMes - a.vistasMes || b.vistasTotal - a.vistasTotal || String(a.nombre).localeCompare(String(b.nombre), 'es'));

    // ---------- Resúmenes ----------
    const activosComida = restaurantes.filter((r) => r.activo !== false);
    const activosHosp = hospedajes.filter((h) => h.activo !== false);
    const porTipo = (lista, campo) => lista.reduce((acc, x) => { const k = ETIQUETA[x[campo]] || x[campo] || 'Otro'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const capacidad = activosHosp.reduce((s, h) => { const c = capacidadHospedaje(h); s.huespedes += c.huespedes; s.cuartos += c.cuartos; return s; }, { huespedes: 0, cuartos: 0 });
    const preciosPorTipo = {};
    Object.keys(TIPOS_HOSP).forEach((t) => {
      const p = activosHosp.filter((h) => h.tipo === t).map(precioHospedaje).filter((x) => x > 0);
      preciosPorTipo[ETIQUETA[t]] = { promedio: Math.round(promedio(p)), minimo: p.length ? Math.min(...p) : 0, maximo: p.length ? Math.max(...p) : 0, conPrecio: p.length };
    });
    const preciosTours = tours.map((t) => Number(t.precio && t.precio.amount) || 0).filter((x) => x > 0);
    const altasMes = (lista) => lista.filter((x) => x.createdAt && clave(new Date(x.createdAt)) === mesHoy).length;
    const variacion = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);

    res.json({
      success: true,
      data: {
        generado: new Date(),
        periodo: { meses: n, desde: meses[0].clave, hasta: mesHoy },
        resumen: {
          establecimientosActivos: activosComida.length + activosHosp.length,
          altasEsteMes: altasMes(restaurantes) + altasMes(hospedajes),
          comidaActivos: activosComida.length,
          hospedajeActivos: activosHosp.length,
          cuartos: capacidad.cuartos,
          plazas: capacidad.huespedes,
          experiencias: tours.filter((t) => t.activo !== false).length,
          guias: totalGuias,
          guiasCertificados,
          agencias: totalAgencias,
          viajeros: totalViajeros,
          viajerosEsteMes: viajerosMes[mesHoy] || 0,
          viajerosVariacion: variacion(viajerosMes[mesHoy] || 0, viajerosMes[mesAntes] || 0),
          itinerarios,
          favoritos: (favoritosAgg[0] && favoritosAgg[0].t) || 0,
          vistasEsteMes: serie[mesHoy].vistas,
          vistasVariacion: variacion(serie[mesHoy].vistas, serie[mesAntes].vistas),
          contactoEsteMes: serie[mesHoy].contacto,
          opiniones: totalOpiniones,
          calificacion: redondear(calificacionGeneral),
          satisfaccion: totalOpiniones ? Math.round((positivas / totalOpiniones) * 100) : 0,
          negativas
        },
        meses: meses.map((m) => ({
          clave: m.clave, texto: m.texto,
          viajeros: viajerosMes[m.clave] || 0,
          opiniones: (opComidaMes[m.clave] || 0) + (opHospMes[m.clave] || 0),
          vistas: serie[m.clave].vistas,
          contacto: serie[m.clave].contacto
        })),
        oferta: {
          comidaPorTipo: porTipo(activosComida, 'tipo'),
          hospedajePorTipo: porTipo(activosHosp, 'tipo'),
          experienciasPorCategoria: porTipo(tours.filter((t) => t.activo !== false), 'categoria')
        },
        precios: { hospedaje: preciosPorTipo, experiencias: { promedio: Math.round(promedio(preciosTours)), minimo: preciosTours.length ? Math.min(...preciosTours) : 0, maximo: preciosTours.length ? Math.max(...preciosTours) : 0 } },
        distribucion,
        establecimientos
      }
    });
  } catch (error) {
    console.error('Error en indicadores de gobierno:', error);
    res.status(500).json({ success: false, message: 'Error al calcular los indicadores' });
  }
};
