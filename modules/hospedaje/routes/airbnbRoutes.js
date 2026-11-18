const express = require('express');
const airbnbController = require('../controllers/airbnbController');
const authMiddleware = require('../middlewares/authMiddleware');
const Airbnb = require('../models/Airbnb');

// 🆕 NUEVO: Imports para gestión de imágenes con Cloudinary
const multer = require('multer');
const { airbnbStorage } = require('../config/cloudinary');

const router = express.Router();

// 🆕 NUEVO: Configuración de Multer para Imágenes de Airbnb con Cloudinary
const uploadAirbnbImages = multer({
  storage: airbnbStorage,
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
router.get('/', airbnbController.getAllAirbnb);
// ⚠️ Regex para que solo coincida con ObjectIds válidos (24 caracteres hex)
// Evita que rutas como /mis-alojamientos sean capturadas por este handler
router.get('/:id([0-9a-fA-F]{24})', airbnbController.getAirbnb);

// Todas las rutas siguientes requieren autenticación
router.use(authMiddleware.protect);

// ===== RUTAS PARA ADMINISTRADORES =====
router
  .route('/mis-alojamientos')
  .get(authMiddleware.restrictTo('admin'), airbnbController.getMisAirbnb);

router
  .route('/nuevo')
  .post(
    authMiddleware.restrictTo('admin'),
    airbnbController.createAirbnb
  );

// 🆕 ===== NUEVAS RUTAS DE GESTIÓN DE IMÁGENES CON CLOUDINARY =====

// 📸 Obtener todas las imágenes del alojamiento
router.get('/:alojamientoId/images', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { alojamientoId } = req.params;

    const alojamiento = await Airbnb.findOne({
      _id: alojamientoId,
      propietario: req.user.id
    });

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró alojamiento asociado o no tienes permisos'
      });
    }

    // Con Cloudinary, las URLs ya están validadas por la plataforma
    res.json({
      status: 'success',
      data: alojamiento.imagenes || [], // Las imágenes directamente en data
      alojamiento: {
        id: alojamiento._id,
        nombre: alojamiento.nombre,
        totalImagenes: alojamiento.imagenes ? alojamiento.imagenes.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo imágenes del alojamiento:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor'
    });
  }
});

// 🏷️ Middleware para cargar el nombre del alojamiento antes de multer
const loadAirbnbNombre = async (req, res, next) => {
  try {
    const { alojamientoId } = req.params;
    const alojamiento = await Airbnb.findOne({
      _id: alojamientoId,
      propietario: req.user.id
    });
    if (!alojamiento) {
      return res.status(404).json({ status: 'error', message: 'No se encontró alojamiento asociado o no tienes permisos' });
    }
    req.hospedajeNombre = alojamiento.nombre; // ← nombre disponible para CloudinaryStorage
    req.hospedaje = alojamiento;              // ← guardamos el objeto completo para reusar
    next();
  } catch (err) {
    next(err);
  }
};

// 📤 Subir múltiples imágenes al alojamiento usando Cloudinary
router.post('/:alojamientoId/upload-images',
  authMiddleware.restrictTo('admin'),
  loadAirbnbNombre,
  uploadAirbnbImages.array('images', 10),
  async (req, res) => {
    try {
      const { alojamientoId } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No se enviaron archivos de imagen'
        });
      }

      console.log(`📸 Procesando ${req.files.length} imágenes para alojamiento ${alojamientoId}`);

      const alojamiento = req.hospedaje; // ← cargado por el middleware loadAirbnbNombre

      // Obtener URLs de Cloudinary de los archivos subidos
      const nuevasImagenesUrls = req.files.map(file => file.path);

      // Agregar imágenes al alojamiento
      if (!alojamiento.imagenes) {
        alojamiento.imagenes = [];
      }

      alojamiento.imagenes.push(...nuevasImagenesUrls);
      alojamiento.updatedAt = new Date();

      await alojamiento.save();

      console.log(`✅ ${nuevasImagenesUrls.length} imágenes subidas para alojamiento ${alojamiento.nombre}`);

      res.json({
        status: 'success',
        message: `${nuevasImagenesUrls.length} imagen(es) subida(s) exitosamente`,
        data: {
          imagenesAgregadas: nuevasImagenesUrls.length,
          totalImagenes: alojamiento.imagenes.length,
          nuevasImagenes: nuevasImagenesUrls
        }
      });

    } catch (error) {
      console.error('❌ Error subiendo imágenes del alojamiento:', error);

      res.status(500).json({
        status: 'error',
        message: 'Error del servidor al subir imágenes',
        error: error.message
      });
    }
  });

