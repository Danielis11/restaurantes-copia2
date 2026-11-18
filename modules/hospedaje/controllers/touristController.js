const PartnerReview = require('../models/PartnerReview');
const PartnerRestaurant = require('../models/PartnerRestaurant');
const Review = require('../models/Review');

// Mapeo de tipoHospedaje a datos legibles
const HOSPEDAJE_CONFIG = {
    hotel: { tipoLugar: 'Hotel', icon: 'fa-hotel', color: '#2e8b57' },
    cabana: { tipoLugar: 'Cabaña', icon: 'fa-home', color: '#8b6914' },
    airbnb: { tipoLugar: 'Airbnb', icon: 'fa-building', color: '#ff5a5f' }
};

// Obtener las reseñas del turista logueado (ambas BDs: partner + local)
exports.getMyReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        let allReviews = [];

        // ===== 1. Reseñas de RESTAURANTE (Partner DB) =====
        try {
            const partnerReviews = await PartnerReview.find({ userId }).sort({ fechaCreacion: -1 });

            const partnerWithDetails = await Promise.all(partnerReviews.map(async (review) => {
                let lugarNombre = 'Restaurante';
                let lugarUrl = '#';

                try {
                    const restaurant = await PartnerRestaurant.findById(review.restaurantId);
                    if (restaurant) {
                        lugarNombre = restaurant.nombre || 'Restaurante';
                        lugarUrl = `/restaurante.html?id=${review.restaurantId}`;
                    }
                } catch (e) {
                    console.error('Error buscando restaurante:', e.message);
                }

                return {
                    _id: review._id,
                    rating: review.rating,
                    comentario: review.comentario,
                    imagenUrl: review.imagenUrl,
                    fotos: review.fotos || [],
                    estado: review.estado,
                    fechaCreacion: review.fechaCreacion || review.createdAt,
                    tipoLugar: 'Restaurante',
                    lugarNombre,
                    lugarUrl,
                    origen: 'partner'
                };
            }));

            allReviews = allReviews.concat(partnerWithDetails);
        } catch (partnerErr) {
            console.error('⚠️ Error cargando reseñas de partner (no crítico):', partnerErr.message);
        }

        // ===== 2. Reseñas de HOSPEDAJE (Local DB) =====
        try {
            const localReviews = await Review.find({ userId }).sort({ fecha: -1 });

            const localWithDetails = localReviews.map(review => {
                const config = HOSPEDAJE_CONFIG[review.tipoHospedaje] || HOSPEDAJE_CONFIG.hotel;
                return {
                    _id: review._id,
                    rating: review.rating,
                    comentario: review.comentario,
                    imagenUrl: null,
                    fotos: [],
                    estado: 'aprobada',
                    fechaCreacion: review.fecha || review.createdAt,
                    tipoLugar: config.tipoLugar,
                    lugarNombre: review.nombreHospedaje || config.tipoLugar,
                    lugarUrl: `/hospedaje-detalle.html?tipo=${review.tipoHospedaje}&id=${review.hospedajeId}`,
                    origen: 'local'
                };
            });

            allReviews = allReviews.concat(localWithDetails);
        } catch (localErr) {
            console.error('⚠️ Error cargando reseñas locales (no crítico):', localErr.message);
        }

        // ===== 3. Ordenar todas por fecha (más reciente primero) =====
        allReviews.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

        res.json({
            success: true,
            data: allReviews
        });
    } catch (error) {
        console.error('Error al obtener reseñas del turista:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus reseñas'
        });
    }
};

// Eliminar una reseña de RESTAURANTE (partner) del turista
exports.deleteMyReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = req.params.id;

        const review = await PartnerReview.findOne({ _id: reviewId, userId });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Reseña no encontrada o no te pertenece'
            });
        }

        await PartnerReview.deleteOne({ _id: reviewId });

        res.json({
            success: true,
            message: 'Reseña eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar reseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la reseña'
        });
    }
};

// Eliminar una reseña de HOSPEDAJE (local) del turista
exports.deleteMyHospedajeReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = req.params.id;

        const review = await Review.findOne({ _id: reviewId, userId });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Reseña no encontrada o no te pertenece'
            });
        }

        await Review.deleteOne({ _id: reviewId });

        res.json({
            success: true,
            message: 'Reseña de hospedaje eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar reseña de hospedaje:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la reseña'
        });
    }
};

// ===== FAVORITOS =====

// Helper: Buscar usuario en ambos modelos (User local o Tourist del partner)
async function findUserForFavorites(userId) {
    const User = require('../models/User');
    const Tourist = require('../models/Tourist');
    
    let user = await User.findById(userId);
    if (user) return { user, model: 'User' };
    
    user = await Tourist.findById(userId);
    if (user) return { user, model: 'Tourist' };
    
    return { user: null, model: null };
}

// Obtener favoritos del turista
exports.getFavorites = async (req, res) => {
    try {
        const { user, model } = await findUserForFavorites(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            data: {
                hospedajes: user.favorites || []
            }
        });
    } catch (error) {
        console.error('Error al obtener favoritos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus favoritos'
        });
    }
};

// Agregar a favoritos
exports.addFavorite = async (req, res) => {
    try {
        const { hospedajeId, tipoHospedaje, nombreHospedaje } = req.body;

        if (!hospedajeId || !tipoHospedaje) {
            return res.status(400).json({
                success: false,
                message: 'hospedajeId y tipoHospedaje son requeridos'
            });
        }

        const { user, model } = await findUserForFavorites(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Inicializar favorites si no existe (para Tourist u otros modelos que no lo tienen)
        if (!user.favorites) {
            user.favorites = [];
        }

        // Verificar si ya existe
        const exists = user.favorites.some(
            f => f.hospedajeId && f.hospedajeId.toString() === hospedajeId
        );

        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Este hospedaje ya está en tus favoritos'
            });
        }

        user.favorites.push({
            hospedajeId,
            tipoHospedaje,
            nombreHospedaje: nombreHospedaje || ''
        });

        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Agregado a favoritos',
            data: user.favorites
        });
    } catch (error) {
        console.error('Error al agregar favorito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar a favoritos'
        });
    }
};

// Eliminar de favoritos
exports.removeFavorite = async (req, res) => {
    try {
        const { hospedajeId } = req.params;
        const { user, model } = await findUserForFavorites(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        if (!user.favorites) {
            user.favorites = [];
        }

        user.favorites = user.favorites.filter(
            f => f.hospedajeId && f.hospedajeId.toString() !== hospedajeId
        );

        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            message: 'Eliminado de favoritos',
            data: user.favorites
        });
    } catch (error) {
        console.error('Error al eliminar favorito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar de favoritos'
        });
    }
};

// Verificar si un hospedaje está en favoritos
exports.checkFavorite = async (req, res) => {
    try {
        const { hospedajeId } = req.params;
        const { user, model } = await findUserForFavorites(req.user.id);

        if (!user) {
            return res.json({ success: true, isFavorite: false });
        }

        const isFavorite = (user.favorites || []).some(
            f => f.hospedajeId && f.hospedajeId.toString() === hospedajeId
        );

        res.json({
            success: true,
            isFavorite
        });
    } catch (error) {
        console.error('Error al verificar favorito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar favorito'
        });
    }
};
