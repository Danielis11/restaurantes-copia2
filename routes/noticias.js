const express = require('express');
const router = express.Router();
const Noticia = require('../models/Noticia');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware para verificar admin de turismo (super-admin o admin-turismo)
// Se reusa del server.js o se implementa aquí de forma simplificada
const verificarAdminTurismo = async (req, res, next) => {
   try {
     let token;
     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
       token = req.headers.authorization.split(' ')[1];
       if (token) {
         token = token.replace(/^"|"$/g, '');
         if (token === 'null' || token === 'undefined') token = '';
       }
     }
 
     if (!token) {
       return res.status(401).json({ success: false, message: 'No autorizado - Token no proporcionado' });
     }
 
     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt_super_seguro_2024');
     const admin = await Admin.findById(decoded.id).select('-password');
     
     if (!admin || !admin.activo || (admin.rol !== 'super-admin' && admin.rol !== 'admin-turismo')) {
       return res.status(403).json({ success: false, message: 'Acceso denegado' });
     }
 
     req.admin = admin;
     next();
   } catch (error) {
     res.status(401).json({ success: false, message: 'No autorizado - Token inválido' });
   }
 };

const { getUploadMiddleware } = require('../middleware/upload');

// ===== RUTAS PÚBLICAS =====

// Obtener todas las noticias activas
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const noticias = await Noticia.find({ activo: true })
                                      .sort({ fecha: -1 })
                                      .limit(limit);
        res.json({ success: true, count: noticias.length, data: noticias });
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        res.status(500).json({ success: false, message: 'Error al obtener noticias' });
    }
});

// ===== RUTAS DE ADMINISTRACIÓN =====

// Obtener todas las noticias (incluso las inactivas)
router.get('/admin', verificarAdminTurismo, async (req, res) => {
    try {
        const noticias = await Noticia.find().sort({ fecha: -1 });
        res.json({ success: true, count: noticias.length, data: noticias });
    } catch (error) {
        console.error('Error al obtener noticias (admin):', error);
        res.status(500).json({ success: false, message: 'Error al obtener noticias' });
    }
});

// Helper para procesar imagen subida
const procesarImagenSubida = (reqFile) => {
    if (!reqFile) return null;
    const { cloudinaryConfigurado } = require('../config/cloudinary');
    return {
        url: cloudinaryConfigurado() ? reqFile.path : `/uploads/restaurants/${reqFile.filename}`,
        public_id: reqFile.filename
    };
};

// Crear una nueva noticia
router.post('/admin', verificarAdminTurismo, getUploadMiddleware().single('imagen'), async (req, res) => {
    try {
        const noticiaData = { ...req.body };
        
        // Parsear títulos y descripciones JSON si vienen como string en el FormData
        if (typeof noticiaData.titulo === 'string') {
            try { noticiaData.titulo = JSON.parse(noticiaData.titulo); } catch(e) {}
        }
        if (typeof noticiaData.descripcion === 'string') {
            try { noticiaData.descripcion = JSON.parse(noticiaData.descripcion); } catch(e) {}
        }
        
        // Procesar imagen si fue subida
        const imagenSubida = procesarImagenSubida(req.file);
        if (imagenSubida) {
            noticiaData.imagen = imagenSubida;
        }

        const nuevaNoticia = await Noticia.create(noticiaData);
        res.status(201).json({ success: true, message: 'Noticia creada exitosamente', data: nuevaNoticia });
    } catch (error) {
        console.error('Error al crear noticia:', error);
        res.status(400).json({ success: false, message: 'Error al crear la noticia. Verifique los datos.' });
    }
});

// Actualizar una noticia
router.put('/admin/:id', verificarAdminTurismo, getUploadMiddleware().single('imagen'), async (req, res) => {
    try {
        const noticiaData = { ...req.body };
        
        // Parsear títulos y descripciones JSON si vienen como string en el FormData
        if (typeof noticiaData.titulo === 'string') {
            try { noticiaData.titulo = JSON.parse(noticiaData.titulo); } catch(e) {}
        }
        if (typeof noticiaData.descripcion === 'string') {
            try { noticiaData.descripcion = JSON.parse(noticiaData.descripcion); } catch(e) {}
        }

        // Procesar imagen si fue subida
        const imagenSubida = procesarImagenSubida(req.file);
        if (imagenSubida) {
            noticiaData.imagen = imagenSubida;
            // Opcional: Eliminar la imagen vieja en Cloudinary aquí si existe y si es requerido
        }

        const noticiaActualizada = await Noticia.findByIdAndUpdate(
            req.params.id,
            noticiaData,
            { new: true, runValidators: true }
        );

        if (!noticiaActualizada) {
            return res.status(404).json({ success: false, message: 'Noticia no encontrada' });
        }

        res.json({ success: true, message: 'Noticia actualizada exitosamente', data: noticiaActualizada });
    } catch (error) {
        console.error('Error al actualizar noticia:', error);
        res.status(400).json({ success: false, message: 'Error al actualizar la noticia' });
    }
});

// Eliminar una noticia
router.delete('/admin/:id', verificarAdminTurismo, async (req, res) => {
    try {
        const noticiaEliminada = await Noticia.findByIdAndDelete(req.params.id);

        if (!noticiaEliminada) {
            return res.status(404).json({ success: false, message: 'Noticia no encontrada' });
        }

        res.json({ success: true, message: 'Noticia eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar noticia:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la noticia' });
    }
});

module.exports = router;
