const express = require('express');
const hotelController = require('../controllers/hotelController');
const authMiddleware = require('../middlewares/authMiddleware');
const Hotel = require('../models/Hotel');

// 🆕 NUEVO: Imports para gestión de imágenes
const multer = require('multer');
const { hotelStorage, hasCloudinaryCredentials } = require('../config/cloudinary');

const router = express.Router();

// 🆕 NUEVO: Configuración de Multer para Imágenes de Hoteles con Cloudinary
const uploadHotelImages = multer({
  storage: hotelStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
});

// ===== RUTAS PÚBLICAS =====
router.get('/', hotelController.getAllHoteles);
// ⚠️ Usar regex para que solo coincida con ObjectIds válidos (24 caracteres hex)
// Esto evita que rutas como /mis-hoteles sean capturadas por este handler
router.get('/:id([0-9a-fA-F]{24})', hotelController.getHotel);

// ===== RUTAS QUE REQUIEREN AUTENTICACIÓN =====
// ⚠️ IMPORTANTE: Las rutas con nombre específico (como /mis-hoteles)
// DEBEN definirse ANTES que las rutas con parámetro /:id
// para evitar que Express confunda el nombre con un ID
router.use(authMiddleware.protect);


// ===== RUTAS PARA ADMINISTRADORES =====
// ⚠️ IMPORTANTE: /mis-hoteles DEBE definirse ANTES que /:id
// para que Express no confunda "mis-hoteles" con un parámetro :id
router
  .route('/mis-hoteles')
  .get(authMiddleware.restrictTo('admin'), hotelController.getMisHoteles);

router
  .route('/nuevo')
  .post(
    authMiddleware.restrictTo('admin'),
    hotelController.createHotel
  );

// 🆕 ===== NUEVAS RUTAS DE GESTIÓN DE IMÁGENES CON CLOUDINARY =====

// 📸 Obtener todas las imágenes del hotel
router.get('/:hotelId/images', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { hotelId } = req.params;

    // ✅ Super admin puede ver imágenes de cualquier hotel
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    const query = isSuperAdmin
      ? { _id: hotelId }
      : { _id: hotelId, propietario: req.user.id };

    const hotel = await Hotel.findOne(query);

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró hotel asociado o no tienes permisos'
      });
    }

    res.json({
      status: 'success',
      message: 'Imágenes obtenidas correctamente',
      data: hotel.imagenes || []
    });

  } catch (error) {
    console.error('❌ Error obteniendo imágenes del hotel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor al obtener imágenes',
      error: error.message
    });
  }
});

// 🏷️ Middleware para cargar el nombre del hotel antes de multer
const loadHotelNombre = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    const query = isSuperAdmin ? { _id: hotelId } : { _id: hotelId, propietario: req.user.id };
    const hotel = await Hotel.findOne(query);
    if (!hotel) {
      return res.status(404).json({ status: 'error', message: 'No se encontró el hotel o no tienes permisos' });
    }
    req.hospedajeNombre = hotel.nombre; // ← nombre disponible para CloudinaryStorage
    req.hospedaje = hotel;              // ← guardamos el objeto completo para reusar
    next();
  } catch (err) {
    next(err);
  }
};

// 📤 Subir nuevas imágenes al hotel (Cloudinary o disco local)
router.post('/:hotelId/images/upload', authMiddleware.restrictTo('admin'), loadHotelNombre, uploadHotelImages.array('images', 10), async (req, res) => {
  try {
    const { hotelId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se enviaron archivos'
      });
    }

    // ✅ El hotel ya fue cargado por el middleware loadHotelNombre
    const hotel = req.hospedaje;

    // ✅ Construir URLs según el storage usado
    // - Cloudinary: file.path ya trae la URL https://res.cloudinary.com/...
    // - Disco local: file.filename tiene solo el nombre, construir ruta relativa
    const nuevasImagenesUrls = req.files.map(file => {
      if (hasCloudinaryCredentials) {
        return file.path; // URL completa de Cloudinary
      } else {
        return `/uploads/hoteles/${file.filename}`; // Ruta local
      }
    });

    // Agregar imágenes al hotel
    if (!hotel.imagenes) {
      hotel.imagenes = [];
    }

    hotel.imagenes.push(...nuevasImagenesUrls);
    hotel.updatedAt = new Date();

    await hotel.save();

    console.log(`✅ ${nuevasImagenesUrls.length} imágenes subidas para hotel ${hotel.nombre} en carpeta 'turismo-app/hoteles/${hotel.nombre}' (${hasCloudinaryCredentials ? 'Cloudinary' : 'disco local'})`);

    res.json({
      status: 'success',
      message: `${nuevasImagenesUrls.length} imagen(es) subida(s) exitosamente`,
      data: {
        imagenesAgregadas: nuevasImagenesUrls.length,
        totalImagenes: hotel.imagenes.length,
        nuevasImagenes: nuevasImagenesUrls
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo imágenes del hotel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor al subir imágenes',
      error: error.message
    });
  }
});

