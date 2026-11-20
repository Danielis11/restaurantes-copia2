// Opiniones para los socios: ven las reseñas aprobadas de sus hoteles, cabañas y airbnb
// y pueden contestarlas públicamente (una respuesta por reseña, editable).
const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/authMiddleware');
const { estaAprobada, modeloDe } = require('../utils/moderacionResenas');
const Review = require('../models/Review');

const router = express.Router();
router.use(authMiddleware.protect);

const TIPOS = ['hotel', 'cabana', 'airbnb'];
const ETIQUETA = { hotel: 'Hotel', cabana: 'Cabaña', airbnb: 'Airbnb' };

// GET /api/hospedaje/opiniones → reseñas aprobadas de mis hospedajes
router.get('/', async (req, res) => {
  try {
    const datos = [];
    let pendientes = 0;
    for (const tipo of TIPOS) {
      const lista = await modeloDe(tipo).find({ propietario: req.user._id }).select('nombre reviews').lean();
      for (const h of lista) {
        for (const r of h.reviews || []) {
          if (r.estado === 'pendiente') { pendientes++; continue; }
          if (!estaAprobada(r)) continue;
          datos.push({
            _id: r._id,
            tipo,
            tipoTexto: ETIQUETA[tipo],
            hospedajeId: h._id,
            lugar: h.nombre,
            autor: r.nombreUsuario || 'Viajero',
            rating: r.rating,
            comentario: r.comentario,
            fecha: r.fecha || r.createdAt,
            respuesta: r.respuesta || '',
            fechaRespuesta: r.fechaRespuesta || null
          });
        }
      }
    }
    datos.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    res.json({ success: true, data: datos, pendientes });
  } catch (e) {
    console.error('Error cargando opiniones del socio:', e.message);
    res.status(500).json({ success: false, message: 'Error al cargar las opiniones' });
  }
});

// PUT /api/hospedaje/opiniones/:tipo/:hospedajeId/:reviewId  { respuesta }
router.put('/:tipo/:hospedajeId/:reviewId', async (req, res) => {
  try {
    const { tipo, hospedajeId, reviewId } = req.params;
    if (!TIPOS.includes(tipo) || !mongoose.Types.ObjectId.isValid(hospedajeId) || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ success: false, message: 'Datos inválidos' });
    }
    const respuesta = String((req.body && req.body.respuesta) || '').trim();
    if (respuesta.length > 1000) return res.status(400).json({ success: false, message: 'La respuesta no puede pasar de 1000 caracteres' });

    const doc = await modeloDe(tipo).findById(hospedajeId);
    if (!doc) return res.status(404).json({ success: false, message: 'Hospedaje no encontrado' });
    const esJefe = req.user.isSuperAdministrator === true;
    if (String(doc.propietario) !== String(req.user._id) && !esJefe) {
      return res.status(403).json({ success: false, message: 'Solo el dueño puede responder' });
    }
    const resena = (doc.reviews || []).id(reviewId);
    if (!resena || !estaAprobada(resena)) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });

    // Respuesta vacía = borrar la respuesta
    resena.respuesta = respuesta || undefined;
    resena.fechaRespuesta = respuesta ? new Date() : undefined;
    await doc.save({ validateBeforeSave: false });

    // Copia en la colección de reseñas (la que lee el panel del viajero)
    await Review.updateOne(
      { hospedajeId: doc._id, userId: resena.user },
      respuesta ? { respuesta, fechaRespuesta: resena.fechaRespuesta } : { $unset: { respuesta: 1, fechaRespuesta: 1 } }
    );

    res.json({ success: true, message: respuesta ? 'Respuesta publicada' : 'Respuesta eliminada', data: { respuesta, fechaRespuesta: resena.fechaRespuesta || null } });
  } catch (e) {
    console.error('Error respondiendo reseña:', e.message);
    res.status(500).json({ success: false, message: 'Error al guardar la respuesta' });
  }
});

module.exports = router;
