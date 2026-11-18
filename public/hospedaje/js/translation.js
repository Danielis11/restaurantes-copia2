// translation.js
document.addEventListener('DOMContentLoaded', () => {
    // Selector de idioma de la barra del sitio (#language-selector, valores es/en/fr) o el suyo antiguo
    const langSelect = document.getElementById('language-selector') || document.getElementById('lang-select');
    if (!langSelect) return;
    const minusculas = langSelect.id === 'language-selector';

    // El sitio principal guarda el idioma en minúsculas ('es'); aquí se usa 'ES'/'EN'/'FR'
    let currentLang = 'ES';
    try { currentLang = (localStorage.getItem('appLang') || 'es').toUpperCase(); } catch (e) { /* almacenamiento bloqueado */ }
    if (!['ES', 'EN', 'FR'].includes(currentLang)) currentLang = 'ES';
    langSelect.value = minusculas ? currentLang.toLowerCase() : currentLang;

    // We only translate if the selected language is not Spanish
    if (currentLang !== 'ES') {
        translatePage(currentLang);
    }

    langSelect.addEventListener('change', async (e) => {
        const targetLang = String(e.target.value).toUpperCase();
        try { localStorage.setItem('appLang', targetLang.toLowerCase()); } catch (err) { /* ignorar */ }

        if (targetLang === 'ES') {
            // Reload to restore original Spanish text
            location.reload();
        } else {
            await translatePage(targetLang);
        }
    });
});

async function translatePage(targetLang) {
    // 1. Selector strategy: Find elements to translate. 
    // Translating the whole body innerHTML can break event listeners.
    // Instead, we find text nodes or elements with a specific class, or 
    // headers and paragraphs.

    // A safer approach for a full page: 
    // Select headers, paragraphs, links, buttons, spans, lists that have direct text content
    const elementsToTranslate = document.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, p, a:not(.no-translate), button, .translate-text, li, th, td'
    );

    const textsToTranslate = [];
    const elementsMap = [];

    elementsToTranslate.forEach((el, index) => {
        // Check if it only has text and no complex child elements, 
        // or if its child elements are just basic formatting like <b>, <i>, <span>
        // To simplify and avoid breaking structure, we only translate if the element has non-empty text

        // We ignore empty elements or those marked as 'no-translate'
        // Avoid overwriting elements that contain inputs/selects to prevent listener loss
        if (el.closest('.no-translate') || el.classList.contains('no-translate') || el.querySelector('select, input, textarea, form')) {
            return;
        }

        const text = el.innerHTML.trim();
        if (text && !text.match(/^[\d\W]+$/)) { // Check if it's not just numbers/symbols
            textsToTranslate.push(text);
            elementsMap.push(el);
        }
    });

    if (textsToTranslate.length === 0) return;

    try {
        // Show a loading indicator on the select
        const langSelect = document.getElementById('language-selector') || document.getElementById('lang-select');
        if (langSelect) langSelect.disabled = true;

        // We can chunk requests if there are too many elements (e.g., > 100), but for now send all
        const response = await fetch('/api/hospedaje/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textsToTranslate,
                target_lang: targetLang
            })
        });

        const data = await response.json();

        if (data.success && data.data) {
            data.data.forEach((translatedHtml, index) => {
                if (elementsMap[index]) {
                    // Reemplazar el HTML conservando posibles tags de span translate="no"
                    elementsMap[index].innerHTML = translatedHtml;
                }
            });
        }

    } catch (error) {
        console.error('Error translating page:', error);
    } finally {
        const langSelect = document.getElementById('language-selector') || document.getElementById('lang-select');
        if (langSelect) langSelect.disabled = false;
    }
}
