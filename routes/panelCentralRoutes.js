// Panel central del super administrador: junta alimentos (restaurantes, bares y cafeterías)
// y hospedaje (hoteles, cabañas, airbnb, guías y tour operadoras) en un solo lugar.
// Las experiencias las lleva el administrador turístico, por eso no están aquí.
const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { verificarToken, verificarSuperAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verificarToken, verificarSuperAdmin);

// Modelos del módulo de hospedaje (se cargan al usarse)
const hosp = {
  hotel: () => require('../modules/hospedaje/models/Hotel'),
  cabana: () => require('../modules/hospedaje/models/Cabana'),
  airbnb: () => require('../modules/hospedaje/models/Airbnb'),
  guia: () => require('../modules/hospedaje/models/GuiaTuristica'),
  operadora: () => require('../modules/hospedaje/models/TourOperadora')
};
const ResenaHospedaje = () => require('../modules/hospedaje/models/Review');
const Socio = () => require('../modules/hospedaje/models/User');
const { aplicarAEmbebida, modeloDe } = require('../modules/hospedaje/utils/moderacionResenas');
const { enviarAvisoNuevaResena, enviarAccesoSocio } = require('../utils/correo');
const crypto = require('crypto');

const ETIQUETA_HOSP = { hotel: 'Hotel', cabana: 'Cabaña', airbnb: 'Airbnb', guia: 'Guía turística', operadora: 'Tour operadora' };
const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];
// El super admin de hospedaje no se lista ni se puede bloquear desde aquí
const CORREO_JEFE_HOSPEDAJE = 'direcciondeturismojalpan@gmail.com';
const SOCIOS_NORMALES = { isSuperAdmin: { $ne: true }, email: { $ne: CORREO_JEFE_HOSPEDAJE } };

const esId = (id) => mongoose.Types.ObjectId.isValid(id);
const promedioDe = (c) => (c && typeof c.promedio === 'number' ? c.promedio : 0);
const fallo = (res, e, msg) => {
  console.error(msg + ':', e.message);
  res.status(500).json({ success: false, message: msg });
};

// ---------- Resumen ----------
router.get('/resumen', async (req, res) => {
  try {
    const conteo = async (Modelo) => {
      const [total, activos] = await Promise.all([Modelo.countDocuments(), Modelo.countDocuments({ activo: { $ne: false } })]);
      return { total, activos };
    };
    const tiposComida = await Restaurant.aggregate([{ $group: { _id: '$tipo', total: { $sum: 1 } } }]);
    const hospedaje = {};
    for (const tipo of Object.keys(hosp)) hospedaje[tipo] = await conteo(hosp[tipo]());

    const [pendRest, pendHosp, admins, socios, viajeros] = await Promise.all([
      Review.countDocuments({ estado: 'pendiente' }),
      ResenaHospedaje().countDocuments({ estado: 'pendiente' }),
      Admin.countDocuments({ rol: { $ne: 'super-admin' } }),
      Socio().countDocuments(SOCIOS_NORMALES),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        alimentos: { ...(await conteo(Restaurant)), porTipo: Object.fromEntries(tiposComida.map((t) => [t._id || 'otro', t.total])) },
        hospedaje,
        resenasPendientes: { alimentos: pendRest, hospedaje: pendHosp, total: pendRest + pendHosp },
        cuentas: { administradores: admins, socios, viajeros }
      }
    });
  } catch (e) { fallo(res, e, 'Error al armar el resumen'); }
});

