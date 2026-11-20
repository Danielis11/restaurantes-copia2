// Turistas: registro/login, perfil, favoritos, notificaciones y sus reseñas
// (Movido desde server.js sin cambios de lógica)
const express = require('express');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Review = require('../models/Review');
const Tour = require('../models/Tour');
const Agencia = require('../models/Agencia');
const { ReviewTurismo } = require('../models/turismoModels');
const { verificarTokenUsuario, generarToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimits');
const { enviarCodigoVerificacion } = require('../utils/correo');

const router = express.Router();
// POST /api/auth/user/register
router.post('/api/auth/user/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, email y contraseña son obligatorios' });
    }

    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ success: false, message: 'Ya existe una cuenta con este correo' });
    }

    // La cuenta nace sin verificar: se manda un código al correo
    const newUser = new User({ nombre, email, password, emailVerificado: false });
    const codigo = newUser.crearCodigoVerificacion();
    await newUser.save();
    const correoEnviado = await enviarCodigoVerificacion(newUser, codigo);
    const token = generarToken(newUser._id); // Usamos la misma función de JWT del admin

    res.status(201).json({
      success: true,
      data: {
        user: { id: newUser._id, nombre: newUser.nombre, email: newUser.email, rol: 'turista', emailVerificado: false },
        token,
        correoEnviado
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Error registro turista:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/user/login
router.post('/api/auth/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const passwordValida = await user.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = generarToken(user._id);

    res.json({
      success: true,
      data: {
        user: { id: user._id, nombre: user.nombre, email: user.email, rol: 'turista', emailVerificado: user.emailVerificado !== false },
        token
      }
    });
  } catch (error) {
    console.error('Error login turista:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/user/verificar-correo - Confirmar la cuenta con el código del correo
router.post('/api/auth/user/verificar-correo', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+codigoVerificacion +codigoVerificacionExpira +intentosVerificacion');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    if (user.emailVerificado !== false) return res.json({ success: true, message: 'Tu correo ya está confirmado' });
    if ((user.intentosVerificacion || 0) >= 5) {
      return res.status(429).json({ success: false, message: 'Demasiados intentos. Pide un código nuevo.' });
    }
    if (!/^\d{6}$/.test(String(req.body.codigo || '').trim()) || !user.codigoVerificacionValido(req.body.codigo)) {
      user.intentosVerificacion = (user.intentosVerificacion || 0) + 1;
      await user.save({ validateBeforeSave: false });
      const vencido = user.codigoVerificacionExpira && user.codigoVerificacionExpira < new Date();
      return res.status(400).json({ success: false, message: vencido ? 'El código ya venció. Pide uno nuevo.' : 'El código no es correcto.' });
    }
    user.emailVerificado = true;
    user.codigoVerificacion = undefined;
    user.codigoVerificacionExpira = undefined;
    user.intentosVerificacion = 0;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: '¡Correo confirmado!' });
  } catch (error) {
    console.error('Error verificando correo:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/user/reenviar-verificacion - Mandar otro código (uno por minuto)
router.post('/api/auth/user/reenviar-verificacion', authLimiter, verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+codigoVerificacionEnviado');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    if (user.emailVerificado !== false) return res.json({ success: true, message: 'Tu correo ya está confirmado' });
    if (user.codigoVerificacionEnviado && Date.now() - user.codigoVerificacionEnviado.getTime() < 60 * 1000) {
      return res.status(429).json({ success: false, message: 'Espera un minuto antes de pedir otro código.' });
    }
    const codigo = user.crearCodigoVerificacion();
    await user.save({ validateBeforeSave: false });
    const enviado = await enviarCodigoVerificacion(user, codigo);
    if (!enviado && process.env.NODE_ENV === 'production') {
      return res.status(502).json({ success: false, message: 'No pudimos enviar el correo. Intenta más tarde.' });
    }
    res.json({ success: true, message: 'Te enviamos un código nuevo a ' + user.email });
  } catch (error) {
    console.error('Error reenviando verificación:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// GET /api/auth/user/profile
router.get('/api/auth/user/profile', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const userWithRol = user.toObject ? user.toObject() : { ...user };
    userWithRol.rol = 'turista';
    res.json({ success: true, data: userWithRol });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo perfil' });
  }
});

// PUT /api/auth/user/profile - Actualizar perfil de turista
router.put('/api/auth/user/profile', verificarTokenUsuario, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (nombre) user.nombre = nombre;
    if (email) {
      // Verificar si el email ya está en uso por otro usuario
      if (email !== user.email) {
         const existingEmail = await User.findOne({ email });
         if (existingEmail) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya está en uso' });
         }
      }
      if (email !== user.email) {
        user.email = email;
        user.emailVerificado = false;
        var codigoNuevoCorreo = user.crearCodigoVerificacion();
      }
    }
    if (password) {
      user.password = password; // Se hasheará en el pre-save hook de Mongoose
    }

    await user.save();
    if (codigoNuevoCorreo) await enviarCodigoVerificacion(user, codigoNuevoCorreo);
    
    // Devolver el super user act. sin password
    res.json({ 
      success: true, 
      message: 'Perfil actualizado correctamente', 
      data: { _id: user._id, nombre: user.nombre, email: user.email, rol: user.rol, emailVerificado: user.emailVerificado !== false }
    });
  } catch (error) {
    console.error('Error actualizando perfil turista:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar perfil' });
  }
});

// Obtener todos los favoritos del usuario (BD local)
router.get('/api/user/favorites', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favoritos')
      .populate('experienciasFavoritas.tourId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    res.json({ 
      success: true, 
      data: {
        restaurantes: user.favoritos || [],
        experiencias: user.experienciasFavoritas || []
      }
    });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener favoritos' });
  }
});

