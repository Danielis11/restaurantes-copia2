const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Verificar si las credenciales de Cloudinary están configuradas
const hasCloudinaryCredentials =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let cloudinary = null;
let hotelStorage, cabanaStorage, airbnbStorage;

/**
 * Sanitiza un nombre para usarlo como carpeta en Cloudinary.
 * Elimina caracteres especiales y reemplaza espacios con guiones bajos.
 * Ejemplo: "Cabaña El Pino #2" => "Cabana_El_Pino_2"
 */
function sanitizeFolderName(name) {
  return name
    .normalize('NFD')                          // separa acentos
    .replace(/[\u0300-\u036f]/g, '')           // elimina diacríticos (tildes, etc.)
    .replace(/[^a-zA-Z0-9\s_-]/g, '')         // elimina caracteres raros
    .trim()
    .replace(/\s+/g, '_');                     // espacios → guiones bajos
}

if (hasCloudinaryCredentials) {
  // ✅ Usar Cloudinary si hay credenciales configuradas
  const cloudinaryLib = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinaryLib.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  cloudinary = cloudinaryLib;

  console.log('☁️ Cloudinary configurado correctamente');

  /**
   * Crea un CloudinaryStorage dinámico para un tipo de hospedaje.
   * La carpeta destino se construye como:
   *   turismo-app/<tipo>/<nombre_sanitizado>
   * El nombre se toma de req.hospedajeNombre (debe ser establecido por
   * el middleware loadHospedajeNombre antes de llamar a multer).
   *
   * @param {string} tipo - 'hoteles' | 'cabanas' | 'airbnb'
   */
  function createCloudinaryStorage(tipo) {
    return new CloudinaryStorage({
      cloudinary: cloudinaryLib,
      params: async (req, file) => {
        // req.hospedajeNombre se carga en el middleware loadHospedajeNombre
        const nombreRaw = req.hospedajeNombre || 'sin-nombre';
        const nombreCarpeta = sanitizeFolderName(nombreRaw);
        const folder = `turismo-app/${tipo}/${nombreCarpeta}`;

        console.log(`☁️ Subiendo imagen a Cloudinary en carpeta: ${folder}`);

        return {
          folder,
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        };
      }
    });
  }

  hotelStorage = createCloudinaryStorage('hoteles');
  cabanaStorage = createCloudinaryStorage('cabanas');
  airbnbStorage = createCloudinaryStorage('airbnb');

} else {
  // ⚠️ Fallback: almacenamiento local en disco cuando no hay credenciales de Cloudinary
  console.warn('⚠️  Variables de Cloudinary no configuradas. Usando almacenamiento LOCAL en disco.');

  function createDiskStorage(subfolder) {
    return multer.diskStorage({
      destination: function (req, file, cb) {
        // Subcarpeta basada en el nombre del hospedaje (si está disponible)
        const nombreRaw = req.hospedajeNombre || 'general';
        const nombreCarpeta = sanitizeFolderName(nombreRaw);
        const uploadPath = path.join(
          __dirname,
          `../../../public/hospedaje/uploads/${subfolder}/${nombreCarpeta}`
        );
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, subfolder.replace(/s$/, '') + '-' + uniqueSuffix + ext);
      }
    });
  }

  hotelStorage = createDiskStorage('hoteles');
  cabanaStorage = createDiskStorage('cabanas');
  airbnbStorage = createDiskStorage('airbnb');
}

module.exports = {
  cloudinary,
  hasCloudinaryCredentials,
  hotelStorage,
  cabanaStorage,
  airbnbStorage,
  sanitizeFolderName
};