// 🗑️ Eliminar imagen específica del hotel
router.delete('/:hotelId/images/:imageIndex', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { hotelId, imageIndex } = req.params;
    const index = parseInt(imageIndex);

    const hotel = await Hotel.findOne({
      _id: hotelId,
      propietario: req.user.id,
      activo: true
    });

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró hotel asociado o no tienes permisos'
      });
    }

    if (!hotel.imagenes || hotel.imagenes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No hay imágenes para eliminar'
      });
    }

    if (index < 0 || index >= hotel.imagenes.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Índice de imagen inválido'
      });
    }

    const imagenAEliminar = hotel.imagenes[index];

    // 🆕 NUEVO: Eliminar imagen de Cloudinary
    try {
      const cloudinaryLib = require('cloudinary').v2;

      // Extraer public_id completo de la URL de Cloudinary
      // URL formato: https://res.cloudinary.com/<cloud>/image/upload/v12345/turismo-app/hoteles/<nombre>/<id>.jpg
      const urlParts = imagenAEliminar.split('/upload/');
      if (urlParts.length > 1) {
        // Quitar la versión (v12345) si existe y la extensión
        const afterUpload = urlParts[1].replace(/^v\d+\//, '');
        const fullPublicId = afterUpload.replace(/\.[^.]+$/, ''); // quitar extensión
        const result = await cloudinaryLib.uploader.destroy(fullPublicId);
        console.log(`🗑️ Imagen eliminada de Cloudinary (public_id: ${fullPublicId}):`, result);
      }
    } catch (cloudinaryError) {
      console.warn('⚠️ Error eliminando de Cloudinary (continuando):', cloudinaryError.message);
      // Continuamos aunque falle la eliminación en Cloudinary
    }

    // Eliminar de la base de datos
    hotel.imagenes.splice(index, 1);
    hotel.updatedAt = new Date();

    await hotel.save();

    console.log(`✅ Imagen eliminada del hotel ${hotel.nombre}`);

    res.json({
      status: 'success',
      message: 'Imagen eliminada exitosamente',
      data: {
        totalImagenes: hotel.imagenes.length,
        imagenEliminada: {
          url: imagenAEliminar,
          index: index
        }
      }
    });

  } catch (error) {
    console.error('❌ Error eliminando imagen del hotel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor al eliminar imagen',
      error: error.message
    });
  }
});

// ⭐ Establecer imagen como principal
router.patch('/:hotelId/images/set-main', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { imageIndex } = req.body;
    const index = parseInt(imageIndex);

    const hotel = await Hotel.findOne({
      _id: hotelId,
      propietario: req.user.id,
      activo: true
    });

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró hotel asociado o no tienes permisos'
      });
    }

    if (!hotel.imagenes || hotel.imagenes.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No hay imágenes disponibles'
      });
    }

    if (index < 0 || index >= hotel.imagenes.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Índice de imagen inválido'
      });
    }

    if (index === 0) {
      return res.json({
        status: 'success',
        message: 'Esta imagen ya es la principal',
        data: {
          imagenPrincipal: hotel.imagenes[0]
        }
      });
    }

    // Mover imagen al primer lugar
    const imagenPrincipal = hotel.imagenes.splice(index, 1)[0];
    hotel.imagenes.unshift(imagenPrincipal);
    hotel.updatedAt = new Date();

    await hotel.save();

    console.log(`✅ Imagen principal actualizada para hotel ${hotel.nombre}`);

    res.json({
      status: 'success',
      message: 'Imagen principal actualizada exitosamente',
      data: {
        imagenPrincipal: imagenPrincipal,
        totalImagenes: hotel.imagenes.length
      }
    });

  } catch (error) {
    console.error('❌ Error estableciendo imagen principal del hotel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor al establecer imagen principal',
      error: error.message
    });
  }
});

// 🌐 Obtener imagen principal del hotel (ruta pública - no requiere auth)
router.get('/:id/main-image', async (req, res) => {
  try {
    const { id } = req.params;

    const hotel = await Hotel.findOne({
      _id: id,
      activo: true
    });

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Hotel no encontrado'
      });
    }

    const mainImage = hotel.imagenes && hotel.imagenes.length > 0
      ? hotel.imagenes[0]
      : null;

    res.json({
      status: 'success',
      data: {
        mainImage: mainImage,
        totalImages: hotel.imagenes ? hotel.imagenes.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo imagen principal del hotel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor'
    });
  }
});

// ===== RUTAS EXISTENTES =====

// ✅ RUTA PRINCIPAL PARA EDITAR - /editar/:id (SIN MULTER)
router
  .route('/editar/:id')
  .patch(
    authMiddleware.restrictTo('admin'),
    hotelController.updateHotel
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    hotelController.deleteHotel
  );

// ✅ RUTA DE TOGGLE STATUS
router.patch('/:id/toggle-status', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    // Verificar si es super admin
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' ||
      req.user.isSuperAdmin ||
      req.user.role === 'super-admin';

    if (!isSuperAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para realizar esta acción. Se requieren privilegios de super administrador.'
      });
    }

    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Hotel no encontrado'
      });
    }

    // Toggle el estado activo
    hotel.activo = !hotel.activo;

    // Agregar información de auditoría
    hotel.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      accion: hotel.activo ? 'activado' : 'bloqueado',
      motivo: 'Cambio de estado por super administrador'
    };

    await hotel.save();

    res.status(200).json({
      status: 'success',
      message: `Hotel ${hotel.activo ? 'activado' : 'bloqueado'} exitosamente`,
      data: {
        hotel: {
          id: hotel._id,
          nombre: hotel.nombre,
          activo: hotel.activo
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// ✅ RUTA GENÉRICA /:id - DEBE IR AL FINAL
router
  .route('/:id')
  .get(hotelController.getHotel)
  .patch(
    authMiddleware.restrictTo('admin'),
    hotelController.updateHotel
  );

// 🆕 NUEVO: Middleware de manejo de errores para multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'Archivo demasiado grande. Máximo 5MB por imagen.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Demasiados archivos. Máximo 10 imágenes por vez.'
      });
    }
  }

  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      status: 'error',
      message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)'
    });
  }

  next(error);
});

// 📝 Crear reseña
router.post('/:id/reviews', authMiddleware.protect, hotelController.createReview);

module.exports = router;

console.log('✅ Rutas de gestión de imágenes de hoteles con Cloudinary configuradas en hotelRoutes.js');