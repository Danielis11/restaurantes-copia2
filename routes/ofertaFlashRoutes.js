const express = require('express');
const router = express.Router();
const OfertaFlash = require('../models/OfertaFlash');
const Restaurant = require('../models/Restaurant');
const { verificarToken } = require('../middleware/auth');

// ===== GET /api/ofertas-flash/activas — Público: ofertas activas ahora =====
router.get('/activas', async (req, res) => {
  try {
    const ahora = new Date();
    // Inicio del día actual (para comparar fechas sin hora)
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    const ofertas = await OfertaFlash.find({
      activa: true,
      fechaInicio: { $lte: new Date(hoy.getTime() + 24 * 60 * 60 * 1000) }, // hasta fin del día
      fechaFin: { $gte: hoy }
    })
    .populate('restaurante', 'nombre imagenes direccion')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({ success: true, data: ofertas });
  } catch (error) {
    console.error('Error al obtener ofertas activas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ofertas' });
  }
});

// ===== Rutas protegidas (admin) =====

// GET /api/ofertas-flash/mis-ofertas — Ofertas del restaurante del admin
router.get('/mis-ofertas', verificarToken, async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Buscar el restaurante del admin
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) {
      return res.json({ success: true, data: [] });
    }

    const ofertas = await OfertaFlash.find({ restaurante: restaurant._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: ofertas });
  } catch (error) {
    console.error('Error al obtener mis ofertas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ofertas' });
  }
});

// POST /api/ofertas-flash — Crear nueva oferta
router.post('/', verificarToken, async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Buscar el restaurante del admin
    const restaurant = await Restaurant.findOne({ adminId });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No tienes un restaurante registrado' });
    }

    const { titulo, descripcion, fechaInicio, fechaFin, horaInicio, horaFin, color } = req.body;

    if (!titulo || !fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, message: 'Título, fecha inicio y fecha fin son obligatorios' });
    }

    // Validar que fechaFin >= fechaInicio
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      return res.status(400).json({ success: false, message: 'La fecha de fin debe ser igual o posterior a la de inicio' });
    }

    // Limitar ofertas activas por restaurante (máx 5)
    const count = await OfertaFlash.countDocuments({ restaurante: restaurant._id, activa: true });
    if (count >= 5) {
      return res.status(400).json({ success: false, message: 'Máximo 5 ofertas activas por restaurante. Elimina alguna primero.' });
    }

    const oferta = new OfertaFlash({
      restaurante: restaurant._id,
      adminId,
      titulo: titulo.trim(),
      descripcion: descripcion ? descripcion.trim() : '',
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      horaInicio: horaInicio || '',
      horaFin: horaFin || '',
      color: color || '#ef4444'
    });

    await oferta.save();
    res.status(201).json({ success: true, data: oferta });
  } catch (error) {
    console.error('Error al crear oferta:', error);
    res.status(500).json({ success: false, message: 'Error al crear oferta' });
  }
});

// DELETE /api/ofertas-flash/:id — Eliminar oferta
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const adminId = req.admin._id;

    const oferta = await OfertaFlash.findOne({ _id: req.params.id, adminId });
    if (!oferta) {
      return res.status(404).json({ success: false, message: 'Oferta no encontrada' });
    }

    await OfertaFlash.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Oferta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar oferta:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar oferta' });
  }
});

module.exports = router;
