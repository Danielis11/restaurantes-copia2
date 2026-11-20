/* ===== Panel del socio (restaurantes) — utilidades compartidas =====
   Avisos tipo toast, botones con estado, ventana de confirmación, sesión y cabecera.
   Lo usan admin.html y manage-images.html. */
(function () {
    const API_BASE = window.location.origin + '/api';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (sel, root = document) => root.querySelector(sel);

    function esc(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const token = () => localStorage.getItem('authToken');
    const authHeaders = (extra = {}) => ({ 'Authorization': `Bearer ${token()}`, ...extra });

    /* ---------- Toasts ---------- */
    function contenedor() {
        let c = $('#toasts');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toasts'; c.className = 'toasts';
            c.setAttribute('aria-live', 'polite');
            document.body.appendChild(c);
        }
        return c;
    }
    function toast(message, type = 'ok', opts = {}) {
        const alias = { success: 'ok', error: 'err', warning: 'aviso' };
        type = alias[type] || type;
        const icon = { ok: 'fa-circle-check', err: 'fa-circle-exclamation', aviso: 'fa-triangle-exclamation', info: 'fa-circle-info' }[type] || 'fa-circle-info';
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.setAttribute('role', type === 'err' ? 'alert' : 'status');
        el.innerHTML = `<i class="fas ${icon}"></i><span></span>${opts.action ? '<button class="accion-toast" type="button"></button>' : ''}<button class="cerrar" type="button" aria-label="Cerrar aviso"><i class="fas fa-times"></i></button>`;
        el.querySelector('span').textContent = message;
        const cerrar = () => {
            if (!el.isConnected) return;
            el.classList.add('saliendo');
            setTimeout(() => el.remove(), reduceMotion ? 0 : 250);
        };
        if (opts.action) {
            const b = el.querySelector('.accion-toast');
            b.textContent = opts.action.label;
            b.onclick = () => { opts.action.fn(); cerrar(); };
        }
        el.querySelector('.cerrar').onclick = cerrar;
        const c = contenedor();
        c.appendChild(el);
        while (c.children.length > 4) c.firstElementChild.remove();
        setTimeout(cerrar, opts.duration || (type === 'err' ? 7000 : 4000));
        return el;
    }

    /* ---------- Botón con estados: Guardando… → ✓ Listo ---------- */
    function btnEstado(btn, estado, textos = {}) {
        if (!btn) return;
        if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
        clearTimeout(btn._t);
        btn.classList.remove('guardando', 'guardado', 'error');
        if (estado === 'guardando') {
            btn.disabled = true; btn.classList.add('guardando');
            btn.innerHTML = `<span class="spin"></span> ${textos.guardando || 'Guardando…'}`;
        } else if (estado === 'guardado') {
            btn.disabled = true; btn.classList.add('guardado');
            btn.innerHTML = `<i class="fas fa-check"></i> ${textos.guardado || 'Guardado'}`;
            btn._t = setTimeout(() => btnEstado(btn, 'normal'), 1800);
        } else if (estado === 'error') {
            btn.disabled = false; void btn.offsetWidth; btn.classList.add('error');
            btn.innerHTML = btn.dataset.original;
        } else {
            btn.disabled = false; btn.innerHTML = btn.dataset.original;
        }
    }

    /* ---------- Ventanas ---------- */
    let ultimoFoco = null;
    function abrirModal(id) {
        const m = document.getElementById(id);
        if (!m) return;
        ultimoFoco = document.activeElement;
        m.classList.add('abierto');
        document.body.style.overflow = 'hidden';
        const f = m.querySelector('[autofocus], input:not([type=hidden]), textarea, select, button.btn');
        setTimeout(() => f && f.focus({ preventScroll: true }), 50);
    }
    function cerrarModal(id) {
        const m = typeof id === 'string' ? document.getElementById(id) : id;
        if (!m) return;
        m.classList.remove('abierto');
        if (!document.querySelector('.modal.abierto')) document.body.style.overflow = '';
        if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true });
    }
    document.addEventListener('click', e => {
        if (e.target.classList && e.target.classList.contains('modal')) cerrarModal(e.target);
        const c = e.target.closest && e.target.closest('[data-cerrar]');
        if (c) cerrarModal(c.closest('.modal'));
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { const m = [...document.querySelectorAll('.modal.abierto')].pop(); if (m) cerrarModal(m); }
    });

    // Confirmación propia (en lugar de confirm()). Devuelve una promesa con true/false.
    function confirmar({ titulo = '¿Seguro?', mensaje = '', aceptar = 'Sí, continuar', peligro = true } = {}) {
        return new Promise(resolve => {
            const m = document.createElement('div');
            m.className = 'modal abierto';
            m.setAttribute('role', 'alertdialog');
            m.setAttribute('aria-modal', 'true');
            m.innerHTML = `
                <div class="modal-caja chica">
                    <div class="modal-cab">
                        <div class="ico" style="background:${peligro ? 'var(--rojo-claro)' : 'var(--azul-claro)'};color:${peligro ? 'var(--rojo)' : 'var(--azul)'}"><i class="fas ${peligro ? 'fa-trash-can' : 'fa-circle-question'}"></i></div>
                        <div><h3></h3><p></p></div>
                    </div>
                    <div class="modal-pie">
                        <button type="button" class="btn btn-texto" data-r="0">Cancelar</button>
                        <button type="button" class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" data-r="1"></button>
                    </div>
                </div>`;
            m.querySelector('h3').textContent = titulo;
            m.querySelector('p').textContent = mensaje;
            m.querySelector('[data-r="1"]').textContent = aceptar;
            const prev = document.activeElement;
            const fin = r => { m.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus({ preventScroll: true }); resolve(r); };
            const key = e => { if (e.key === 'Escape') { e.stopPropagation(); fin(false); } };
            m.addEventListener('click', e => { if (e.target === m) fin(false); const b = e.target.closest('[data-r]'); if (b) fin(b.dataset.r === '1'); });
            document.addEventListener('keydown', key, true);
            document.body.appendChild(m);
            m.querySelector('[data-r="1"]').focus();
        });
    }

    /* ---------- Sesión ---------- */
    async function verificarSesion() {
        if (!token()) {
            toast('No has iniciado sesión. Te llevamos al inicio de sesión…', 'aviso');
            setTimeout(() => { window.location.href = '/login.html'; }, 1500);
            return null;
        }
        try {
            const r = await fetch(`${API_BASE}/auth/profile`, { headers: authHeaders() });
            const data = await r.json().catch(() => ({}));
            if (r.ok && data.data && data.data.admin) {
                pintarUsuario(data.data.admin);
                return data.data.admin;
            }
            const inactiva = data.code === 'ACCOUNT_INACTIVE' || (data.message && data.message.includes('inactiva'));
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            toast(inactiva ? 'Tu cuenta está desactivada. Contacta al super administrador para reactivarla.' : 'Tu sesión expiró. Vuelve a iniciar sesión.', 'aviso');
            setTimeout(() => { window.location.href = '/login.html'; }, inactiva ? 3000 : 2000);
            return null;
        } catch (e) {
            console.error('Error verificando sesión:', e);
            toast('No pudimos verificar tu sesión. Revisa tu conexión.', 'err');
            return null;
        }
    }
    function pintarUsuario(u) {
        const n = $('#user-name'), r = $('#user-role'), a = $('#user-avatar');
        if (n) n.textContent = `${u.nombre || ''} ${u.apellido || ''}`.trim();
        if (r) r.textContent = u.rol || '';
        if (a) a.textContent = (((u.nombre || '').charAt(0)) + ((u.apellido || '').charAt(0))).toUpperCase() || '?';
    }
    async function cerrarSesion() {
        const ok = await confirmar({ titulo: '¿Cerrar sesión?', mensaje: 'Tendrás que volver a entrar con tu correo y contraseña.', aceptar: 'Cerrar sesión', peligro: false });
        if (!ok) return;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        toast('Sesión cerrada.', 'info');
        setTimeout(() => { window.location.href = '/login.html'; }, 500);
    }
    // Si la sesión se cierra en otra pestaña, salir también aquí
    setInterval(() => { if (!token()) window.location.href = '/login.html'; }, 30000);

    window.Panel = { API_BASE, reduceMotion, esc, token, authHeaders, toast, btnEstado, abrirModal, cerrarModal, confirmar, verificarSesion, cerrarSesion };
    // Compatibilidad con el nombre anterior
    window.showNotification = (m, t = 'info') => toast(m, t);
})();
