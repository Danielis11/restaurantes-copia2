const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Cabana = require('../models/Cabana');
const Airbnb = require('../models/Airbnb');

// GET /api/hospedajes — Devuelve hoteles, cabañas y airbnbs que tengan coordenadas
router.get('/', async (req, res) => {
    try {
        // Filtro: solo los activos y que tengan coordenadas (ya sea en ubicacion.coordenadas o directo en ubicacion)
        const filtroConCoordenadas = {
            activo: { $ne: false },
            $or: [
                {
                    'ubicacion.coordenadas.lat': { $exists: true, $ne: null },
                    'ubicacion.coordenadas.lng': { $exists: true, $ne: null }
                },
                {
                    'ubicacion.lat': { $exists: true, $ne: null },
                    'ubicacion.lng': { $exists: true, $ne: null }
                },
                {
                    'latitud': { $exists: true, $ne: null },
                    'longitud': { $exists: true, $ne: null }
                },
                {
                    'coordenadas.latitud': { $exists: true, $ne: null },
                    'coordenadas.longitud': { $exists: true, $ne: null }
                },
                {
                    'ubicacion.coordenadas.latitud': { $exists: true, $ne: null },
                    'ubicacion.coordenadas.longitud': { $exists: true, $ne: null }
                }
            ]
        };

        const campos = 'nombre descripcion imagenes ubicacion calificacion contacto coordenadas latitud longitud';

        const [hoteles, cabanas, airbnbs] = await Promise.all([
            Hotel.find(filtroConCoordenadas).select(campos + ' precio').lean(),
            Cabana.find(filtroConCoordenadas).select(campos + ' precio').lean(),
            Airbnb.find(filtroConCoordenadas).select(campos + ' precioPorNoche tipoPropiedad').lean()
        ]);

        // Marcar cada item con su tipo para el frontend
        const data = [
            ...hoteles.map(h => ({ ...h, _tipoHospedaje: 'hotel' })),
            ...cabanas.map(c => ({ ...c, _tipoHospedaje: 'cabana' })),
            ...airbnbs.map(a => {
                const normA = { ...a, _tipoHospedaje: 'airbnb' };
                // Normalizar coordenadas
                if (!normA.ubicacion) normA.ubicacion = {};
                if (!normA.ubicacion.coordenadas) normA.ubicacion.coordenadas = {};
                
                if (normA.ubicacion.coordenadas.latitud && normA.ubicacion.coordenadas.longitud) {
                    normA.ubicacion.coordenadas.lat = normA.ubicacion.coordenadas.latitud;
                    normA.ubicacion.coordenadas.lng = normA.ubicacion.coordenadas.longitud;
                } else if (normA.latitud && normA.longitud) {
                    normA.ubicacion.coordenadas.lat = normA.latitud;
                    normA.ubicacion.coordenadas.lng = normA.longitud;
                } else if (normA.coordenadas && normA.coordenadas.latitud && normA.coordenadas.longitud) {
                    normA.ubicacion.coordenadas.lat = normA.coordenadas.latitud;
                    normA.ubicacion.coordenadas.lng = normA.coordenadas.longitud;
                }
                return normA;
            })
        ];

        res.json({
            success: true,
            total: data.length,
            desglose: {
                hoteles: hoteles.length,
                cabanas: cabanas.length,
                airbnbs: airbnbs.length
            },
            data
        });
    } catch (error) {
        console.error('Error obteniendo hospedajes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener hospedajes',
            error: error.message
        });
    }
});

module.exports = router;
