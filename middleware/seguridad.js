// Middlewares de seguridad que se aplican a todas las peticiones

// Anti inyección NoSQL: elimina claves que empiezan con "$"
// (evita ataques tipo { "email": "x", "code": { "$ne": null } })
const limpiarOperadoresMongo = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) {
      delete obj[key];
    } else {
      limpiarOperadoresMongo(obj[key]);
    }
  }
};

const sanitizarEntrada = (req, res, next) => {
  limpiarOperadoresMongo(req.body);
  limpiarOperadoresMongo(req.query);
  limpiarOperadoresMongo(req.params);
  next();
};

// Configurar cabeceras COOP y COEP para permitir popups de Google (Cross-Origin-Opener-Policy)
const permitirPopupsGoogle = (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
};

// Archivos que no deben servirse públicamente aunque estén en /public
const bloquearArchivosPrivados = (req, res, next) => {
  if (/\.(txt|log|bak|old)$/i.test(req.path) && !/^\/robots\.txt$/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
};

module.exports = { limpiarOperadoresMongo, sanitizarEntrada, permitirPopupsGoogle, bloquearArchivosPrivados };
