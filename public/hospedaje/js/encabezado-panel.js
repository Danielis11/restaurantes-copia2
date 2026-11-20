// Encabezado de los paneles de socios de hospedaje, igual al del panel de administración del sitio
// (logo «Turismo Admin», nombre, rol, avatar y botón de salir).
(function () {
    'use strict';

    function leerSocio() {
        try { return JSON.parse(localStorage.getItem('hospUserData') || 'null') || {}; } catch (e) { return {}; }
    }
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    var TIPOS = { hotel: 'Hotel', cabana: 'Cabaña', airbnb: 'Airbnb', ayb: 'Airbnb', guiaturistica: 'Guía turística', touroperadora: 'Tour operadora', administracion: 'Administración' };

    function pintar() {
        if (document.getElementById('panel-encabezado')) return;
        var socio = leerSocio();
        var jefe = socio.isSuperAdmin === true || socio.isSuperAdmin === 'true';
        var rol = jefe ? 'Super Admin' : (TIPOS[socio.tipoNegocio] || 'Socio de hospedaje');
        var nombre = socio.nombre || 'Socio';
        var iniciales = nombre.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase();

        var cab = document.createElement('header');
        cab.className = 'panel-encabezado';
        cab.id = 'panel-encabezado';
        cab.innerHTML =
            '<nav class="panel-encabezado-nav">' +
            '<a href="/" class="panel-encabezado-logo" title="Volver al inicio">' +
            '<img src="/images/PueblosMágicos.svg.png" alt="Logo Turismo"><span>Turismo Admin</span></a>' +
            '<div class="panel-encabezado-usuario">' +
            '<div class="panel-encabezado-datos"><div class="panel-encabezado-nombre">' + esc(nombre) + '</div>' +
            '<div class="panel-encabezado-rol">' + esc(rol) + '</div></div>' +
            '<div class="panel-encabezado-avatar">' + (esc(iniciales) || '<i class="fas fa-user"></i>') + '</div>' +
            '<button class="panel-encabezado-salir" type="button" title="Cerrar sesión" aria-label="Cerrar sesión"><i class="fas fa-sign-out-alt"></i></button>' +
            '</div></nav>';
        document.body.insertBefore(cab, document.body.firstChild);

        cab.querySelector('.panel-encabezado-salir').addEventListener('click', function () {
            // Si la página tiene su propio botón de salir, se usa (conserva su lógica)
            var suyo = document.getElementById('logoutBtn') || document.querySelector('.logout-btn:not(.panel-encabezado-salir)');
            if (suyo) { suyo.click(); return; }
            ['hospAuthToken', 'hospUserData', 'hospCurrentUser'].forEach(function (k) {
                try { localStorage.removeItem(k); } catch (e) { /* ignorar */ }
            });
            window.location.href = '/hospedaje/login.html';
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar);
    else pintar();
})();
