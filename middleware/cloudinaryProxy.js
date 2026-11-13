// ===== Transformar URLs de Cloudinary a Proxy Local =====
// Evita bloqueo por "Tracking Prevention" en navegadores modernos.
// Se monta en /api: reescribe las URLs de Cloudinary de cada respuesta JSON a /api/img-proxy?url=...
module.exports = (req, res, next) => {
  // No interceptar la ruta del proxy ni uploads de archivos
  if (req.path === '/img-proxy' || req.path.startsWith('/img-proxy')) return next();

  const originalJson = res.json.bind(res);
  res.json = function(data) {
    try {
      let jsonStr = JSON.stringify(data);
      // Reemplazar todas las URLs de Cloudinary con URLs del proxy
      jsonStr = jsonStr.replace(/https?:\/\/res\.cloudinary\.com\/[^"\\]+/g, (match) => {
        return `/api/img-proxy?url=${encodeURIComponent(match)}`;
      });
      // Enviar el string directamente (antes se hacía stringify → parse → stringify en cada respuesta)
      if (!res.get('Content-Type')) res.set('Content-Type', 'application/json; charset=utf-8');
      return res.send(jsonStr);
    } catch (e) {
      return originalJson(data);
    }
  };
  next();
};
