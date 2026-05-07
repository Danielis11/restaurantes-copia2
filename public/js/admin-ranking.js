const API_BASE = `${window.location.origin}/api`;
let currentUser = null;
let restaurantes = [];
let topMap = new Map();

const el = {
  list: document.getElementById('list-container'),
  top: document.getElementById('top-container'),
  search: document.getElementById('search-input'),
  save: document.getElementById('save-btn'),
  clear: document.getElementById('clear-btn'),
  logout: document.getElementById('logout-btn'),
  toast: document.getElementById('toast-stack')
};

function notify(message, type = 'info', title = '') {
  if (!el.toast) return;
  const iconByType = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const resolvedTitle = title || (
    type === 'success' ? 'Acción completada' :
    type === 'error' ? 'Error' :
    type === 'warning' ? 'Atención' : 'Información'
  );

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${iconByType[type] || iconByType.info}"></i>
    <div>
      <div class="toast-title">${resolvedTitle}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  el.toast.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

async function authGuard() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }

  const res = await fetch(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/login.html';
    return false;
  }

  const data = await res.json();
  currentUser = data?.data?.admin;

  if (!currentUser || !['admin-ranking', 'super-admin'].includes(currentUser.rol)) {
    notify('No tienes permisos para este panel', 'error', 'Acceso denegado');
    window.location.href = '/admin.html';
    return false;
  }

  notify(`Sesión iniciada como ${currentUser.nombre}`, 'success', 'Bienvenido');

  return true;
}

function renderTopSlots() {
  el.top.innerHTML = '';

  for (let i = 1; i <= 12; i += 1) {
    const item = [...topMap.values()].find((x) => x.position === i);
    const slot = document.createElement('div');
    slot.className = 'top-slot';

    if (item) {
      slot.innerHTML = `
        <div>
          <span class="slot-index">#${i}</span>
          <span class="item-title">${item.nombre}</span>
          <div class="item-sub">${item.tipo || 'Sin tipo'} · ${item.ciudad || 'Sin ciudad'}</div>
        </div>
        <button class="btn btn-outline" data-remove-id="${item._id}">Quitar</button>
      `;
    } else {
      slot.innerHTML = `
        <div>
          <span class="slot-index">#${i}</span>
          <span class="empty">Vacío</span>
        </div>
      `;
    }

    el.top.appendChild(slot);
  }

  el.top.querySelectorAll('[data-remove-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      topMap.delete(btn.dataset.removeId);
      renderTopSlots();
      renderList();
    });
  });
}

function renderList() {
  const q = (el.search.value || '').trim().toLowerCase();
  const filtered = restaurantes.filter((r) => {
    const city = r?.direccion?.ciudad || '';
    return `${r.nombre} ${r.tipo} ${city}`.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    el.list.innerHTML = '<p class="empty">No hay resultados</p>';
    return;
  }

  el.list.innerHTML = filtered.map((r) => {
    const city = r?.direccion?.ciudad || 'Sin ciudad';
    const isAssigned = topMap.has(r._id);
    const assigned = isAssigned ? topMap.get(r._id).position : null;

    return `
      <div class="item">
        <div>
          <div class="item-title">${r.nombre}</div>
          <div class="item-sub">${r.tipo || 'Sin tipo'} · ${city}</div>
        </div>
        <div class="item-controls">
          ${assigned ? `<span class="pos-badge">Top #${assigned}</span>` : ''}
          ${Array.from({ length: 12 }, (_, idx) => {
            const pos = idx + 1;
            return `<button class="btn btn-outline" data-assign-id="${r._id}" data-pos="${pos}">#${pos}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  el.list.querySelectorAll('[data-assign-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.assignId;
      const position = Number(btn.dataset.pos);
      const r = restaurantes.find((x) => x._id === id);
      if (!r) return;

      const occupied = [...topMap.values()].find((x) => x.position === position);
      if (occupied && occupied._id !== id) {
        topMap.delete(occupied._id);
      }

      topMap.set(id, {
        _id: r._id,
        nombre: r.nombre,
        tipo: r.tipo,
        ciudad: r?.direccion?.ciudad || '',
        position
      });

      renderTopSlots();
      renderList();
    });
  });
}

async function loadData() {
  const token = localStorage.getItem('authToken');

  const res = await fetch(`${API_BASE}/ranking-admin/list`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    notify(data.message || 'No se pudo cargar el listado', 'error', 'Carga fallida');
    return;
  }

  restaurantes = data.data.restaurantes || [];
  topMap.clear();

  restaurantes.forEach((r) => {
    if (Number.isInteger(r.homePosition) && r.homePosition >= 1 && r.homePosition <= 12) {
      topMap.set(r._id, {
        _id: r._id,
        nombre: r.nombre,
        tipo: r.tipo,
        ciudad: r?.direccion?.ciudad || '',
        position: r.homePosition
      });
    }
  });

  renderTopSlots();
  renderList();
}

async function saveRanking() {
  const token = localStorage.getItem('authToken');
  const positions = [...topMap.values()]
    .sort((a, b) => a.position - b.position)
    .map((x) => ({ restaurantId: x._id, position: x.position }));

  const res = await fetch(`${API_BASE}/ranking-admin/positions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ positions })
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    notify(data.message || 'No se pudo guardar el ranking', 'error', 'Guardado fallido');
    return;
  }

  notify('Ranking guardado correctamente', 'success', 'Cambios aplicados');
  await loadData();
}

function clearTop() {
  topMap.clear();
  renderTopSlots();
  renderList();
}

async function logout() {
  notify('Cerrando sesión de forma segura...', 'info', 'Cierre de sesión');

  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.warn('No se pudo cerrar sesión en servidor, se hará cierre local:', error);
  } finally {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    notify('Sesión cerrada correctamente', 'success', 'Hasta pronto');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 900);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const canAccess = await authGuard();
  if (!canAccess) return;

  await loadData();

  el.search.addEventListener('input', renderList);
  el.save.addEventListener('click', saveRanking);
  el.clear.addEventListener('click', clearTop);
  el.logout.addEventListener('click', logout);
});