// Alternar (Agregar/Quitar) un restaurante de favoritos
router.post('/api/user/favorites/:id', verificarTokenUsuario, async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const index = user.favoritos.indexOf(restaurantId);
    let isFavorite = false;

    if (index === -1) {
      // No está en favoritos, agregarlo
      user.favoritos.push(restaurantId);
      isFavorite = true;
      
      // Inteligencia Conceptual: Generar notificación al guardar un favorito
      try {
        const restInfo = await Restaurant.findById(restaurantId).select('nombre');
        if (restInfo) {
          user.notificaciones.push({
            mensaje: `¡Has guardado ${restInfo.nombre} en tus favoritos! ¿Por qué no dejas una reseña cuando lo visites?`,
            tipo: 'recordatorio-reseña'
          });
        }
      } catch(e) { console.error('Error generando notificación:', e); }
      
    } else {
      // Ya está en favoritos, quitarlo
      user.favoritos.splice(index, 1);
      isFavorite = false;
    }

    await user.save();
    
    res.json({ 
      success: true, 
      message: isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos',
      isFavorite 
    });
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al modificar favoritos' });
  }
});

// Alternar (Agregar/Quitar) un tour de experiencias favoritas (con clasificación)
router.post('/api/user/tour-favorites/:id', verificarTokenUsuario, async (req, res) => {
  try {
    const tourId = req.params.id;
    const { tipoMeGusta = 'Favorito general' } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const index = user.experienciasFavoritas.findIndex(f => f.tourId.toString() === tourId);
    let isFavorite = false;

    if (index === -1) {
      // No está en favoritos, agregarlo
      user.experienciasFavoritas.push({ tourId, tipoMeGusta });
      isFavorite = true;
    } else {
      // Ya está en favoritos, si cambia el tipo actualizarlo, si es el mismo u otra acción, quitarlo
      if (req.body.updateOnly && user.experienciasFavoritas[index].tipoMeGusta !== tipoMeGusta) {
         user.experienciasFavoritas[index].tipoMeGusta = tipoMeGusta;
         isFavorite = true;
      } else {
         user.experienciasFavoritas.splice(index, 1);
         isFavorite = false;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos',
      isFavorite,
      experienciasFavoritas: user.experienciasFavoritas
    });
  } catch (error) {
    console.error('Error al alternar favorito de tour:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al modificar favoritos' });
  }
});

