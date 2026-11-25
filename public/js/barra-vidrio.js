// Cambia el color de las barras de vidrio según lo que haya detrás:
// sobre una foto o un fondo oscuro se vuelven oscuras con letras blancas;
// sobre fondo claro, claras con letras oscuras. Ver css/barra-vidrio.css.
(function () {
    'use strict';
    var raiz = document.documentElement;

    function luz(color) {
        var m = color && color.match(/[\d.]+/g);
        if (!m || m.length < 3) return null;
        var a = m.length > 3 ? +m[3] : 1;
        if (a < 0.45) return null;
        return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    }

    function tieneFoto(cs) {
        return cs && cs.backgroundImage && cs.backgroundImage.indexOf('url(') !== -1;
    }

    // ¿Lo que hay en (x, y), sin contar las barras, es oscuro?
    function oscuroEn(x, y, barra) {
        var lista = document.elementsFromPoint(x, y);
        for (var i = 0; i < lista.length; i++) {
            var el = lista[i];
            if (barra.contains(el)) continue;
            var tag = el.tagName;
            if (tag === 'IMG' || tag === 'VIDEO' || tag === 'PICTURE') {
                var op = parseFloat(getComputedStyle(el).opacity);
                if (op > 0.3) return true;
                continue;
            }
            if (tag === 'CANVAS') return false; // el mapa es claro
            // Portadas con foto (a veces la foto está en capas que no reciben clics)
            if (el.matches && el.matches('.hero, .page-header, .ij-hero, .gs-hero, .hd-hero, [data-fondo="oscuro"]')) return true;
            if (el.matches && el.matches('[data-fondo="claro"]')) return false;
            var cs = getComputedStyle(el);
            // Fotos puestas como fondo, también en ::before (portadas)
            var antes = getComputedStyle(el, '::before');
            if (tieneFoto(cs) || (antes.content !== 'none' && tieneFoto(antes))) return true;
            var l = luz(cs.backgroundColor);
            if (l === null && cs.backgroundImage.indexOf('gradient') !== -1) {
                l = luz((cs.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,6}/i) || [''])[0]);
            }
            if (l !== null) return l < 0.5;
        }
        return false;
    }

    function preparar() {
        var barra = document.querySelector('.global-nav');
        if (!barra || !document.elementsFromPoint) return;
        var menu = document.getElementById('nav-menu');
        var pendiente = false;

        function votar(y) {
            var w = innerWidth, n = 0;
            [0.2, 0.5, 0.8].forEach(function (f) { if (oscuroEn(w * f, y, barra)) n++; });
            return n >= 2;
        }

        function revisar() {
            pendiente = false;
            var alto = barra.getBoundingClientRect().height || 70;
            raiz.classList.toggle('barra-oscura', votar(alto / 2));
            var abajo = menu && getComputedStyle(menu).position === 'fixed' && menu.getBoundingClientRect().top > innerHeight / 2;
            if (abajo) {
                var r = menu.getBoundingClientRect();
                raiz.classList.toggle('menu-oscuro', votar(r.top + r.height / 2));
            } else {
                raiz.classList.remove('menu-oscuro');
            }
        }

        function pedir() {
            if (pendiente) return;
            pendiente = true;
            requestAnimationFrame(revisar);
        }

        addEventListener('scroll', pedir, { passive: true });
        addEventListener('resize', pedir);
        addEventListener('load', pedir);
        // Carruseles y contenido que llega después
        setInterval(function () { if (!document.hidden) pedir(); }, 1200);
        pedir();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparar);
    else preparar();
})();
