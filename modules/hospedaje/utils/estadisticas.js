// Contadores de visitas y clics de hoteles, cabañas y airbnb.
// Se guardan con select:false para que no salgan en las respuestas públicas.
const EVENTOS = ['vistas', 'whatsapp', 'telefono', 'mapa', 'web'];

const contadores = {};
EVENTOS.forEach((e) => { contadores[e] = { type: Number, default: 0 }; });

const camposEstadisticas = {
  estadisticas: { type: contadores, select: false, default: () => ({}) },
  estadisticasMensuales: {
    type: [{ _id: false, mes: String, ...contadores }],
    select: false,
    default: undefined
  }
};

// 'AAAA-MM' en hora local, igual que las estadísticas de restaurantes
const formatoMes = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const mesActual = () => formatoMes(new Date());

// Últimos n meses (del más viejo al actual) en formato 'AAAA-MM'
function ultimosMeses(n) {
  const hoy = new Date();
  const meses = [];
  for (let i = n - 1; i >= 0; i--) meses.push(formatoMes(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)));
  return meses;
}

module.exports = { EVENTOS, camposEstadisticas, mesActual, ultimosMeses };