// ---------- Lo más visto del mes ----------
router.get('/estadisticas', async (req, res) => {
  try {
    const { mesActual } = require('../modules/hospedaje/utils/estadisticas');
    const mes = mesActual();
    const restaurantes = await Restaurant.aggregate([
      { $match: { activo: { $ne: false }, 'estadisticasMensuales.fecha': mes } },
      { $unwind: '$estadisticasMensuales' },
      { $match: { 'estadisticasMensuales.fecha': mes } },
      { $project: { nombre: 1, tipo: 1, vistas: '$estadisticasMensuales.vistas', contactos: { $add: [{ $ifNull: ['$estadisticasMensuales.clicsWhatsapp', 0] }, { $ifNull: ['$estadisticasMensuales.clicsMapa', 0] }] } } },
      { $sort: { vistas: -1 } },
      { $limit: 5 }
    ]);
    let hospedajes = [];
    for (const tipo of ['hotel', 'cabana', 'airbnb']) {
      const lista = await hosp[tipo]().aggregate([
        { $match: { activo: { $ne: false }, 'estadisticasMensuales.mes': mes } },
        { $unwind: '$estadisticasMensuales' },
        { $match: { 'estadisticasMensuales.mes': mes } },
        { $project: {
          nombre: 1,
          vistas: '$estadisticasMensuales.vistas',
          contactos: { $add: ['whatsapp', 'telefono', 'mapa', 'web'].map((c) => ({ $ifNull: ['$estadisticasMensuales.' + c, 0] })) }
        } },
        { $sort: { vistas: -1 } },
        { $limit: 5 }
      ]);
      hospedajes = hospedajes.concat(lista.map((h) => ({ ...h, tipo, tipoTexto: ETIQUETA_HOSP[tipo] })));
    }
    hospedajes = hospedajes.sort((a, b) => b.vistas - a.vistas).slice(0, 5);
    res.json({ success: true, data: { mes, restaurantes, hospedajes } });
  } catch (e) { fallo(res, e, 'Error al obtener las estadísticas'); }
});

// ---------- Alimentos ----------
router.get('/alimentos', async (req, res) => {
  try {
    const lista = await Restaurant.find({})
      .select('nombre tipo activo adminId direccion.calle imagenes calificacion fechaCreacion createdAt')
      .populate('adminId', 'nombre apellido email')
      .sort({ nombre: 1 })
      .lean();
    res.json({
      success: true,
      data: lista.map((r) => ({
        _id: r._id,
        nombre: r.nombre,
        tipo: r.tipo || 'restaurante',
        activo: r.activo !== false,
        responsable: r.adminId ? [r.adminId.nombre, r.adminId.apellido].filter(Boolean).join(' ') : '',
        correo: r.adminId?.email || '',
        imagen: r.imagenes?.[0]?.url || '',
        url: `/${['bar', 'cafeteria'].includes(r.tipo) ? r.tipo : 'restaurante'}.html?id=${r._id}`
      }))
    });
  } catch (e) { fallo(res, e, 'Error al cargar alimentos'); }
});

router.patch('/alimentos/:id/activo', async (req, res) => {
  try {
    if (!esId(req.params.id)) return res.status(400).json({ success: false, message: 'Id inválido' });
    const r = await Restaurant.findById(req.params.id).select('activo');
    if (!r) return res.status(404).json({ success: false, message: 'No encontrado' });
    const activo = r.activo === false;
    await Restaurant.updateOne({ _id: r._id }, { activo, fechaActualizacion: new Date() });
    res.json({ success: true, activo });
  } catch (e) { fallo(res, e, 'Error al cambiar el estado'); }
});

// ---------- Hospedaje ----------
router.get('/hospedaje', async (req, res) => {
  try {
    const tipos = req.query.tipo && hosp[req.query.tipo] ? [req.query.tipo] : Object.keys(hosp);
    const datos = [];
    for (const tipo of tipos) {
      const lista = await hosp[tipo]().find({})
        .select('nombre apellidos activo propietario calificacion imagenes foto contacto.email')
        .populate('propietario', 'nombre email')
        .lean();
      for (const h of lista) {
        const img = h.foto || (Array.isArray(h.imagenes) && (h.imagenes[0]?.url || (typeof h.imagenes[0] === 'string' ? h.imagenes[0] : ''))) || '';
        datos.push({
          _id: h._id,
          tipo,
          tipoTexto: ETIQUETA_HOSP[tipo],
          nombre: [h.nombre, h.apellidos].filter(Boolean).join(' '),
          activo: h.activo !== false,
          responsable: h.propietario?.nombre || '',
          correo: h.propietario?.email || h.contacto?.email || '',
          calificacion: promedioDe(h.calificacion),
          imagen: img,
          url: ['hotel', 'cabana', 'airbnb'].includes(tipo)
            ? `/hospedaje/hospedaje-detalle.html?tipo=${tipo}&id=${h._id}`
            : tipo === 'guia' ? '/hospedaje/guias.html' : '/hospedaje/tourOperadora.html'
        });
      }
    }
    datos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    res.json({ success: true, data: datos });
  } catch (e) { fallo(res, e, 'Error al cargar hospedaje'); }
});

