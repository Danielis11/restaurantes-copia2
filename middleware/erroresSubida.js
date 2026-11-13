// 🛡️ Manejo de errores de subida de imágenes (multer): responde con un mensaje claro en JSON
const multer = require('multer');

module.exports = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Archivo demasiado grande. Máximo 15MB por imagen.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos. Máximo 10 imágenes por vez.'
      });
    }
  }

  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)'
    });
  }

  next(error);
};
