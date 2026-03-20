/**
 * Script para poblar el campo `.en` en todos los registros existentes de la BD
 * que tienen el campo de texto bilingüe vacío.
 * 
 * Uso: node scripts/backfillTranslations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { translateText } = require('../utils/translator');
const Restaurant = require('../models/Restaurant');
const Tour = require('../models/Tour');
const Guia = require('../models/Guia');

async function backfillTranslations() {
  console.log('🔌 Conectando a MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado\n');

  // ===== RESTAURANTES =====
  console.log('🍽️  Procesando restaurantes...');
  const restaurantes = await Restaurant.find({$or: [
    { 'descripcion.en': '' },
    { 'descripcion.en': null },
    { 'descripcion.en': { $exists: false } }
  ]});
  
  console.log(`  Encontrados: ${restaurantes.length} restaurantes sin traducción`);
  
  for (const r of restaurantes) {
    const textoEs = r.descripcion?.es || (typeof r.descripcion === 'string' ? r.descripcion : '');
    if (!textoEs) continue;
    
    try {
      const en = await translateText(textoEs, 'EN-US');
      r.descripcion = { es: textoEs, en };
      
      // Traducir menú si existe
      if (r.menu && r.menu.length > 0) {
        for (const cat of r.menu) {
          if (!cat.categoria.en) {
            const catEs = cat.categoria.es || cat.categoria;
            cat.categoria = { es: catEs, en: await translateText(catEs, 'EN-US') };
          }
          for (const item of (cat.items || [])) {
            if (!item.nombre.en) {
              const nomEs = item.nombre.es || item.nombre;
              item.nombre = { es: nomEs, en: await translateText(nomEs, 'EN-US') };
            }
            if (item.descripcion && !item.descripcion.en) {
              const descEs = item.descripcion.es || item.descripcion;
              item.descripcion = { es: descEs, en: await translateText(descEs, 'EN-US') };
            }
          }
        }
      }
      
      await r.save();
      console.log(`  ✅ ${r.nombre}`);
    } catch (err) {
      console.error(`  ❌ ${r.nombre}: ${err.message}`);
    }
  }

  // ===== TOURS =====
  console.log('\n🗺️  Procesando tours/experiencias...');
  const tours = await Tour.find({ $or: [
    { 'descripcion.en': '' },
    { 'nombre.en': '' },
    { 'descripcion.en': { $exists: false } }
  ]});
  
  console.log(`  Encontrados: ${tours.length} tours sin traducción`);
  
  for (const t of tours) {
    try {
      const nombreEs = t.nombre?.es || (typeof t.nombre === 'string' ? t.nombre : '');
      const descEs = t.descripcion?.es || (typeof t.descripcion === 'string' ? t.descripcion : '');
      const descCortaEs = t.descripcionCorta?.es || (typeof t.descripcionCorta === 'string' ? t.descripcionCorta : '');
      
      if (nombreEs && !t.nombre?.en) {
        t.nombre = { es: nombreEs, en: await translateText(nombreEs, 'EN-US') };
      }
      if (descEs && !t.descripcion?.en) {
        t.descripcion = { es: descEs, en: await translateText(descEs, 'EN-US') };
      }
      if (descCortaEs && !t.descripcionCorta?.en) {
        t.descripcionCorta = { es: descCortaEs, en: await translateText(descCortaEs, 'EN-US') };
      }
      
      // Arrays bilingüe
      const traduceArray = async (arr) => {
        if (!arr || !arr.length) return arr;
        return Promise.all(arr.map(async (item) => {
          if (item.en) return item; // Ya traducido
          const texto = item.es || (typeof item === 'string' ? item : '');
          return texto ? { es: texto, en: await translateText(texto, 'EN-US') } : item;
        }));
      };
      
      t.incluye = await traduceArray(t.incluye);
      t.noIncluye = await traduceArray(t.noIncluye);
      t.queTraer = await traduceArray(t.queTraer);
      t.requisitos = await traduceArray(t.requisitos);
      
      await t.save();
      console.log(`  ✅ ${nombreEs}`);
    } catch (err) {
      console.error(`  ❌ ${t._id}: ${err.message}`);
    }
  }

  // ===== GUÍAS =====
  console.log('\n👤  Procesando guías...');
  const guias = await Guia.find({ $or: [
    { 'biografia.en': '' },
    { 'biografia.en': { $exists: false } }
  ]});
  
  console.log(`  Encontrados: ${guias.length} guías sin traducción`);
  
  for (const g of guias) {
    try {
      const bioEs = g.biografia?.es || (typeof g.biografia === 'string' ? g.biografia : '');
      if (!bioEs) continue;
      
      g.biografia = { es: bioEs, en: await translateText(bioEs, 'EN-US') };
      await g.save();
      console.log(`  ✅ ${g.nombreCompleto}`);
    } catch (err) {
      console.error(`  ❌ ${g.nombreCompleto}: ${err.message}`);
    }
  }

  console.log('\n🎉 ¡Retrotraducción completada!');
  await mongoose.disconnect();
}

backfillTranslations().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