router.patch('/hospedaje/:tipo/:id/activo', async (req, res) => {
  try {
    const { tipo, id } = req.params;
    if (!hosp[tipo] || !esId(id)) return res.status(400).json({ success: false, message: 'Datos inválidos' });
    const Modelo = hosp[tipo]();
    const h = await Modelo.findById(id).select('activo');
    if (!h) return res.status(404).json({ success: false, message: 'No encontrado' });
    const activo = h.activo === false;
    await Modelo.updateOne({ _id: id }, {
      activo,
      ultimaModificacion: { fecha: new Date(), accion: activo ? 'activado' : 'bloqueado', motivo: 'Panel central del super administrador' }
    }, { strict: false });
    res.json({ success: true, activo });
  } catch (e) { fallo(res, e, 'Error al cambiar el estado'); }
});

// Alta de hotel, cabaña o airbnb. Si el dueño ya tiene cuenta de socio se le agrega;
// si no, se le crea una con contraseña temporal (se muestra una vez y se le manda por correo).
const TIPO_NEGOCIO = { hotel: 'hotel', cabana: 'cabana', airbnb: 'ayb' };
const PROPIEDAD_AIRBNB = ['cabaña', 'casa', 'zona_camping'];
const contrasenaTemporal = () => {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(10), (b) => letras[b % letras.length]).join('');
};

router.post('/hospedaje', async (req, res) => {
  const b = req.body || {};
  const texto = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const tipo = b.tipo;
  const datos = {
    nombre: texto(b.nombre, 100),
    descripcion: texto(b.descripcion, 2000),
    precio: Number(b.precio),
    direccion: texto(b.direccion, 200),
    telefono: String(b.telefono || '').replace(/\D/g, ''),
    huespedes: parseInt(b.huespedes, 10),
    habitaciones: parseInt(b.habitaciones, 10),
    tipoPropiedad: texto(b.tipoPropiedad, 20),
    dueno: texto(b.duenoNombre, 50),
    correo: texto(b.duenoCorreo, 120).toLowerCase()
  };

  const error = !TIPO_NEGOCIO[tipo] ? 'Elige hotel, cabaña o airbnb'
    : datos.nombre.length < 3 ? 'Escribe el nombre del hospedaje'
    : datos.descripcion.length < 20 ? 'La descripción debe tener al menos 20 caracteres'
    : !(datos.precio >= 0) ? 'Escribe un precio válido'
    : datos.telefono && datos.telefono.length !== 10 ? 'El teléfono debe tener 10 dígitos'
    : tipo !== 'hotel' && !(datos.huespedes >= 1) ? 'Indica cuántos huéspedes caben'
    : tipo === 'cabana' && !(datos.habitaciones >= 1) ? 'Indica cuántas habitaciones tiene'
    : tipo === 'airbnb' && !PROPIEDAD_AIRBNB.includes(datos.tipoPropiedad) ? 'Elige el tipo de propiedad'
    : datos.dueno.length < 2 ? 'Escribe el nombre del responsable'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo) ? 'Escribe un correo válido para el responsable'
    : null;
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const SocioModelo = Socio();
    let socio = await SocioModelo.findOne({ email: datos.correo });
    let clave = null;
    if (socio) {
      if (socio.role !== 'admin' || socio.isSuperAdmin || socio.email === CORREO_JEFE_HOSPEDAJE) {
        return res.status(400).json({ success: false, message: 'Ese correo ya pertenece a otro tipo de cuenta. Usa otro correo para el responsable.' });
      }
    } else {
      clave = contrasenaTemporal();
      socio = await SocioModelo.create({
        nombre: datos.dueno, email: datos.correo, password: clave,
        role: 'admin', tipoNegocio: TIPO_NEGOCIO[tipo], activo: true
      });
    }

    const doc = {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      precio: datos.precio,
      propietario: socio._id,
      activo: true,
      ubicacion: { direccion: datos.direccion, ciudad: 'Jalpan de Serra', estado: 'Querétaro' },
      contacto: { email: datos.correo, ...(datos.telefono ? { telefono: datos.telefono } : {}) }
    };
    if (tipo === 'hotel') {
      if (datos.habitaciones >= 1) doc.capacidad = { habitaciones: datos.habitaciones, personasMax: datos.huespedes >= 1 ? datos.huespedes : undefined };
    } else if (tipo === 'cabana') {
      doc.capacidad = { huespedes: datos.huespedes, habitaciones: datos.habitaciones };
    } else {
      doc.capacidad = { huespedes: datos.huespedes, ...(datos.habitaciones >= 1 ? { habitaciones: datos.habitaciones } : {}) };
      doc.tipoPropiedad = datos.tipoPropiedad;
      doc.precioPorNoche = datos.precio; // airbnb guarda el precio en otro campo
      delete doc.precio;
    }

    let nuevo;
    try {
      nuevo = await hosp[tipo]().create(doc);
    } catch (e) {
      if (clave) await SocioModelo.deleteOne({ _id: socio._id }); // no dejar una cuenta huérfana
      const detalle = e.errors ? Object.values(e.errors)[0].message : null;
      return res.status(400).json({ success: false, message: detalle || 'No se pudo crear el hospedaje' });
    }

    let correoEnviado = false;
    if (clave) {
      correoEnviado = await enviarAccesoSocio({ para: socio.email, nombre: socio.nombre, lugar: nuevo.nombre, clave });
    }
    res.status(201).json({
      success: true,
      data: {
        hospedaje: { _id: nuevo._id, tipo, nombre: nuevo.nombre },
        cuenta: { nombre: socio.nombre, email: socio.email, nueva: !!clave, claveTemporal: clave, correoEnviado }
      }
    });
  } catch (e) { fallo(res, e, 'Error al crear el hospedaje'); }
});

