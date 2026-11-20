// Visitas y clics de hoteles, cabañas y airbnb.
//  POST /api/hospedaje/estadisticas/:tipo/:id/:evento  (público, una vez por visita)
//  GET  /api/hospedaje/estadisticas/mias              (socio: sus hospedajes con totales y 6 meses)
const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/authMiddleware');
const unaVezPorVisita = require('../../../middleware/unaVezPorVisita');
const { modeloDe } = require('../utils/moderacionResenas');
const { EVENTOS, mesActual, ultimosMeses } = require('../utils/estadisticas');

const router = express.Router();
const TIPOS = ['hotel', 'cabana', 'airbnb'];
// En la URL se usa "vista" (singular); en la BD el campo es "vistas"
const CAMPO = { vista: 'vistas', whatsapp: 'whatsapp', telefono: 'telefono', mapa: 'mapa', web: 'web' };

function validar(req, res, next) {
  const { tipo, id, evento } = req.params;
  if (!TIPOS.includes(tipo) || !CAMPO[evento] || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Datos inválidos' });
  }
  next();
}

router.post('/:tipo/:id/:evento', validar, unaVezPorVisita, async (req, res) => {
  try {
    const { tipo, id, evento } = req.params;
    const Modelo = modeloDe(tipo);
    const campo = CAMPO[evento];
    const mes = mesActual();
    const filtro = { _id: id, activo: { $ne: false } };

    // Suma al total y al mes en curso si ya existe ese mes
    const r = await Modelo.updateOne(
      { ...filtro, 'estadisticasMensuales.mes': mes },
      { $inc: { ['estadisticas.' + campo]: 1, ['estadisticasMensuales.$.' + campo]: 1 } }
    );
    if (r.matchedCount === 0) {
      // Primer registro del mes (o el hospedaje no existe / está oculto)
      const nuevoMes = { mes };
      EVENTOS.forEach((e) => { nuevoMes[e] = e === campo ? 1 : 0; });
      const r2 = await Modelo.updateOne(
        { ...filtro, 'estadisticasMensuales.mes': { $ne: mes } },
        { $inc: { ['estadisticas.' + campo]: 1 }, $push: { estadisticasMensuales: { $each: [nuevoMes], $slice: -24 } } }
      );
      if (r2.matchedCount === 0) return res.status(404).json({ success: false, message: 'Hospedaje no encontrado' });
    }
    res.status(204).end();
  } catch (e) {
    console.error('Error registrando estadística de hospedaje:', e.message);
    res.status(500).json({ success: false, message: 'Error al registrar' });
  }
});

router.get('/mias', authMiddleware.protect, async (req, res) => {
  try {
    const meses = ultimosMeses(6);
    const datos = [];
    for (const tipo of TIPOS) {
      const lista = await modeloDe(tipo).find({ propietario: req.user._id })
        .select('nombre activo imagenes +estadisticas +estadisticasMensuales')
        .lean();
      for (const h of lista) {
        const totales = {};
        EVENTOS.forEach((e) => { totales[e] = (h.estadisticas && h.estadisticas[e]) || 0; });
        const porMes = meses.map((mes) => {
          const m = (h.estadisticasMensuales || []).find((x) => x.mes === mes) || {};
          const fila = { mes };
          EVENTOS.forEach((e) => { fila[e] = m[e] || 0; });
          return fila;
        });
        const img = Array.isArray(h.imagenes) && h.imagenes[0];
        datos.push({
          _id: h._id, tipo, nombre: h.nombre, activo: h.activo !== false,
          imagen: (img && (img.url || (typeof img === 'string' ? img : ''))) || '',
          totales, meses: porMes
        });
      }
    }
    datos.sort((a, b) => b.totales.vistas - a.totales.vistas);
    res.json({ success: true, data: datos });
  } catch (e) {
    console.error('Error obteniendo estadísticas del socio:', e.message);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
