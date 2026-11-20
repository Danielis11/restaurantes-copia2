// Moderación de reseñas de hospedaje (hoteles, cabañas y airbnb).
// Las reseñas nuevas llegan como «pendiente»; solo las «aprobada» se muestran y cuentan
// en el promedio. Las reseñas viejas no tienen estado y se toman como aprobadas.

const CAMPO_TOTAL = { hotel: 'totalReviews', cabana: 'numeroReviews', airbnb: 'totalReviews' };

function estaAprobada(r) {
  return !r.estado || r.estado === 'aprobada';
}

// Recalcula promedio y total con las reseñas aprobadas
function recalcularCalificacion(doc, tipo) {
  const aprobadas = (doc.reviews || []).filter(estaAprobada);
  if (!doc.calificacion) doc.calificacion = {};
  doc.calificacion[CAMPO_TOTAL[tipo] || 'totalReviews'] = aprobadas.length;
  doc.calificacion.promedio = aprobadas.length
    ? Math.round((aprobadas.reduce((a, r) => a + (Number(r.rating) || 0), 0) / aprobadas.length) * 10) / 10
    : 0;
}

// Copia para el público: sin reseñas pendientes ni rechazadas
function soloAprobadas(obj) {
  if (!obj || !Array.isArray(obj.reviews)) return obj;
  const plano = typeof obj.toObject === 'function' ? obj.toObject() : { ...obj };
  plano.reviews = plano.reviews.filter(estaAprobada);
  return plano;
}

function modeloDe(tipo) {
  if (tipo === 'hotel') return require('../models/Hotel');
  if (tipo === 'cabana') return require('../models/Cabana');
  if (tipo === 'airbnb') return require('../models/Airbnb');
  return null;
}

// La reseña vive en dos lugares: la colección resenashospedaje y dentro del hospedaje.
// Esto aplica el cambio (nuevo estado o borrado) a la copia dentro del hospedaje.
async function aplicarAEmbebida(review, cambio) {
  const Modelo = modeloDe(review.tipoHospedaje);
  if (!Modelo) return false;
  const doc = await Modelo.findById(review.hospedajeId);
  if (!doc || !Array.isArray(doc.reviews)) return false;
  const i = doc.reviews.findIndex((r) => String(r.user) === String(review.userId));
  if (i < 0) return false;
  if (cambio.borrar) doc.reviews.splice(i, 1);
  else doc.reviews[i].estado = cambio.estado;
  recalcularCalificacion(doc, review.tipoHospedaje);
  await doc.save({ validateBeforeSave: false });
  return true;
}

module.exports = { estaAprobada, recalcularCalificacion, soloAprobadas, aplicarAEmbebida, modeloDe, CAMPO_TOTAL };
