// Encabezado de los paneles de socios de hospedaje, igual al del panel de restaurantes (admin.html):
// logo «Turismo Admin», enlaces del panel, nombre, rol, avatar y botón de salir.
// En las páginas de socios (no en el panel del super admin) además:
//  - oculta el menú lateral viejo (los enlaces ya están en el encabezado),
//  - convierte cada .form-section en una tarjeta con su icono y arma arriba
//    los chips para saltar entre secciones, como la ficha de restaurantes,
//  - deja fija abajo la barra con el botón de guardar.
(function () {
    'use strict';

    function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
    function leerSocio() {
        try { return JSON.parse(leer('hospUserData') || 'null') || {}; } catch (e) { return {}; }
    }
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    var TIPOS = { hotel: 'Hotel', cabana: 'Cabaña', airbnb: 'Airbnb', ayb: 'Airbnb', guiaturistica: 'Guía turística', touroperadora: 'Tour operadora', administracion: 'Administración' };
    var socio = leerSocio();
    var jefe = socio.isSuperAdmin === true || socio.isSuperAdmin === 'true' || /super-admin-dashboard/.test(location.pathname);
    var pagina = (location.pathname.split('/').pop() || '').toLowerCase();

    // Las clases se ponen de inmediato para que la página no se vea con el diseño viejo
    if (!jefe) document.documentElement.classList.add('ps-socio');

    // Páginas de cada tipo de anuncio
    function enlacesAnuncio() {
        var tipo = leer('hospPanelTipo') || ({ ayb: 'airbnb' })[socio.tipoNegocio] || socio.tipoNegocio;
        if (tipo === 'hotel') return { editar: 'actualizar-detalles.html', fotos: 'manage-images-hotel.html?hotelId=' + (leer('currentHotelId') || '') };
        if (tipo === 'cabana') return { editar: 'actualizar-cabanas.html', fotos: 'manage-images-cabana.html?cabanaId=' + (leer('currentCabanaId') || '') };
        if (tipo === 'airbnb') return { editar: 'actualizar-airbnb.html', fotos: 'manage-images-airbnb.html?airbnbId=' + (leer('currentAirbnbId') || '') };
        if (tipo === 'guiaturistica') return { editar: 'actualizar-guias.html', fotos: null };
        if (tipo === 'touroperadora') return { editar: 'actualizar-tourOperadora.html', fotos: null };
        return { editar: null, fotos: null };
    }

    function pintarEncabezado() {
        if (document.getElementById('panel-encabezado')) return;
        var rol = jefe ? 'Super Admin' : (TIPOS[socio.tipoNegocio] || 'Socio de hospedaje');
        var nombre = socio.nombre || 'Socio';
        var iniciales = nombre.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase();

        var links = [];
        if (jefe) {
            links.push({ href: 'super-admin-dashboard.html', ico: 'fa-home', txt: 'Panel', activo: /super-admin-dashboard/.test(pagina) });
        } else {
            var e = enlacesAnuncio();
            links.push({ href: 'dashboard.html', ico: 'fa-home', txt: 'Panel', activo: pagina === 'dashboard.html' });
            if (e.editar) links.push({ href: e.editar, ico: 'fa-bed', txt: 'Mi anuncio', activo: /^actualizar-/.test(pagina) });
            if (e.fotos) links.push({ href: e.fotos, ico: 'fa-images', txt: 'Fotos', activo: /^manage-images/.test(pagina) });
            links.push({ href: 'opiniones.html', ico: 'fa-star', txt: 'Opiniones', activo: pagina === 'opiniones.html' });
            links.push({ href: 'estadisticas.html', ico: 'fa-chart-column', txt: 'Estadísticas', activo: pagina === 'estadisticas.html' });
        }

        var cab = document.createElement('header');
        cab.className = 'panel-encabezado';
        cab.id = 'panel-encabezado';
        cab.innerHTML =
            '<nav class="panel-encabezado-nav">' +
            '<a href="/" class="panel-encabezado-logo" title="Ir al sitio de turismo">' +
            '<img src="/images/PueblosMágicos.svg.png" alt="Logo Turismo"><span>Turismo Admin</span></a>' +
            '<div class="panel-encabezado-links">' + links.map(function (l) {
                return '<a href="' + esc(l.href) + '" class="panel-encabezado-link' + (l.activo ? ' activo' : '') + '"><i class="fas ' + l.ico + '"></i> ' + esc(l.txt) + '</a>';
            }).join('') + '</div>' +
            '<div class="panel-encabezado-usuario">' +
            '<div class="panel-encabezado-datos"><div class="panel-encabezado-nombre">' + esc(nombre) + '</div>' +
            '<div class="panel-encabezado-rol">' + esc(rol) + '</div></div>' +
            '<a class="panel-encabezado-avatar" href="perfil.html" title="Mi perfil">' + (esc(iniciales) || '<i class="fas fa-user"></i>') + '</a>' +
            '<button class="panel-encabezado-salir" type="button" title="Cerrar sesión" aria-label="Cerrar sesión"><i class="fas fa-sign-out-alt"></i></button>' +
            '</div></nav>';
        document.body.insertBefore(cab, document.body.firstChild);

        cab.querySelector('.panel-encabezado-salir').addEventListener('click', function () {
            // Si la página tiene su propio botón de salir, se usa (conserva su lógica)
            var suyo = document.getElementById('logoutBtn') || document.querySelector('.logout-btn:not(.panel-encabezado-salir)');
            if (suyo) { suyo.click(); return; }
            if (!confirm('¿Cerrar sesión?')) return;
            ['hospAuthToken', 'hospUserData', 'hospCurrentUser'].forEach(function (k) {
                try { localStorage.removeItem(k); } catch (e) { /* ignorar */ }
            });
            window.location.href = '/hospedaje/login.html';
        });
    }

    // ---------- Formularios: secciones como tarjetas + chips para saltar ----------
    function prepararFormulario() {
        var secciones = Array.prototype.slice.call(document.querySelectorAll('.main-content .form-section'));
        if (secciones.length < 2) return;
        var chips = [];
        secciones.forEach(function (sec, i) {
            var titulo = sec.querySelector('.section-title');
            if (!titulo) return;
            if (!sec.id) sec.id = 'seccion-' + (i + 1);
            var icono = titulo.querySelector('i');
            var texto = titulo.textContent.replace(/\s+/g, ' ').trim();
            // El icono va en su recuadro, como en la ficha de restaurantes
            if (icono && !titulo.querySelector('.ps-sec-ico')) {
                var caja = document.createElement('span');
                caja.className = 'ps-sec-ico';
                titulo.insertBefore(caja, icono);
                caja.appendChild(icono);
            }
            chips.push({ id: sec.id, texto: texto, ico: icono ? icono.className : 'fas fa-circle' });
        });
        if (chips.length < 2) return;

        var nav = document.createElement('nav');
        nav.className = 'ps-secnav';
        nav.setAttribute('aria-label', 'Secciones del formulario');
        nav.innerHTML = chips.map(function (c) {
            // Texto corto para el chip: sin lo que va entre paréntesis
            var corto = c.texto.replace(/\(.*?\)/g, '').trim();
            return '<a class="ps-chip" href="#' + c.id + '" data-sec="' + c.id + '"><i class="' + esc(c.ico) + '"></i> ' + esc(corto) + '</a>';
        }).join('');
        var antes = secciones[0].closest('.form-container') || secciones[0].closest('form') || secciones[0];
        antes.parentNode.insertBefore(nav, antes);

        nav.addEventListener('click', function (e) {
            var a = e.target.closest('.ps-chip');
            if (!a) return;
            e.preventDefault();
            var destino = document.getElementById(a.dataset.sec);
            if (!destino) return;
            var y = destino.getBoundingClientRect().top + window.pageYOffset - 130;
            window.scrollTo({ top: y, behavior: 'smooth' });
        });

        // Marca el chip de la sección que se está viendo
        if ('IntersectionObserver' in window) {
            var visibles = {};
            var io = new IntersectionObserver(function (entradas) {
                entradas.forEach(function (en) { visibles[en.target.id] = en.isIntersecting ? en.boundingClientRect.top : null; });
                var actual = null;
                chips.forEach(function (c) { if (visibles[c.id] != null && actual == null) actual = c.id; });
                if (!actual) return;
                nav.querySelectorAll('.ps-chip').forEach(function (ch) {
                    var si = ch.dataset.sec === actual;
                    ch.classList.toggle('activo', si);
                    if (si && ch.scrollIntoView && nav.scrollWidth > nav.clientWidth) {
                        nav.scrollTo({ left: ch.offsetLeft - 24, behavior: 'smooth' });
                    }
                });
            }, { rootMargin: '-140px 0px -55% 0px' });
            secciones.forEach(function (s) { if (s.id) io.observe(s); });
        }
    }

    function iniciar() {
        pintarEncabezado();
        if (!jefe) prepararFormulario();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
