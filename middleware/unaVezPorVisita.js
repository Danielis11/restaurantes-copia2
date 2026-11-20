// Cuenta una sola vez cada visita o clic: si la misma IP repite la misma acción sobre el mismo
// lugar dentro de 30 minutos, se responde 204 sin volver a sumar. Vive en memoria (se reinicia
// con el servidor) y tiene un tope para no crecer sin límite.
const VENTANA_MS = 30 * 60 * 1000;
const TOPE = 20000;
const vistos = new Map(); // clave -> hora en que se contó

function limpiar(ahora) {
  for (const [clave, hora] of vistos) {
    if (ahora - hora > VENTANA_MS) vistos.delete(clave);
  }
  // Si sigue lleno, se tiran las más viejas (el Map conserva el orden de inserción)
  while (vistos.size >= TOPE) vistos.delete(vistos.keys().next().value);
}

function unaVezPorVisita(req, res, next) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || '';
  const clave = ip + '|' + req.baseUrl + req.path;
  const ahora = Date.now();
  const antes = vistos.get(clave);
  if (antes && ahora - antes < VENTANA_MS) return res.status(204).end();
  if (vistos.size >= TOPE) limpiar(ahora);
  vistos.delete(clave); // reinsertar al final para que el orden refleje la hora
  vistos.set(clave, ahora);
  next();
}

module.exports = unaVezPorVisita;
module.exports._vistos = vistos; // para pruebas
