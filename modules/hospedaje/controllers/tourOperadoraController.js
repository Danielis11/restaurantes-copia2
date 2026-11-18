const TourOperadora = require('../models/TourOperadora');

// Obtener todas las tour operadoras (público + super admin ve TODO)
exports.getAllTourOperadoras = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve todas, otros solo activas con filtros
    let filters = { activo: true }; // Por defecto solo activas
    
    // Si es super admin, mostrar TODAS las tour operadoras (activas e inactivas)
    if (req.user && (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin)) {
      filters = {}; // Sin filtros = mostrar TODO
    } else {
      // Aplicar filtros normales solo para usuarios no super admin
      // Filtros opcionales
      if (req.query.ciudad) {
        filters['ubicacion.ciudad'] = new RegExp(req.query.ciudad, 'i');
      }
      
      if (req.query.tipoTour) {
        filters['tours.tipoTour'] = req.query.tipoTour;
      }
      
      if (req.query.precioMin) {
        filters['tours.precio'] = { ...filters['tours.precio'], $gte: req.query.precioMin };
      }
      
      if (req.query.precioMax) {
        filters['tours.precio'] = { ...filters['tours.precio'], $lte: req.query.precioMax };
      }
    }

    const tourOperadoras = await TourOperadora.find(filters)
      .populate('propietario', 'nombre email createdAt updatedAt') // Más info para super admin
      .sort({ 'calificacion.promedio': -1, updatedAt: -1 }); // Ordenar por última modificación

    res.status(200).json({
      status: 'success',
      results: tourOperadoras.length,
      data: {
        tourOperadoras
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener una tour operadora por ID (público)
exports.getTourOperadora = async (req, res) => {
  try {
    const tourOperadora = await TourOperadora.findById(req.params.id)
      .populate('propietario', 'nombre email contacto');

    if (!tourOperadora) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la tour operadora'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        tourOperadora
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Crear nueva tour operadora (solo administradores)
exports.createTourOperadora = async (req, res) => {
  try {
    req.body.propietario = req.user.id;
    const newTourOperadora = await TourOperadora.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tourOperadora: newTourOperadora
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener tour operadoras del usuario autenticado
exports.getMisTourOperadoras = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve TODAS las tour operadoras, no solo las suyas
    let query = { propietario: req.user.id }; // Por defecto solo las del usuario
    
    if (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin) {
      query = {}; // Super admin ve TODAS
    }

    const tourOperadoras = await TourOperadora.find(query)
      .populate('propietario', 'nombre email updatedAt') // Info del propietario para super admin
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tourOperadoras.length,
      data: {
        tourOperadoras
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Actualizar tour operadora
exports.updateTourOperadora = async (req, res) => {
  try {
    const tourOperadora = await TourOperadora.findById(req.params.id);

    if (!tourOperadora) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la tour operadora'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede editar cualquier tour operadora
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    
    if (!isSuperAdmin && tourOperadora.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para actualizar esta tour operadora'
      });
    }

    // 🔥 AGREGAR: Información de auditoría para el historial
    req.body.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      camposModificados: Object.keys(req.body)
    };

    const updatedTourOperadora = await TourOperadora.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        tourOperadora: updatedTourOperadora
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Eliminar tour operadora
exports.deleteTourOperadora = async (req, res) => {
  try {
    const tourOperadora = await TourOperadora.findById(req.params.id);

    if (!tourOperadora) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la tour operadora'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede eliminar cualquier tour operadora
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    
    if (!isSuperAdmin && tourOperadora.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar esta tour operadora'
      });
    }

    // Soft delete (marcar como inactiva)
    tourOperadora.activo = false;
    await tourOperadora.save();

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

// Obtener tours específicos de una operadora
exports.getToursDeOperadora = async (req, res) => {
  try {
    const tourOperadora = await TourOperadora.findById(req.params.id);
    
    if (!tourOperadora) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la tour operadora'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin ve todos los tours, otros solo activos
    let toursDisponibles;
    
    if (req.user && (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin)) {
      toursDisponibles = tourOperadora.tours; // Super admin ve TODOS los tours
    } else {
      // Filtrar solo tours activos para usuarios normales
      toursDisponibles = tourOperadora.tours.filter(tour => tour.activo);
    }

    res.status(200).json({
      status: 'success',
      results: toursDisponibles.length,
      data: {
        tours: toursDisponibles,
        operadora: {
          nombre: tourOperadora.nombre,
          calificacion: tourOperadora.calificacion
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};