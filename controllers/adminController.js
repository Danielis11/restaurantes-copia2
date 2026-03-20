const Restaurant = require('../models/Restaurant');
const Admin = require('../models/Admin');
const { translateText } = require('../utils/translator');

// @desc    Obtener estadísticas del dashboard
// @route   GET /api/admin/dashboard
// @access  Privado
const obtenerDashboard = async (req, res) => {
  try {
    // Obtener estadísticas reales
    const totalRestaurantes = await Restaurant.countDocuments({ adminId: req.admin.id });
    const restaurantesActivos = await Restaurant.countDocuments({ adminId: req.admin.id, activo: true });
    const restaurantesInactivos = await Restaurant.countDocuments({ adminId: req.admin.id, activo: false });

    res.json({
      success: true,
      message: 'Dashboard cargado exitosamente',
      data: {
        resumen: {
          totalRestaurantes,
          restaurantesActivos,
          restaurantesInactivos
        },
        admin: {
          id: req.admin.id,
          nombre: req.admin.nombre,
          apellido: req.admin.apellido,
          email: req.admin.email,
          rol: req.admin.rol
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener MI restaurante (individual)
// @route   GET /api/admin/my-restaurant
// @access  Privado
const obtenerMiRestaurante = async (req, res) => {
  try {
    console.log('🔍 Buscando restaurante para admin:', req.admin.id);
    
    const restaurant = await Restaurant.findOne({ 
      adminId: req.admin.id, 
      activo: true 
    }).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró establecimiento asociado a este administrador'
      });
    }
    
    console.log('✅ Restaurante encontrado:', restaurant.nombre);
    
    res.json({
      success: true,
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener establecimiento',
      error: error.message
    });
  }
};

// @desc    Obtener mis restaurantes (lista)
// @route   GET /api/admin/restaurants
// @access  Privado
const obtenerMisRestaurantes = async (req, res) => {
  try {
    const restaurantes = await Restaurant.find({ adminId: req.admin.id })
      .populate('adminId', 'nombre apellido email')
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
};

// @desc    Actualizar información básica de MI restaurante
// @route   PATCH /api/admin/my-restaurant/basic-info
// @access  Privado
const actualizarInformacionBasica = async (req, res) => {
  try {
    const { nombre, descripcion, telefono, email, tipoComida, opcionesPago, precioPromedio, whatsappPedidos } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !descripcion || !telefono || !email) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Traducir descripción al inglés
    const descripcionEn = await translateText(descripcion, 'EN-US');
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        nombre: nombre.trim(),
        descripcion: {
          es: descripcion.trim(),
          en: descripcionEn.trim()
        },
        telefono: telefono.trim(),
        email: email.toLowerCase().trim(),
        whatsappPedidos: whatsappPedidos ? whatsappPedidos.trim() : null,
        tipoComida: tipoComida ? tipoComida.trim() : '',
        opcionesPago: opcionesPago || { efectivo: true, tarjeta: false, transferencia: false },
        precioPromedio: precioPromedio || 0,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Información básica actualizada:', restaurant.nombre);
    
    res.json({
      success: true,
      message: 'Información básica actualizada exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando información básica:', error);
    
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
};

// @desc    Actualizar dirección de MI restaurante
// @route   PATCH /api/admin/my-restaurant/address
// @access  Privado
const actualizarDireccion = async (req, res) => {
  try {
    const { direccion } = req.body;
    
    if (!direccion || !direccion.calle || !direccion.ciudad || !direccion.codigoPostal) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de dirección son requeridos'
      });
    }

    if (direccion.lat !== undefined && direccion.lng !== undefined) {
      direccionToUpdate.coordenadas = {
        lat: parseFloat(direccion.lat),
        lng: parseFloat(direccion.lng)
      };
    }
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        direccion: direccionToUpdate,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Dirección actualizada:', restaurant.nombre);
    
    res.json({
      success: true,
      message: 'Dirección actualizada exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando dirección:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
};

// @desc    Actualizar horarios de MI restaurante
// @route   PATCH /api/admin/my-restaurant/schedule
// @access  Privado
const actualizarHorarios = async (req, res) => {
  try {
    const { horarios } = req.body;
    
    if (!horarios) {
      return res.status(400).json({
        success: false,
        message: 'Los horarios son requeridos'
      });
    }
    
    // Validar estructura de horarios
    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const horariosValidos = {};
    
    diasValidos.forEach(dia => {
      if (horarios[dia]) {
        horariosValidos[dia] = {
          abierto: horarios[dia].abierto !== undefined ? Boolean(horarios[dia].abierto) : false,
          apertura: horarios[dia].apertura || '',
          cierre: horarios[dia].cierre || ''
        };
      }
    });
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        horarios: horariosValidos,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Horarios actualizados:', restaurant.nombre);
    
    res.json({
      success: true,
      message: 'Horarios actualizados exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando horarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
};

// @desc    Actualizar menú de MI restaurante
// @route   PATCH /api/admin/my-restaurant/menu
// @access  Privado
const actualizarMenu = async (req, res) => {
  try {
    const { menu } = req.body;
    
    if (!menu || !Array.isArray(menu)) {
      return res.status(400).json({
        success: false,
        message: 'El menú debe ser un array válido'
      });
    }
    
    // Validar y traducir estructura del menú
    const translatedMenu = [];
    for (const categoria of menu) {
      if (!categoria.categoria || !categoria.items || !Array.isArray(categoria.items)) {
        return res.status(400).json({
          success: false,
          message: 'Estructura de menú inválida'
        });
      }
      
      const categoriaEn = await translateText(categoria.categoria, 'EN-US');
      const translatedItems = [];

      for (const item of categoria.items) {
        if (!item.nombre || typeof item.precio !== 'number' || item.precio < 0) {
          return res.status(400).json({
            success: false,
            message: 'Cada item del menú debe tener nombre y precio válido'
          });
        }
        
        const nombreEn = await translateText(item.nombre, 'EN-US');
        let descripcionEn = '';
        if (item.descripcion) {
          descripcionEn = await translateText(item.descripcion, 'EN-US');
        }
        
        translatedItems.push({
          ...item,
          nombre: { es: item.nombre, en: nombreEn },
          descripcion: { es: item.descripcion || '', en: descripcionEn },
          esEspecialidad: !!item.esEspecialidad
        });
      }
      
      translatedMenu.push({
        ...categoria,
        categoria: { es: categoria.categoria, en: categoriaEn },
        items: translatedItems
      });
    }
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        menu: translatedMenu,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Menú actualizado:', restaurant.nombre);
    
    res.json({
      success: true,
      message: 'Menú actualizado exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando menú:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
};

// @desc    Actualizar redes sociales de MI restaurante
// @route   PATCH /api/admin/my-restaurant/social-media
// @access  Privado
const actualizarRedesSociales = async (req, res) => {
  try {
    const { redes } = req.body;
    
    if (!redes) {
      return res.status(400).json({
        success: false,
        message: 'Los datos de redes sociales son requeridos'
      });
    }
    
    // Validar URLs si se proporcionan
    const redesActualizadas = {};
    
    if (redes.facebook) {
      if (redes.facebook.trim() !== '') {
        try {
          new URL(redes.facebook);
          redesActualizadas.facebook = redes.facebook.trim();
        } catch {
          return res.status(400).json({
            success: false,
            message: 'La URL de Facebook no es válida'
          });
        }
      }
    }
    
    if (redes.website) {
      if (redes.website.trim() !== '') {
        try {
          new URL(redes.website);
          redesActualizadas.website = redes.website.trim();
        } catch {
          return res.status(400).json({
            success: false,
            message: 'La URL del website no es válida'
          });
        }
      }
    }
    
    if (redes.instagram) {
      redesActualizadas.instagram = redes.instagram.trim();
    }
    
    if (redes.twitter) {
      redesActualizadas.twitter = redes.twitter.trim();
    }
    
    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        redes: redesActualizadas,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }
    
    console.log('✅ Redes sociales actualizadas:', restaurant.nombre);
    
    res.json({
      success: true,
      message: 'Redes sociales actualizadas exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('❌ Error actualizando redes sociales:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: error.message
    });
  }
};

// @desc    Crear nuevo restaurante
// @route   POST /api/admin/restaurants
// @access  Privado
const crearRestaurante = async (req, res) => {
  try {
    const { nombre, tipo, descripcion, direccion, telefono, email, horarios, menu, redes } = req.body;

    // Validar campos requeridos
    if (!nombre || !tipo || !descripcion || !direccion || !telefono || !email) {
      return res.status(400).json({
        success: false,
        message: 'Los campos básicos son requeridos'
      });
    }

    // Verificar que el admin no tenga ya un restaurante activo
    const restauranteExistente = await Restaurant.findOne({ 
      adminId: req.admin.id, 
      activo: true 
    });

    if (restauranteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un restaurante activo. Solo puedes tener uno por cuenta.'
      });
    }

    // Create a new direction object properly parsed
    const direccionParseada = {
      calle: direccion.calle,
      ciudad: direccion.ciudad,
      codigoPostal: direccion.codigoPostal
    };
    
    if (direccion.lat !== undefined && direccion.lng !== undefined) {
      direccionParseada.coordenadas = {
        lat: parseFloat(direccion.lat),
        lng: parseFloat(direccion.lng)
      };
    }

    // Crear restaurante
    const restaurant = await Restaurant.create({
      nombre,
      tipo,
      descripcion,
      direccion: direccionParseada,
      telefono,
      email,
      horarios: horarios || {},
      menu: menu || [],
      redes: redes || {},
      adminId: req.admin.id
    });

    const restaurantPopulated = await Restaurant.findById(restaurant._id)
      .populate('adminId', 'nombre apellido email telefono');

    res.status(201).json({
      success: true,
      message: 'Restaurante creado exitosamente',
      data: restaurantPopulated
    });

  } catch (error) {
    console.error('Error creando restaurante:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar restaurante completo
// @route   PUT /api/admin/restaurants/:id
// @access  Privado
const actualizarRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Verificar que el restaurante pertenece al admin
    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      adminId: req.admin.id 
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado o no tienes permisos'
      });
    }
    
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
    
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('adminId', 'nombre apellido email telefono');
    
    res.json({
      success: true,
      message: 'Restaurante actualizado exitosamente',
      data: updatedRestaurant
    });
    
  } catch (error) {
    console.error('Error actualizando restaurante:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Cambiar estado de restaurante
// @route   PATCH /api/admin/restaurants/:id/toggle-status
// @access  Privado
const cambiarEstadoRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el restaurante pertenece al admin
    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      adminId: req.admin.id 
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado o no tienes permisos'
      });
    }
    
    // Cambiar estado
    restaurant.activo = !restaurant.activo;
    restaurant.fechaActualizacion = new Date();
    await restaurant.save();
    
    res.json({
      success: true,
      message: `Restaurante ${restaurant.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: restaurant
    });
    
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar restaurante (desactivar)
// @route   DELETE /api/admin/restaurants/:id
// @access  Privado
const eliminarRestaurante = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el restaurante pertenece al admin
    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      adminId: req.admin.id 
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado o no tienes permisos'
      });
    }
    
    // En lugar de eliminar, desactivar
    restaurant.activo = false;
    restaurant.fechaActualizacion = new Date();
    await restaurant.save();
    
    res.json({
      success: true,
      message: 'Restaurante eliminado exitosamente',
      data: restaurant
    });
    
  } catch (error) {
    console.error('Error eliminando restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar servicios (amenities) de MI restaurante
// @route   PATCH /api/admin/my-restaurant/amenities
// @access  Privado
const actualizarServicios = async (req, res) => {
  try {
    const { servicios } = req.body;

    if (!servicios) {
      return res.status(400).json({
        success: false,
        message: 'Los servicios son requeridos'
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        servicios: {
          petFriendly: !!servicios.petFriendly,
          estacionamiento: !!servicios.estacionamiento,
          musicaEnVivo: !!servicios.musicaEnVivo,
          opcionesVeganas: !!servicios.opcionesVeganas,
          areaInfantil: !!servicios.areaInfantil,
          wifiGratis: !!servicios.wifiGratis
        },
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    res.json({ success: true, message: 'Servicios actualizados exitosamente', data: restaurant });
  } catch (error) {
    console.error('Error actualizando servicios:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// @desc    Actualizar promociones de MI restaurante
// @route   PATCH /api/admin/my-restaurant/promotions
// @access  Privado
const actualizarPromociones = async (req, res) => {
  try {
    const { promociones } = req.body;

    if (!Array.isArray(promociones)) {
      return res.status(400).json({ success: false, message: 'Las promociones deben ser un arreglo' });
    }

    // Traducir promociones y formatear
    const promostraducciones = [];
    for (const p of promociones) {
      if (!p.titulo || !p.descripcion) continue;
      
      const tituloEn = await translateText(p.titulo, 'EN-US');
      const descEn = await translateText(p.descripcion, 'EN-US');

      promostraducciones.push({
        titulo: { es: p.titulo, en: tituloEn },
        descripcion: { es: p.descripcion, en: descEn },
        imagen: p.imagen || '',
        fechaInicio: p.fechaInicio || new Date(),
        fechaFin: p.fechaFin || null,
        activa: p.activa !== undefined ? p.activa : true
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { adminId: req.admin.id, activo: true },
      {
        promociones: promostraducciones,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    res.json({ success: true, message: 'Promociones actualizadas', data: restaurant });
  } catch (error) {
    console.error('Error actualizando promociones:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// @desc    Subir imagen para promoción
// @route   POST /api/admin/my-restaurant/promotions/upload-image
// @access  Privado
const subirImagenPromocion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ninguna imagen' });
    }

    const { cloudinaryConfigurado } = require('../config/cloudinary');
    let imageUrl = '';

    if (cloudinaryConfigurado() && req.file.path) {
      imageUrl = req.file.path;
    } else {
      imageUrl = `/uploads/restaurants/${req.file.filename}`;
    }

    res.json({
      success: true,
      message: 'Imagen subida correctamente',
      imageUrl
    });
  } catch (error) {
    console.error('Error subiendo imagen de promoción:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al subir imagen' });
  }
};

const Review = require('../models/Review');

// @desc    Obtener Reseñas de MI restaurante (Administrador)
// @route   GET /api/admin/my-restaurant/reviews
// @access  Privado
const obtenerResenasAdmin = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin.id, activo: true });
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    const reviews = await Review.find({ restaurantId: restaurant._id })
      .populate('userId', 'nombre apellido avatarUrl')
      .sort({ fechaCreacion: -1 });

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error obteniendo reseñas admin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// @desc    Responder a una Reseña
// @route   PATCH /api/admin/my-restaurant/reviews/:id/reply
// @access  Privado
const responderResena = async (req, res) => {
  try {
    const { respuesta } = req.body;
    const reviewId = req.params.id;

    if (!respuesta || respuesta.trim() === '') {
      return res.status(400).json({ success: false, message: 'La respuesta no puede estar vacía' });
    }

    const restaurant = await Restaurant.findOne({ adminId: req.admin.id, activo: true });
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, restaurantId: restaurant._id },
      {
        respuestaAdmin: respuesta.trim(),
        fechaRespuesta: new Date()
      },
      { new: true }
    ).populate('userId', 'nombre apellido avatarUrl');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Reseña no encontrada o no pertenece a tu restaurante' });
    }

    res.json({ success: true, message: 'Respuesta guardada exitosamente', data: review });
  } catch (error) {
    console.error('Error respondiendo reseña:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// @desc    Obtener analíticas del restaurante
// @route   GET /api/admin/my-restaurant/analytics
// @access  Privado
const obtenerAnaliticasAdmin = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ adminId: req.admin.id, activo: true });
    
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Establecimiento no encontrado' });
    }

    // 1. Obtener estadísticas del mes actual
    const ahora = new Date();
    const mesActualConfig = `${ahora.getFullYear()}-${(ahora.getMonth() + 1).toString().padStart(2, '0')}`;
    const statsMesActual = restaurant.estadisticasMensuales.find(s => s.fecha === mesActualConfig) || {
      vistas: 0,
      clicsWhatsapp: 0,
      clicsMapa: 0
    };

    // 2. Obtener historial de calificaciones por mes
    const reviews = await Review.find({ restaurantId: restaurant._id }).sort({ fechaCreacion: 1 });
    
    // Agrupar por mes
    const ratingPorMesMap = {};
    reviews.forEach(review => {
      const date = new Date(review.fechaCreacion);
      const mes = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!ratingPorMesMap[mes]) {
        ratingPorMesMap[mes] = { suma: 0, cantidad: 0 };
      }
      ratingPorMesMap[mes].suma += review.rating;
      ratingPorMesMap[mes].cantidad += 1;
    });

    const ratingEvolution = Object.keys(ratingPorMesMap).sort().map(mes => ({
      mes,
      promedio: Number((ratingPorMesMap[mes].suma / ratingPorMesMap[mes].cantidad).toFixed(1))
    }));

    res.json({
      success: true,
      data: {
        estadisticasActuales: {
          vistasPerfil: statsMesActual.vistas,
          clicsWhatsapp: statsMesActual.clicsWhatsapp,
          clicsMapa: statsMesActual.clicsMapa
        },
        historicoMensual: restaurant.estadisticasMensuales.sort((a,b) => a.fecha.localeCompare(b.fecha)),
        evolucionCalificacion: ratingEvolution,
        estadisticasGlobales: restaurant.estadisticas
      }
    });

  } catch (error) {
    console.error('Error obteniendo analíticas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// IMPORTANTE: Exportar todas las funciones
module.exports = {
  obtenerDashboard,
  obtenerMiRestaurante,
  obtenerMisRestaurantes,
  crearRestaurante,
  actualizarRestaurante,
  actualizarMenu,
  actualizarInformacionBasica,
  actualizarDireccion,
  actualizarHorarios,
  actualizarRedesSociales,
  actualizarServicios,
  actualizarPromociones,
  subirImagenPromocion,
  obtenerResenasAdmin,
  responderResena,
  cambiarEstadoRestaurante,
  eliminarRestaurante,
  obtenerAnaliticasAdmin
};