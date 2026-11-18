const CuestionarioSemanal = require('../models/CuestionarioSemanal');
const Hotel = require('../models/Hotel');
const Airbnb = require('../models/Airbnb');
const Cabana = require('../models/Cabana'); // ✅ NUEVO: Importar modelo Cabana

// FUNCIÓN AUXILIAR para calcular número de semana
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ==================== CREAR CUESTIONARIO UNIFICADO ====================
exports.crearCuestionario = async (req, res) => {
  try {
    console.log('🔥 Creando cuestionario:', req.body);
    
    const { hotelId, airbnbId, cabanaId, fechaInicio, fechaFin, datos, notas } = req.body;

    
    // ✅ ACTUALIZADO: Determinar tipo de establecimiento incluyendo cabañas
    let tipoEstablecimiento, establecimientoId, establecimiento;
    
    // ORDEN: airbnb → hotel → cabana
    if (airbnbId) {
      tipoEstablecimiento = 'airbnb';
      establecimientoId = airbnbId;
      console.log('🏠 Buscando alojamiento Airbnb con ID:', airbnbId);
      establecimiento = await Airbnb.findById(airbnbId);
      if (!establecimiento) {
        return res.status(404).json({
          status: 'error',
          message: 'Alojamiento no encontrado'
        });
      }
    } else if (hotelId) {
      tipoEstablecimiento = 'hotel';
      establecimientoId = hotelId;
      console.log('🏨 Buscando hotel con ID:', hotelId);
      establecimiento = await Hotel.findById(hotelId);
      if (!establecimiento) {
        return res.status(404).json({
          status: 'error',
          message: 'Hotel no encontrado'
        });
      }
    } else if (cabanaId) {
      tipoEstablecimiento = 'cabana';
      establecimientoId = cabanaId;
      console.log('🏔️ Buscando cabaña con ID:', cabanaId);
      establecimiento = await Cabana.findById(cabanaId);
      if (!establecimiento) {
        return res.status(404).json({
          status: 'error',
          message: 'Cabaña no encontrada'
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Debe proporcionar hotelId, airbnbId o cabanaId' // ✅ ACTUALIZADO: Incluir cabanaId
      });
    }
    
    console.log(`✅ ${tipoEstablecimiento} encontrado:`, establecimiento.nombre);
    
    // Verificar permisos
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    if (!isSuperAdmin && establecimiento.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: `No tienes permiso para crear cuestionarios para este ${tipoEstablecimiento}`
      });
    }
    
    console.log('✅ Permisos verificados');
    
    // Generar semanaAnio
    const fecha = new Date(fechaInicio);
    const año = fecha.getFullYear();
    const semana = getWeekNumber(fecha);
    const semanaAnio = `${año}-W${semana.toString().padStart(2, '0')}`;
    
    console.log('📅 Semana generada:', semanaAnio);
    
    // ✅ ACTUALIZADO: Verificar duplicados incluyendo cabañas
    const query = {
      semanaAnio: semanaAnio,
      propietario: req.user.id,
      tipoEstablecimiento: tipoEstablecimiento
    };
    
    if (tipoEstablecimiento === 'hotel') {
      query.hotel = establecimientoId;
    } else if (tipoEstablecimiento === 'airbnb') {
      query.alojamiento = establecimientoId;
    } else if (tipoEstablecimiento === 'cabana') {
      query.cabana = establecimientoId; // ✅ NUEVO: Agregar query para cabañas
    }
    
    const cuestionarioExistente = await CuestionarioSemanal.findOne(query);
    
    if (cuestionarioExistente) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe un cuestionario para esta semana. Use la función de actualización.',
        data: { cuestionarioId: cuestionarioExistente._id }
      });
    }
    
    console.log('✅ No hay cuestionario existente, creando nuevo...');
    
    // Preparar datos para crear
    const cuestionarioData = {
      propietario: req.user.id,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      semanaAnio,
      tipoEstablecimiento,
      datos,
      notas: notas || ''
    };
    
    // ✅ ACTUALIZADO: Agregar referencia al establecimiento incluyendo cabañas
    if (tipoEstablecimiento === 'hotel') {
      cuestionarioData.hotel = establecimientoId;
    } else if (tipoEstablecimiento === 'airbnb') {
      cuestionarioData.alojamiento = establecimientoId;
    } else if (tipoEstablecimiento === 'cabana') {
      cuestionarioData.cabana = establecimientoId; // ✅ NUEVO: Agregar cabana al objeto
    }
    
    console.log('📊 Datos a guardar:', cuestionarioData);
    
    // Crear cuestionario
    const cuestionario = await CuestionarioSemanal.create(cuestionarioData);
    
    console.log('✅ Cuestionario creado:', cuestionario._id);
    
    // ✅ ACTUALIZADO: Poblar datos del establecimiento incluyendo cabañas
    let populateField, selectFields;
    
    if (tipoEstablecimiento === 'hotel') {
      populateField = 'hotel';
      selectFields = 'nombre ubicacion';
    } else if (tipoEstablecimiento === 'airbnb') {
      populateField = 'alojamiento';
      selectFields = 'nombre tipoPropiedad ubicacion';
    } else if (tipoEstablecimiento === 'cabana') {
      populateField = 'cabana';
      selectFields = 'nombre ubicacion caracteristicas'; // ✅ NUEVO: Campos para cabañas
    }
    
    await cuestionario.populate(populateField, selectFields);
    
    res.status(201).json({
      status: 'success',
      message: `Cuestionario semanal de ${tipoEstablecimiento} creado exitosamente`,
      data: { cuestionario }
    });
    
  } catch (error) {
    console.error('❌ Error al crear cuestionario:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe un cuestionario para esta semana'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Error de validación: ' + messages.join(', ')
      });
    }
    
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== OBTENER CUESTIONARIOS DEL ESTABLECIMIENTO ====================
exports.getCuestionariosEstablecimiento = async (req, res) => {
  try {
    const { establecimientoId } = req.params;
    const { tipo = 'hotel', año, mes, limite = 10 } = req.query;
    
    // ✅ ACTUALIZADO: Verificar que el establecimiento existe incluyendo cabañas
    let establecimiento;
    if (tipo === 'hotel') {
      establecimiento = await Hotel.findById(establecimientoId);
    } else if (tipo === 'airbnb') {
      establecimiento = await Airbnb.findById(establecimientoId);
    } else if (tipo === 'cabana') {
      establecimiento = await Cabana.findById(establecimientoId); // ✅ NUEVO
    }
    
    if (!establecimiento) {
      return res.status(404).json({
        status: 'error',
        message: `${tipo === 'hotel' ? 'Hotel' : tipo === 'airbnb' ? 'Alojamiento' : 'Cabaña'} no encontrado` // ✅ ACTUALIZADO
      });
    }
    
    // Verificar permisos
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    if (!isSuperAdmin && establecimiento.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: `No tienes permiso para ver los cuestionarios de este ${tipo}`
      });
    }
    
    // ✅ ACTUALIZADO: Construir query incluyendo cabañas
    let query = { 
      tipoEstablecimiento: tipo
    };
    
    if (tipo === 'hotel') {
      query.hotel = establecimientoId;
    } else if (tipo === 'airbnb') {
      query.alojamiento = establecimientoId;
    } else if (tipo === 'cabana') {
      query.cabana = establecimientoId; // ✅ NUEVO
    }
    
    if (año) {
      const startOfYear = new Date(año, 0, 1);
      const endOfYear = new Date(año, 11, 31, 23, 59, 59);
      query.fechaInicio = { $gte: startOfYear, $lte: endOfYear };
    }
    
    if (mes && año) {
      const startOfMonth = new Date(año, mes - 1, 1);
      const endOfMonth = new Date(año, mes, 0, 23, 59, 59);
      query.fechaInicio = { $gte: startOfMonth, $lte: endOfMonth };
    }
    
    // ✅ ACTUALIZADO: Populate fields incluyendo cabañas
    let populateField, selectFields;
    if (tipo === 'hotel') {
      populateField = 'hotel';
      selectFields = 'nombre ubicacion';
    } else if (tipo === 'airbnb') {
      populateField = 'alojamiento';
      selectFields = 'nombre tipoPropiedad ubicacion';
    } else if (tipo === 'cabana') {
      populateField = 'cabana';
      selectFields = 'nombre ubicacion caracteristicas'; // ✅ NUEVO
    }
    
    const cuestionarios = await CuestionarioSemanal.find(query)
      .populate(populateField, selectFields)
      .sort({ fechaInicio: -1 })
      .limit(parseInt(limite));
    
    res.status(200).json({
      status: 'success',
      results: cuestionarios.length,
      data: { cuestionarios }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener cuestionarios:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== OBTENER MIS CUESTIONARIOS ====================
exports.getMisCuestionarios = async (req, res) => {
  try {
    const { tipo, año, mes, limite = 20 } = req.query;
    
    // Construir query
    let query = { propietario: req.user.id };
    
    // Super admin ve todos
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    if (isSuperAdmin) {
      query = {};
    }
    
    // ✅ ACTUALIZADO: Filtro por tipo de establecimiento incluyendo cabañas
    if (tipo && ['hotel', 'airbnb', 'cabana'].includes(tipo)) {
      query.tipoEstablecimiento = tipo;
    }
    
    // Filtros de fecha
    if (año) {
      const startOfYear = new Date(año, 0, 1);
      const endOfYear = new Date(año, 11, 31, 23, 59, 59);
      query.fechaInicio = { $gte: startOfYear, $lte: endOfYear };
    }
    
    if (mes && año) {
      const startOfMonth = new Date(año, mes - 1, 1);
      const endOfMonth = new Date(año, mes, 0, 23, 59, 59);
      query.fechaInicio = { $gte: startOfMonth, $lte: endOfMonth };
    }
    
    // ✅ ACTUALIZADO: Populate incluyendo cabañas
    const cuestionarios = await CuestionarioSemanal.find(query)
      .populate('hotel', 'nombre ubicacion')
      .populate('alojamiento', 'nombre tipoPropiedad ubicacion')
      .populate('cabana', 'nombre ubicacion caracteristicas') // ✅ NUEVO: Populate cabañas
      .populate('propietario', 'nombre email')
      .sort({ fechaInicio: -1 })
      .limit(parseInt(limite));
    
    res.status(200).json({
      status: 'success',
      results: cuestionarios.length,
      data: { cuestionarios }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener mis cuestionarios:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== ACTUALIZAR CUESTIONARIO ====================
exports.actualizarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    const { datos, notas } = req.body;
    
    const cuestionario = await CuestionarioSemanal.findById(id);
    if (!cuestionario) {
      return res.status(404).json({
        status: 'error',
        message: 'Cuestionario no encontrado'
      });
    }
    
    // Verificar permisos
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    if (!isSuperAdmin && cuestionario.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para actualizar este cuestionario'
      });
    }
    
    // Actualizar datos
    cuestionario.datos = { ...cuestionario.datos, ...datos };
    if (notas !== undefined) {
      cuestionario.notas = notas;
    }
    cuestionario.fechaEnvio = new Date();
    
    await cuestionario.save();
    
    // ✅ ACTUALIZADO: Poblar datos según el tipo incluyendo cabañas
    let populateField, selectFields;
    
    if (cuestionario.tipoEstablecimiento === 'hotel') {
      populateField = 'hotel';
      selectFields = 'nombre ubicacion';
    } else if (cuestionario.tipoEstablecimiento === 'airbnb') {
      populateField = 'alojamiento';
      selectFields = 'nombre tipoPropiedad ubicacion';
    } else if (cuestionario.tipoEstablecimiento === 'cabana') {
      populateField = 'cabana';
      selectFields = 'nombre ubicacion caracteristicas'; // ✅ NUEVO
    }
    
    await cuestionario.populate(populateField, selectFields);
    
    res.status(200).json({
      status: 'success',
      message: 'Cuestionario actualizado exitosamente',
      data: { cuestionario }
    });
    
  } catch (error) {
    console.error('❌ Error al actualizar cuestionario:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== ELIMINAR CUESTIONARIO ====================
exports.eliminarCuestionario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cuestionario = await CuestionarioSemanal.findById(id);
    if (!cuestionario) {
      return res.status(404).json({
        status: 'error',
        message: 'Cuestionario no encontrado'
      });
    }
    
    // Verificar permisos
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    if (!isSuperAdmin && cuestionario.propietario.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar este cuestionario'
      });
    }
    
    await cuestionario.deleteOne();
    
    res.status(200).json({
      status: 'success',
      message: 'Cuestionario eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error al eliminar cuestionario:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== FUNCIONES ESPECÍFICAS (mantener compatibilidad) ====================
exports.getCuestionariosHotel = async (req, res) => {
  req.query.tipo = 'hotel';
  req.params.establecimientoId = req.params.hotelId;
  return exports.getCuestionariosEstablecimiento(req, res);
};

// ✅ NUEVO: Función específica para cabañas
exports.getCuestionariosCabana = async (req, res) => {
  req.query.tipo = 'cabana';
  req.params.establecimientoId = req.params.cabanaId;
  return exports.getCuestionariosEstablecimiento(req, res);
};

// ==================== ESTADÍSTICAS BÁSICAS ====================
exports.getEstadisticas = async (req, res) => {
  try {
    const { tipo, año, mes } = req.query;
    
    // Query base
    let query = {};
    
    // Solo mostrar cuestionarios del usuario (excepto super admin)
    const isSuperAdmin = req.user.email === 'direcciondeturismojalpan@gmail.com' || req.user.isSuperAdmin;
    if (!isSuperAdmin) {
      query.propietario = req.user.id;
    }
    
    // ✅ ACTUALIZADO: Filtro por tipo incluyendo cabañas
    if (tipo && ['hotel', 'airbnb', 'cabana'].includes(tipo)) {
      query.tipoEstablecimiento = tipo;
    }
    
    // Filtros de fecha
    if (año) {
      const startOfYear = new Date(año, 0, 1);
      const endOfYear = new Date(año, 11, 31, 23, 59, 59);
      query.fechaInicio = { $gte: startOfYear, $lte: endOfYear };
    }
    
    if (mes && año) {
      const startOfMonth = new Date(año, mes - 1, 1);
      const endOfMonth = new Date(año, mes, 0, 23, 59, 59);
      query.fechaInicio = { $gte: startOfMonth, $lte: endOfMonth };
    }
    
    // Estadísticas separadas por tipo
    const estadisticasHoteles = await CuestionarioSemanal.aggregate([
      { $match: { ...query, tipoEstablecimiento: 'hotel' } },
      {
        $group: {
          _id: null,
          totalCuestionarios: { $sum: 1 },
          totalHabitacionesOcupadas: { $sum: '$datos.habitacionesOcupadas' },
          totalPersonas: { $sum: '$datos.totalPersonas' },
          promedioHabitacionesPorSemana: { $avg: '$datos.habitacionesOcupadas' },
          promedioPersonasPorSemana: { $avg: '$datos.totalPersonas' }
        }
      }
    ]);
    
    const estadisticasAirbnb = await CuestionarioSemanal.aggregate([
      { $match: { ...query, tipoEstablecimiento: 'airbnb' } },
      {
        $group: {
          _id: null,
          totalCuestionarios: { $sum: 1 },
          totalOcupaciones: { $sum: '$datos.ocupacionesSemana' },
          totalPersonas: { $sum: '$datos.totalPersonasSemana' },
          promedioOcupacionesPorSemana: { $avg: '$datos.ocupacionesSemana' },
          promedioPersonasPorSemana: { $avg: '$datos.totalPersonasSemana' }
        }
      }
    ]);
    
    // ✅ NUEVO: Estadísticas para cabañas
    const estadisticasCabanas = await CuestionarioSemanal.aggregate([
      { $match: { ...query, tipoEstablecimiento: 'cabana' } },
      {
        $group: {
          _id: null,
          totalCuestionarios: { $sum: 1 },
          totalDiasOcupados: { $sum: '$datos.diasOcupada' },
          totalPersonas: { $sum: '$datos.totalPersonas' },
          promedioDiasPorSemana: { $avg: '$datos.diasOcupada' },
          promedioPersonasPorSemana: { $avg: '$datos.totalPersonas' }
        }
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        estadisticas: {
          hoteles: estadisticasHoteles[0] || {},
          airbnb: estadisticasAirbnb[0] || {},
          cabanas: estadisticasCabanas[0] || {} // ✅ NUEVO: Incluir estadísticas de cabañas
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== REPORTES PARA SUPER ADMIN ====================
exports.getReportesSemanalesTodosLosEstablecimientos = async (req, res) => {
    try {
        console.log('🔍 Super Admin solicitando todos los reportes...');
        
        // ✅ ACTUALIZADO: Obtener TODOS los cuestionarios incluyendo cabañas
        const cuestionarios = await CuestionarioSemanal.find({})
            .populate('hotel', 'nombre ubicacion')
            .populate('alojamiento', 'nombre tipoPropiedad ubicacion')
            .populate('cabana', 'nombre ubicacion caracteristicas') // ✅ NUEVO: Populate cabañas
            .populate('propietario', 'nombre email')
            .sort({ fechaInicio: -1 });

        console.log(`📊 Reportes encontrados: ${cuestionarios.length}`);

        res.status(200).json({
            status: 'success',
            results: cuestionarios.length,
            data: {
                cuestionarios
            }
        });
    } catch (error) {
        console.error('❌ Error al obtener todos los reportes:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener reportes: ' + error.message
        });
    }
};

// ==================== 📊 ESTADÍSTICAS AVANZADAS PARA SUPER ADMIN ====================

// Estadísticas avanzadas generales
exports.getEstadisticasAvanzadas = async (req, res) => {
  try {
    console.log('📊 Generando estadísticas avanzadas...');
    
    const { 
      tipoEstablecimiento, 
      fechaInicio, 
      fechaFin, 
      periodo = 'trimestre' 
    } = req.query;

    // Construir filtros
    let filtros = {};
    
    if (tipoEstablecimiento && tipoEstablecimiento !== 'todos') {
      filtros.tipoEstablecimiento = tipoEstablecimiento;
    }
    
    // Aplicar filtros de fecha
    if (fechaInicio && fechaFin) {
      filtros.fechaInicio = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    } else {
      // Aplicar período predefinido
      const ahora = new Date();
      let fechaLimite = new Date();
      
      switch(periodo) {
        case 'trimestre':
          fechaLimite.setMonth(ahora.getMonth() - 3);
          break;
        case 'semestre':
          fechaLimite.setMonth(ahora.getMonth() - 6);
          break;
        case 'año':
          fechaLimite.setFullYear(ahora.getFullYear() - 1);
          break;
      }
      
      filtros.fechaInicio = { $gte: fechaLimite };
    }

    // Obtener cuestionarios con populate
    const cuestionarios = await CuestionarioSemanal.find(filtros)
      .populate('hotel', 'nombre ubicacion')
      .populate('alojamiento', 'nombre tipoPropiedad ubicacion')
      .populate('cabana', 'nombre ubicacion caracteristicas')
      .sort({ fechaInicio: -1 });

    // Generar estadísticas procesadas
    const estadisticas = await procesarEstadisticasAvanzadas(cuestionarios);

    res.status(200).json({
      status: 'success',
      data: {
        cuestionarios,
        estadisticas,
        filtros: filtros,
        total: cuestionarios.length
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas avanzadas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas: ' + error.message
    });
  }
};

// Análisis de fechas más concurridas
exports.getAnalisisFechasConcurridas = async (req, res) => {
  try {
    const { tipoEstablecimiento, meses = 6 } = req.query;
    
    console.log(`📅 Analizando fechas concurridas - últimos ${meses} meses`);
    
    // Fecha límite
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - parseInt(meses));
    
    let pipeline = [
      {
        $match: {
          fechaInicio: { $gte: fechaLimite },
          ...(tipoEstablecimiento && tipoEstablecimiento !== 'todos' && { tipoEstablecimiento })
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$fechaInicio' },
            semana: { $week: '$fechaInicio' }
          },
          totalPersonas: { $sum: '$datos.totalPersonas' },
          totalReportes: { $sum: 1 },
          promedioPersonas: { $avg: '$datos.totalPersonas' },
          fechaInicio: { $first: '$fechaInicio' },
          reportes: {
            $push: {
              tipoEstablecimiento: '$tipoEstablecimiento',
              totalPersonas: '$datos.totalPersonas',
              procedenciaTuristas: '$datos.procedenciaTuristas',
              fechaInicio: '$fechaInicio'
            }
          }
        }
      },
      {
        $addFields: {
          // Determinar si es temporada alta (más del 80% del máximo)
          temporadaAlta: {
            $cond: {
              if: { $gt: ['$totalPersonas', 50] }, // Umbral configurable
              then: true,
              else: false
            }
          },
          // Calcular variación con período anterior (simplificado)
          variacionPeriodoAnterior: {
            $multiply: [
              { $divide: ['$totalPersonas', '$promedioPersonas'] },
              100
            ]
          }
        }
      },
      {
        $sort: { '_id.año': 1, '_id.semana': 1 }
      }
    ];

    const resultado = await CuestionarioSemanal.aggregate(pipeline);

    // Calcular estadísticas adicionales
    const totalSemanas = resultado.length;
    const semanasTemporadaAlta = resultado.filter(s => s.temporadaAlta).length;
    const pico = Math.max(...resultado.map(s => s.totalPersonas));
    const promedio = resultado.reduce((sum, s) => sum + s.totalPersonas, 0) / totalSemanas;

    res.status(200).json({
      status: 'success',
      data: {
        fechasConcurridas: resultado,
        resumen: {
          totalSemanas,
          semanasTemporadaAlta,
          picoOcupacion: pico,
          promedioOcupacion: Math.round(promedio),
          porcentajeTemporadaAlta: ((semanasTemporadaAlta / totalSemanas) * 100).toFixed(1)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis de fechas:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Análisis de procedencia de turistas
exports.getAnalisisProcedencia = async (req, res) => {
  try {
    const { tipoEstablecimiento, limite = 15 } = req.query;
    
    console.log('🌎 Analizando procedencia de turistas...');
    
    let pipeline = [
      {
        $match: {
          ...(tipoEstablecimiento && tipoEstablecimiento !== 'todos' && { tipoEstablecimiento }),
          'datos.procedenciaTuristas': { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$datos.procedenciaTuristas',
          totalTuristas: { $sum: '$datos.totalPersonas' },
          totalReportes: { $sum: 1 },
          promedioTuristas: { $avg: '$datos.totalPersonas' },
          tiposEstablecimiento: { $addToSet: '$tipoEstablecimiento' },
          ultimoReporte: { $max: '$fechaInicio' }
        }
      },
      {
        $sort: { totalTuristas: -1 }
      },
      {
        $limit: parseInt(limite)
      }
    ];

    const procedencias = await CuestionarioSemanal.aggregate(pipeline);

    // Procesar y categorizar procedencias
    const procedenciasProc = procedencias.map(proc => {
      const descripcion = proc._id.toLowerCase();
      let categoria = 'Otros';
      let esExtranjero = false;

      // Detectar si es nacional o extranjero
      if (descripcion.includes('méxico') || descripcion.includes('nacional') || 
          descripcion.includes('cdmx') || descripcion.includes('guadalajara') ||
          descripcion.includes('monterrey') || descripcion.includes('puebla')) {
        categoria = 'Nacional';
        esExtranjero = false;
      } else if (descripcion.includes('estados unidos') || descripcion.includes('usa') ||
                 descripcion.includes('canadá') || descripcion.includes('españa') ||
                 descripcion.includes('francia') || descripcion.includes('alemania')) {
        categoria = 'Internacional';
        esExtranjero = true;
      } else if (descripcion.includes('extranjero') || descripcion.includes('internacional')) {
        categoria = 'Internacional';
        esExtranjero = true;
      }

      return {
        ...proc,
        categoria,
        esExtranjero,
        descripcionCorta: proc._id.length > 50 ? proc._id.substring(0, 50) + '...' : proc._id
      };
    });

    // Calcular totales
    const totalTuristas = procedenciasProc.reduce((sum, p) => sum + p.totalTuristas, 0);
    const turistasExtranjeros = procedenciasProc
      .filter(p => p.esExtranjero)
      .reduce((sum, p) => sum + p.totalTuristas, 0);
    const porcentajeExtranjeros = totalTuristas > 0 ? 
      ((turistasExtranjeros / totalTuristas) * 100).toFixed(1) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        procedencias: procedenciasProc,
        resumen: {
          totalProcedencias: procedenciasProc.length,
          totalTuristas,
          turistasExtranjeros,
          porcentajeExtranjeros,
          procedenciaPrincipal: procedenciasProc[0]?.descripcionCorta || 'N/A'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis de procedencia:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Comparación con período anterior
exports.getComparacionPeriodos = async (req, res) => {
  try {
    const { tipoEstablecimiento, meses = 6 } = req.query;
    
    console.log(`📊 Comparando períodos - últimos ${meses} meses`);
    
    const fechaActual = new Date();
    const fechaInicioActual = new Date();
    fechaInicioActual.setMonth(fechaActual.getMonth() - parseInt(meses));
    
    const fechaInicioAnterior = new Date(fechaInicioActual);
    fechaInicioAnterior.setMonth(fechaInicioAnterior.getMonth() - parseInt(meses));
    const fechaFinAnterior = new Date(fechaInicioActual);

    // Obtener datos del período actual
    const periodoActual = await CuestionarioSemanal.find({
      fechaInicio: { $gte: fechaInicioActual, $lte: fechaActual },
      ...(tipoEstablecimiento && tipoEstablecimiento !== 'todos' && { tipoEstablecimiento })
    });

    // Obtener datos del período anterior
    const periodoAnterior = await CuestionarioSemanal.find({
      fechaInicio: { $gte: fechaInicioAnterior, $lte: fechaFinAnterior },
      ...(tipoEstablecimiento && tipoEstablecimiento !== 'todos' && { tipoEstablecimiento })
    });

    // Calcular métricas para ambos períodos
    const calcularMetricas = (datos) => {
      const totalTuristas = datos.reduce((sum, r) => sum + (r.datos.totalPersonas || 0), 0);
      const totalReportes = datos.length;
      const promedioTuristas = totalReportes > 0 ? totalTuristas / totalReportes : 0;
      const turistasNacionales = datos.reduce((sum, r) => sum + (r.datos.turistasNacionales || 0), 0);
      const turistasExtranjeros = datos.reduce((sum, r) => sum + (r.datos.turistasExtranjeros || 0), 0);
      const totalPernoctaciones = datos.reduce((sum, r) => sum + (r.datos.totalPernoctaciones || 0), 0);

      return {
        totalTuristas,
        totalReportes,
        promedioTuristas,
        turistasNacionales,
        turistasExtranjeros,
        totalPernoctaciones,
        porcentajeExtranjeros: totalTuristas > 0 ? ((turistasExtranjeros / totalTuristas) * 100).toFixed(1) : 0
      };
    };

    const metricsActual = calcularMetricas(periodoActual);
    const metricsAnterior = calcularMetricas(periodoAnterior);

    // Calcular variaciones porcentuales
    const calcularVariacion = (anterior, actual) => {
      if (anterior === 0) return actual > 0 ? 100 : 0;
      return (((actual - anterior) / anterior) * 100).toFixed(1);
    };

    const variaciones = {
      turistasTotal: calcularVariacion(metricsAnterior.totalTuristas, metricsActual.totalTuristas),
      reportes: calcularVariacion(metricsAnterior.totalReportes, metricsActual.totalReportes),
      promedio: calcularVariacion(metricsAnterior.promedioTuristas, metricsActual.promedioTuristas),
      extranjeros: calcularVariacion(metricsAnterior.turistasExtranjeros, metricsActual.turistasExtranjeros),
      pernoctaciones: calcularVariacion(metricsAnterior.totalPernoctaciones, metricsActual.totalPernoctaciones)
    };

    res.status(200).json({
      status: 'success',
      data: {
        periodoActual: {
          fechaInicio: fechaInicioActual,
          fechaFin: fechaActual,
          metricas: metricsActual
        },
        periodoAnterior: {
          fechaInicio: fechaInicioAnterior,
          fechaFin: fechaFinAnterior,
          metricas: metricsAnterior
        },
        variaciones,
        resumen: {
          tendenciaGeneral: parseFloat(variaciones.turistasTotal) > 0 ? 'Crecimiento' : 
                           parseFloat(variaciones.turistasTotal) < 0 ? 'Decrecimiento' : 'Estable',
          variacionPrincipal: `${variaciones.turistasTotal > 0 ? '+' : ''}${variaciones.turistasTotal}%`,
          metricas: Object.keys(variaciones).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en comparación de períodos:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Estadísticas específicas por tipo de establecimiento
exports.getEstadisticasPorTipo = async (req, res) => {
    try {
        const { tipo } = req.params;
        const { meses = 6, limite = 10 } = req.query;
        
        console.log(`📊 Estadísticas para tipo: ${tipo}`);
        
        if (!['hotel', 'cabana', 'airbnb'].includes(tipo)) {
            return res.status(400).json({
                status: 'error',
                message: 'Tipo de establecimiento no válido'
            });
        }
        
        const fechaLimite = new Date();
        fechaLimite.setMonth(fechaLimite.getMonth() - parseInt(meses));
        
        const cuestionarios = await CuestionarioSemanal.find({
            tipoEstablecimiento: tipo,
            fechaInicio: { $gte: fechaLimite }
        }).populate(getPopulateField(tipo), getSelectFields(tipo));
        
        // Estadísticas agregadas por establecimiento
        const estadisticasPorEstablecimiento = {};
        
        cuestionarios.forEach(cuestionario => {
            const establecimientoId = getEstablecimientoId(cuestionario);
            const establecimientoNombre = getEstablecimientoNombre(cuestionario);
            
            if (!estadisticasPorEstablecimiento[establecimientoId]) {
                estadisticasPorEstablecimiento[establecimientoId] = {
                    establecimiento: establecimientoNombre,
                    totalReportes: 0,
                    totalTuristas: 0,
                    totalNacionales: 0,
                    totalExtranjeros: 0,
                    totalPernoctaciones: 0,
                    promedioTuristas: 0,
                    ultimoReporte: null,
                    procedenciasUnicas: new Set()
                };
            }
            
            const stats = estadisticasPorEstablecimiento[establecimientoId];
            stats.totalReportes += 1;
            stats.totalTuristas += cuestionario.datos.totalPersonas || 0;
            stats.totalNacionales += cuestionario.datos.turistasNacionales || 0;
            stats.totalExtranjeros += cuestionario.datos.turistasExtranjeros || 0;
            stats.totalPernoctaciones += cuestionario.datos.totalPernoctaciones || 0;
            stats.ultimoReporte = cuestionario.fechaInicio;
            
            if (cuestionario.datos.procedenciaTuristas) {
                stats.procedenciasUnicas.add(cuestionario.datos.procedenciaTuristas);
            }
        });
        
        // Convertir a array y calcular promedios
        const estadisticasArray = Object.values(estadisticasPorEstablecimiento).map(stats => {
            stats.promedioTuristas = stats.totalReportes > 0 ? stats.totalTuristas / stats.totalReportes : 0;
            stats.diversidadProcedencias = stats.procedenciasUnicas.size;
            stats.porcentajeExtranjeros = stats.totalTuristas > 0 ? 
                ((stats.totalExtranjeros / stats.totalTuristas) * 100).toFixed(1) : 0;
            
            // Convertir Set a string para la respuesta
            delete stats.procedenciasUnicas;
            
            return stats;
        }).sort((a, b) => b.totalTuristas - a.totalTuristas);
        
        // Calcular totales generales
        const totales = {
            establecimientos: estadisticasArray.length,
            totalTuristas: estadisticasArray.reduce((sum, e) => sum + e.totalTuristas, 0),
            totalReportes: estadisticasArray.reduce((sum, e) => sum + e.totalReportes, 0),
            promedioGeneral: 0
        };
        
        totales.promedioGeneral = totales.totalReportes > 0 ? 
            (totales.totalTuristas / totales.totalReportes).toFixed(1) : 0;
        
        res.status(200).json({
            status: 'success',
            data: {
                tipo,
                periodo: `Últimos ${meses} meses`,
                totales,
                establecimientos: estadisticasArray.slice(0, limite),
                resumen: {
                    mejorEstablecimiento: estadisticasArray[0]?.establecimiento || 'N/A',
                    mayorPromedio: Math.max(...estadisticasArray.map(e => e.promedioTuristas)),
                    mayorDiversidad: Math.max(...estadisticasArray.map(e => e.diversidadProcedencias))
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error en estadísticas por tipo:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Tendencias mensuales detalladas
exports.getTendenciasMensuales = async (req, res) => {
  try {
    const { tipoEstablecimiento, meses = 12 } = req.query;
    
    console.log(`📈 Generando tendencias mensuales - ${meses} meses`);
    
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - parseInt(meses));
    
    let pipeline = [
      {
        $match: {
          fechaInicio: { $gte: fechaLimite },
          ...(tipoEstablecimiento && tipoEstablecimiento !== 'todos' && { tipoEstablecimiento })
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$fechaInicio' },
            mes: { $month: '$fechaInicio' },
            tipo: '$tipoEstablecimiento'
          },
          totalPersonas: { $sum: '$datos.totalPersonas' },
          totalNacionales: { $sum: '$datos.turistasNacionales' },
          totalExtranjeros: { $sum: '$datos.turistasExtranjeros' },
          totalPernoctaciones: { $sum: '$datos.totalPernoctaciones' },
          totalReportes: { $sum: 1 },
          promedioPersonas: { $avg: '$datos.totalPersonas' },
          establecimientos: { $addToSet: '$hotel' }, // Simplificado
          fechaEjemplo: { $first: '$fechaInicio' }
        }
      },
      {
        $addFields: {
          mesNombre: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id.mes', 1] }, then: 'Enero' },
                { case: { $eq: ['$_id.mes', 2] }, then: 'Febrero' },
                { case: { $eq: ['$_id.mes', 3] }, then: 'Marzo' },
                { case: { $eq: ['$_id.mes', 4] }, then: 'Abril' },
                { case: { $eq: ['$_id.mes', 5] }, then: 'Mayo' },
                { case: { $eq: ['$_id.mes', 6] }, then: 'Junio' },
                { case: { $eq: ['$_id.mes', 7] }, then: 'Julio' },
                { case: { $eq: ['$_id.mes', 8] }, then: 'Agosto' },
                { case: { $eq: ['$_id.mes', 9] }, then: 'Septiembre' },
                { case: { $eq: ['$_id.mes', 10] }, then: 'Octubre' },
                { case: { $eq: ['$_id.mes', 11] }, then: 'Noviembre' },
                { case: { $eq: ['$_id.mes', 12] }, then: 'Diciembre' }
              ],
              default: 'Desconocido'
            }
          },
          porcentajeExtranjeros: {
            $cond: {
              if: { $gt: ['$totalPersonas', 0] },
              then: { $multiply: [{ $divide: ['$totalExtranjeros', '$totalPersonas'] }, 100] },
              else: 0
            }
          },
          establecimientosUnicos: { $size: '$establecimientos' }
        }
      },
      {
        $sort: { '_id.año': 1, '_id.mes': 1, '_id.tipo': 1 }
      }
    ];
    
    const tendencias = await CuestionarioSemanal.aggregate(pipeline);
    
    // Procesar datos para análisis de crecimiento
    const tendenciasConCrecimiento = tendencias.map((mes, index) => {
      let crecimiento = 0;
      
      // Buscar el mes anterior del mismo tipo
      const mesAnterior = tendencias
        .slice(0, index)
        .reverse()
        .find(m => m._id.tipo === mes._id.tipo);
      
      if (mesAnterior && mesAnterior.totalPersonas > 0) {
        crecimiento = ((mes.totalPersonas - mesAnterior.totalPersonas) / mesAnterior.totalPersonas) * 100;
      }
      
      return {
        ...mes,
        crecimientoMensual: Math.round(crecimiento * 100) / 100, // Redondear a 2 decimales
        esPico: false // Se calculará después
      };
    });
    
    // Identificar picos (top 20% de meses)
    const sortedByTuristas = [...tendenciasConCrecimiento].sort((a, b) => b.totalPersonas - a.totalPersonas);
    const threshold = Math.ceil(sortedByTuristas.length * 0.2);
    const picos = new Set(sortedByTuristas.slice(0, threshold).map(t => `${t._id.año}-${t._id.mes}-${t._id.tipo}`));
    
    tendenciasConCrecimiento.forEach(mes => {
      const key = `${mes._id.año}-${mes._id.mes}-${mes._id.tipo}`;
      mes.esPico = picos.has(key);
    });
    
    // Calcular estadísticas generales
    const resumen = {
      totalMeses: tendenciasConCrecimiento.length,
      promedioMensual: tendenciasConCrecimiento.reduce((sum, m) => sum + m.totalPersonas, 0) / tendenciasConCrecimiento.length,
      mesConMayorAfluencia: sortedByTuristas[0] || null,
      tendenciaGeneral: calcularTendenciaGeneral(tendenciasConCrecimiento),
      variacionPromedio: calcularVariacionPromedio(tendenciasConCrecimiento)
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        tendenciasMensuales: tendenciasConCrecimiento,
        resumen,
        parametros: {
          tipoEstablecimiento: tipoEstablecimiento || 'todos',
          meses: parseInt(meses),
          fechaLimite: fechaLimite.toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en tendencias mensuales:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Top establecimientos por diferentes métricas
exports.getTopEstablecimientos = async (req, res) => {
  try {
    const { metrica = 'turistas', limite = 10, meses = 6 } = req.query;
    
    console.log(`🏆 Top establecimientos por: ${metrica}`);
    
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - parseInt(meses));
    
    const cuestionarios = await CuestionarioSemanal.find({
      fechaInicio: { $gte: fechaLimite }
    })
    .populate('hotel', 'nombre ubicacion')
    .populate('alojamiento', 'nombre tipoPropiedad ubicacion')
    .populate('cabana', 'nombre ubicacion caracteristicas');
    
    // Agrupar por establecimiento
    const establecimientosStats = {};
    
    cuestionarios.forEach(cuestionario => {
      const establecimientoId = getEstablecimientoId(cuestionario);
      const establecimientoInfo = getEstablecimientoInfo(cuestionario);
      
      if (!establecimientosStats[establecimientoId]) {
        establecimientosStats[establecimientoId] = {
          id: establecimientoId,
          ...establecimientoInfo,
          totalTuristas: 0,
          totalReportes: 0,
          totalPernoctaciones: 0,
          totalExtranjeros: 0,
          promedioTuristas: 0,
          consistencia: 0, // Basada en regularidad de reportes
          diversidadProcedencias: new Set(),
          ultimoReporte: null,
          primerReporte: null
        };
      }
      
      const stats = establecimientosStats[establecimientoId];
      stats.totalTuristas += cuestionario.datos.totalPersonas || 0;
      stats.totalReportes += 1;
      stats.totalPernoctaciones += cuestionario.datos.totalPernoctaciones || 0;
      stats.totalExtranjeros += cuestionario.datos.turistasExtranjeros || 0;
      
      // Fechas para calcular consistencia
      const fechaReporte = new Date(cuestionario.fechaInicio);
      if (!stats.primerReporte || fechaReporte < stats.primerReporte) {
        stats.primerReporte = fechaReporte;
      }
      if (!stats.ultimoReporte || fechaReporte > stats.ultimoReporte) {
        stats.ultimoReporte = fechaReporte;
      }
      
      if (cuestionario.datos.procedenciaTuristas) {
        stats.diversidadProcedencias.add(cuestionario.datos.procedenciaTuristas);
      }
    });
    
    // Calcular métricas finales
    Object.values(establecimientosStats).forEach(stats => {
      stats.promedioTuristas = stats.totalReportes > 0 ? stats.totalTuristas / stats.totalReportes : 0;
      stats.porcentajeExtranjeros = stats.totalTuristas > 0 ? 
        (stats.totalExtranjeros / stats.totalTuristas) * 100 : 0;
      stats.diversidadProcedenciasCount = stats.diversidadProcedencias.size;
      
      // Calcular consistencia (reportes por mes activo)
      if (stats.primerReporte && stats.ultimoReporte) {
        const mesesActivos = Math.max(1, 
          (stats.ultimoReporte - stats.primerReporte) / (1000 * 60 * 60 * 24 * 30)
        );
        stats.consistencia = stats.totalReportes / mesesActivos;
      }
      
      // Limpiar para respuesta
      delete stats.diversidadProcedencias;
    });
    
    // Ordenar según métrica solicitada
    const establecimientos = Object.values(establecimientosStats);
    
    let sortFunction;
    switch (metrica) {
      case 'turistas':
        sortFunction = (a, b) => b.totalTuristas - a.totalTuristas;
        break;
      case 'promedio':
        sortFunction = (a, b) => b.promedioTuristas - a.promedioTuristas;
        break;
      case 'consistencia':
        sortFunction = (a, b) => b.consistencia - a.consistencia;
        break;
      case 'diversidad':
        sortFunction = (a, b) => b.diversidadProcedenciasCount - a.diversidadProcedenciasCount;
        break;
      case 'extranjeros':
        sortFunction = (a, b) => b.porcentajeExtranjeros - a.porcentajeExtranjeros;
        break;
      default:
        sortFunction = (a, b) => b.totalTuristas - a.totalTuristas;
    }
    
    const topEstablecimientos = establecimientos
      .sort(sortFunction)
      .slice(0, parseInt(limite));
    
    res.status(200).json({
      status: 'success',
      data: {
        metrica,
        topEstablecimientos,
        resumen: {
          totalEstablecimientos: establecimientos.length,
          establecimientoTop: topEstablecimientos[0] || null,
          promedioGeneral: {
            turistas: establecimientos.reduce((sum, e) => sum + e.totalTuristas, 0) / establecimientos.length,
            reportes: establecimientos.reduce((sum, e) => sum + e.totalReportes, 0) / establecimientos.length,
            consistencia: establecimientos.reduce((sum, e) => sum + e.consistencia, 0) / establecimientos.length
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en top establecimientos:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Exportar estadísticas
exports.exportarEstadisticas = async (req, res) => {
  try {
    const { formato = 'json', ...filtros } = req.query;
    
    console.log(`📤 Exportando estadísticas en formato ${formato}...`);
    
    const cuestionarios = await CuestionarioSemanal.find(construirFiltros(filtros))
      .populate('hotel', 'nombre ubicacion')
      .populate('alojamiento', 'nombre tipoPropiedad ubicacion') 
      .populate('cabana', 'nombre ubicacion caracteristicas')
      .sort({ fechaInicio: -1 });

    const estadisticas = await procesarEstadisticasAvanzadas(cuestionarios);

    if (formato === 'csv') {
      // Preparar datos para CSV
      const csvData = cuestionarios.map(c => ({
        Fecha: new Date(c.fechaInicio).toISOString().split('T')[0],
        Tipo: c.tipoEstablecimiento,
        Establecimiento: c.hotel?.nombre || c.alojamiento?.nombre || c.cabana?.nombre || 'N/A',
        'Total Personas': c.datos.totalPersonas || 0,
        'Turistas Nacionales': c.datos.turistasNacionales || 0,
        'Turistas Extranjeros': c.datos.turistasExtranjeros || 0,
        'Total Pernoctaciones': c.datos.totalPernoctaciones || 0,
        'Procedencia': (c.datos.procedenciaTuristas || '').substring(0, 200)
      }));

      // Configurar headers para CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="estadisticas_hospedajes.csv"');
      
      // Enviar CSV (aquí usarías una librería como csv-writer en producción)
      const csvHeaders = Object.keys(csvData[0] || {}).join(',');
      const csvRows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','));
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      return res.send(csvContent);
    }

    // Formato JSON por defecto
    res.status(200).json({
      status: 'success',
      data: {
        cuestionarios: cuestionarios.length,
        estadisticas,
        fechaExportacion: new Date().toISOString(),
        filtrosAplicados: filtros
      }
    });

  } catch (error) {
    console.error('❌ Error al exportar estadísticas:', error);
    res.status(500).json({
      status: 'error', 
      message: error.message
    });
  }
};

// ==================== 🔧 FUNCIONES AUXILIARES ====================

// Procesar estadísticas avanzadas
async function procesarEstadisticasAvanzadas(cuestionarios) {
  try {
    const total = cuestionarios.length;
    
    if (total === 0) {
      return {
        resumen: { total: 0, message: 'No hay datos disponibles' }
      };
    }

    // Calcular totales generales
    const totales = cuestionarios.reduce((acc, cuestionario) => {
      const datos = cuestionario.datos;
      
      acc.totalPersonas += datos.totalPersonas || 0;
      acc.turistasNacionales += datos.turistasNacionales || 0;
      acc.turistasExtranjeros += datos.turistasExtranjeros || 0;
      acc.totalPernoctaciones += datos.totalPernoctaciones || 0;
      
      return acc;
    }, {
      totalPersonas: 0,
      turistasNacionales: 0,
      turistasExtranjeros: 0,
      totalPernoctaciones: 0
    });

    // Estadísticas por tipo de establecimiento
    const porTipo = cuestionarios.reduce((acc, cuestionario) => {
      const tipo = cuestionario.tipoEstablecimiento;
      
      if (!acc[tipo]) {
        acc[tipo] = {
          count: 0,
          totalPersonas: 0,
          promedioPersonas: 0
        };
      }
      
      acc[tipo].count++;
      acc[tipo].totalPersonas += cuestionario.datos.totalPersonas || 0;
      acc[tipo].promedioPersonas = acc[tipo].totalPersonas / acc[tipo].count;
      
      return acc;
    }, {});

    // Análisis temporal (por mes)
    const porMes = cuestionarios.reduce((acc, cuestionario) => {
      const fecha = new Date(cuestionario.fechaInicio);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[mesKey]) {
        acc[mesKey] = {
          mes: mesKey,
          totalPersonas: 0,
          reportes: 0,
          promedio: 0
        };
      }
      
      acc[mesKey].totalPersonas += cuestionario.datos.totalPersonas || 0;
      acc[mesKey].reportes++;
      acc[mesKey].promedio = acc[mesKey].totalPersonas / acc[mesKey].reportes;
      
      return acc;
    }, {});

    // Top procedencias
    const procedencias = {};
    cuestionarios.forEach(cuestionario => {
      const proc = cuestionario.datos.procedenciaTuristas;
      if (proc && proc.trim().length > 0) {
        const procKey = proc.substring(0, 100); // Limitar longitud
        
        if (!procedencias[procKey]) {
          procedencias[procKey] = {
            descripcion: procKey,
            count: 0,
            totalTuristas: 0
          };
        }
        
        procedencias[procKey].count++;
        procedencias[procKey].totalTuristas += cuestionario.datos.totalPersonas || 0;
      }
    });

    const topProcedencias = Object.values(procedencias)
      .sort((a, b) => b.totalTuristas - a.totalTuristas)
      .slice(0, 10);

    return {
      resumen: {
        total,
        ...totales,
        promedioPersonasPorReporte: total > 0 ? Math.round(totales.totalPersonas / total) : 0,
        porcentajeExtranjeros: totales.totalPersonas > 0 ? 
          ((totales.turistasExtranjeros / totales.totalPersonas) * 100).toFixed(1) : 0
      },
      porTipo,
      tendenciaMensual: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)),
      topProcedencias
    };
    
  } catch (error) {
    console.error('❌ Error al procesar estadísticas:', error);
    throw error;
  }
}

// Construir filtros para queries
function construirFiltros(query) {
  const { tipoEstablecimiento, fechaInicio, fechaFin, periodo = 'trimestre' } = query;
  let filtros = {};
  
  if (tipoEstablecimiento && tipoEstablecimiento !== 'todos') {
    filtros.tipoEstablecimiento = tipoEstablecimiento;
  }
  
  if (fechaInicio && fechaFin) {
    filtros.fechaInicio = {
      $gte: new Date(fechaInicio),
      $lte: new Date(fechaFin)
    };
  } else {
    const ahora = new Date();
    let fechaLimite = new Date();
    
    switch(periodo) {
      case 'trimestre':
        fechaLimite.setMonth(ahora.getMonth() - 3);
        break;
      case 'semestre':
        fechaLimite.setMonth(ahora.getMonth() - 6);
        break;
      case 'año':
        fechaLimite.setFullYear(ahora.getFullYear() - 1);
        break;
    }
    
    filtros.fechaInicio = { $gte: fechaLimite };
  }
  
  return filtros;
}

function getPopulateField(tipo) {
    switch (tipo) {
        case 'hotel': return 'hotel';
        case 'airbnb': return 'alojamiento';
        case 'cabana': return 'cabana';
        default: return 'hotel';
    }
}

function getSelectFields(tipo) {
    switch (tipo) {
        case 'hotel': return 'nombre ubicacion';
        case 'airbnb': return 'nombre tipoPropiedad ubicacion';
        case 'cabana': return 'nombre ubicacion caracteristicas';
        default: return 'nombre ubicacion';
    }
}

function getEstablecimientoId(cuestionario) {
    return cuestionario.hotel?._id || 
           cuestionario.alojamiento?._id || 
           cuestionario.cabana?._id || 
           'desconocido';
}

function getEstablecimientoNombre(cuestionario) {
    return cuestionario.hotel?.nombre || 
           cuestionario.alojamiento?.nombre || 
           cuestionario.cabana?.nombre || 
           'Establecimiento desconocido';
}

function getEstablecimientoInfo(cuestionario) {
    if (cuestionario.hotel) {
        return {
            nombre: cuestionario.hotel.nombre,
            tipo: 'Hotel',
            ubicacion: cuestionario.hotel.ubicacion
        };
    } else if (cuestionario.alojamiento) {
        return {
            nombre: cuestionario.alojamiento.nombre,
            tipo: 'Airbnb',
            ubicacion: cuestionario.alojamiento.ubicacion
        };
    } else if (cuestionario.cabana) {
        return {
            nombre: cuestionario.cabana.nombre,
            tipo: 'Cabaña',
            ubicacion: cuestionario.cabana.ubicacion
        };
    } else {
        return {
            nombre: 'Desconocido',
            tipo: 'N/A',
            ubicacion: 'N/A'
        };
    }
}

function calcularTendenciaGeneral(tendencias) {
    if (tendencias.length < 2) return 'Insuficientes datos';
    
    const primerosMeses = tendencias.slice(0, Math.ceil(tendencias.length / 3));
    const ultimosMeses = tendencias.slice(-Math.ceil(tendencias.length / 3));
    
    const promedioPrimeros = primerosMeses.reduce((sum, m) => sum + m.totalPersonas, 0) / primerosMeses.length;
    const promedioUltimos = ultimosMeses.reduce((sum, m) => sum + m.totalPersonas, 0) / ultimosMeses.length;
    
    const variacion = ((promedioUltimos - promedioPrimeros) / promedioPrimeros) * 100;
    
    if (variacion > 10) return 'Crecimiento fuerte';
    if (variacion > 3) return 'Crecimiento moderado';
    if (variacion > -3) return 'Estable';
    if (variacion > -10) return 'Decrecimiento moderado';
    return 'Decrecimiento fuerte';
}

function calcularVariacionPromedio(tendencias) {
    if (tendencias.length < 2) return 0;
    
    const variaciones = tendencias
        .filter(t => t.crecimientoMensual !== 0)
        .map(t => Math.abs(t.crecimientoMensual));
    
    return variaciones.length > 0 ? 
        variaciones.reduce((sum, v) => sum + v, 0) / variaciones.length : 0;
}