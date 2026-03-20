const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { languageMiddleware } = require('../utils/languageUtils');
const { getUploadMiddleware } = require('../middleware/upload');

// Try to load auth middleware
let verificarToken;
try {
  ({ verificarToken } = require('../middleware/auth'));
} catch(e) {
  // If middleware/auth doesn't export verificarToken, it might be in server.js
  // We'll handle this below
}

// ===== PUBLIC ROUTES =====

// @route   GET /api/restaurants
// @desc    Obtener todos los restaurantes con filtros y paginación
// @access  Público
router.get('/', languageMiddleware, restaurantController.obtenerRestaurantes);

// @route   GET /api/restaurants/stats
// @desc    Obtener estadísticas públicas
// @access  Público
router.get('/stats', languageMiddleware, restaurantController.obtenerEstadisticas);

// @route   GET /api/restaurants/tipo/:tipo
// @desc    Obtener restaurantes por tipo (restaurante, bar, cafeteria)
// @access  Público
router.get('/tipo/:tipo', languageMiddleware, restaurantController.obtenerRestaurantesPorTipo);

// @route   GET /api/restaurants/search/:termino
// @desc    Buscar restaurantes por nombre, descripción o ciudad
// @access  Público
router.get('/search/:termino', languageMiddleware, restaurantController.buscarRestaurantes);

// @route   POST /api/restaurants/:id/view
// @desc    Incrementar vistas de perfil
// @access  Público
router.post('/:id/view', restaurantController.incrementarVistas);

// @route   POST /api/restaurants/:id/click-map
// @desc    Incrementar clics al mapa
// @access  Público
router.post('/:id/click-map', restaurantController.incrementarClicsMapa);

// @route   POST /api/restaurants/:id/click-whatsapp
// @desc    Incrementar clics a WhatsApp
// @access  Público
router.post('/:id/click-whatsapp', restaurantController.incrementarClicsWhatsapp);

// ===== AUTHENTICATED ROUTES (Admin Image Management + My Restaurant) =====
// These are used by manage-images.html and manage-restaurant.html

if (verificarToken) {
  const Restaurant = require('../models/Restaurant');
  const { cloudinaryConfigurado, eliminarImagenCloudinary } = require('../config/cloudinary');

  // ===== MY-RESTAURANT PROXY ROUTES =====
  // Proxy /api/restaurants/my-restaurant/* to the admin controller
  const adminController = require('../controllers/adminController');

  router.get('/my-restaurant', verificarToken, adminController.obtenerMiRestaurante);
  router.get('/my-restaurant/analytics', verificarToken, adminController.obtenerAnaliticasAdmin);
  router.patch('/my-restaurant/basic-info', verificarToken, adminController.actualizarInformacionBasica);
  router.patch('/my-restaurant/address', verificarToken, adminController.actualizarDireccion);
  router.patch('/my-restaurant/schedule', verificarToken, adminController.actualizarHorarios);
  router.patch('/my-restaurant/menu', verificarToken, adminController.actualizarMenu);
  router.patch('/my-restaurant/social-media', verificarToken, adminController.actualizarRedesSociales);
  router.patch('/my-restaurant/amenities', verificarToken, adminController.actualizarServicios);
  router.patch('/my-restaurant/promotions', verificarToken, adminController.actualizarPromociones);
  router.get('/my-restaurant/reviews', verificarToken, adminController.obtenerResenasAdmin);
  router.patch('/my-restaurant/reviews/:id/reply', verificarToken, adminController.responderResena);

  // ===== IMAGE MANAGEMENT ROUTES =====

  // GET /api/restaurants/images - Get all images for admin's restaurant
  router.get('/images', verificarToken, async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({ adminId: req.admin._id });
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
      }

      const images = (restaurant.imagenes || []).map((img, index) => ({
        id: img._id.toString(),
        filename: img.filename || `imagen-${index + 1}`,
        url: img.url,
        size: img.size || 0,
        uploadDate: img.uploadDate,
        esPrincipal: index === 0 // First image is the main one
      }));

      res.json({ success: true, data: images });
    } catch (error) {
      console.error('Error obteniendo imágenes:', error);
      res.status(500).json({ success: false, message: 'Error obteniendo imágenes' });
    }
  });

  // POST /api/restaurants/images/upload - Upload images
  router.post('/images/upload', verificarToken, getUploadMiddleware().array('images', 10), async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({ adminId: req.admin._id });
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No se recibieron archivos' });
      }

      const mongoose = require('mongoose');
      const newImages = [];

      for (const file of req.files) {
        let imageData = {
          _id: new mongoose.Types.ObjectId()
        };
        
        if (cloudinaryConfigurado() && file.path) {
          // multer-storage-cloudinary already uploaded the file
          // file.path is the Cloudinary URL, file.filename is the public_id
          imageData.filename = file.originalname;
          imageData.url = file.path;
          imageData.size = file.size || 0;
          imageData.cloudinaryId = file.filename;
        } else {
          // Local storage
          imageData.filename = file.originalname;
          imageData.url = `/uploads/restaurants/${file.filename}`;
          imageData.size = file.size || 0;
          imageData.path = file.path;
        }

        newImages.push(imageData);
      }

      await Restaurant.updateOne(
        { _id: restaurant._id },
        { 
          $push: { imagenes: { $each: newImages } },
          $set: { fechaActualizacion: new Date() }
        }
      );

      res.json({
        success: true,
        message: `${newImages.length} imagen(es) subida(s) correctamente`,
        data: newImages.map(img => ({ ...img, id: img._id }))
      });
    } catch (error) {
      console.error('Error subiendo imágenes:', error);
      res.status(500).json({ success: false, message: 'Error subiendo imágenes' });
    }
  });

  // PATCH /api/restaurants/images/:imageId/set-main - Set main image
  router.patch('/images/:imageId/set-main', verificarToken, async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({ adminId: req.admin._id });
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
      }

      await restaurant.establecerImagenPrincipal(req.params.imageId);
      res.json({ success: true, message: 'Imagen principal actualizada' });
    } catch (error) {
      console.error('Error estableciendo imagen principal:', error);
      res.status(500).json({ success: false, message: 'Error estableciendo imagen principal' });
    }
  });

  // DELETE /api/restaurants/images/:imageId - Delete image
  router.delete('/images/:imageId', verificarToken, async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({ adminId: req.admin._id });
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
      }

      // Find the image to delete
      const image = restaurant.imagenes.id(req.params.imageId);
      if (!image) {
        return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      }

      // If Cloudinary, delete from cloud
      if (image.cloudinaryId && cloudinaryConfigurado()) {
        try {
          await eliminarImagenCloudinary(image.cloudinaryId);
        } catch (cloudErr) {
          console.error('Error deleting from Cloudinary:', cloudErr);
        }
      }

      await restaurant.eliminarImagen(req.params.imageId);
      res.json({ success: true, message: 'Imagen eliminada correctamente' });
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      res.status(500).json({ success: false, message: 'Error eliminando imagen' });
    }
  });
}

// @route   GET /api/restaurants/:id
// @desc    Obtener un restaurante específico por ID
// @access  Público
// NOTA: Esta ruta debe ir al final para evitar conflictos con otras rutas
router.get('/:id', languageMiddleware, restaurantController.obtenerRestaurantePorId);

module.exports = router;