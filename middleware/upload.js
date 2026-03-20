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
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

const localUpload = multer({
  storage: localStorage_m,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten archivos de imagen'), false);
  },
  limits: { fileSize: 50 * 1024 * 1024, files: 10 }
});

// Selector dinámico de middleware
const getUploadMiddleware = () => cloudinaryConfigurado() ? uploadCloudinary : localUpload;

module.exports = {
  getUploadMiddleware,
  localUpload,
  uploadsDir
};
