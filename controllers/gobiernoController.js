const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Guia = require('../models/Guia');
const Tour = require('../models/Tour');
const Agencia = require('../models/Agencia');
const Review = require('../models/Review');
const Hotel = require('../models/Hotel');
const Cabana = require('../models/Cabana');
const Airbnb = require('../models/Airbnb');

// ===== DASHBOARD COMPLETO GUBERNAMENTAL =====
exports.getDashboardStats = async (req, res) => {
  try {
    // ─── Conteos Generales ───
    const [totalRestaurantes, restaurantesActivos, totalUsuarios, totalGuias, guiasActivos, totalTours, totalAgencias] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ activo: true }),
      User.countDocuments(),
      Guia.countDocuments(),
      Guia.countDocuments({ estado: 'activo', activo: true }),
      Tour.countDocuments(),
      Agencia.countDocuments()
    ]);

    // ─── Rating Promedio General (Restaurantes) usando Review Model ───
    const restaurantReviews = await Review.aggregate([
      { $group: { _id: '$restaurantId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    let sumaRating = 0;
    let conRating = 0;
    const ratingMap = {}; 
    
    restaurantReviews.forEach(r => {
      if (r.avgRating > 0 && r._id) {
        sumaRating += r.avgRating;
        conRating++;
        ratingMap[r._id.toString()] = { rating: parseFloat(r.avgRating.toFixed(1)), totalResenas: r.count };
      }
    });

    const ratingPromedio = conRating > 0 ? parseFloat((sumaRating / conRating).toFixed(1)) : 0;

    // ─── Distribución por Tipo de Restaurante ───
    const statsTipo = await Restaurant.aggregate([
      { $group: { _id: '$tipo', count: { $sum: 1 } } }
    ]);
    const estadisticasTipo = {};
    statsTipo.forEach(st => { if (st._id) estadisticasTipo[st._id] = st.count; });

    // ─── Crecimiento Mensual (últimos 6 meses) - Datos Reales ───
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [restaurantTrend, userTrend] = await Promise.all([
      Restaurant.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const crecimiento = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const rEntry = restaurantTrend.find(r => r._id === key);
      const uEntry = userTrend.find(u => u._id === key);
      crecimiento.push({
        period: meses[d.getMonth()],
        periodFull: key,
        nuevosRestaurantes: rEntry?.count || 0,
        nuevosUsuarios: uEntry?.count || 0
      });
    }

    // ─── Restaurantes Top y Bottom (Basado en ratingMap calculado arriba) ───
    const todosRestaurantesInfo = await Restaurant.find({ activo: true })
      .select('nombre tipo direccion.ciudad _id')
      .lean();

    todosRestaurantesInfo.forEach(rest => {
      const stats = ratingMap[rest._id.toString()] || { rating: 0, totalResenas: 0 };
      rest.estadisticas = stats;
    });

    const restConCalificacion = todosRestaurantesInfo.filter(r => r.estadisticas.rating > 0);
    
    // Sort descending
    restConCalificacion.sort((a, b) => b.estadisticas.rating - a.estadisticas.rating);
    const topRestaurantes = restConCalificacion.slice(0, 5);
    
    // Sort ascending
    const bottomRestaurantes = [...restConCalificacion].sort((a, b) => a.estadisticas.rating - b.estadisticas.rating).slice(0, 5);

    // ─── Guías Certificados (con credencial SECTUR) ───
    const guiasCertificados = await Guia.countDocuments({
      credencialSECTUR: { $exists: true, $ne: '' },
      estado: 'activo'
    });

    // ─── Distribución de Tours por Categoría ───
    const toursPorCategoria = await Tour.aggregate([
      { $group: { _id: '$categoria', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ─── Distribución de Tours por Tipo ───
    const toursPorTipo = await Tour.aggregate([
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ─── Empleos Estimados (2 empleados promedio por restaurante) ───
    const empleosEstimados = restaurantesActivos * 2;

    // ─── Restaurantes Inactivos / Sin actualizar ───
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);
    const sinActualizar = await Restaurant.countDocuments({
      updatedAt: { $lt: treintaDiasAtras }
    });

    // ─── Reseñas Negativas Recientes (últimos 7 días, rating <= 2) ───
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
    let resenasNegativas = [];
    try {
      resenasNegativas = await Review.find({
        rating: { $lte: 2 },
        createdAt: { $gte: sieteDiasAtras }
      }).populate('restaurante', 'nombre').limit(10).lean();
    } catch (e) {
      // Si el modelo Review no tiene la estructura esperada
      resenasNegativas = [];
    }

    // ─── Guías: lista con certificación y estado ───
    const guiasDetalle = await Guia.find()
      .select('nombreCompleto credencialSECTUR autorizacionCONANP estado especialidades idiomas calificacionPromedio numeroResenas createdAt')
      .lean();

    // ─── Tours detallados para reporte ───
    const toursDetalle = await Tour.find()
      .select('nombre categoria tipo precio dificultad capacidad duracion calificacionPromedio createdAt')
      .lean();

    // ─── Estadísticas de Hospedajes (Hoteles, Cabañas, Airbnbs) ───
    const [hotelesTotal, hotelesActivos, cabanasTotal, cabanasActivas, airbnbTotal, airbnbActivos] = await Promise.all([
      Hotel.countDocuments(), Hotel.countDocuments({ activo: { $ne: false } }),
      Cabana.countDocuments(), Cabana.countDocuments({ activo: { $ne: false } }),
      Airbnb.countDocuments(), Airbnb.countDocuments({ activo: { $ne: false } })
    ]);

    const [hotelAgg, cabanaAgg, airbnbAgg] = await Promise.all([
      Hotel.aggregate([{ $match: { 'calificacion.promedio': { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$calificacion.promedio' } } }]),
      Cabana.aggregate([{ $match: { 'calificacion.promedio': { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$calificacion.promedio' } } }]),
      Airbnb.aggregate([{ $match: { 'calificacion.promedio': { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$calificacion.promedio' } } }])
    ]);

    const statsHospedajes = {
      hoteles: { total: hotelesTotal, activos: hotelesActivos, promedio: hotelAgg[0]?.avg ? parseFloat(hotelAgg[0].avg.toFixed(1)) : 0 },
      cabanas: { total: cabanasTotal, activos: cabanasActivas, promedio: cabanaAgg[0]?.avg ? parseFloat(cabanaAgg[0].avg.toFixed(1)) : 0 },
      airbnbs: { total: airbnbTotal, activos: airbnbActivos, promedio: airbnbAgg[0]?.avg ? parseFloat(airbnbAgg[0].avg.toFixed(1)) : 0 }
    };

    // ─── Ubicaciones para mapa de calor (Combinadas) ───
    const [ubicacionesRestaurantes, ubicacionesHoteles, ubicacionesCabanas, ubicacionesAirbnbs] = await Promise.all([
      // Buscar restaurantes
      (async () => {
        const query = { 'ubicacion.coordinates': { $exists: true } };
        const restaurantes = await Restaurant.find(query)
              .select('nombre tipo ubicacion direccion.ciudad activo _id').lean();

        // Consultar ratings reales desde Review
        const resenasAgg = await Review.aggregate([
          { $group: { _id: '$restaurantId', avg: { $avg: '$rating' } } }
        ]);
        const mapRatings = {};
        resenasAgg.forEach(r => mapRatings[r._id?.toString()] = parseFloat(r.avg.toFixed(1)));

        // Inyectar el rating en el objeto de salida
        restaurantes.forEach(r => {
          r.estadisticas = { rating: mapRatings[r._id.toString()] || 0 };
        });
        return restaurantes;
      })(),
        Hotel.find({ $or: [{ 'ubicacion.coordenadas.lat': { $exists: true } }, { 'ubicacion.lat': { $exists: true } }, { 'latitud': { $exists: true } }] })
            .select('nombre ubicacion latitud longitud calificacion activo').lean(),
        Cabana.find({ $or: [{ 'ubicacion.coordenadas.lat': { $exists: true } }, { 'ubicacion.lat': { $exists: true } }, { 'latitud': { $exists: true } }] })
            .select('nombre ubicacion latitud longitud calificacion activo').lean(),
        Airbnb.find({ $or: [{ 'ubicacion.coordenadas.lat': { $exists: true } }, { 'ubicacion.lat': { $exists: true } }, { 'latitud': { $exists: true } }] })
            .select('nombre ubicacion latitud longitud calificacion activo').lean()
    ]);

    const formatHospUbicacion = (docs, fallbackTipo) => docs.map((d) => {
        let lat = null, lng = null;
        if (d.ubicacion?.coordenadas?.lat && d.ubicacion?.coordenadas?.lng) { lat = d.ubicacion.coordenadas.lat; lng = d.ubicacion.coordenadas.lng; }
        else if (d.ubicacion?.lat && d.ubicacion?.lng) { lat = d.ubicacion.lat; lng = d.ubicacion.lng; }
        else if (d.latitud && d.longitud) { lat = d.latitud; lng = d.longitud; }

        return {
            nombre: d.nombre,
            tipo: fallbackTipo,
            activo: d.activo !== false,
            estadisticas: { rating: d.calificacion?.promedio || 0 },
            ubicacion: { coordinates: lat && lng ? [lng, lat] : [null, null] } // Mapbox is [lng, lat]
        };
    }).filter(d => d.ubicacion.coordinates[0] !== null);

    const ubicaciones = [
        ...ubicacionesRestaurantes,
        ...formatHospUbicacion(ubicacionesHoteles, 'hotel'),
        ...formatHospUbicacion(ubicacionesCabanas, 'cabaña'),
        ...formatHospUbicacion(ubicacionesAirbnbs, 'airbnb')
    ];

    // ─── Respuesta completa ───
    const stats = {
      resumen: {
        totalRestaurantes,
        restaurantesActivos,
        totalUsuarios,
        totalGuias,
        guiasActivos,
        guiasCertificados,
        totalTours,
        totalAgencias,
        ratingPromedio,
        restaurantesConRating: conRating,
        empleosEstimados,
        sinActualizar
      },
      estadisticasTipo,
      crecimiento,
      topRestaurantes,
      bottomRestaurantes,
      toursPorCategoria: toursPorCategoria.reduce((acc, t) => { if (t._id) acc[t._id] = t.count; return acc; }, {}),
      toursPorTipo: toursPorTipo.reduce((acc, t) => { if (t._id) acc[t._id] = t.count; return acc; }, {}),
      guiasDetalle,
      toursDetalle,
      ubicaciones,
      resenasNegativas,
      hospedajes: statsHospedajes,
      alertas: {
        sinActualizar,
        resenasNegativasCount: resenasNegativas.length,
        guiasSinCertificar: totalGuias > 0 ? totalGuias - guiasCertificados : 0
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching government stats:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Obtener listado de restaurantes de solo-lectura
exports.getRestaurantsReadOnly = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate({
      path: 'adminId',
      select: 'nombre apellido email'
    }).lean();

    // Consultar ratings reales desde Review
    const resenasAgg = await Review.aggregate([
      { $group: { _id: '$restaurantId', avg: { $avg: '$rating' } } }
    ]);
    const mapRatings = {};
    resenasAgg.forEach(r => mapRatings[r._id?.toString()] = parseFloat(r.avg.toFixed(1)));

    // Inyectar el rating en el objeto de salida
    restaurants.forEach(r => {
      if (!r.estadisticas) r.estadisticas = {};
      r.estadisticas.rating = mapRatings[r._id.toString()] || 0;
    });

    res.json({ success: true, data: restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
