// Panel del restaurante: edición, imágenes, eventos y perfil del admin
// (Movido desde server.js sin cambios de lógica)
const express = require('express');
const Restaurant = require('../models/Restaurant');
const Evento = require('../models/Evento');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();
// ===== CONFIGURACIÓN DE SUBIDA DE IMÁGENES (MÓDULO CENTRALIZADO) =====
const fs = require('fs');

// Cargar configuración y helper de eliminación de Cloudinary
const { eliminarImagenCloudinary, cloudinaryConfigurado } = require('../config/cloudinary');

// Obtener el middleware de subida dinámico desde el nuevo archivo
const { getUploadMiddleware } = require('../middleware/upload');

if (cloudinaryConfigurado()) {
  console.log('☁️  Cloudinary configurado - imágenes se guardarán en la nube');
} else {
  console.log('💾 Usando almacenamiento local (configura Cloudinary en .env)');
}

// Subir imagen para una promoción
router.post('/api/restaurants/my-restaurant/promotions/upload-image', verificarToken, (req, res, next) => {
  const { getUploadMiddleware } = require('../middleware/upload');
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.single('imagen')(req, res, (err) => {
    if (err) {
      console.error('Error subiendo imagen de promoción:', err);
      return res.status(400).json({ success: false, message: 'Error subiendo la imagen' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió ninguna imagen' });
    }

    const { cloudinaryConfigurado } = require('../config/cloudinary');
    let imageUrl;
    if (cloudinaryConfigurado()) {
      imageUrl = req.file.path; // Cloudinary URL
    } else {
      imageUrl = '/uploads/restaurants/' + req.file.filename;
    }

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error subiendo imagen de promoción:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Actualizar todo el restaurante (opción completa)
router.patch('/api/restaurants/my-restaurant', verificarToken, async (req, res) => {
  try {
    const updateData = req.body;
    
    // Campos permitidos para actualizar
    const allowedUpdates = [
      'nombre', 'descripcion', 'telefono', 'email', 'direccion', 
      'horarios', 'menu', 'redes'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });
    
    // Agregar fecha de actualización
    updates.fechaActualizacion = new Date();
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin._id, activo: true },
      updates,
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Restaurante actualizado completamente:', restaurant.nombre);
    
    // Notificar actualización via WebSocket si está disponible
    if (global.wsServer) {
      global.wsServer.notifyUpdatedRestaurant(restaurant, { tipo: 'actualización completa' });
    }
    
    res.json({
      success: true,
      message: 'Establecimiento actualizado exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando restaurante:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
});

// 📤 Subir imagen para un platillo del menú
router.post('/api/restaurants/menu/:categoryId/item/:itemId/image', verificarToken, (req, res, next) => {
  const middlewareUpload = getUploadMiddleware();
  middlewareUpload.single('image')(req, res, next);
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se envió ninguna imagen' });
    }

    const { categoryId, itemId } = req.params;
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });

    if (!restaurant) {
      if (!cloudinaryConfigurado() && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'No se encontró el restaurante' });
    }

    // Buscar categoría y platillo
    const categoria = restaurant.menu.id(categoryId);
    if (!categoria) {
      if (!cloudinaryConfigurado() && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    const platillo = categoria.items.id(itemId);
    if (!platillo) {
      if (!cloudinaryConfigurado() && req.file.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Platillo no encontrado' });
    }

    // Preparar objeto de imagen
    const nuevaImagen = cloudinaryConfigurado() 
      ? {
          filename: req.file.filename,
          url: req.file.path,
          cloudinaryId: req.file.filename,
          size: req.file.size || 0,
          uploadDate: new Date()
        }
      : {
          filename: req.file.filename,
          url: `/uploads/restaurants/${req.file.filename}`,
          path: req.file.path,
          size: req.file.size,
          uploadDate: new Date()
        };

    // Eliminar imagen anterior si existe
    if (platillo.imagen) {
      if (cloudinaryConfigurado() && platillo.imagen.cloudinaryId) {
        try { await eliminarImagenCloudinary(platillo.imagen.cloudinaryId); } catch(e) {}
      } else if (!cloudinaryConfigurado() && platillo.imagen.path && fs.existsSync(platillo.imagen.path)) {
        fs.unlinkSync(platillo.imagen.path);
      }
    }

    platillo.imagen = nuevaImagen;
    restaurant.fechaActualizacion = new Date();
    await restaurant.save({ validateModifiedOnly: true });

    res.json({
      success: true,
      message: 'Imagen del platillo actualizada exitosamente',
      data: { imagen: nuevaImagen }
    });

  } catch (error) {
    console.error('❌ Error subiendo imagen de platillo:', error);
    if (!cloudinaryConfigurado() && req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ success: false, message: 'Error al subir la imagen' });
  }
});

// 🔄 Reordenar imágenes (arrastrar y soltar)
router.patch('/api/restaurants/images/reorder', verificarToken, async (req, res) => {
  try {
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de imageIds'
      });
    }

    const restaurant = await Restaurant.findOne({
      adminId: req.admin._id,
      activo: true
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró restaurante asociado'
      });
    }

    if (!restaurant.imagenes || restaurant.imagenes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay imágenes disponibles'
      });
    }

    // Mapear por id
    const imageMap = new Map();
    restaurant.imagenes.forEach(img => imageMap.set(img._id.toString(), img));

    // Construir nuevo arreglo en el orden solicitado
    const reordered = [];
    const seen = new Set();
    for (const id of imageIds) {
      const key = String(id);
      const img = imageMap.get(key);
      if (img && !seen.has(key)) {
        reordered.push(img);
        seen.add(key);
      }
    }

    // Agregar cualquier imagen faltante al final (seguridad)
    restaurant.imagenes.forEach(img => {
      const key = img._id.toString();
      if (!seen.has(key)) reordered.push(img);
    });

    restaurant.imagenes = reordered;
    restaurant.fechaActualizacion = new Date();
    await restaurant.save();

    console.log(`✅ Orden de imágenes actualizado para ${restaurant.nombre} (${reordered.length} imágenes)`);

    res.json({
      success: true,
      message: 'Orden de imágenes actualizado',
      data: {
        totalImagenes: restaurant.imagenes.length,
        imagenPrincipal: restaurant.imagenes[0]
      }
    });

  } catch (error) {
    console.error('❌ Error reordenando imágenes:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al reordenar imágenes',
      error: error.message
    });
  }
});