// Alternar restaurante o agencia favorita (Agencia)
router.post('/api/user/favorito-agencia', verificarTokenUsuario, async (req, res) => {
  try {
    const { agenciaId } = req.body;
    if (!agenciaId) return res.status(400).json({ success: false, message: 'ID de agencia requerido' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Ensure array exists
    if (!user.agenciasFavoritas) user.agenciasFavoritas = [];

    const index = user.agenciasFavoritas.indexOf(agenciaId);
    let isFavorite = false;

    if (index === -1) {
      user.agenciasFavoritas.push(agenciaId);
      isFavorite = true;
    } else {
      user.agenciasFavoritas.splice(index, 1);
      isFavorite = false;
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorite ? 'Agencia añadida a favoritos' : 'Agencia eliminada de favoritos',
      isFavorite
    });
  } catch (error) {
    console.error('Error al alternar favorito de agencia:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Obtener notificaciones del usuario
router.get('/api/user/notifications', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificaciones');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    // Ordenar notificaciones por fecha (más recientes primero)
    const sortedNotifs = user.notificaciones.sort((a,b) => b.fecha - a.fecha);
    
    res.json({ success: true, data: sortedNotifs });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener notificaciones' });
  }
});

// Marcar notificación como leída
router.patch('/api/user/notifications/:id/read', verificarTokenUsuario, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const notificacion = user.notificaciones.id(req.params.id);
    if (notificacion) {
      notificacion.leida = true;
      await user.save();
      res.json({ success: true, message: 'Notificación marcada como leída' });
    } else {
      res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Obtener reseñas del usuario — UNIFICADAS (BD local + turismo-db)
router.get('/api/user/reviews', verificarTokenUsuario, async (req, res) => {
  try {
    const userId = req.user._id;

    // === 1. Reseñas LOCALES: restaurantes (modelo Review local) ===
    const restaurantReviews = await Review.find({ userId })
      .populate('restaurantId', 'nombre imagenes direccion')
      .sort({ fechaCreacion: -1 });

    const mappedRestaurant = restaurantReviews.map(r => ({
      _id: r._id,
      tipoLugar: 'Restaurante',
      lugarId: r.restaurantId?._id || r.restaurantId,
      lugarNombre: r.restaurantId?.nombre || 'Restaurante Desconocido',
      lugarUrl: `/restaurante.html?id=${r.restaurantId?._id || r.restaurantId}`,
      rating: r.rating,
      comentario: r.comentario,
      fotos: r.fotos || [],
      estado: r.estado,
      fechaCreacion: r.fechaCreacion
    }));

    // === 2. Reseñas LOCALES: tours (embebidas en Tour.resenas) ===
    const toursWithMyReviews = await Tour.find({ 'resenas.usuario': userId });
    const mappedTours = [];
    toursWithMyReviews.forEach(tour => {
      tour.resenas.forEach(resena => {
        if (resena.usuario.toString() === userId.toString()) {
          mappedTours.push({
            _id: resena._id,
            tourId: tour._id,
            tipoLugar: 'Experiencia',
            lugarId: tour._id,
            lugarNombre: tour.nombre?.es || 'Experiencia Desconocida',
            lugarUrl: `/experiencia.html?id=${tour._id}`,
            rating: resena.calificacion,
            comentario: resena.comentario,
            fotos: resena.fotos || [],
            estado: 'aprobada',
            fechaCreacion: resena.fecha
          });
        }
      });
    });

    // === 3. Reseñas LOCALES: agencias ===
    const agenciasWithMyReviews = await Agencia.find({ 'resenas.usuario': userId });
    const mappedAgencias = [];
    agenciasWithMyReviews.forEach(agencia => {
      agencia.resenas.forEach(resena => {
        if (resena.usuario.toString() === userId.toString()) {
          mappedAgencias.push({
            _id: resena._id,
            agenciaId: agencia._id,
            tipoLugar: 'Agencia',
            lugarId: agencia._id,
            lugarNombre: agencia.nombre || 'Agencia Desconocida',
            lugarUrl: `/agencia.html?id=${agencia._id}`,
            rating: resena.calificacion,
            comentario: resena.comentario,
            fotos: resena.fotos || [],
            estado: resena.estado || 'aprobada',
            fechaCreacion: resena.fecha
          });
        }
      });
    });

    // === 4. Reseñas de TURISMO-DB (hospedajes: hoteles, cabañas, airbnbs) ===
    const hospedajeReviews = await ReviewTurismo.find({ userId: userId.toString() })
      .sort({ fecha: -1 });

    const mappedHospedajes = hospedajeReviews.map(r => ({
      _id: r._id,
      tipoLugar: `Hospedaje (${r.tipoHospedaje || 'hotel'})`,
      lugarId: r.hospedajeId,
      lugarNombre: r.nombreHospedaje || 'Hospedaje Desconocido',
      lugarUrl: '#',
      rating: r.rating,
      comentario: r.comentario,
      fotos: [],
      estado: 'aprobada',
      fechaCreacion: r.fecha || r.createdAt
    }));

    // === 5. Combinar y ordenar ===
    const allReviews = [...mappedRestaurant, ...mappedTours, ...mappedAgencias, ...mappedHospedajes]
      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

    res.json({ success: true, count: allReviews.length, data: allReviews });
  } catch (error) {
    console.error('Error obteniendo reseñas del usuario:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener las opiniones' });
  }
});

// Eliminar una reseña propia de RESTAURANTE
router.delete('/api/user/reviews/restaurante/:id', verificarTokenUsuario, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No puedes eliminar una reseña que no es tuya' });
    }
    await review.deleteOne();
    res.json({ success: true, message: 'Reseña eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña de restaurante:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Eliminar una reseña propia de TOUR/EXPERIENCIA
router.delete('/api/user/reviews/tour/:tourId/review/:reviewId', verificarTokenUsuario, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour no encontrado' });

    const resena = tour.resenas.id(req.params.reviewId);
    if (!resena) return res.status(404).json({ success: false, message: 'Reseña no encontrada en este tour' });
    if (resena.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No puedes eliminar una reseña que no es tuya' });
    }

    // Quitar la reseña del array
    tour.resenas.pull(req.params.reviewId);

    // Recalcular estadísticas
    if (tour.resenas.length > 0) {
      const totalCalif = tour.resenas.reduce((sum, r) => sum + r.calificacion, 0);
      tour.calificacionPromedio = totalCalif / tour.resenas.length;
    } else {
      tour.calificacionPromedio = 0;
    }
    tour.numeroResenas = tour.resenas.length;
    await tour.save();
    res.json({ success: true, message: 'Reseña de experiencia eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña de tour:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Eliminar una reseña propia de AGENCIA
router.delete('/api/user/reviews/agencia/:agenciaId/review/:reviewId', verificarTokenUsuario, async (req, res) => {
  try {
    const agencia = await Agencia.findById(req.params.agenciaId);
    if (!agencia) return res.status(404).json({ success: false, message: 'Agencia no encontrada' });

    const resena = agencia.resenas.id(req.params.reviewId);
    if (!resena) return res.status(404).json({ success: false, message: 'Reseña no encontrada en esta agencia' });
    if (resena.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No puedes eliminar una reseña que no es tuya' });
    }

    resena.deleteOne(); // Removes the subdocument
    await agencia.save();

    res.json({ success: true, message: 'Reseña eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reseña de agencia:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

module.exports = router;
