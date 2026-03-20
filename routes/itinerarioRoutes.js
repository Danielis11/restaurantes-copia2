const express = require('express');
const router = express.Router();
const Itinerario = require('../models/Itinerario');
const { verificarTokenUsuario } = require('../middleware/auth');

// Todas las rutas de itinerarios requieren autenticación de usuario (turista)
router.use(verificarTokenUsuario);

// ===== GET /api/itinerarios/me — Obtener itinerarios del usuario autenticado =====
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const itinerarios = await Itinerario.find({ usuario: userId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: itinerarios });
  } catch (error) {
    console.error('Error al obtener itinerarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener itinerarios' });
  }
});

// ===== POST /api/itinerarios — Crear nuevo itinerario =====
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del itinerario es obligatorio' });
    }

    const nuevoItinerario = new Itinerario({
      usuario: userId,
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : '',
      dias: [],
      estado: 'borrador'
    });

    await nuevoItinerario.save();
    res.status(201).json({ success: true, data: nuevoItinerario });
  } catch (error) {
    console.error('Error al crear itinerario:', error);
    res.status(500).json({ success: false, message: 'Error al crear itinerario' });
  }
});

// ===== GET /api/itinerarios/:id — Obtener un itinerario por ID =====
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const itinerario = await Itinerario.findOne({ _id: req.params.id, usuario: userId });

    if (!itinerario) {
      return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    }

    res.json({ success: true, data: itinerario });
  } catch (error) {
    console.error('Error al obtener itinerario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener itinerario' });
  }
});

// ===== DELETE /api/itinerarios/:id — Eliminar un itinerario =====
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const itinerario = await Itinerario.findOneAndDelete({ _id: req.params.id, usuario: userId });

    if (!itinerario) {
      return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    }

    res.json({ success: true, message: 'Itinerario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar itinerario:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar itinerario' });
  }
});

// ===== POST /api/itinerarios/:id/actividad — Agregar actividad a un itinerario =====
router.post('/:id/actividad', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const itinerario = await Itinerario.findOne({ _id: req.params.id, usuario: userId });

    if (!itinerario) {
      return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    }

    const { fecha, hora, tipoLugar, lugarId, notas } = req.body;

    if (!tipoLugar || !lugarId) {
      return res.status(400).json({ success: false, message: 'tipoLugar y lugarId son obligatorios' });
    }

    // Buscar o crear el día correspondiente
    const fechaStr = fecha || new Date().toISOString().split('T')[0];
    let dia = itinerario.dias.find(d => {
      if (d.fecha) {
        return new Date(d.fecha).toISOString().split('T')[0] === fechaStr;
      }
      return false;
    });

    if (!dia) {
      // Crear un nuevo día
      const fechaDate = new Date(fechaStr + 'T12:00:00');
      const nombreDia = fechaDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

      itinerario.dias.push({
        fecha: fechaDate,
        nombreDia: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1),
        actividades: []
      });
      dia = itinerario.dias[itinerario.dias.length - 1];
    }

    // Agregar la actividad
    dia.actividades.push({
      hora: hora || '',
      tipoLugar: tipoLugar.toLowerCase(),
      lugarId,
      notas: notas || ''
    });

    await itinerario.save();
    res.json({ success: true, data: itinerario, message: 'Actividad agregada exitosamente' });
  } catch (error) {
    console.error('Error al agregar actividad:', error);
    res.status(500).json({ success: false, message: 'Error al agregar actividad' });
  }
});

// ===== DELETE /api/itinerarios/:id/actividad/:actividadId — Eliminar actividad =====
router.delete('/:id/actividad/:actividadId', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const itinerario = await Itinerario.findOne({ _id: req.params.id, usuario: userId });

    if (!itinerario) {
      return res.status(404).json({ success: false, message: 'Itinerario no encontrado' });
    }

    // Buscar y eliminar la actividad de cualquier día
    let found = false;
    for (const dia of itinerario.dias) {
      const index = dia.actividades.findIndex(a => a._id.toString() === req.params.actividadId);
      if (index !== -1) {
        dia.actividades.splice(index, 1);
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
    }

    // Limpiar días vacíos
    itinerario.dias = itinerario.dias.filter(d => d.actividades.length > 0);

    await itinerario.save();
    res.json({ success: true, data: itinerario, message: 'Actividad eliminada' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar actividad' });
  }
});

module.exports = router;
