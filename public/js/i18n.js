/**
 * Script para manejar el multilenguaje en el Frontend
 * Maneja:
 *  - Traducciones estáticas (data-i18n) desde archivos JSON
 *  - Contenido dinámico bilingüe de la BD mediante window.getL(obj)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Determinar el idioma inicial y fijarlo en localStorage si no existe
  let savedLang = localStorage.getItem('appLang');
  if (!savedLang) {
    savedLang = 'es';
    localStorage.setItem('appLang', savedLang);
  }
  
  // 2. Cargar traducciones y aplicarlas
  loadTranslations(savedLang);

  // 3. Configurar el selector de idioma si existe en la página
  const langSelector = document.getElementById('language-selector');
  if (langSelector) {
    langSelector.value = savedLang;
    langSelector.addEventListener('change', (e) => {
      const newLang = e.target.value;
      localStorage.setItem('appLang', newLang);
      loadTranslations(newLang);
    });
  }
});

async function loadTranslations(lang) {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) throw new Error(`Error loading ${lang}.json`);
    
    const translations = await response.json();
    applyTranslations(translations);
    
    // Disparar evento para que otros scripts re-rendericen el contenido dinámico
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, translations } }));
  } catch (error) {
    console.error('Error loading translations:', error);
  }
}

function applyTranslations(translations) {
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const keys = key.split('.');
    let text = translations;
    
    for (let k of keys) {
      if (text[k] !== undefined) {
        text = text[k];
      } else {
        text = null;
        break;
      }
    }
    
    if (text) {
      // Si el elemento es un input con placeholder
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });
}

/**
 * Helper para leer el campo correcto de un objeto bilingüe { es, en }
 * Usa el idioma activo en localStorage.
 * También funciona con strings simples (los pasa tal cual).
 * @param {string|{es:string,en:string}|null|undefined} obj
 * @returns {string}
 */
window.getL = function getL(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const lang = localStorage.getItem('appLang') || 'es';
  let val = obj[lang] || obj['es'] || obj['en'] || obj['fr'] || '';
  // Recursively unwrap deeply nested objects like {es: {es: {es: "text"}}}
  for (let i = 0; i < 10 && typeof val === 'object' && val !== null; i++) {
    val = val[lang] || val['es'] || val['en'] || val['fr'] || '';
  }
  return typeof val === 'string' ? val : '';
};

// Map translations for tour categories internally
const categoryTranslations = {
    'Espeleismo': { en: 'Caving', fr: 'Spéléologie' },
    'Senderismo': { en: 'Hiking', fr: 'Randonnée' },
    'Trail Running': { en: 'Trail Running', fr: 'Course en sentier' },
    'MTB y Gravel': { en: 'MTB & Gravel', fr: 'VTT et Gravel' },
    'RZR': { en: 'RZR/ATV', fr: 'RZR/Quad' },
    'Transporte Turístico': { en: 'Tourist Transport', fr: 'Transport Touristique' },
    'Aviturismo': { en: 'Birdwatching', fr: 'Ornithologie' },
    'Kayak': { en: 'Kayaking', fr: 'Kayak' },
    'Turismo Cultural': { en: 'Cultural Tourism', fr: 'Tourisme Culturel' },
    'Ciclismo de Montaña': { en: 'Mountain Biking', fr: 'Vélo de Montagne' },
    'Rutas Bioculturales': { en: 'Biocultural Routes', fr: 'Routes Bioculturelles' },
    'Ruta Herbolaria': { en: 'Herbal Route', fr: 'Route des Herbes' },
    'Ruta del Agua': { en: 'Water Route', fr: 'Route de l\'Eau' },
    'Ruta del Pulque': { en: 'Pulque Route', fr: 'Route du Pulque' }
};

window.translateCategoria = function(categoria) {
    if (!categoria) return '';
    const lang = localStorage.getItem('appLang') || 'es';
    if (lang === 'es') return categoria;
    return categoryTranslations[categoria]?.[lang] || categoria;
};
