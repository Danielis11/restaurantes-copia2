const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { HotelTurismo, CabanaTurismo, AirbnbTurismo } = require('../models/turismoModels');
const Tour = require('../models/Tour');
const Restaurant = require('../models/Restaurant');

// Helper para obtener un sample aleatorio de un modelo
async function getRandomSample(Model, limit = 2) {
    try {
        const count = await Model.countDocuments({ activo: { $ne: false } });
        if (count === 0) return [];
        
        // Mongo aggregation for random sample
        const samples = await Model.aggregate([
            { $match: { activo: { $ne: false } } },
            { $sample: { size: limit } }
        ]);
        return samples;
    } catch (e) {
        console.error('Error in getRandomSample:', e);
        return [];
    }
}

// Helper para procesar imagen
function getImageUrl(item) {
    if (item.imagenPrincipal && item.imagenPrincipal.url) {
        return item.imagenPrincipal.url;
    }
    if (item.imagenes && item.imagenes.length > 0) {
        if (typeof item.imagenes[0] === 'string') return item.imagenes[0];
        if (item.imagenes[0].url) return item.imagenes[0].url;
    }
    return 'https://placehold.co/400x300/e2e8f0/475569?text=Sin+Imagen';
}

// Helper para procesar nombre
function getNombre(item) {
    if (item.nombre && typeof item.nombre === 'object' && item.nombre.es) {
        return item.nombre.es;
    }
    return item.nombre || 'Lugar Increíble';
}

router.get('/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        // 1. Obtener muestras de cada colección
        const hoteles = await getRandomSample(HotelTurismo, 2);
        const cabanas = await getRandomSample(CabanaTurismo, 1);
        const airbnbs = await getRandomSample(AirbnbTurismo, 1);
        const tours = await getRandomSample(Tour, 2);

        // 2. Mapear y estandarizar datos para el frontend
        const recomendaciones = [];

        hoteles.forEach(h => recomendaciones.push({
            id: h._id || h.id,
            nombre: getNombre(h),
            imagen: getImageUrl(h),
            tipo: 'Hotel',
            enlace: `/hotel.html?id=${h._id || h.id}`
        }));

        cabanas.forEach(c => recomendaciones.push({
            id: c._id || c.id,
            nombre: getNombre(c),
            imagen: getImageUrl(c),
            tipo: 'Cabaña',
            enlace: `/cabana.html?id=${c._id || c.id}`
        }));

        airbnbs.forEach(a => recomendaciones.push({
            id: a._id || a.id,
            nombre: getNombre(a),
            imagen: getImageUrl(a),
            tipo: 'Airbnb',
            enlace: `/airbnb.html?id=${a._id || a.id}`
        }));

        tours.forEach(t => recomendaciones.push({
            id: t._id || t.id,
            nombre: getNombre(t),
            imagen: getImageUrl(t),
            tipo: 'Aventura / Tour',
            enlace: `/experiencia.html?id=${t._id || t.id}`
        }));

        // 3. Mezclar (shuffle) aleatoriamente el array final
        for (let i = recomendaciones.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [recomendaciones[i], recomendaciones[j]] = [recomendaciones[j], recomendaciones[i]];
        }

        res.json({
            success: true,
            data: recomendaciones
        });
    } catch (error) {
        console.error('Error generando recomendaciones:', error);
        res.status(500).json({ success: false, message: 'Error al generar recomendaciones' });
    }
});

module.exports = router;
