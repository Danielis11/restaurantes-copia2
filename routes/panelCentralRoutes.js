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
const { enviarAvisoNuevaResena } = require('../utils/correo');

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
