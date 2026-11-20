/* ============================================================
   UI ENHANCEMENTS — Back-to-top FAB + Cloudinary blur-up (LQIP)
   Self-contained: include via <script src="/js/ui-enhancements.js" defer>
   Pair with /css/ui-enhancements.css
   ============================================================ */
(function () {
    'use strict';

    // ============================================================
    // 1) BACK-TO-TOP FAB
    // ============================================================
    function initBackToTop() {
        if (document.querySelector('.back-to-top')) return; // already present

        const btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Volver arriba');
        btn.setAttribute('title', 'Volver arriba');
        btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        document.body.appendChild(btn);

        // If a WhatsApp floating button exists, lift the FAB above it
        const hasWa = !!document.querySelector(
            '.whatsapp-float, .floating-whatsapp, .wa-float, [class*="whatsapp"][class*="float"]'
        );
        if (hasWa) btn.classList.add('has-wa-offset');

        const THRESHOLD = 500; // px scrolled before FAB appears
        let ticking = false;

        function update() {
            const scrolled = window.scrollY || document.documentElement.scrollTop;
            btn.classList.toggle('visible', scrolled > THRESHOLD);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });

        btn.addEventListener('click', function () {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        });

        update();
    }

    // ============================================================
    // 2) CLOUDINARY BLUR-UP (LQIP)
    // ------------------------------------------------------------
    // For every <img> with a Cloudinary URL, we set a tiny blurred
    // version as background-image and fade in the real image once
    // it finishes loading. Single-element solution, no DOM mutation.
    // ============================================================
    const LQIP_TRANSFORM = 'q_auto,f_auto,w_24,e_blur:600/';
    const CLOUDINARY_HOST = 'res.cloudinary.com';

    function buildLqipUrl(url) {
        // Only transform Cloudinary delivery URLs that contain /upload/
        if (!url || typeof url !== 'string') return null;
        if (!url.includes(CLOUDINARY_HOST)) return null;
        const idx = url.indexOf('/upload/');
        if (idx === -1) return null;
        // Avoid double-injecting if a transformation is already there
        const after = url.slice(idx + '/upload/'.length);
        if (after.startsWith('q_auto,f_auto,w_24,e_blur')) return url;
        return url.slice(0, idx + '/upload/'.length) + LQIP_TRANSFORM + after;
    }

    function enhanceImage(img) {
        if (!img || img.dataset.lqip === 'on' || img.dataset.lqip === 'skip') return;

        const src = img.currentSrc || img.src;
        const lqip = buildLqipUrl(src);
        if (!lqip) {
            img.dataset.lqip = 'skip';
            return;
        }
        img.dataset.lqip = 'on';

        // Set blurred preview as background and start hidden
        img.style.backgroundImage = 'url("' + lqip + '")';
        img.classList.add('lqip-loading');

        function done() {
            img.classList.remove('lqip-loading');
            img.classList.add('lqip-loaded');
            // Clean up to free GPU/memory once visible
            setTimeout(function () {
                img.style.backgroundImage = '';
            }, 600);
        }

        if (img.complete && img.naturalWidth > 0) {
            // Already cached/decoded → reveal immediately
            done();
        } else {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
        }
    }

    function initLqip() {
        // Enhance existing images
        document.querySelectorAll('img').forEach(enhanceImage);

        // Watch for dynamically inserted images (cards rendered after fetch)
        const observer = new MutationObserver(function (mutations) {
            for (const m of mutations) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return; // elements only
                    if (node.tagName === 'IMG') {
                        enhanceImage(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(enhanceImage);
                    }
                });
                // Also handle src swaps on existing imgs
                if (m.type === 'attributes' && m.attributeName === 'src' && m.target.tagName === 'IMG') {
                    if (m.target.dataset.lqip === 'on' || m.target.dataset.lqip === 'skip') {
                        m.target.dataset.lqip = '';
                        enhanceImage(m.target);
                    } else {
                        enhanceImage(m.target);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });
    }

    // ============================================================
    // BOOTSTRAP
    // ============================================================
    // ============================================================
    // 3) OCULTAR "HOSPEDAJE" SI NO HAY DATOS
    // ------------------------------------------------------------
    // La BD de hospedajes es externa; si no responde, escondemos los
    // enlaces para no mandar al visitante a una página vacía o rota.
    // El resultado se recuerda durante la sesión para no repetir la consulta.
    // ============================================================
    function initHospedajeLinks() {
        const links = document.querySelectorAll('a[href*="hospedaje" i], a[href*="hoteles" i]');
        if (!links.length) return;

        // 'important' porque la barra inferior móvil fuerza display con !important en el CSS
        const ocultar = function () { links.forEach(function (a) { a.style.setProperty('display', 'none', 'important'); }); };
        const KEY = 'hospedajesDisponibles';
        let cached = null;
        try { cached = sessionStorage.getItem(KEY); } catch (e) { /* almacenamiento bloqueado */ }
        if (cached === '0') return ocultar();
        if (cached === '1') return;

        fetch('/api/hospedajes')
            .then(function (r) { return r.ok ? r.json() : { total: 0 }; })
            .catch(function () { return { total: 0 }; })
            .then(function (json) {
                const hay = json && json.total > 0;
                try { sessionStorage.setItem(KEY, hay ? '1' : '0'); } catch (e) { /* ignorar */ }
                if (!hay) ocultar();
            });
    }

    function boot() {
        try { initBackToTop(); } catch (e) { console.warn('back-to-top init failed', e); }
        try { initLqip(); } catch (e) { console.warn('lqip init failed', e); }
        try { initHospedajeLinks(); } catch (e) { console.warn('hospedaje links init failed', e); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    function renderSkeletons(count = 6) {
        let html = '<div class="skeleton-grid" style="grid-column: 1 / -1; width: 100%;">';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="skeleton-img"></div>
                    <div class="skeleton-body">
                        <div class="skeleton-line" style="width: 30%; height: 10px;"></div>
                        <div class="skeleton-line" style="width: 75%; height: 16px; margin-top: 0.6rem;"></div>
                        <div class="skeleton-line" style="width: 100%; margin-top: 1rem;"></div>
                        <div class="skeleton-line" style="width: 60%;"></div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <div class="skeleton-line" style="flex: 1; height: 34px; margin: 0;"></div>
                            <div class="skeleton-line" style="width: 42px; height: 34px; margin: 0;"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    // Expose helpers for advanced use
    window.UIEnhancements = {
        buildLqipUrl: buildLqipUrl,
        enhanceImage: enhanceImage,
        renderSkeletons: renderSkeletons
    };
})();
