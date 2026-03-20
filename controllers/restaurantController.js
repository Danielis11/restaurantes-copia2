// ===== CONTROLLERS/restaurantController.js =====
const Restaurant = require('../models/Restaurant');

// Función helper para mes actual (formato YYYY-MM)
const obtenerMesActual = () => {
  const ahora = new Date();
  const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}`;
};

// @desc    Obtener todos los restaurantes (público) con filtros y paginación
// @route   GET /api/restaurants
// @access  Público
const obtenerRestaurantes = async (req, res) => {
  try {
    const { 
      pagina = 1, 
      limite = 100, 
      tipo, 
      ciudad, 
      buscar,
      ordenar = 'fechaCreacion',
      direccion = 'desc',
      compact
    } = req.query;

    // Construir filtros
    const filtros = { activo: true };
    
    if (tipo && ['restaurante', 'bar', 'cafeteria', 'comida-rapida', 'panaderia', 'obrador-artesanal', 'otro'].includes(tipo)) {
      filtros.tipo = tipo;
    }
    
    if (ciudad) {
      filtros['direccion.ciudad'] = { $regex: ciudad, $options: 'i' };
    }
    
    if (buscar) {
      filtros.$or = [
        { nombre: { $regex: buscar, $options: 'i' } },
        { 'descripcion.es': { $regex: buscar, $options: 'i' } },
        { 'descripcion.en': { $regex: buscar, $options: 'i' } }
      ];
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[ordenar] = direccion === 'desc' ? -1 : 1;

    // Calcular skip
    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const ts1 = Date.now();
    
    let dbQuery = Restaurant.find(filtros)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limite))
      .lean(); // Mejor performance
      
    if (compact === 'true') {
      dbQuery = dbQuery.select('nombre tipo direccion.coordenadas direccion.calle googleRating googleTotalReviews imagenes _id');
    } else {
      dbQuery = dbQuery.populate('adminId', 'nombre apellido email telefono');
    }

    // Ejecutar consultas en paralelo
    const [restaurantes, total] = await Promise.all([
      dbQuery,
      Restaurant.countDocuments(filtros)
    ]);
    const ts2 = Date.now();

    const totalPaginas = Math.ceil(total / parseInt(limite));

    res.json({
      success: true,
      message: 'Restaurantes obtenidos exitosamente',
      data: {
        restaurantes: restaurantes.map(restaurant => {
          if (compact === 'true') {
            return {
              id: restaurant._id,
              nombre: restaurant.nombre,
              tipo: restaurant.tipo,
              direccion: restaurant.direccion,
              googleRating: restaurant.googleRating,
              googleTotalReviews: restaurant.googleTotalReviews,
              imagenPrincipal: restaurant.imagenes && restaurant.imagenes.length > 0 ? restaurant.imagenes[0] : null
            };
          }
          return {
            id: restaurant._id,
            nombre: restaurant.nombre,
            tipo: restaurant.tipo,
            descripcion: restaurant.descripcion,
            direccion: restaurant.direccion,
            telefono: restaurant.telefono,
            email: restaurant.email,
            horarios: restaurant.horarios,
            imagenPrincipal: restaurant.imagenes && restaurant.imagenes.length > 0 ? restaurant.imagenes[0] : null,
            redes: restaurant.redes,
            admin: restaurant.adminId,
            fechaCreacion: restaurant.fechaCreacion,
            fechaActualizacion: restaurant.fechaActualizacion
          };
        }),
        pagination: {
          total,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas,
          hasNext: parseInt(pagina) < totalPaginas,
          hasPrev: parseInt(pagina) > 1
        },
        filtros: {
          tipo,
          ciudad,
          buscar,
          ordenar,
          direccion
        },
        debugTime: { dbQuery: ts2 - ts1, total: Date.now() - ts1 }
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Obtener restaurante por ID con información completa
// @route   GET /api/restaurants/:id
// @access  Público
const obtenerRestaurantePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ 
      _id: id, 
      activo: true 
    }).populate('adminId', 'nombre apellido email telefono').lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Restaurante obtenido exitosamente',
      data: {
        restaurant: {
          id: restaurant._id,
          nombre: restaurant.nombre,
          tipo: restaurant.tipo,
          tipoComida: restaurant.tipoComida,
          descripcion: restaurant.descripcion,
          direccion: restaurant.direccion,
          telefono: restaurant.telefono,
          email: restaurant.email,
          whatsappPedidos: restaurant.whatsappPedidos,
          horarios: restaurant.horarios,
          menu: restaurant.menu,
          imagenes: restaurant.imagenes,
          redes: restaurant.redes,
          servicios: restaurant.servicios,
          promociones: restaurant.promociones,
          opcionesPago: restaurant.opcionesPago,
          precioPromedio: restaurant.precioPromedio,
          activo: restaurant.activo,
          admin: restaurant.adminId,
          estadisticas: restaurant.estadisticas,
          fechaCreacion: restaurant.fechaCreacion,
          fechaActualizacion: restaurant.fechaActualizacion
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener restaurantes por tipo
// @route   GET /api/restaurants/tipo/:tipo
// @access  Público
const obtenerRestaurantesPorTipo = async (req, res) => {
  try {
    const { tipo } = req.params;
    const { pagina = 1, limite = 100 } = req.query;

    if (!['restaurante', 'bar', 'cafeteria', 'comida-rapida', 'panaderia', 'obrador-artesanal', 'otro'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de establecimiento no válido'
      });
    }

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const [restaurantes, total] = await Promise.all([
      Restaurant.find({ tipo, activo: true })
        .populate('adminId', 'nombre apellido')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(parseInt(limite))
        .lean(),
      Restaurant.countDocuments({ tipo, activo: true })
    ]);

    const totalPaginas = Math.ceil(total / parseInt(limite));

    res.json({
      success: true,
      message: `Restaurantes de tipo: ${tipo}`,
      data: {
        tipo,
        restaurantes,
        pagination: {
          total,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas,
          hasNext: parseInt(pagina) < totalPaginas,
          hasPrev: parseInt(pagina) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurantes por tipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Buscar restaurantes
// @route   GET /api/restaurants/search/:termino
// @access  Público
const buscarRestaurantes = async (req, res) => {
  try {
    const { termino } = req.params;
    const { pagina = 1, limite = 100, tipo, ciudad } = req.query;

    if (!termino || termino.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Término de búsqueda requerido'
      });
    }

    // Construir filtros de búsqueda
    const filtros = {
      activo: true,
      $or: [
        { nombre: { $regex: termino, $options: 'i' } },
        { descripcion: { $regex: termino, $options: 'i' } },
        { 'direccion.ciudad': { $regex: termino, $options: 'i' } }
      ]
    };

    if (tipo) filtros.tipo = tipo;
    if (ciudad) filtros['direccion.ciudad'] = { $regex: ciudad, $options: 'i' };

    const skip = (parseInt(pagina) - 1) * parseInt(limite);

    const [restaurantes, total] = await Promise.all([
      Restaurant.find(filtros)
        .populate('adminId', 'nombre apellido')
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(parseInt(limite))
        .lean(),
      Restaurant.countDocuments(filtros)
    ]);

    const totalPaginas = Math.ceil(total / parseInt(limite));

    res.json({
      success: true,
      message: `Búsqueda: "${termino}" - ${total} resultados`,
      data: {
        termino,
        restaurantes,
        pagination: {
          total,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas,
          hasNext: parseInt(pagina) < totalPaginas,
          hasPrev: parseInt(pagina) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error buscando restaurantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas públicas
// @route   GET /api/restaurants/stats
// @access  Público
const obtenerEstadisticas = async (req, res) => {
  try {
    const estadisticas = await Restaurant.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: null,
          totalRestaurantes: { $sum: 1 },
          tipoRestaurante: {
            $sum: { $cond: [{ $eq: ['$tipo', 'restaurante'] }, 1, 0] }
          },
          tipoBares: {
            $sum: { $cond: [{ $eq: ['$tipo', 'bar'] }, 1, 0] }
          },
          tipoCafeterias: {
            $sum: { $cond: [{ $eq: ['$tipo', 'cafeteria'] }, 1, 0] }
          }
        }
      }
    ]);

    const ciudades = await Restaurant.aggregate([
      { $match: { activo: true } },
      { $group: { _id: '$direccion.ciudad', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recientes = await Restaurant.find({ activo: true })
      .sort({ fechaCreacion: -1 })
      .limit(5)
      .select('nombre tipo direccion.ciudad fechaCreacion')
      .lean();

    res.json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: {
        general: estadisticas[0] || {
          totalRestaurantes: 0,
          tipoRestaurante: 0,
          tipoBares: 0,
          tipoCafeterias: 0
        },
        ciudadesPopulares: ciudades,
        recientes
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener restaurantes recientes (últimos 24h)
// @route   GET /api/restaurants/recent
// @access  Público
const obtenerRestaurantesRecientes = async (req, res) => {
  try {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const restaurantesRecientes = await Restaurant.find({
      activo: true,
      fechaCreacion: { $gte: hace24h }
    })
    .populate('adminId', 'nombre apellido')
    .sort({ fechaCreacion: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      message: 'Restaurantes recientes obtenidos',
      data: {
        restaurantes: restaurantesRecientes,
        total: restaurantesRecientes.length,
        periodo: '24 horas'
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurantes recientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener restaurantes actualizados recientemente
// @route   GET /api/restaurants/updated
// @access  Público
const obtenerRestaurantesActualizados = async (req, res) => {
  try {
    const hace1h = new Date(Date.now() - 60 * 60 * 1000);
    
    const restaurantesActualizados = await Restaurant.find({
      activo: true,
      fechaActualizacion: { $gte: hace1h },
      fechaCreacion: { $lt: hace1h } // Excluir los recién creados
    })
    .populate('adminId', 'nombre apellido')
    .sort({ fechaActualizacion: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      message: 'Restaurantes actualizados obtenidos',
      data: {
        restaurantes: restaurantesActualizados,
        total: restaurantesActualizados.length,
        periodo: '1 hora'
      }
    });

  } catch (error) {
    console.error('Error obteniendo restaurantes actualizados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Incrementar vistas del perfil
// @route   POST /api/restaurants/:id/view
// @access  Público
const incrementarVistas = async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurantExists = await Restaurant.exists({ _id: id, activo: true });

    if (!restaurantExists) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const mesActual = obtenerMesActual();
    
    const result = await Restaurant.updateOne(
      { _id: id, "estadisticasMensuales.fecha": mesActual },
      { 
        $inc: { 
          "estadisticas.vistasPerfil": 1,
          "estadisticasMensuales.$.vistas": 1
        }
      }
    );

    if (result.modifiedCount === 0) {
      await Restaurant.updateOne(
        { _id: id },
        {
          $inc: { "estadisticas.vistasPerfil": 1 },
          $push: {
            estadisticasMensuales: {
              fecha: mesActual,
              vistas: 1,
              clicsMapa: 0,
              clicsWhatsapp: 0
            }
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Vista registrada exitosamente'
    });

  } catch (error) {
    console.error('Error incrementando vistas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Incrementar clics al mapa
// @route   POST /api/restaurants/:id/click-map
// @access  Público
const incrementarClicsMapa = async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurantExists = await Restaurant.exists({ _id: id, activo: true });

    if (!restaurantExists) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const mesActual = obtenerMesActual();
    
    const result = await Restaurant.updateOne(
      { _id: id, "estadisticasMensuales.fecha": mesActual },
      { 
        $inc: { 
          "estadisticas.clicsMapa": 1,
          "estadisticasMensuales.$.clicsMapa": 1
        }
      }
    );

    if (result.modifiedCount === 0) {
      await Restaurant.updateOne(
        { _id: id },
        {
          $inc: { "estadisticas.clicsMapa": 1 },
          $push: {
            estadisticasMensuales: {
              fecha: mesActual,
              vistas: 0,
              clicsMapa: 1,
              clicsWhatsapp: 0
            }
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Clic al mapa registrado exitosamente'
    });

  } catch (error) {
    console.error('Error incrementando clics al mapa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Incrementar clics a WhatsApp
// @route   POST /api/restaurants/:id/click-whatsapp
// @access  Público
const incrementarClicsWhatsapp = async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurantExists = await Restaurant.exists({ _id: id, activo: true });

    if (!restaurantExists) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante no encontrado'
      });
    }

    const mesActual = obtenerMesActual();
    
    const result = await Restaurant.updateOne(
      { _id: id, "estadisticasMensuales.fecha": mesActual },
      { 
        $inc: { 
          "estadisticas.clicsWhatsapp": 1,
          "estadisticasMensuales.$.clicsWhatsapp": 1
        }
      }
    );

    if (result.modifiedCount === 0) {
      await Restaurant.updateOne(
        { _id: id },
        {
          $inc: { "estadisticas.clicsWhatsapp": 1 },
          $push: {
            estadisticasMensuales: {
              fecha: mesActual,
              vistas: 0,
              clicsMapa: 0,
              clicsWhatsapp: 1
            }
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Clic a WhatsApp registrado exitosamente'
    });

  } catch (error) {
    console.error('Error incrementando clics a WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerRestaurantes,
  obtenerRestaurantePorId,
  obtenerRestaurantesPorTipo,
  buscarRestaurantes,
  obtenerEstadisticas,
  obtenerRestaurantesRecientes,
  obtenerRestaurantesActualizados,
  incrementarVistas,
  incrementarClicsMapa,
  incrementarClicsWhatsapp
};