// 🌐 Obtener imagen principal (ruta pública)
router.get('/api/restaurants/:id/main-image', async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      activo: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const mainImage = restaurant.imagenes && restaurant.imagenes.length > 0 
      ? restaurant.imagenes[0] 
      : null;

    res.json({
      success: true,
      data: {
        mainImage: mainImage ? {
          url: mainImage.url,
          filename: mainImage.filename,
          size: mainImage.size
        } : null,
        totalImages: restaurant.imagenes ? restaurant.imagenes.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo imagen principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// Obtener eventos de MI restaurante (admin)
router.get('/api/restaurants/my-restaurant/eventos', verificarToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }
    const eventos = await Evento.find({ restaurantId: restaurant._id }).sort({ fecha: -1 });
    res.json({ success: true, data: eventos });
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Crear evento (admin)
router.post('/api/restaurants/my-restaurant/eventos', verificarToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }
    const { titulo, descripcion, tipo, fecha, horaInicio, horaFin, recurrente, diasRecurrencia } = req.body;
    if (!titulo || !descripcion || !fecha || !horaInicio) {
      return res.status(400).json({ success: false, message: 'Título, descripción, fecha y hora de inicio son obligatorios' });
    }
    const evento = await Evento.create({
      restaurantId: restaurant._id,
      adminId: req.admin._id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo: tipo || 'especial',
      fecha: new Date(fecha),
      horaInicio,
      horaFin: horaFin || '',
      recurrente: recurrente || false,
      diasRecurrencia: diasRecurrencia || []
    });
    res.status(201).json({ success: true, message: 'Evento creado exitosamente', data: evento });
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Actualizar evento (admin)
router.patch('/api/restaurants/my-restaurant/eventos/:eventoId', verificarToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }
    const evento = await Evento.findOneAndUpdate(
      { _id: req.params.eventoId, restaurantId: restaurant._id },
      { ...req.body, fechaActualizacion: new Date() },
      { new: true, runValidators: true }
    );
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    res.json({ success: true, message: 'Evento actualizado', data: evento });
  } catch (error) {
    console.error('Error actualizando evento:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Eliminar evento (admin)
router.delete('/api/restaurants/my-restaurant/eventos/:eventoId', verificarToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin._id, activo: true });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }
    const evento = await Evento.findOneAndDelete({ _id: req.params.eventoId, restaurantId: restaurant._id });
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    res.json({ success: true, message: 'Evento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Obtener eventos de un restaurante (público)
router.get('/api/restaurants/:id/eventos', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const eventos = await Evento.find({
      restaurantId: id,
      activo: true,
      $or: [
        { fecha: { $gte: hoy } },
        { recurrente: true }
      ]
    }).sort({ fecha: 1 }).limit(20);
    res.json({ success: true, data: eventos });
  } catch (error) {
    console.error('Error obteniendo eventos públicos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Obtener todos los eventos próximos (global, para index)
router.get('/api/eventos/proximos', async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = parseInt(req.query.limite) || 10;
    const eventos = await Evento.find({
      activo: true,
      $or: [
        { fecha: { $gte: hoy } },
        { recurrente: true }
      ]
    }).populate('restaurantId', 'nombre tipo imagenes direccion').sort({ fecha: 1 }).limit(limite);
    res.json({ success: true, data: eventos });
  } catch (error) {
    console.error('Error obteniendo eventos próximos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ===== PERFIL DEL ADMINISTRADOR =====
router.get('/api/admin/profile', verificarToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        admin: {
          id: req.admin._id,
          nombre: req.admin.nombre,
          apellido: req.admin.apellido,
          email: req.admin.email,
          telefono: req.admin.telefono,
          rol: req.admin.rol
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo perfil'
    });
  }
});

router.get('/api/admin/my-restaurants', verificarToken, async (req, res) => {
  try {
    const restaurantes = await Restaurant.find({ adminId: req.admin._id })
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      message: 'Mis restaurantes obtenidos exitosamente',
      data: {
        restaurantes,
        total: restaurantes.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo mis restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
