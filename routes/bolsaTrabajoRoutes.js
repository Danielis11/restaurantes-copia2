const express = require('express');
const router = express.Router();
const BolsaTrabajo = require('../models/BolsaTrabajo');
const Restaurant = require('../models/Restaurant');
const { verificarToken } = require('../middleware/auth');

// =======================
// RUTAS PÚBLICAS (Para restaurante.html)
// =======================

// Obtener todas las vacantes activas de un restaurante específico
router.get('/activas/:restaurantId', async (req, res) => {
    try {
        const vacantes = await BolsaTrabajo.find({
            restaurantId: req.params.restaurantId,
            activa: true
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: vacantes });
    } catch (error) {
        console.error('Error al obtener vacantes públicas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener vacantes' });
    }
});

// =======================
// RUTAS PRIVADAS (Para panel de Admin)
// =======================

// Obtener mis vacantes (todas: activas e inactivas)
router.get('/mis-vacantes', verificarToken, async (req, res) => {
    try {
        const adminId = req.admin._id || req.user.id; // Soporta según cómo venga definido en el auth middleware
        const restaurant = await Restaurant.findOne({ owner: adminId }) || await Restaurant.findOne({ adminId });
        
        if (!restaurant) {
            return res.json({ success: true, data: [] });
        }

        const vacantes = await BolsaTrabajo.find({ restaurantId: restaurant._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: vacantes });

    } catch (error) {
        console.error('Error al obtener mis vacantes:', error);
        res.status(500).json({ success: false, message: 'Error de servidor' });
    }
});

// Crear nueva vacante
router.post('/', verificarToken, async (req, res) => {
    try {
        const adminId = req.admin ? req.admin._id : req.user.id;
        const restaurant = await Restaurant.findOne({ owner: adminId }) || await Restaurant.findOne({ adminId });
        
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'No tienes un restaurante asignado' });
        }

        const { titulo, descripcion, sueldo, contacto } = req.body;

        if (!titulo || !descripcion || !contacto) {
            return res.status(400).json({ success: false, message: 'Título, descripción y contacto son obligatorios' });
        }

        // Evitar spam limitando a max 5 activas
        const count = await BolsaTrabajo.countDocuments({ restaurantId: restaurant._id, activa: true });
        if (count >= 5) {
            return res.status(400).json({ success: false, message: 'Máximo 5 vacantes activas. Desactiva o elimina alguna primero.' });
        }

        const vacante = new BolsaTrabajo({
            restaurantId: restaurant._id,
            adminId,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            sueldo: sueldo ? sueldo.trim() : '',
            contacto: contacto.trim(),
            activa: true
        });

        await vacante.save();
        res.status(201).json({ success: true, data: vacante, message: 'Vacante publicada exitosamente' });

    } catch (error) {
        console.error('Error al crear vacante:', error);
        res.status(500).json({ success: false, message: 'Error al crear vacante' });
    }
});

// Cambiar estado activa/inactiva
router.patch('/:id/estado', verificarToken, async (req, res) => {
    try {
        const adminId = req.admin ? req.admin._id : req.user.id;
        const vacante = await BolsaTrabajo.findOne({ _id: req.params.id, adminId });

        if (!vacante) {
            return res.status(404).json({ success: false, message: 'Vacante no encontrada' });
        }

        vacante.activa = !vacante.activa;
        await vacante.save();

        res.json({ success: true, data: vacante, message: vacante.activa ? 'Vacante reactivada' : 'Vacante desactivada' });

    } catch (error) {
        console.error('Error al cambiar estado de vacante:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Eliminar vacante
router.delete('/:id', verificarToken, async (req, res) => {
    try {
        const adminId = req.admin ? req.admin._id : req.user.id;
        const vacante = await BolsaTrabajo.findOneAndDelete({ _id: req.params.id, adminId });

        if (!vacante) {
            return res.status(404).json({ success: false, message: 'Vacante no encontrada' });
        }

        res.json({ success: true, message: 'Vacante eliminada' });

    } catch (error) {
        console.error('Error al eliminar vacante:', error);
        res.status(500).json({ success: false, message: 'Error de servidor' });
    }
});

module.exports = router;