// 🗑️ Eliminar imagen específica del alojamiento
router.delete('/:alojamientoId/images/:imageIndex', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { alojamientoId, imageIndex } = req.params;
    const index = parseInt(imageIndex);

    const alojamiento = await Airbnb.findOne({
      _id: alojamientoId,
      propietario: req.user.id
    });

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'Alojamiento no encontrado o sin permisos'
      });
    }

    if (!alojamiento.imagenes || !alojamiento.imagenes[index]) {
      return res.status(404).json({
        status: 'error',
        message: 'Imagen no encontrada'
      });
    }

    const imagenAEliminar = alojamiento.imagenes[index];

    // 🆕 NUEVO: Eliminar imagen de Cloudinary
    try {
      const cloudinaryLib = require('cloudinary').v2;

      // Extraer public_id completo de la URL de Cloudinary
      // URL formato: https://res.cloudinary.com/<cloud>/image/upload/v12345/turismo-app/airbnb/<nombre>/<id>.jpg
      const urlParts = imagenAEliminar.split('/upload/');
      if (urlParts.length > 1) {
        const afterUpload = urlParts[1].replace(/^v\d+\//, '');
        const fullPublicId = afterUpload.replace(/\.[^.]+$/, '');
        const result = await cloudinaryLib.uploader.destroy(fullPublicId);
        console.log(`🗑️ Imagen eliminada de Cloudinary (public_id: ${fullPublicId}):`, result);
      }
    } catch (cloudinaryError) {
      console.warn('⚠️ Error eliminando de Cloudinary (continuando):', cloudinaryError.message);
      // Continuamos aunque falle la eliminación en Cloudinary
    }

    // Eliminar de la base de datos
    alojamiento.imagenes.splice(index, 1);
    alojamiento.updatedAt = new Date();
    await alojamiento.save();

    res.json({
      status: 'success',
      message: 'Imagen eliminada exitosamente',
      data: {
        imagenesRestantes: alojamiento.imagenes.length,
        imagenEliminada: imagenAEliminar
      }
    });

  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor al eliminar imagen'
    });
  }
});

// ✅ CAMBIO 2: Ruta corregida para establecer imagen principal
// 🎯 Establecer imagen principal (mover a primera posición)
router.patch('/:alojamientoId/images/set-main', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    const { alojamientoId } = req.params;
    const { imageIndex } = req.body; // ✅ Ahora toma imageIndex del body
    const index = parseInt(imageIndex);

    const alojamiento = await Airbnb.findOne({
      _id: alojamientoId,
      propietario: req.user.id
    });

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'Alojamiento no encontrado o sin permisos'
      });
    }

    if (!alojamiento.imagenes || !alojamiento.imagenes[index]) {
      return res.status(404).json({
        status: 'error',
        message: 'Imagen no encontrada'
      });
    }

    if (index === 0) {
      return res.json({
        status: 'success',
        message: 'Esta imagen ya es la principal',
        data: {
          nuevaImagenPrincipal: alojamiento.imagenes[0],
          totalImagenes: alojamiento.imagenes.length
        }
      });
    }

    // Mover imagen a primera posición
    const imagenPrincipal = alojamiento.imagenes.splice(index, 1)[0];
    alojamiento.imagenes.unshift(imagenPrincipal);

    alojamiento.updatedAt = new Date();
    await alojamiento.save();

    console.log(`⭐ Imagen principal actualizada para alojamiento ${alojamiento.nombre}`);

    res.json({
      status: 'success',
      message: 'Imagen principal establecida exitosamente',
      data: {
        nuevaImagenPrincipal: imagenPrincipal,
        totalImagenes: alojamiento.imagenes.length
      }
    });

  } catch (error) {
    console.error('❌ Error estableciendo imagen principal:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error del servidor'
    });
  }
});

// 🖼️ Obtener imagen principal del alojamiento
router.get('/:alojamientoId/main-image', async (req, res) => {
  try {
    const { alojamientoId } = req.params;

    const alojamiento = await Airbnb.findOne({
      _id: alojamientoId,
      activo: true
    });

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'Alojamiento no encontrado'
      });
    }

    const mainImage = alojamiento.imagenes && alojamiento.imagenes.length > 0
      ? alojamiento.imagenes[0]
      : null;

    res.json({
      status: 'success',
      data: {
        mainImage: mainImage,
        totalImages: alojamiento.imagenes ? alojamiento.imagenes.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo imagen principal del alojamiento:', error);
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
    airbnbController.updateAirbnb
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    airbnbController.deleteAirbnb
  );

// ✅ RUTA DE TOGGLE STATUS
router.patch('/:id/toggle-status', authMiddleware.restrictTo('admin'), async (req, res) => {
  try {
    // Verificar si es super admin
    const isSuperAdmin = req.user.email === 'superadmin@turismo.com' ||
      req.user.email === 'direcciondeturismojalpan@gmail.com' ||
      req.user.isSuperAdmin ||
      req.user.role === 'super-admin';

    if (!isSuperAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para realizar esta acción. Se requieren privilegios de super administrador.'
      });
    }

    const alojamiento = await Airbnb.findById(req.params.id);

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'Alojamiento no encontrado'
      });
    }

    // Toggle el estado activo
    alojamiento.activo = !alojamiento.activo;

    // Agregar información de auditoría
    alojamiento.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      accion: alojamiento.activo ? 'activado' : 'bloqueado',
      motivo: 'Cambio de estado por super administrador'
    };

    await alojamiento.save();

    res.status(200).json({
      status: 'success',
      message: `Alojamiento ${alojamiento.activo ? 'activado' : 'bloqueado'} exitosamente`,
      data: {
        alojamiento: {
          id: alojamiento._id,
          nombre: alojamiento.nombre,
          activo: alojamiento.activo
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

// 🛠️ Middleware de manejo de errores de Multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'Archivo muy grande. Máximo 5MB por imagen.'
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
router.post('/:id/reviews', authMiddleware.protect, airbnbController.createReview);

module.exports = router;

console.log('✅ Rutas de gestión de imágenes de Airbnb con Cloudinary configuradas en airbnbRoutes.js');