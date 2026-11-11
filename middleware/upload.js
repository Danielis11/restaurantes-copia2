// ===== middleware/upload.js =====
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadCloudinary, cloudinaryConfigurado } = require('../config/cloudinary');

// Directorio local como fallback (si Cloudinary no está configurado)
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'restaurants');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer local (fallback sin Cloudinary)
const localStorage_m = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// Lista blanca de extensiones Y tipos MIME. Antes solo se revisaba el MIME (lo manda el navegador
// y se puede falsificar), así que se podía subir un .html con JavaScript y servirlo desde el sitio.
const EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
const MIMES_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const localUpload = multer({
  storage: localStorage_m,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (EXTENSIONES_PERMITIDAS.includes(ext) && MIMES_PERMITIDOS.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten archivos de imagen'), false);
  },
  limits: { fileSize: 15 * 1024 * 1024, files: 10 }
});

// Selector dinámico de middleware
const getUploadMiddleware = () => cloudinaryConfigurado() ? uploadCloudinary : localUpload;

module.exports = {
  getUploadMiddleware,
  localUpload,
  uploadsDir
};
