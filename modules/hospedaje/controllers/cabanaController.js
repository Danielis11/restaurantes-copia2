const Cabana = require('../models/Cabana');
const Review = require('../models/Review');

// Obtener todas las cabañas (público + super admin ve TODO)
exports.getAllCabanas = async (req, res) => {
  try {
    //  Super admin ve todas, otros solo activas
    let query = { activo: true }; // Por defecto solo activas

    // Si es super admin, mostrar TODAS las cabañas (activas e inactivas)
    if (req.user && (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin)) {
      query = {}; // Sin filtros = mostrar TODO
    }
    const cabanas = await Cabana.find(query)
      .populate('propietario', 'nombre email createdAt updatedAt') // Más info para super admin
      .sort({ updatedAt: -1 }); // Ordenar por última modificación

    res.status(200).json({
      status: 'success',
      results: cabanas.length,
      data: {
        cabanas
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
// Obtener una cabaña por ID (público)
exports.getCabana = async (req, res) => {
  try {
    const cabana = await Cabana.findById(req.params.id)
      .populate('propietario', 'nombre email contacto');

    if (!cabana) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la cabaña'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        cabana
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Crear nueva cabaña (solo administradores)
exports.createCabana = async (req, res) => {
  try {
    req.body.propietario = req.user.id;
    const newCabana = await Cabana.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        cabana: newCabana
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener cabañas del usuario autenticado
exports.getMisCabanas = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve TODAS las cabañas, no solo las suyas
    let query = { propietario: req.user.id }; // Por defecto solo las del usuario

    if (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin) {
      query = {}; // Super admin ve TODAS
    }

    const cabanas = await Cabana.find(query)
      .populate('propietario', 'nombre email updatedAt') // Info del propietario para super admin
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: cabanas.length,
      data: {
        cabanas
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Actualizar cabaña
exports.updateCabana = async (req, res) => {
  try {
    const cabana = await Cabana.findById(req.params.id);

    if (!cabana) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la cabaña'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede editar cualquier cabaña
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;

    if (!isSuperAdmin && cabana.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para actualizar esta cabaña'
      });
    }

    // 🔥 AGREGAR: Información de auditoría para el historial
    req.body.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      camposModificados: Object.keys(req.body)
    };

    const updatedCabana = await Cabana.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    // 🆕 REGISTRAR HISTORIAL DE ACTUALIZACIÓN
    try {
      const UpdateHistory = require('../models/UpdateHistory');
      await UpdateHistory.create({
        hospedajeId: updatedCabana._id,
        nombreHospedaje: updatedCabana.nombre,
        tipoHospedaje: 'cabana',
        usuarioId: req.user.id,
        nombreUsuario: req.user.nombre || req.user.email || 'Admin',
        camposModificados: Object.keys(req.body).filter(key => key !== 'ultimaModificacion')
      });
      console.log('✅ Historial de actualización guardado');
    } catch (historyError) {
      console.error('⚠️ Error guardando historial de actualización:', historyError.message);
    }

    res.status(200).json({
      status: 'success',
      data: {
        cabana: updatedCabana
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Eliminar cabaña
exports.deleteCabana = async (req, res) => {
  try {
    const cabana = await Cabana.findById(req.params.id);

    if (!cabana) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la cabaña'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede eliminar cualquier cabaña
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;

    if (!isSuperAdmin && cabana.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar esta cabaña'
      });
    }

    // Soft delete (marcar como inactiva)
    cabana.activo = false;
    await cabana.save();

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

// Agregar reseña a una cabaña
exports.createReview = async (req, res) => {
  try {
    const cabanaId = req.params.id;
    const cabana = await Cabana.findById(cabanaId);

    if (!cabana) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la cabaña'
      });
    }

    const { rating, comentario } = req.body;

    // Verificar si el usuario ya dejó una reseña (opcional)
    const alreadyReviewed = cabana.reviews && cabana.reviews.find(
      (r) => r.user.toString() === req.user.id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya has enviado una reseña para esta cabaña'
      });
    }

    const review = {
      user: req.user.id,
      nombreUsuario: req.user.nombre,
      rating: Number(rating),
      comentario
    };

    if (!cabana.reviews) cabana.reviews = [];
    cabana.reviews.push(review);

    // Recalcular promedio
    cabana.calificacion.numeroReviews = cabana.reviews.length;

    const sum = cabana.reviews.reduce((acc, item) => acc + item.rating, 0);
    // Redondear a 1 decimal
    cabana.calificacion.promedio = Math.round((sum / cabana.reviews.length) * 10) / 10;

    await cabana.save();

    // 📝 También guardar en la colección separada 'reviews'
    try {
      await Review.create({
        userId: req.user.id,
        nombreUsuario: req.user.nombre,
        hospedajeId: cabanaId,
        tipoHospedaje: 'cabana',
        nombreHospedaje: cabana.nombre,
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
        calificacion: cabana.calificacion
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};