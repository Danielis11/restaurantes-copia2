/* ============================================================
   PWA — instalación en la pantalla de inicio + service worker
   Incluir en cada página: <script src="/js/pwa.js" defer></script>
   ============================================================ */
(function () {
    'use strict';

    var DIAS_OCULTO = 14; // si el usuario cierra el aviso, no volver a mostrarlo en 2 semanas
    var KEY_CERRADO = 'pwaInstallCerrado';
    var esStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var ua = navigator.userAgent || '';
    var esIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var esSafariIOS = esIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    var promptGuardado = null;

    function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* almacenamiento bloqueado */ } }

    function cerradoRecientemente() {
        var t = parseInt(leer(KEY_CERRADO) || '0', 10);
        return t && (Date.now() - t) < DIAS_OCULTO * 864e5;
    }

    // ---------- estilos (autocontenidos) ----------
    function inyectarEstilos() {
        if (document.getElementById('pwa-estilos')) return;
        var css = '' +
            '.pwa-banner{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:9998;' +
            'max-width:420px;margin:0 auto;background:#fff;color:#1e293b;border-radius:16px;box-shadow:0 12px 32px rgba(15,23,42,.22);' +
            'display:flex;align-items:center;gap:12px;padding:12px 14px;font-family:Outfit,system-ui,sans-serif;' +
            'transform:translateY(140%);transition:transform .35s ease;}' +
            '.pwa-banner.visible{transform:translateY(0);}' +
            '.pwa-banner img{width:44px;height:44px;border-radius:10px;flex-shrink:0;}' +
            '.pwa-banner .pwa-txt{flex:1;min-width:0;font-size:.85rem;line-height:1.35;}' +
            '.pwa-banner .pwa-txt strong{display:block;font-size:.95rem;}' +
            '.pwa-banner .pwa-txt span{color:#64748b;}' +
            '.pwa-banner .pwa-btn{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:.6rem .9rem;font:inherit;font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap;}' +
            '.pwa-banner .pwa-x{background:none;border:0;color:#94a3b8;font-size:1.4rem;line-height:1;cursor:pointer;padding:4px 6px;}' +
            '.pwa-ios-icon{display:inline-block;vertical-align:-3px;width:16px;height:16px;}' +
            '@media (max-width:768px){.pwa-banner{bottom:calc(env(safe-area-inset-bottom,0px) + 84px);}}' +
            '@media (prefers-color-scheme:dark){.pwa-banner{background:#1e293b;color:#e2e8f0;}.pwa-banner .pwa-txt span{color:#94a3b8;}}';
        var s = document.createElement('style');
        s.id = 'pwa-estilos';
        s.textContent = css;
        document.head.appendChild(s);
    }

    function crearBanner(titulo, texto, textoBoton, alAceptar, recordarCierre) {
        inyectarEstilos();
        var viejo = document.querySelector('.pwa-banner');
        if (viejo) viejo.remove();

        var b = document.createElement('div');
        b.className = 'pwa-banner';
        b.setAttribute('role', 'dialog');
        b.setAttribute('aria-label', titulo);

        var img = document.createElement('img');
        img.src = '/icons/icon-192.png';
        img.alt = '';

        var txt = document.createElement('div');
        txt.className = 'pwa-txt';
        var st = document.createElement('strong');
        st.textContent = titulo;
        var sp = document.createElement('span');
        if (typeof texto === 'string') sp.textContent = texto; else sp.appendChild(texto);
        txt.appendChild(st);
        txt.appendChild(sp);

        b.appendChild(img);
        b.appendChild(txt);

        if (textoBoton) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pwa-btn';
            btn.textContent = textoBoton;
            btn.addEventListener('click', function () { alAceptar(b); });
            b.appendChild(btn);
        }

        var x = document.createElement('button');
        x.type = 'button';
        x.className = 'pwa-x';
        x.setAttribute('aria-label', 'Cerrar');
        x.textContent = '×';
        x.addEventListener('click', function () {
            if (recordarCierre !== false) escribir(KEY_CERRADO, String(Date.now()));
            ocultar(b);
        });
        b.appendChild(x);

        document.body.appendChild(b);
        requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('visible'); }); });
        return b;
    }

    function ocultar(b) {
        b.classList.remove('visible');
        setTimeout(function () { b.remove(); }, 400);
    }

    // ---------- Android / Chrome / Edge: botón de instalación nativo ----------
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault(); // no mostrar la mini barra de Chrome; usamos nuestro aviso
        promptGuardado = e;
        if (esStandalone || cerradoRecientemente()) return;
        // Esperar un poco para no interrumpir apenas abre la página
        setTimeout(function () {
            if (!promptGuardado) return;
            crearBanner('Instala la app de Jalpan', 'Acceso directo desde tu pantalla de inicio, más rápida y funciona sin señal.', 'Instalar', function (b) {
                ocultar(b);
                promptGuardado.prompt();
                promptGuardado.userChoice.finally(function () { promptGuardado = null; });
            });
        }, 6000);
    });

    window.addEventListener('appinstalled', function () {
        promptGuardado = null;
        var b = document.querySelector('.pwa-banner');
        if (b) ocultar(b);
    });

    // Para usar desde cualquier botón del sitio: onclick="RestauranteWebPWA.instalar()"
    window.RestauranteWebPWA = {
        puedeInstalar: function () { return !!promptGuardado || (esSafariIOS && !esStandalone); },
        instalar: function () {
            if (promptGuardado) { promptGuardado.prompt(); return; }
            if (esSafariIOS) mostrarAyudaIOS(true);
        }
    };

    // ---------- iPhone / iPad: Safari no tiene botón, se explica cómo ----------
    function mostrarAyudaIOS(forzar) {
        if (esStandalone || (!forzar && cerradoRecientemente())) return;
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode('Toca '));
        var ico = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        ico.setAttribute('viewBox', '0 0 24 24');
        ico.setAttribute('class', 'pwa-ios-icon');
        ico.setAttribute('aria-label', 'Compartir');
        ico.innerHTML = '<path fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>';
        frag.appendChild(ico);
        frag.appendChild(document.createTextNode(' y luego «Agregar a inicio».'));
        crearBanner('Agrega Jalpan a tu inicio', frag, null, null);
    }

    if (esSafariIOS && !esStandalone) {
        window.addEventListener('load', function () { setTimeout(function () { mostrarAyudaIOS(false); }, 8000); });
    }

    // ---------- Service worker + aviso de versión nueva ----------
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').then(function (reg) {
                reg.addEventListener('updatefound', function () {
                    var nuevo = reg.installing;
                    if (!nuevo) return;
                    nuevo.addEventListener('statechange', function () {
                        // Solo avisar si ya había una versión anterior controlando la página
                        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
                            crearBanner('Nueva versión disponible', 'Actualiza para ver los últimos cambios.', 'Actualizar', function () {
                                nuevo.postMessage('SKIP_WAITING');
                            }, false);
                        }
                    });
                });
            }).catch(function (err) {
                console.warn('Service worker no registrado:', err);
            });

            // En la primera visita no hay versión previa: no recargar al activarse
            var habiaControlador = !!navigator.serviceWorker.controller;
            var recargando = false;
            navigator.serviceWorker.addEventListener('controllerchange', function () {
                if (recargando || !habiaControlador) return;
                recargando = true;
                window.location.reload();
            });
        });
    }
})();
