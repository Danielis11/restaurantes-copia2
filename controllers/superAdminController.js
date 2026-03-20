const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Obtener estadísticas para el Dashboard del Super Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ activo: true });
    
    const totalAdmins = await Admin.countDocuments();
    const adminActivos = await Admin.countDocuments({ activo: true });
    const totalSuperAdmins = await Admin.countDocuments({ rol: 'super-admin' });
    
    // Devolvemos datos organizados como los espera el frontend
    const stats = {
      resumen: {
        totalAdmins,
        adminActivos,
        totalRestaurantes: activeRestaurants,
        restaurantesActivos: activeRestaurants,
        totalSuperAdmins,
        totalUsuarios: totalUsers
      },
      estadisticasTipo: {
        restaurante: activeRestaurants,
        bar: 0,
        cafeteria: 0
      },
      userTrends: [
        { period: 'Ene', newUsers: 10, activeUsers: 8, churned: 2 },
        { period: 'Feb', newUsers: 15, activeUsers: 12, churned: 3 },
        { period: 'Mar', newUsers: 20, activeUsers: 18, churned: 1 }
      ]
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password +passwordPlano');
    res.json({ success: true, data: { admins } });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, rol } = req.body;
    
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ success: false, message: 'El email ya está en uso' });

    // Si tu esquema de Admin ya hashea usando un esquema 'pre-save', puedes pasar solo el password
    const newAdmin = new Admin({ nombre, apellido, email, telefono, rol, password });
    await newAdmin.save();

    res.json({ success: true, data: newAdmin });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, rol, password } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });

    admin.nombre = nombre || admin.nombre;
    admin.apellido = apellido || admin.apellido;
    admin.email = email || admin.email;
    admin.telefono = telefono || admin.telefono;
    admin.rol = rol || admin.rol;
    
    if (password) {
      admin.password = password; // Se aplicará el hook pre-save si existe
    }

    await admin.save();
    res.json({ success: true, data: admin });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });

    admin.activo = !admin.activo;
    await admin.save();
    res.json({ success: true, message: 'Estado del administrador actualizado', data: admin });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });

    if (admin.rol === 'super-admin') {
      const superAdminsCount = await Admin.countDocuments({ rol: 'super-admin' });
      if (superAdminsCount <= 1) {
        return res.status(400).json({ success: false, message: 'No se puede eliminar al último super-admin' });
      }
    }

    await Admin.findByIdAndDelete(id);
    res.json({ success: true, message: 'Administrador eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('adminId', 'nombre apellido');
    res.json({ success: true, data: { restaurants } });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.toggleRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });

    restaurant.activo = !restaurant.activo;
    await restaurant.save();
    res.json({ success: true, message: 'Estado del restaurante actualizado' });
  } catch (error) {
    console.error('Error toggling restaurant status:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    await Restaurant.findByIdAndDelete(id);
    res.json({ success: true, message: 'Restaurante eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Obtener un restaurante por ID
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id).populate('adminId', 'nombre apellido');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
    res.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Crear restaurante con admin (nuevo o existente)
exports.createRestaurantWithAdmin = async (req, res) => {
  try {
    const { adminId, adminData, restaurantData } = req.body;
    let finalAdminId;

    if (adminData) {
      // Create new admin
      const existingAdmin = await Admin.findOne({ email: adminData.email });
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: 'El email del administrador ya está en uso' });
      }
      const newAdmin = new Admin({
        nombre: adminData.nombre,
        apellido: adminData.apellido,
        email: adminData.email,
        password: adminData.password,
        telefono: adminData.telefono,
        rol: 'admin'
      });
      await newAdmin.save();
      finalAdminId = newAdmin._id;
    } else if (adminId) {
      const admin = await Admin.findById(adminId);
      if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
      finalAdminId = adminId;
    } else {
      return res.status(400).json({ success: false, message: 'Se requiere un administrador' });
    }

    // Create restaurant
    const restaurant = new Restaurant({
      ...restaurantData,
      adminId: finalAdminId,
      activo: true
    });
    await restaurant.save();

    res.status(201).json({ success: true, data: restaurant, message: 'Restaurante creado exitosamente' });
  } catch (error) {
    console.error('Error creating restaurant with admin:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// ===== REVIEWS MANAGEMENT =====
exports.getReviews = async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find()
      .populate('restaurantId', 'nombre')
      .populate('userId', 'nombre apellido')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const Review = require('../models/Review');
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    await Review.findByIdAndDelete(id);
    res.json({ success: true, message: 'Reseña eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

exports.changeReviewStatus = async (req, res) => {
  try {
    const Review = require('../models/Review');
    const { id } = req.params;
    const { estado } = req.body;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
    review.estado = estado;
    await review.save();
    res.json({ success: true, message: `Estado de reseña actualizado a ${estado}`, data: review });
  } catch (error) {
    console.error('Error changing review status:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