// ---------- Reseñas (moderación de alimentos y hospedaje juntas) ----------
router.get('/resenas', async (req, res) => {
  try {
    const estado = ESTADOS.includes(req.query.estado) ? req.query.estado : 'pendiente';
    const filtroHosp = estado === 'aprobada'
      ? { $or: [{ estado: 'aprobada' }, { estado: { $exists: false } }] }
      : { estado };
    const [rest, hospR] = await Promise.all([
      Review.find({ estado }).populate('userId', 'nombre email').populate('restaurantId', 'nombre tipo')
        .sort({ fechaCreacion: -1 }).limit(100).lean(),
      ResenaHospedaje().find(filtroHosp).sort({ fecha: -1 }).limit(100).lean()
    ]);
    const datos = [
      ...rest.map((r) => ({
        _id: r._id,
        origen: 'alimentos',
        lugar: r.restaurantId?.nombre || 'Restaurante',
        tipoTexto: r.restaurantId?.tipo === 'bar' ? 'Bar' : r.restaurantId?.tipo === 'cafeteria' ? 'Cafetería' : 'Restaurante',
        autor: r.userId?.nombre || 'Viajero',
        correo: r.userId?.email || '',
        rating: r.rating,
        comentario: r.comentario,
        fotos: (r.fotos || []).map((f) => f.url).filter(Boolean),
        fecha: r.fechaCreacion || r.createdAt,
        estado: r.estado
      })),
      ...hospR.map((r) => ({
        _id: r._id,
        origen: 'hospedaje',
        lugar: r.nombreHospedaje,
        tipoTexto: ETIQUETA_HOSP[r.tipoHospedaje] || 'Hospedaje',
        autor: r.nombreUsuario || 'Viajero',
        correo: '',
        rating: r.rating,
        comentario: r.comentario,
        fotos: [],
        fecha: r.fecha || r.createdAt,
        estado: r.estado || 'aprobada'
      }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json({ success: true, data: datos });
  } catch (e) { fallo(res, e, 'Error al cargar reseñas'); }
});

router.patch('/resenas/:origen/:id', async (req, res) => {
  try {
    const { origen, id } = req.params;
    const { estado } = req.body || {};
    if (!ESTADOS.includes(estado) || !esId(id)) return res.status(400).json({ success: false, message: 'Datos inválidos' });

    if (origen === 'alimentos') {
      const antes = await Review.findById(id).select('estado');
      if (!antes) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
      const r = await Review.findByIdAndUpdate(id, { estado }, { new: true });
      res.json({ success: true, estado });
      // Aviso por correo al responsable del restaurante (sin hacer esperar al panel)
      if (estado === 'aprobada' && antes.estado !== 'aprobada') {
        Restaurant.findById(r.restaurantId).select('nombre adminId').populate('adminId', 'nombre email').lean()
          .then((rest) => rest && rest.adminId && enviarAvisoNuevaResena({
            para: rest.adminId.email, nombre: rest.adminId.nombre, lugar: rest.nombre,
            rating: r.rating, comentario: r.comentario, enlacePanel: '/admin.html'
          }))
          .catch((e) => console.error('Aviso de reseña (alimentos):', e.message));
      }
      return;
    }
    if (origen === 'hospedaje') {
      const r = await ResenaHospedaje().findById(id);
      if (!r) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
      const estadoAnterior = r.estado || 'aprobada';
      r.estado = estado;
      await r.save();
      await aplicarAEmbebida(r, { estado }); // la copia que se ve en la página del hospedaje
      res.json({ success: true, estado });
      // Aviso por correo al socio dueño del hospedaje
      const Modelo = modeloDe(r.tipoHospedaje);
      if (estado === 'aprobada' && estadoAnterior !== 'aprobada' && Modelo) {
        Modelo.findById(r.hospedajeId).select('nombre propietario').populate('propietario', 'nombre email').lean()
          .then((h) => h && h.propietario && enviarAvisoNuevaResena({
            para: h.propietario.email, nombre: h.propietario.nombre, lugar: h.nombre,
            rating: r.rating, comentario: r.comentario, enlacePanel: '/hospedaje/admin/opiniones.html'
          }))
          .catch((e) => console.error('Aviso de reseña (hospedaje):', e.message));
      }
      return;
    }
    res.status(400).json({ success: false, message: 'Origen inválido' });
  } catch (e) { fallo(res, e, 'Error al moderar la reseña'); }
});

// ---------- Cuentas (administradores de negocios y socios de hospedaje) ----------
router.get('/cuentas', async (req, res) => {
  try {
    const [admins, socios] = await Promise.all([
      Admin.find({ rol: { $ne: 'super-admin' } }).select('nombre apellido email rol activo ultimoAcceso').sort({ nombre: 1 }).lean(),
      Socio().find(SOCIOS_NORMALES).select('nombre email tipoNegocio activo createdAt').sort({ nombre: 1 }).lean()
    ]);
    const ROLES = { admin: 'Restaurante', 'admin-turismo': 'Turismo', gobernamental: 'Gobierno', 'admin-ranking': 'Ranking' };
    const NEGOCIO = { hotel: 'Hotel', cabana: 'Cabaña', ayb: 'Airbnb', airbnb: 'Airbnb', guiaturistica: 'Guía turística', touroperadora: 'Tour operadora', administracion: 'Administración' };
    res.json({
      success: true,
      data: [
        ...admins.map((a) => ({ _id: a._id, origen: 'admin', nombre: [a.nombre, a.apellido].filter(Boolean).join(' '), correo: a.email, rol: ROLES[a.rol] || a.rol, area: 'alimentos', activo: a.activo !== false })),
        ...socios.map((s) => ({ _id: s._id, origen: 'socio', nombre: s.nombre, correo: s.email, rol: NEGOCIO[s.tipoNegocio] || 'Socio', area: 'hospedaje', activo: s.activo !== false }))
      ]
    });
  } catch (e) { fallo(res, e, 'Error al cargar cuentas'); }
});

router.patch('/cuentas/:origen/:id/activo', async (req, res) => {
  try {
    const { origen, id } = req.params;
    if (!esId(id)) return res.status(400).json({ success: false, message: 'Id inválido' });
    const Modelo = origen === 'admin' ? Admin : origen === 'socio' ? Socio() : null;
    if (!Modelo) return res.status(400).json({ success: false, message: 'Origen inválido' });
    const c = await Modelo.findById(id).select('activo rol isSuperAdmin email');
    if (!c) return res.status(404).json({ success: false, message: 'Cuenta no encontrada' });
    if (c.rol === 'super-admin' || c.isSuperAdmin === true || c.email === CORREO_JEFE_HOSPEDAJE) return res.status(403).json({ success: false, message: 'No se puede bloquear a un super administrador' });
    const activo = c.activo === false;
    await Modelo.updateOne({ _id: id }, { activo });
    res.json({ success: true, activo });
  } catch (e) { fallo(res, e, 'Error al cambiar la cuenta'); }
});

module.exports = router;
