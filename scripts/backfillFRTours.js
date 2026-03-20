require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { translateText } = require('../utils/translator');
const Tour = require('../models/Tour');

async function backfillFRTours() {
  console.log('🔌 Conectando a MongoDB para traducciones al francés...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado\n');

  console.log('🗺️ Procesando tours/experiencias...');
  const tours = await Tour.find({});
  
  console.log(`Encontrados: ${tours.length} tours evaluando para francés`);
  
  for (const t of tours) {
    try {
      console.log(`Procesando tour: ${t.nombre?.es || t._id}`);
      let hasChanges = false;

      // Helper for simple text fields
      const translateField = async (fieldObj) => {
        if (!fieldObj) return fieldObj;
        const textoEs = fieldObj.es || (typeof fieldObj === 'string' ? fieldObj : '');
        if (textoEs && !fieldObj.fr) {
          fieldObj.fr = await translateText(textoEs, 'FR');
          hasChanges = true;
        }
        return fieldObj;
      };

      t.nombre = await translateField(t.nombre);
      t.descripcion = await translateField(t.descripcion);
      t.descripcionCorta = await translateField(t.descripcionCorta);
      t.itinerarioBasico = await translateField({ ...t.itinerarioBasico, es: t.itinerarioBasico?.es || '' });
      t.puntoEncuentro = await translateField({ ...t.puntoEncuentro, es: t.puntoEncuentro?.es || '' });
      t.politicasCancelacion = await translateField({ ...t.politicasCancelacion, es: t.politicasCancelacion?.es || '' });
      t.restricciones = await translateField({ ...t.restricciones, es: t.restricciones?.es || '' });
      
      // Helper for bilingual arrays
      const translateArray = async (arr) => {
        if (!arr || !arr.length) return arr;
        let arrayChanged = false;
        const newArr = await Promise.all(arr.map(async (item) => {
          if (item.fr) return item; // Already translated
          const textoEs = item.es || (typeof item === 'string' ? item : '');
          if (textoEs) {
             const fr = await translateText(textoEs, 'FR');
             arrayChanged = true;
             return { es: textoEs, en: item.en || '', fr };
          }
          return item;
        }));
        if (arrayChanged) hasChanges = true;
        return newArr;
      };
      
      t.incluye = await translateArray(t.incluye);
      t.noIncluye = await translateArray(t.noIncluye);
      t.queTraer = await translateArray(t.queTraer);
      t.requisitos = await translateArray(t.requisitos);
      
      if (hasChanges) {
        await t.save();
        console.log(`  ✅ Actualizado con FR: ${t.nombre?.es}`);
      } else {
        console.log(`  ⚡ Sin cambios (ya tiene FR o no hay data)`);
      }
    } catch (err) {
      console.error(`  ❌ Error en tour ${t._id}: ${err.message}`);
    }
  }

  console.log('\n🎉 ¡Retrotraducción a francés completada!');
  await mongoose.disconnect();
}

backfillFRTours().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
