// Reseñas públicas de restaurantes, tours y guías; galería y moderación
// (Movido desde server.js sin cambios de lógica)
const express = require('express');
const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const Guia = require('../models/Guia');
const Tour = require('../models/Tour');
const { verificarToken, verificarSuperAdmin, verificarTokenUsuario } = require('../middleware/auth');

const router = express.Router();
// Obtener reseñas aprobadas de un restaurante específico
router.get('/api/restaurants/:id/reviews', async (req, res, next) => {
  try {
    // Skip if id is not a valid ObjectId (e.g. 'my-restaurant') so the specific admin route can handle it
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return next();
    }
    const reviews = await Review.find({ restaurantId: req.params.id, estado: 'aprobada' })
      .populate('userId', 'nombre')
      .sort({ destacada: -1, fechaCreacion: -1 });
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error('Error obteniendo reseñas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Crear una nueva reseña (Debe estar logueado como turista)
router.post('/api/restaurants/:id/reviews', verificarTokenUsuario, (req, res, next) => {
  // Multi-foto: hasta 5 archivos con campo 'fotos'
  const upload = getUploadMiddleware().array('fotos', 5);
  upload(req, res, function(err) {
    if (err) {
      console.error('Error de multer (nueva reseña):', err);
      return res.status(400).json({ success: false, message: 'Error subiendo las imágenes' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { rating, comentario } = req.body;

    // Construir objetos de foto si hay archivos adjuntos
    let fotos = [];
    let imagenUrl = null;
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('../config/cloudinary');
      fotos = req.files.map(file => {
        if (cloudinaryConfigurado()) {
          return {
            filename: file.filename,
            url: file.path,
            cloudinaryId: file.filename,
            size: file.size || 0
          };
        } else {
          return {
            filename: file.filename,
            url: `/uploads/restaurants/${file.filename}`,
            size: file.size || 0
          };
        }
      });
      // Compatibilidad: primera foto como imagenUrl
      imagenUrl = fotos[0].url;
    }

    // Verificar si el restaurante existe
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
    }

    // Comprobar si el usuario ya hizo una reseña para este restaurante (opcional, para evitar spam)
    const existingReview = await Review.findOne({ restaurantId: req.params.id, userId: req.user._id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Ya has escrito una opinión para este restaurante.' });
    }

    const newReview = await Review.create({
      restaurantId: req.params.id,
      userId: req.user._id,
      rating,
      comentario,
      imagenUrl,
      fotos
    });

    res.status(201).json({ success: true, message: 'Reseña enviada correctamente. En espera de moderación.', data: newReview });
  } catch (error) {
    console.error('Error creando reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Alternar (Agregar/Quitar) me gusta a una reseña de restaurante
router.post('/api/restaurants/:id/reviews/:reviewId/like', verificarTokenUsuario, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    const userId = req.user._id;
    const index = review.likedBy.indexOf(userId);
    let isLiked = false;

    if (index === -1) {
      review.likedBy.push(userId);
      review.likes = (review.likes || 0) + 1;
      isLiked = true;
    } else {
      review.likedBy.splice(index, 1);
      review.likes = Math.max(0, (review.likes || 1) - 1);
      isLiked = false;
    }

    await review.save();

    res.json({ success: true, isLiked, likes: review.likes });
  } catch (error) {
    console.error('Error al dar like a reseña:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// PUT /api/reviews/:reviewId/reply - Responder a una reseña (Solo Admin)
router.put('/api/reviews/:reviewId/reply', verificarToken, async (req, res) => {
  try {
    const { respuesta } = req.body;

    if (!respuesta || respuesta.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'La respuesta es requerida' });
    }

    if (respuesta.length > 500) {
      return res.status(400).json({ success: false, message: 'La respuesta no puede exceder 500 caracteres' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    review.respuestaAdmin = respuesta.trim();
    review.fechaRespuesta = Date.now();
    await review.save();

    console.log(`💬 Admin respondió a reseña ${req.params.reviewId}`);

    res.json({ success: true, message: 'Respuesta publicada', data: review });
  } catch (error) {
    console.error('Error respondiendo a reseña:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Crear una nueva reseña para un TOUR (Debe estar logueado como turista)
router.post('/api/tours/:id/reviews', verificarTokenUsuario, (req, res, next) => {
  const { getUploadMiddleware } = require('../middleware/upload');
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.array('fotos', 5)(req, res, next);
}, async (req, res) => {
  try {
    const { rating, comentario } = req.body;
    
    if (!rating || !comentario) {
      return res.status(400).json({ success: false, message: 'La calificación y el comentario son requeridos' });
    }

    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour no encontrado' });
    }

    // Comprobar si el usuario ya hizo una reseña para este tour
    const existingReview = tour.resenas.find(r => r.usuario.toString() === req.user._id.toString());
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Ya has escrito una opinión para esta experiencia.' });
    }

    // Construir objetos de foto si hay archivos adjuntos
    let fotos = [];
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('../config/cloudinary');
      fotos = req.files.map(file => {
        if (cloudinaryConfigurado()) {
          return {
            filename: file.filename,
            url: file.path,
            cloudinaryId: file.filename,
            size: file.size || 0,
            uploadDate: new Date()
          };
        } else {
          return {
            filename: file.filename,
            url: `/uploads/restaurants/${file.filename}`,
            path: file.path,
            size: file.size,
            uploadDate: new Date()
          };
        }
      });
    }

    const nuevaResena = {
      usuario: req.user._id,
      nombreUsuario: req.user.nombre,
      calificacion: Number(rating),
      comentario,
      fotos
    };

    tour.resenas.push(nuevaResena);
    tour.numeroResenas = tour.resenas.length;
    tour.calificacionPromedio = tour.resenas.reduce((acc, curr) => acc + curr.calificacion, 0) / tour.numeroResenas;

    await tour.save();

    res.status(201).json({ success: true, message: 'Reseña enviada correctamente.', data: nuevaResena });
  } catch (error) {
    console.error('Error creando reseña de tour:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Obtener reseñas de un guía
router.get('/api/guias/:id/reviews', async (req, res) => {
  try {
    const guia = await Guia.findById(req.params.id);
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }
    // Devolver las reseñas asociadas (aquí se ordenan de más reciente a más antigua)
    const reviews = (guia.resenas || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error('Error obteniendo reseñas del guía:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Crear una nueva reseña para un GUÍA (Debe estar logueado como turista)
router.post('/api/guias/:id/reviews', verificarTokenUsuario, (req, res, next) => {
  const { getUploadMiddleware } = require('../middleware/upload');
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.array('fotos', 5)(req, res, next);
}, async (req, res) => {
  try {
    const { rating, comentario } = req.body;
    
    if (!rating || !comentario) {
      return res.status(400).json({ success: false, message: 'La calificación y el comentario son requeridos' });
    }

    const guia = await Guia.findById(req.params.id);
    if (!guia) {
      return res.status(404).json({ success: false, message: 'Guía no encontrado' });
    }

    // Comprobar si el usuario ya hizo una reseña para este guía
    const existingReview = (guia.resenas || []).find(r => r.usuario.toString() === req.user._id.toString());
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Ya has escrito una opinión para este guía.' });
    }

    // Construir objetos de foto si hay archivos adjuntos
    let fotos = [];
    if (req.files && req.files.length > 0) {
      const { cloudinaryConfigurado } = require('../config/cloudinary');
      fotos = req.files.map(file => {
        if (cloudinaryConfigurado()) {
          return {
            filename: file.filename,
            url: file.path,
            cloudinaryId: file.filename,
            size: file.size || 0,
            uploadDate: new Date()
          };
        } else {
          return {
            filename: file.filename,
            url: `/uploads/restaurants/${file.filename}`,
            path: file.path,
            size: file.size,
            uploadDate: new Date()
          };
        }
      });
    }

    const nuevaResena = {
      usuario: req.user._id,
      nombreUsuario: req.user.nombre,
      calificacion: Number(rating),
      comentario,
      fotos
    };

    guia.resenas.push(nuevaResena);
    guia.numeroResenas = guia.resenas.length;
    guia.calificacionPromedio = guia.resenas.reduce((acc, curr) => acc + curr.calificacion, 0) / guia.numeroResenas;

    await guia.save();

    res.status(201).json({ success: true, message: 'Reseña enviada correctamente.', data: nuevaResena });
  } catch (error) {
    console.error('Error creando reseña de guía:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Cambiar estado "destacada" de una reseña
router.patch('/api/super-admin/reviews/:id/feature', verificarToken, verificarSuperAdmin, async (req, res) => {
  try {
    const { destacada } = req.body;
    
    const review = await Review.findByIdAndUpdate(req.params.id, { destacada }, { new: true });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    }

    res.json({ success: true, message: `Reseña ${destacada ? 'destacada' : 'no destacada'} exitosamente`, data: review });
  } catch (error) {
    console.error('Error destacando reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/reviews/gallery - Fotos recientes de viajeros (público)
router.get('/api/reviews/gallery', async (req, res) => {
  try {
    const reviews = await Review.find({
      estado: 'aprobada',
      $or: [
        { 'fotos.0': { $exists: true } },
        { imagenUrl: { $ne: null } }
      ]
    })
      .populate('userId', 'nombre')
      .populate('restaurantId', 'nombre')
      .sort({ fechaCreacion: -1 })
      .limit(20)
      .lean();

    // Flatten photos from all reviews
    const gallery = [];
    for (const r of reviews) {
      const author = r.userId?.nombre || 'Viajero';
      const place = r.restaurantId?.nombre || '';
      const rating = r.rating;
      const restaurantId = r.restaurantId?._id;

      if (r.fotos && r.fotos.length > 0) {
        for (const f of r.fotos) {
          gallery.push({
            url: f.url,
            author,
            place,
            rating,
            restaurantId
          });
          if (gallery.length >= 12) break;
        }
      } else if (r.imagenUrl) {
        gallery.push({
          url: r.imagenUrl,
          author,
          place,
          rating,
          restaurantId
        });
      }
      if (gallery.length >= 12) break;
    }

    res.json({ success: true, data: gallery });
  } catch (error) {
    console.error('Error obteniendo galería:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

module.exports = router;
