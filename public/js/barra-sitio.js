// Barra superior del sitio para páginas que no cargan main.js (por ejemplo, las de /hospedaje/).
// Hace lo mismo que la barra de la portada: menú móvil y botón de sesión.
// Reconoce las dos sesiones: la del sitio (authToken) y la de socios de hospedaje (hospAuthToken).
(function () {
    'use strict';

    function leer(clave) {
        try { return localStorage.getItem(clave); } catch (e) { return null; }
    }
    function leerJSON(clave) {
        try { return JSON.parse(leer(clave) || 'null'); } catch (e) { return null; }
    }
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // ===== Menú móvil (igual que en main.js) =====
    function prepararMenuMovil() {
        var boton = document.getElementById('nav-toggle');
        var menu = document.getElementById('nav-menu');
        if (!boton || !menu || boton.dataset.listo) return;
        boton.dataset.listo = '1';

        function icono(abierto) {
            var i = boton.querySelector('i');
            if (i) i.className = abierto ? 'fas fa-times' : 'fas fa-bars';
            boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        }
        function cerrar() { menu.classList.remove('active'); icono(false); }

        boton.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var abrir = !menu.classList.contains('active');
            menu.classList.toggle('active', abrir);
            icono(abrir);
        });
        menu.querySelectorAll('.nav-link').forEach(function (a) { a.addEventListener('click', cerrar); });
        document.addEventListener('click', function (e) {
            if (menu.classList.contains('active') && !boton.contains(e.target) && !menu.contains(e.target)) cerrar();
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
        window.addEventListener('resize', function () { if (window.innerWidth > 768) cerrar(); });
    }

    // ===== Botón de sesión =====
    var COLORES = { 'super-admin': '#ec4899', 'admin-turismo': '#0d9488', gobernamental: '#3b82f6', 'admin-ranking': '#1d4ed8', admin: '#10b981' };
    var ROLES = { 'super-admin': 'Super Admin', 'admin-turismo': 'Admin Turismo', gobernamental: 'Gubernamental', 'admin-ranking': 'Admin Ranking', admin: 'Administrador', turista: 'Turista' };

    function enlacesSitio(rol) {
        if (rol === 'turista') {
            return '<a href="/user-panel.html" class="profile-dropdown-link"><i class="fas fa-th-large"></i> Mi Panel</a>' +
                '<a href="/user-panel.html#favoritos-section" class="profile-dropdown-link"><i class="fas fa-heart"></i> Mis Favoritos</a>' +
                '<a href="/user-panel.html#opiniones-section" class="profile-dropdown-link"><i class="fas fa-star"></i> Mis Opiniones</a>';
        }
        var paneles = {
            'super-admin': ['/panel-central.html', 'fa-crown', 'Panel central'],
            'admin-turismo': ['/admin-turismo.html', 'fa-compass', 'Panel Turismo'],
            gobernamental: ['/admin-gobierno.html', 'fa-landmark', 'Panel Gubernamental'],
            'admin-ranking': ['/admin-ranking.html', 'fa-list-ol', 'Panel Ranking']
        };
        var p = paneles[rol] || ['/admin.html', 'fa-cog', 'Panel Admin'];
        return '<a href="' + p[0] + '" class="profile-dropdown-link"><i class="fas ' + p[1] + '"></i> ' + p[2] + '</a>';
    }

    function enlacesSocio(socio) {
        if (!socio.role || socio.role === 'user') {
            return '<a href="/user-panel.html" class="profile-dropdown-link"><i class="fas fa-th-large"></i> Mi Panel</a>' +
                '<a href="/user-panel.html#favoritos-section" class="profile-dropdown-link"><i class="fas fa-heart"></i> Mis Favoritos</a>';
        }
        var jefe = socio.isSuperAdmin === true || socio.isSuperAdmin === 'true';
        return jefe
            ? '<a href="/hospedaje/admin/super-admin-dashboard.html" class="profile-dropdown-link"><i class="fas fa-crown"></i> Panel de Hospedajes</a>'
            : '<a href="/hospedaje/admin/dashboard.html" class="profile-dropdown-link"><i class="fas fa-bed"></i> Mi Panel de Hospedaje</a>';
    }

    function menuPerfil(nombre, apellido, rolTexto, color, enlaces, alSalir) {
        var corto = nombre ? String(nombre).split(' ')[0] : 'Usuario';
        var iniciales = (String(nombre || '').charAt(0) + String(apellido || '').charAt(0)) || '<i class="fas fa-user"></i>';
        return '<div class="profile-menu-container">' +
            '<button class="profile-menu-btn" style="background-color:' + color + ';" type="button" data-perfil>' +
            '<i class="fas fa-user-circle"></i> <span class="mobile-hide">' + esc(corto) + '</span> <i class="fas fa-chevron-down" style="font-size:0.8em;margin-left:4px;"></i></button>' +
            '<div class="profile-dropdown" id="profile-dropdown-main">' +
            '<div class="profile-dropdown-header"><div class="profile-avatar" style="background-color:' + color + ';">' + esc(iniciales) + '</div>' +
            '<div class="profile-info"><div class="profile-name">' + esc(nombre) + ' ' + esc(apellido || '') + '</div><div class="profile-role">' + esc(rolTexto) + '</div></div></div>' +
            '<div class="profile-dropdown-body">' + enlaces + '<div class="dropdown-divider"></div>' +
            '<a href="#" class="profile-dropdown-link text-danger" data-salir="' + alSalir + '"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a></div></div></div>';
    }

    async function pintarSesion() {
        var caja = document.getElementById('navbar-actions');
        if (!caja) return;
        var boton = document.getElementById('nav-toggle');
        var botonHtml = boton ? boton.outerHTML : '<button class="nav-toggle" id="nav-toggle" aria-label="Abrir menú"><i class="fas fa-bars"></i></button>';
        var html = '<a href="/login.html" class="btn-login"><i class="far fa-user"></i> Iniciar Sesión</a>';

        var token = leer('authToken');
        var usuario = leerJSON('currentUser');
        if (token) {
            try {
                var ruta = usuario && usuario.rol === 'turista' ? '/api/auth/user/profile' : '/api/auth/profile';
                var r = await fetch(ruta, { headers: { Authorization: 'Bearer ' + token } });
                if (r.ok) {
                    var d = await r.json();
                    usuario = d.data && d.data.admin ? d.data.admin : d.data;
                    if (usuario) localStorage.setItem('currentUser', JSON.stringify(usuario));
                } else {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    usuario = null;
                }
            } catch (e) { /* sin red: se usa lo guardado */ }
        } else {
            usuario = null;
        }

        var socio = leer('hospAuthToken') ? leerJSON('hospUserData') : null;
        if (usuario) {
            html = menuPerfil(usuario.nombre, usuario.apellido, ROLES[usuario.rol] || usuario.rol || '',
                COLORES[usuario.rol] || 'var(--primary)', enlacesSitio(usuario.rol), 'sitio');
        } else if (socio) {
            var esJefe = socio.isSuperAdmin === true || socio.isSuperAdmin === 'true';
            html = menuPerfil(socio.nombre, '', esJefe ? 'Super Admin Hospedaje' : (socio.role === 'user' || !socio.role ? 'Turista' : 'Socio de hospedaje'),
                esJefe ? '#ec4899' : '#0d9488', enlacesSocio(socio), 'socio');
        }

        caja.innerHTML = '<div style="display:flex;align-items:center;">' + html + '</div>' + botonHtml;
        prepararMenuMovil();
    }

    // Abrir/cerrar el menú de perfil y cerrar sesión
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-perfil]');
        var menu = document.getElementById('profile-dropdown-main');
        if (btn && menu) { e.stopPropagation(); menu.classList.toggle('show'); return; }
        var salir = e.target.closest('[data-salir]');
        if (salir) {
            e.preventDefault();
            var claves = salir.dataset.salir === 'socio'
                ? ['hospAuthToken', 'hospUserData', 'hospCurrentUser']
                : ['authToken', 'currentUser'];
            claves.forEach(function (k) { try { localStorage.removeItem(k); } catch (err) { /* ignorar */ } });
            window.location.reload();
            return;
        }
        if (menu && menu.classList.contains('show') && !e.target.closest('.profile-menu-container')) menu.classList.remove('show');
    });

    window.BarraSitio = { pintarSesion: pintarSesion };

    function iniciar() {
        prepararMenuMovil();
        pintarSesion();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
