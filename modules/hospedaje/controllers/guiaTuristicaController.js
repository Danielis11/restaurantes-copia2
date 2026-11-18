const GuiaTuristica = require('../models/GuiaTuristica');

// Obtener todas las guías turísticas (público + super admin ve TODO)
exports.getAllGuias = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve todas, otros solo activas con filtros
    let filters = { activo: true }; // Por defecto solo activas
    
    // Si es super admin, mostrar TODAS las guías (activas e inactivas)
    if (req.user && (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin)) {
      filters = {}; // Sin filtros = mostrar TODO
    } else {
      // Aplicar filtros normales solo para usuarios no super admin
      // Filtros opcionales
      if (req.query.ciudad) {
        filters['ubicacion.ciudadesOperacion'] = new RegExp(req.query.ciudad, 'i');
      }
      
      if (req.query.especialidad) {
        filters.especialidades = req.query.especialidad;
      }
      
      if (req.query.idioma) {
        filters['idiomas.idioma'] = req.query.idioma;
      }
      
      if (req.query.tarifaMax) {
        filters['tarifas.porHora'] = { $lte: req.query.tarifaMax };
      }
    }

    const guias = await GuiaTuristica.find(filters)
      .populate('propietario', 'nombre email createdAt updatedAt') // Más info para super admin
      .sort({ 'calificacion.promedio': -1, updatedAt: -1 }); // Ordenar por última modificación

    res.status(200).json({
      status: 'success',
      results: guias.length,
      data: {
        guias
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener una guía por ID (público)
exports.getGuia = async (req, res) => {
  try {
    const guia = await GuiaTuristica.findById(req.params.id)
      .populate('propietario', 'nombre email contacto');

    if (!guia) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la guía turística'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        guia
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Crear nueva guía turística (solo administradores)
exports.createGuia = async (req, res) => {
  try {
    req.body.propietario = req.user.id;
    const newGuia = await GuiaTuristica.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        guia: newGuia
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener guías del usuario autenticado
exports.getMisGuias = async (req, res) => {
  try {
    // 🔥 MODIFICACIÓN: Super admin ve TODAS las guías, no solo las suyas
    let query = { propietario: req.user.id }; // Por defecto solo las del usuario
    
    if (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin) {
      query = {}; // Super admin ve TODAS
    }

    const guias = await GuiaTuristica.find(query)
      .populate('propietario', 'nombre email updatedAt') // Info del propietario para super admin
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: guias.length,
      data: {
        guias
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Actualizar guía turística
exports.updateGuia = async (req, res) => {
  try {
    const guia = await GuiaTuristica.findById(req.params.id);

    if (!guia) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la guía turística'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede editar cualquier guía
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    
    if (!isSuperAdmin && guia.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para actualizar esta guía'
      });
    }

    // 🔥 AGREGAR: Información de auditoría para el historial
    req.body.ultimaModificacion = {
      usuario: req.user.id,
      fecha: new Date(),
      camposModificados: Object.keys(req.body)
    };

    const updatedGuia = await GuiaTuristica.findByIdAndUpdate(
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
        guia: updatedGuia
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Eliminar guía turística
exports.deleteGuia = async (req, res) => {
  try {
    const guia = await GuiaTuristica.findById(req.params.id);

    if (!guia) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la guía turística'
      });
    }

    // 🔥 MODIFICACIÓN: Super admin puede eliminar cualquier guía
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    
    if (!isSuperAdmin && guia.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar esta guía'
      });
    }

    // Soft delete (marcar como inactiva)
    guia.activo = false;
    await guia.save();

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

// Buscar guías por especialidades
exports.getGuiasPorEspecialidad = async (req, res) => {
  try {
    const { especialidad } = req.params;
    
    // 🔥 MODIFICACIÓN: Super admin ve todas, otros solo activas
    let filters = {
      especialidades: especialidad,
      activo: true
    };
    
    if (req.user && (req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin)) {
      filters = { especialidades: especialidad }; // Super admin ve todas (activas e inactivas)
    }
    
    const guias = await GuiaTuristica.find(filters)
      .populate('propietario', 'nombre email')
      .sort({ 'calificacion.promedio': -1 });

    res.status(200).json({
      status: 'success',
      results: guias.length,
      data: {
        especialidad,
        guias
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Verificar disponibilidad de guía
exports.verificarDisponibilidad = async (req, res) => {
  try {
    const { fecha, hora } = req.query;
    const guia = await GuiaTuristica.findById(req.params.id);

    if (!guia) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la guía turística'
      });
    }

    // Lógica simple de disponibilidad (se puede expandir)
    const fechaSolicitud = new Date(fecha);
    const diaFecha = fechaSolicitud.getDay(); // 0 = domingo, 1 = lunes, etc.
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const nombreDia = diasSemana[diaFecha];

    const disponible = guia.disponibilidad.horarios[nombreDia]?.disponible || false;

    res.status(200).json({
      status: 'success',
      data: {
        fecha,
        hora,
        disponible,
        guia: {
          nombre: `${guia.nombre} ${guia.apellidos}`,
          id: guia._id
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