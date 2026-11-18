const Airbnb = require('../models/Airbnb');
const Review = require('../models/Review');

// Obtener todos los alojamientos (público + super admin ve TODO)
exports.getAllAirbnb = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve todos, otros solo activos con filtros
    let filters = { activo: true }; // Por defecto solo activos

    // Si es super admin, mostrar TODOS los alojamientos (activos e inactivos)
    if (req.user && (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin)) {
      filters = {}; // Sin filtros = mostrar TODO
    } else {
      // Aplicar filtros normales solo para usuarios no super admin
      // Filtro por ciudad
      if (req.query.ciudad) {
        filters['ubicacion.ciudad'] = new RegExp(req.query.ciudad, 'i');
      }

      // Filtro por precio
      if (req.query.precioMin) {
        filters.precioPorNoche = { ...filters.precioPorNoche, $gte: req.query.precioMin };
      }
      if (req.query.precioMax) {
        filters.precioPorNoche = { ...filters.precioPorNoche, $lte: req.query.precioMax };
      }

      // Filtro por huéspedes
      if (req.query.huespedes) {
        filters['capacidad.huespedes'] = { $gte: req.query.huespedes };
      }

      // Filtro por tipo de propiedad
      if (req.query.tipo) {
        filters.tipoPropiedad = req.query.tipo;
      }
    }

    const alojamientos = await Airbnb.find(filters)
      .populate('propietario', 'nombre email createdAt updatedAt') // Más info para super admin
      .sort({ 'calificacion.promedio': -1, updatedAt: -1 }); // Ordenar por última modificación

    const formattedAlojamientos = alojamientos.map(alojamiento => {
      const obj = alojamiento.toObject();
      if (obj.ubicacion && obj.ubicacion.coordenadas) {
        obj.ubicacion.lat = obj.ubicacion.coordenadas.latitud;
        obj.ubicacion.lng = obj.ubicacion.coordenadas.longitud;
      }
      return obj;
    });

    res.status(200).json({
      status: 'success',
      results: formattedAlojamientos.length,
      data: {
        alojamientos: formattedAlojamientos
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener un alojamiento por ID (público)
exports.getAirbnb = async (req, res) => {
  try {
    const alojamiento = await Airbnb.findById(req.params.id)
      .populate('propietario', 'nombre email contacto');

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró el alojamiento'
      });
    }

    const obj = alojamiento.toObject();
    if (obj.ubicacion && obj.ubicacion.coordenadas) {
      obj.ubicacion.lat = obj.ubicacion.coordenadas.latitud;
      obj.ubicacion.lng = obj.ubicacion.coordenadas.longitud;
    }

    res.status(200).json({
      status: 'success',
      data: {
        alojamiento: obj
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Crear nuevo alojamiento (solo administradores)
exports.createAirbnb = async (req, res) => {
  try {
    req.body.propietario = req.user.id;
    const newAlojamiento = await Airbnb.create(req.body);

    const obj = newAlojamiento.toObject();
    if (obj.ubicacion && obj.ubicacion.coordenadas) {
      obj.ubicacion.lat = obj.ubicacion.coordenadas.latitud;
      obj.ubicacion.lng = obj.ubicacion.coordenadas.longitud;
    }

    res.status(201).json({
      status: 'success',
      data: {
        alojamiento: obj
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener alojamientos del usuario autenticado
exports.getMisAirbnb = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve TODOS los alojamientos, no solo los suyos
    let query = { propietario: req.user.id }; // Por defecto solo los del usuario

    if (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin) {
      query = {}; // Super admin ve TODOS
    }

    const alojamientos = await Airbnb.find(query)
      .populate('propietario', 'nombre email updatedAt') // Info del propietario para super admin
      .sort({ createdAt: -1 });

    const formattedAlojamientos = alojamientos.map(alojamiento => {
      const obj = alojamiento.toObject();
      if (obj.ubicacion && obj.ubicacion.coordenadas) {
        obj.ubicacion.lat = obj.ubicacion.coordenadas.latitud;
        obj.ubicacion.lng = obj.ubicacion.coordenadas.longitud;
      }
      return obj;
    });

    res.status(200).json({
      status: 'success',
      results: formattedAlojamientos.length,
      data: {
        alojamientos: formattedAlojamientos
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ✅ ACTUALIZAR ALOJAMIENTO - CORREGIDO (como hoteles que funciona)
exports.updateAirbnb = async (req, res) => {
  try {
    console.log('🏠 === INICIO ACTUALIZACIÓN AIRBNB ===');
    console.log('🆔 Alojamiento ID:', req.params.id);
    console.log('👤 Usuario:', req.user.email);
    console.log('📝 Campos recibidos:', Object.keys(req.body));

    const alojamiento = await Airbnb.findById(req.params.id);

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró el alojamiento'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede editar cualquier alojamiento
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;

    if (!isSuperAdmin && alojamiento.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para actualizar este alojamiento'
      });
    }

    // ✅ PREPARAR DATOS PARA ACTUALIZAR (igual que hoteles)
    const updateData = { ...req.body };

    // 🔧 MAPEAR PRECIO A PRECIEPORNOCHE (diferencia con hoteles/cabañas)
    if (updateData.precio) {
      updateData.precioPorNoche = updateData.precio;
      delete updateData.precio; // Eliminar el campo precio original
      console.log(`🔄 Mapeado precio -> precioPorNoche: ${updateData.precioPorNoche}`);
    }

    // ✅ PARSEAR OBJETOS JSON (desde FormData) - LISTA COMPLETA
    const fieldsToParseAsJSON = [
      'ubicacion',
      'contacto',
      'capacidad',
      'caracteristicas',
      'servicios',
      'metodosPago',
      'politicas',
      'instalaciones',
      'accesibilidad',
      'distancias',
      'reservaciones',
      'comodidadesExtra',
      'promociones'
    ];

    fieldsToParseAsJSON.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
          console.log(`✅ Parseado ${field}:`, updateData[field]);
        } catch (e) {
          console.log(`⚠️ No se pudo parsear ${field}:`, e.message);
        }
      }
    });

    // 🔥 AGREGAR: Información de auditoría para el historial
    updateData.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      camposModificados: Object.keys(updateData)
    };

    console.log('📋 Campos finales para actualizar:', Object.keys(updateData));
    console.log('📊 Datos estructurados:', {
      nombre: updateData.nombre ? '✅' : '❌',
      descripcion: updateData.descripcion ? '✅' : '❌',
      precioPorNoche: updateData.precioPorNoche ? '✅' : '❌',
      ubicacion: updateData.ubicacion ? '✅' : '❌',
      instalaciones: updateData.instalaciones !== undefined ? updateData.instalaciones : alojamiento.instalaciones,
      accesibilidad: updateData.accesibilidad !== undefined ? updateData.accesibilidad : alojamiento.accesibilidad,
      distancias: updateData.distancias !== undefined ? updateData.distancias : alojamiento.distancias,
      comodidadesExtra: updateData.comodidadesExtra !== undefined ? updateData.comodidadesExtra : alojamiento.comodidadesExtra,
      reservaciones: updateData.reservaciones !== undefined ? updateData.reservaciones : alojamiento.reservaciones
    });

    // ✅ ACTUALIZAR EN BASE DE DATOS con datos procesados
    const updatedAlojamiento = await Airbnb.findByIdAndUpdate(
      req.params.id,
      updateData, // ✅ Ahora usa updateData procesado en lugar de req.body
      {
        new: true,
        runValidators: true
      }
    );

    // 🆕 REGISTRAR HISTORIAL DE ACTUALIZACIÓN
    try {
      const UpdateHistory = require('../models/UpdateHistory');
      await UpdateHistory.create({
        hospedajeId: updatedAlojamiento._id,
        nombreHospedaje: updatedAlojamiento.nombre,
        tipoHospedaje: 'airbnb',
        usuarioId: req.user.id,
        nombreUsuario: req.user.nombre || req.user.email || 'Admin',
        camposModificados: Object.keys(updateData).filter(key => key !== 'ultimaModificacion')
      });
      console.log('✅ Historial de actualización guardado');
    } catch (historyError) {
      console.error('⚠️ Error guardando historial de actualización:', historyError.message);
    }

    const obj = updatedAlojamiento.toObject();
    if (obj.ubicacion && obj.ubicacion.coordenadas) {
      obj.ubicacion.lat = obj.ubicacion.coordenadas.latitud;
      obj.ubicacion.lng = obj.ubicacion.coordenadas.longitud;
    }

    // ✅ RESPUESTA EXITOSA
    res.status(200).json({
      status: 'success',
      message: 'Alojamiento actualizado exitosamente',
      data: {
        alojamiento: obj
      },
      updateSummary: {
        fieldsUpdated: Object.keys(updateData).filter(key => !key.startsWith('imagen')).length,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ === ALOJAMIENTO ACTUALIZADO EXITOSAMENTE ===');

  } catch (error) {
    console.error('❌ === ERROR EN ACTUALIZACIÓN ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Eliminar alojamiento
exports.deleteAirbnb = async (req, res) => {
  try {
    const alojamiento = await Airbnb.findById(req.params.id);

    if (!alojamiento) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró el alojamiento'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede eliminar cualquier alojamiento
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;

    if (!isSuperAdmin && alojamiento.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar este alojamiento'
      });
    }

    // Soft delete (marcar como inactivo)
    alojamiento.activo = false;
    await alojamiento.save();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Agregar reseña a un airbnb
exports.createReview = async (req, res) => {
  try {
    const airbnbId = req.params.id;
    const airbnb = await Airbnb.findById(airbnbId);

    if (!airbnb) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró el alojamiento'
      });
    }

    const { rating, comentario } = req.body;

    // Verificar si el usuario ya dejó una reseña (opcional)
    const alreadyReviewed = airbnb.reviews && airbnb.reviews.find(
      (r) => r.user.toString() === req.user.id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya has enviado una reseña para este alojamiento'
      });
    }

    const review = {
      user: req.user.id,
      nombreUsuario: req.user.nombre,
      rating: Number(rating),
      comentario
    };

    if (!airbnb.reviews) airbnb.reviews = [];
    airbnb.reviews.push(review);

    // Recalcular promedio
    airbnb.calificacion.totalReviews = airbnb.reviews.length;

    const sum = airbnb.reviews.reduce((acc, item) => acc + item.rating, 0);
    // Redondear a 1 decimal
    airbnb.calificacion.promedio = Math.round((sum / airbnb.reviews.length) * 10) / 10;

    await airbnb.save();

    // 📝 También guardar en la colección separada 'reviews'
    try {
      await Review.create({
        userId: req.user.id,
        nombreUsuario: req.user.nombre,
        hospedajeId: airbnbId,
        tipoHospedaje: 'airbnb',
        nombreHospedaje: airbnb.nombre,
        rating: Number(rating),
        comentario
      });
      console.log('✅ Reseña guardada en colección reviews');
    } catch (reviewErr) {
      console.error('⚠️ Error guardando en colección reviews:', reviewErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Reseña agregada exitosamente',
      data: {
        review,
        calificacion: airbnb.calificacion
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};