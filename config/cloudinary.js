// ===== config/cloudinary.js =====
// Configuración de Cloudinary para subida de imágenes en la nube

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const Restaurant = require('../models/Restaurant');

// Configurar Cloudinary con credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to sanitize names for folders
const sanitizeName = (str) => {
  return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
            .replace(/_+/g, '_') // Collapse multiple underscores
            .replace(/^_|_$/g, ''); // Trim underscores
};

// Configurar almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: async (req, file) => {
      try {
        if (req.admin && req.admin._id) {
          // Si es administrador del subsistema de Turismo (tours y guías)
          if (req.admin.rol === 'admin-turismo' || req.originalUrl.includes('/tours') || req.originalUrl.includes('/guias')) {
            const subFolder = req.originalUrl.includes('/guias') ? 'guias' : 'tours';
            return `restaurantes-jalpan/${subFolder}`;
          }

          // Si es administrador de un Restaurante
          const restaurant = await Restaurant.findOne({ adminId: req.admin._id });
          if (restaurant) {
            const tipo = sanitizeName(restaurant.tipo || 'otros');
            const nombre = sanitizeName(restaurant.nombre || 'desconocido');
            return `restaurantes-jalpan/restaurantes/${tipo}/${nombre}`;
          }
        }
        return 'restaurantes-jalpan/otros';
      } catch (error) {
        console.error('Error fetching data for Cloudinary folder:', error);
        return 'restaurantes-jalpan/otros';
      }
    },
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
    transformation: [
      { width: 1200, height: 900, crop: 'limit', quality: 'auto:good' }
    ],
    // El public_id se genera automáticamente con timestamp
    public_id: (req, file) => {
      const timestamp = Date.now();
      const name = file.originalname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      return `${timestamp}_${name}`;
    }
  }
});

// Multer configurado con Cloudinary
const uploadCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP, AVIF, GIF)'), false);
    }
  }
});

// Función para eliminar imagen de Cloudinary por public_id
async function eliminarImagenCloudinary(publicId) {
  try {
    const resultado = await cloudinary.uploader.destroy(publicId);
    console.log('🗑️ Imagen eliminada de Cloudinary:', publicId, resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Error eliminando imagen de Cloudinary:', error);
    throw error;
  }
}

// Función auxiliar: verificar si Cloudinary está configurado
function cloudinaryConfigurado() {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'tu_cloud_name_aqui' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'tu_api_key_aqui' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'tu_api_secret_aqui'
  );
}

module.exports = {
  cloudinary,
  uploadCloudinary,
  eliminarImagenCloudinary,
  cloudinaryConfigurado
};
