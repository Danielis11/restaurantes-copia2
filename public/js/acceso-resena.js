// Invitación para opinar: si la persona no tiene sesión de viajero, abre una ventana para
// iniciar sesión o crear cuenta ahí mismo y, al terminar, abre el formulario de reseña.
// Uso: AccesoResena.pedir(funcionQueAbreElFormulario)
(function () {
    'use strict';

    function leer(clave) {
        try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { return null; }
    }

    // ¿La sesión guardada es de un viajero? (las de administradores no sirven para opinar)
    function esViajero() {
        if (!localStorage.getItem('authToken')) return false;
        var u = leer('currentUser');
        if (!u) return true; // sin datos: que decida el servidor
        var rol = u.rol || u.role;
        return !rol || rol === 'turista' || rol === 'user';
    }

    var CSS = '' +
        '.acr-fondo{position:fixed;inset:0;background:rgba(17,24,39,.55);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;opacity:0;transition:opacity .2s}' +
        '.acr-fondo.acr-visible{opacity:1}' +
        '.acr-caja{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:28px 24px;box-shadow:0 20px 50px rgba(0,0,0,.2);font-family:Outfit,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;position:relative;max-height:calc(100vh - 32px);overflow-y:auto}' +
        '.acr-cerrar{position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.1rem;color:#6b7280;cursor:pointer;padding:6px;border-radius:8px}' +
        '.acr-cerrar:hover{background:#f3f4f6;color:#111827}' +
        '.acr-icono{width:52px;height:52px;border-radius:14px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:14px}' +
        '.acr-titulo{font-size:1.35rem;font-weight:700;color:#111827;margin:0 0 6px}' +
        '.acr-texto{color:#4b5563;font-size:.95rem;line-height:1.5;margin:0 0 18px}' +
        '.acr-aviso{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:8px;padding:10px 12px;font-size:.85rem;margin:0 0 16px}' +
        '.acr-pestanas{display:flex;background:#f3f4f6;border-radius:10px;padding:4px;margin-bottom:16px}' +
        '.acr-pestana{flex:1;border:none;background:none;padding:9px;border-radius:8px;font:inherit;font-weight:600;color:#6b7280;cursor:pointer}' +
        '.acr-pestana.acr-activa{background:#fff;color:#111827;box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
        '.acr-campo{margin-bottom:12px}' +
        '.acr-campo label{display:block;font-size:.85rem;font-weight:500;color:#374151;margin-bottom:5px}' +
        '.acr-campo input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d1d5db;border-radius:8px;font:inherit;font-size:.95rem}' +
        '.acr-campo input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}' +
        '.acr-trampa{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}' +
        '.acr-boton{width:100%;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:12px;font:inherit;font-weight:600;font-size:1rem;cursor:pointer;margin-top:4px}' +
        '.acr-boton:hover{background:#1e40af}.acr-boton:disabled{opacity:.6;cursor:wait}' +
        '.acr-error{color:#dc2626;font-size:.85rem;margin:8px 0 0;min-height:1em}' +
        '.acr-pie{text-align:center;font-size:.8rem;color:#6b7280;margin:14px 0 0;line-height:1.5}' +
        '.acr-pie a{color:#2563eb}';

    function ponerCss() {
        if (document.getElementById('acr-css')) return;
        var s = document.createElement('style');
        s.id = 'acr-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // ¿La cuenta de viajero todavía no confirma su correo?
    function necesitaVerificar() {
        var u = leer('currentUser');
        return !!u && u.emailVerificado === false;
    }

    function guardarVerificado() {
        var u = leer('currentUser') || {};
        u.emailVerificado = true;
        try { localStorage.setItem('currentUser', JSON.stringify(u)); } catch (e) { /* ignorar */ }
    }

    // Paso para escribir el código de 6 dígitos que llegó al correo
    function verificar(alListo, aviso) {
        ponerCss();
        var viejo = document.getElementById('acr-fondo');
        if (viejo) viejo.remove();
        var u = leer('currentUser') || {};
        var fondo = document.createElement('div');
        fondo.className = 'acr-fondo';
        fondo.id = 'acr-fondo';
        fondo.innerHTML =
            '<div class="acr-caja" role="dialog" aria-modal="true" aria-labelledby="acr-titulo">' +
            '<button type="button" class="acr-cerrar" aria-label="Cerrar"><i class="fas fa-times"></i></button>' +
            '<div class="acr-icono"><i class="fas fa-envelope-open-text"></i></div>' +
            '<h3 class="acr-titulo" id="acr-titulo">Confirma tu correo</h3>' +
            '<p class="acr-texto">Te enviamos un código de 6 dígitos a <strong></strong>. Escríbelo aquí para poder opinar.</p>' +
            (aviso ? '<p class="acr-aviso"></p>' : '') +
            '<form class="acr-form" novalidate>' +
            '<div class="acr-campo"><label for="acr-codigo">Código</label><input id="acr-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" style="font-size:1.4rem;letter-spacing:.4em;text-align:center"></div>' +
            '<button type="submit" class="acr-boton">Confirmar</button>' +
            '<p class="acr-error" role="alert"></p>' +
            '</form>' +
            '<p class="acr-pie">¿No te llegó? Revisa tu carpeta de spam o <a href="#" class="acr-reenviar">envíame otro código</a></p>' +
            '</div>';
        fondo.querySelector('.acr-texto strong').textContent = u.email || 'tu correo';
        if (aviso) fondo.querySelector('.acr-aviso').textContent = aviso;
        document.body.appendChild(fondo);
        requestAnimationFrame(function () { fondo.classList.add('acr-visible'); });

        var error = fondo.querySelector('.acr-error');
        var boton = fondo.querySelector('.acr-boton');
        var input = fondo.querySelector('#acr-codigo');
        function cerrar() {
            fondo.classList.remove('acr-visible');
            document.removeEventListener('keydown', alTeclear);
            setTimeout(function () { fondo.remove(); }, 200);
        }
        function alTeclear(e) { if (e.key === 'Escape') cerrar(); }
        document.addEventListener('keydown', alTeclear);
        fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
        fondo.querySelector('.acr-cerrar').addEventListener('click', cerrar);
        input.addEventListener('input', function () { input.value = input.value.replace(/\D/g, '').slice(0, 6); });

        function llamar(ruta, datos) {
            return fetch(ruta, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '') },
                body: JSON.stringify(datos || {})
            }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._ok = r.ok; return j; }); });
        }

        fondo.querySelector('.acr-reenviar').addEventListener('click', function (e) {
            e.preventDefault();
            error.style.color = '';
            llamar('/api/auth/user/reenviar-verificacion').then(function (j) {
                error.style.color = j._ok ? '#059669' : '';
                error.textContent = j.message || (j._ok ? 'Código enviado' : 'No se pudo enviar');
            }).catch(function () { error.textContent = 'Error de conexión.'; });
        });

        fondo.querySelector('.acr-form').addEventListener('submit', function (e) {
            e.preventDefault();
            error.style.color = '';
            if (!/^\d{6}$/.test(input.value)) { error.textContent = 'Escribe los 6 dígitos.'; return; }
            boton.disabled = true;
            llamar('/api/auth/user/verificar-correo', { codigo: input.value }).then(function (j) {
                boton.disabled = false;
                if (!j._ok || !j.success) { error.textContent = j.message || 'No se pudo confirmar.'; return; }
                guardarVerificado();
                cerrar();
                if (alListo) setTimeout(alListo, 250);
            }).catch(function () { boton.disabled = false; error.textContent = 'Error de conexión.'; });
        });
        setTimeout(function () { input.focus(); }, 100);
    }

    function pedir(alEntrar) {
        if (esViajero()) {
            if (necesitaVerificar()) { verificar(alEntrar); return; }
            if (alEntrar) alEntrar();
            return;
        }
        ponerCss();
        var viejo = document.getElementById('acr-fondo');
        if (viejo) viejo.remove();

        var sesionAdmin = !!localStorage.getItem('authToken');
        var fondo = document.createElement('div');
        fondo.className = 'acr-fondo';
        fondo.id = 'acr-fondo';
        fondo.innerHTML =
            '<div class="acr-caja" role="dialog" aria-modal="true" aria-labelledby="acr-titulo">' +
            '<button type="button" class="acr-cerrar" aria-label="Cerrar"><i class="fas fa-times"></i></button>' +
            '<div class="acr-icono"><i class="fas fa-comment-dots"></i></div>' +
            '<h3 class="acr-titulo" id="acr-titulo">Comparte tu experiencia</h3>' +
            '<p class="acr-texto">Para que las opiniones sean reales, solo los viajeros con cuenta pueden opinar. Crear una es gratis y toma un minuto.</p>' +
            (sesionAdmin ? '<p class="acr-aviso"><i class="fas fa-info-circle"></i> Tu sesión actual es de administrador. Las reseñas son solo para cuentas de viajero; al entrar aquí se cerrará esa sesión.</p>' : '') +
            '<div class="acr-pestanas">' +
            '<button type="button" class="acr-pestana acr-activa" data-modo="entrar">Iniciar sesión</button>' +
            '<button type="button" class="acr-pestana" data-modo="crear">Crear cuenta</button>' +
            '</div>' +
            '<form class="acr-form" novalidate>' +
            '<div class="acr-campo acr-solo-crear" style="display:none"><label for="acr-nombre">Nombre</label><input id="acr-nombre" autocomplete="name" maxlength="60"></div>' +
            '<div class="acr-campo"><label for="acr-correo">Correo electrónico</label><input id="acr-correo" type="email" autocomplete="email" required></div>' +
            '<div class="acr-campo"><label for="acr-clave">Contraseña</label><input id="acr-clave" type="password" autocomplete="current-password" required minlength="6"></div>' +
            '<div class="acr-trampa" aria-hidden="true"><label>Sitio web<input id="acr-sitio" tabindex="-1" autocomplete="off"></label></div>' +
            '<button type="submit" class="acr-boton">Entrar y opinar</button>' +
            '<p class="acr-error" role="alert"></p>' +
            '</form>' +
            '<p class="acr-pie">¿Prefieres la página completa? <a href="/login.html" class="acr-pagina">Ir a iniciar sesión</a></p>' +
            '</div>';
        document.body.appendChild(fondo);
        requestAnimationFrame(function () { fondo.classList.add('acr-visible'); });

        var modo = 'entrar';
        var form = fondo.querySelector('.acr-form');
        var error = fondo.querySelector('.acr-error');
        var boton = fondo.querySelector('.acr-boton');

        function cerrar() {
            fondo.classList.remove('acr-visible');
            document.removeEventListener('keydown', alTeclear);
            setTimeout(function () { fondo.remove(); }, 200);
        }
        function alTeclear(e) { if (e.key === 'Escape') cerrar(); }
        document.addEventListener('keydown', alTeclear);
        fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
        fondo.querySelector('.acr-cerrar').addEventListener('click', cerrar);

        // Si va a la página completa, que regrese aquí al terminar
        fondo.querySelector('.acr-pagina').addEventListener('click', function () {
            try { localStorage.setItem('redirectUrl', window.location.href); } catch (e) { /* ignorar */ }
        });

        fondo.querySelectorAll('.acr-pestana').forEach(function (p) {
            p.addEventListener('click', function () {
                modo = p.dataset.modo;
                fondo.querySelectorAll('.acr-pestana').forEach(function (x) { x.classList.toggle('acr-activa', x === p); });
                fondo.querySelector('.acr-solo-crear').style.display = modo === 'crear' ? 'block' : 'none';
                fondo.querySelector('#acr-clave').autocomplete = modo === 'crear' ? 'new-password' : 'current-password';
                boton.textContent = modo === 'crear' ? 'Crear cuenta y opinar' : 'Entrar y opinar';
                error.textContent = '';
            });
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            error.textContent = '';
            if (fondo.querySelector('#acr-sitio').value) return; // bot
            var nombre = fondo.querySelector('#acr-nombre').value.trim();
            var correo = fondo.querySelector('#acr-correo').value.trim();
            var clave = fondo.querySelector('#acr-clave').value;
            if (modo === 'crear' && nombre.length < 2) { error.textContent = 'Escribe tu nombre.'; return; }
            if (!/^\S+@\S+\.\S+$/.test(correo)) { error.textContent = 'Escribe un correo válido.'; return; }
            if (clave.length < 6) { error.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }

            boton.disabled = true;
            var datos = modo === 'crear' ? { nombre: nombre, email: correo, password: clave } : { email: correo, password: clave };
            fetch(modo === 'crear' ? '/api/auth/user/register' : '/api/auth/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (json) {
                if (!json.success || !json.data || !json.data.token) {
                    error.textContent = json.message || 'No se pudo entrar. Revisa tus datos.';
                    boton.disabled = false;
                    return;
                }
                localStorage.setItem('authToken', json.data.token);
                localStorage.setItem('currentUser', JSON.stringify(json.data.user));
                cerrar();
                // Actualiza la barra si la página sabe hacerlo
                if (typeof window.renderAuthNavbar === 'function') { try { window.renderAuthNavbar(); } catch (er) { /* ignorar */ } }
                if (window.BarraSitio && typeof window.BarraSitio.pintarSesion === 'function') { try { window.BarraSitio.pintarSesion(); } catch (er) { /* ignorar */ } }
                // Cuenta nueva (o sin confirmar): primero el código del correo
                if (json.data.user && json.data.user.emailVerificado === false) {
                    setTimeout(function () {
                        verificar(alEntrar, json.data.correoEnviado === false ? 'Si el correo tarda, usa «envíame otro código» en un minuto.' : '');
                    }, 250);
                    return;
                }
                if (alEntrar) setTimeout(alEntrar, 250);
            }).catch(function () {
                error.textContent = 'Error de conexión. Intenta de nuevo.';
                boton.disabled = false;
            });
        });

        setTimeout(function () { var c = fondo.querySelector('#acr-correo'); if (c) c.focus(); }, 100);
    }

    window.AccesoResena = { pedir: pedir, esViajero: esViajero, necesitaVerificar: necesitaVerificar, verificar: verificar };
})();
