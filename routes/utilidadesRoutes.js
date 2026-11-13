// Utilidades: token de Mapbox y proxy de imágenes de Cloudinary
// (Movido desde server.js sin cambios de lógica)
const express = require('express');

const router = express.Router();
// ===== CONFIG =====
router.get('/api/config/mapbox', (req, res) => {
  res.json({ success: true, token: process.env.MAPBOX_TOKEN });
});

// ===== PROXY DE IMÁGENES CLOUDINARY =====
// Evita bloqueo por "Tracking Prevention" al servir imágenes desde el mismo dominio
router.get('/api/img-proxy', async (req, res) => {
  try {
    let imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'URL de imagen no válida' });
    }

    // Decodificar completamente (puede venir doble-encoded)
    let maxDecode = 5;
    while (maxDecode-- > 0 && (imageUrl.includes('%2F') || imageUrl.includes('%3A'))) {
      imageUrl = decodeURIComponent(imageUrl);
    }

    // Si la URL es otro proxy (doble-wrap), extraer la URL real de Cloudinary
    const cloudMatch = imageUrl.match(/(https?:\/\/res\.cloudinary\.com\/[^\s"']+)/);
    if (!cloudMatch) {
      return res.status(400).json({ success: false, message: 'URL de Cloudinary no encontrada' });
    }
    imageUrl = cloudMatch[1];

    // Optimización automática: formato moderno (WebP/AVIF), calidad automática y ancho máx. 1600px.
    // Solo si la URL aún no trae transformaciones propias (ej. w_300,c_fill).
    imageUrl = imageUrl.replace(/\/image\/upload\/(?![a-z]{1,3}_[^/]*\/)/, '/image/upload/f_auto,q_auto,c_limit,w_1600/');

    const https = require('https');
    const reqOpts = {
      headers: {
        // Reenviar Accept del navegador para que f_auto elija WebP/AVIF cuando sea compatible
        'Accept': req.headers.accept || 'image/webp,image/*,*/*;q=0.8',
        'User-Agent': 'restaurante-web-img-proxy'
      },
      timeout: 15000
    };

    const enviar = (imgRes) => {
      const ok = imgRes.statusCode === 200;
      res.status(imgRes.statusCode || 502);
      res.set({
        'Content-Type': imgRes.headers['content-type'] || 'image/jpeg',
        // Las URLs de Cloudinary son inmutables (llevan versión), se pueden cachear 1 año
        'Cache-Control': ok ? 'public, max-age=31536000, immutable' : 'no-store',
        'Vary': 'Accept',
        'Access-Control-Allow-Origin': '*'
      });
      if (imgRes.headers['content-length']) res.set('Content-Length', imgRes.headers['content-length']);
      imgRes.pipe(res);
    };

    https.get(imageUrl, reqOpts, (imgRes) => {
      const loc = imgRes.headers.location;
      if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && loc) {
        imgRes.resume();
        // Solo seguir redirecciones dentro de Cloudinary (evita SSRF)
        if (!/^https:\/\/res\.cloudinary\.com\//.test(loc)) return res.status(502).end();
        https.get(loc, reqOpts, enviar).on('error', () => res.status(502).end());
        return;
      }
      enviar(imgRes);
    }).on('error', (err) => {
      console.error('Error proxy imagen:', err.message);
      if (!res.headersSent) res.status(502).json({ success: false, message: 'Error al obtener imagen' });
    });
  } catch (error) {
    console.error('Error proxy:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

module.exports = router;
