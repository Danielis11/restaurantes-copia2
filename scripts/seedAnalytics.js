/**
 * Script para poblar datos de prueba de estadísticas mensuales
 * para el panel de analíticas del administrador.
 * 
 * Uso: node scripts/seedAnalytics.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');

async function seedAnalytics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar el primer restaurante activo
    const restaurant = await Restaurant.findOne({ activo: true });
    if (!restaurant) {
      console.log('❌ No se encontró ningún restaurante activo');
      process.exit(1);
    }

    console.log(`📊 Sembrando datos de analíticas para: ${restaurant.nombre} (${restaurant._id})`);

    // Generar datos de los últimos 6 meses
    const ahora = new Date();
    const estadisticasMensuales = [];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mes = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      
      estadisticasMensuales.push({
        fecha: mes,
        vistas: Math.floor(Math.random() * 80) + 20,
        clicsWhatsapp: Math.floor(Math.random() * 30) + 5,
        clicsMapa: Math.floor(Math.random() * 40) + 10
      });
    }

    // Actualizar el restaurante con los datos de prueba
    restaurant.estadisticasMensuales = estadisticasMensuales;
    
    // Asegurar que las estadísticas globales reflejen los totales
    const totalVistas = estadisticasMensuales.reduce((sum, m) => sum + m.vistas, 0);
    const totalWhatsapp = estadisticasMensuales.reduce((sum, m) => sum + m.clicsWhatsapp, 0);
    const totalMapa = estadisticasMensuales.reduce((sum, m) => sum + m.clicsMapa, 0);
    
    if (!restaurant.estadisticas) restaurant.estadisticas = {};
    restaurant.estadisticas.vistasPerfil = totalVistas;
    restaurant.estadisticas.clicsWhatsapp = totalWhatsapp;
    restaurant.estadisticas.clicsMapa = totalMapa;

    await restaurant.save();
    console.log('✅ Estadísticas mensuales guardadas:');
    estadisticasMensuales.forEach(m => {
      console.log(`   ${m.fecha}: ${m.vistas} vistas, ${m.clicsWhatsapp} WhatsApp, ${m.clicsMapa} mapa`);
    });

    // Verificar si hay reseñas existentes
    const reviewCount = await Review.countDocuments({ restaurantId: restaurant._id });
    console.log(`\n📝 Reseñas existentes: ${reviewCount}`);

    if (reviewCount < 3) {
      console.log('   Creando reseñas de prueba para la evolución de calificación...');
      
      const User = require('../models/User');
      let user = await User.findOne();
      
      if (!user) {
        console.log('   ⚠️ No se encontró un usuario para las reseñas. Omitiendo reseñas.');
      } else {
        const reviewsData = [];
        for (let i = 5; i >= 0; i--) {
          const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 15);
          reviewsData.push({
            restaurantId: restaurant._id,
            userId: user._id,
            rating: Math.floor(Math.random() * 2) + 3,  // 3-5 estrellas
            comentario: `Reseña de prueba del mes ${fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
            estado: 'aprobada',
            fechaCreacion: fecha
          });
        }

        await Review.insertMany(reviewsData);
        console.log(`   ✅ ${reviewsData.length} reseñas de prueba creadas`);
      }
    }

    console.log('\n🎉 ¡Datos de analíticas sembrados exitosamente!');
    console.log('   Recarga la página de estadísticas para ver las gráficas con datos.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

seedAnalytics();
