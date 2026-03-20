// ===== ADMIN TURISMO - PANEL CRUD COMPLETO =====

let allTours = [];
let allGuias = [];
let allAgencias = [];
const API = window.location.origin + '/api';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Verificar rol: solo super-admin o admin-turismo
    if (user.rol && user.rol !== 'super-admin' && user.rol !== 'admin-turismo') {
        showNotification('No tienes permisos para acceder a este panel', 'error');
        setTimeout(() => window.location.href = '/login.html', 2000);
        return;
    }

    // Mostrar info del usuario
    document.getElementById('user-name').textContent = user.nombre || 'Admin';
    document.getElementById('user-role').textContent = user.rol === 'super-admin' ? 'Super Admin' : 'Admin Turismo';
    document.getElementById('user-avatar').textContent = (user.nombre || 'A').charAt(0).toUpperCase();

    loadDashboardData();
});

// ===== AUTH HELPERS =====
function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    };
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/login.html';
}

// ===== TABS =====
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${tabId}-section`).classList.add('active');
}

// ===== LOAD DATA =====
async function loadDashboardData() {
    try {
        const [toursRes, guiasRes, agenciasRes] = await Promise.all([
            fetch(`${API}/tours?allLangs=true`),
            fetch(`${API}/guias?allLangs=true`),
            fetch(`${API}/agencias?allLangs=true`)
        ]);
        const toursData = await toursRes.json();
        const guiasData = await guiasRes.json();
        const agenciasData = await agenciasRes.json();

        if (toursData.success) {
            allTours = toursData.data;
            document.getElementById('total-tours').textContent = allTours.length;
            renderToursTable(allTours);

            // Contar categorías únicas
            const cats = new Set(allTours.map(t => t.categoria).filter(Boolean));
            document.getElementById('total-categorias').textContent = cats.size;
        }

        if (guiasData.success) {
            allGuias = guiasData.data;
            document.getElementById('total-guias').textContent = allGuias.length;
            renderGuiasTable(allGuias);
        }

        if (agenciasData.success) {
            allAgencias = agenciasData.data;
            renderAgenciasTable(allAgencias);
        }
    } catch (e) {
        showNotification('Error de conexión con el servidor', 'error');
    }
}

// ===== RENDER TOURS TABLE =====
function renderToursTable(tours) {
    const tbody = document.getElementById('tours-table-body');
    if (tours.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-map-marked-alt"></i><p>No hay tours registrados</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = tours.map(tour => {
        const diffClass = { 'Fácil': 'badge-green', 'Moderado': 'badge-amber', 'Difícil': 'badge-red', 'Extremo': 'badge-red' };
        const catClass = { 'Naturaleza': 'badge-green', 'Cultura': 'badge-purple', 'Aventura': 'badge-amber', 'Gastronomía': 'badge-blue' };
        const principalImg = tour.imagenes?.find(i => i.esPrincipal)?.url || tour.imagenes?.[0]?.url || null;

        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:1.5rem;">
                    <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;border:1px solid var(--gray-200);display:flex;align-items:center;justify-content:center;background:var(--gray-100);">
                        ${principalImg ? `<img src="${principalImg}" alt="Tour" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fas fa-image" style="color:var(--gray-400);font-size:1.2rem;"></i>`}
                    </div>
                    <div>
                        <strong style="font-size:1.05rem;color:var(--gray-800);">${tour.nombre?.es || 'Sin nombre'}</strong>
                        ${tour.nombre?.en ? `<div style="font-size:0.75rem;color:var(--gray-400);margin-top:2px;">${tour.nombre.en}</div>` : ''}
                    </div>
                </div>
            </td>
            <td><span class="badge badge-purple">${tour.tipo || 'Turismo Convencional'}</span></td>
            <td><span class="badge ${catClass[tour.categoria] || 'badge-blue'}">${tour.categoria || 'N/A'}</span></td>
            <td><strong>$${(tour.precio?.amount || 0).toLocaleString()}</strong> <span style="color:var(--gray-400);font-size:0.8rem;">${tour.precio?.moneda || 'MXN'}</span></td>
            <td>${tour.duracion?.horas || 0} hrs</td>
            <td><span class="badge ${diffClass[tour.dificultad] || 'badge-green'}">${tour.dificultad || 'N/A'}</span></td>
            <td class="actions-cell">
                <button class="btn btn-outline btn-sm" onclick="openTourModal('${tour._id}')" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="confirmDelete('tours', '${tour._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ===== RENDER GUIAS TABLE =====
function renderGuiasTable(guias) {
    const tbody = document.getElementById('guias-table-body');
    if (guias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-user-slash"></i><p>No hay guías registrados</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = guias.map(guia => {
        const estadoClass = { 'activo': 'badge-green', 'pendiente': 'badge-amber', 'inactivo': 'badge-red' };
        const profilImg = typeof guia.fotoPerfil === 'string' ? guia.fotoPerfil : (guia.fotoPerfil?.url || null);
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="position:relative;width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid var(--gray-200);background:var(--accent-light);display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:600;">
                        ${profilImg ? `<img src="${profilImg}" style="width:100%;height:100%;object-fit:cover;">` : (guia.nombreCompleto || 'G').charAt(0).toUpperCase()}
                    </div>
                    <strong>${guia.nombreCompleto || 'Sin nombre'}</strong>
                </div>
            </td>
            <td>${guia.especialidades?.length > 0 ? guia.especialidades.slice(0, 2).map(e => `<span class="badge badge-purple" style="margin-right:3px;">${e}</span>`).join('') : '<span style="color:var(--gray-400)">—</span>'}</td>
            <td><span style="font-size:0.85rem;color:var(--gray-600);">${guia.credencialSECTUR || 'N/A'}</span></td>
            <td>${guia.idiomas?.join(', ') || 'Español'}</td>
            <td><span class="badge ${estadoClass[guia.estado] || 'badge-green'}">${guia.estado || 'activo'}</span></td>
            <td class="actions-cell">
                <button class="btn btn-outline btn-sm" onclick="openGuiaModal('${guia._id}')" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="confirmDelete('guias', '${guia._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

let tourImagenesEliminar = [];
let tourCurrentImagesState = []; // [{ id: '...', isNew: false, url: '...', file: null }, { isNew: true, url: 'blob:...', file: File }]
let tourRutasAdicionales = [];
let guiaEliminarFotoPerfil = false;
let agenciaEliminarLogo = false;

// ===== RENDER AGENCIAS TABLE =====
function renderAgenciasTable(agencias) {
    const tbody = document.getElementById('agencias-table-body');
    if (agencias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-building-slash"></i><p>No hay agencias registradas</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = agencias.map(agencia => {
        const estadoClass = { 'activo': 'badge-green', 'pendiente': 'badge-amber', 'inactivo': 'badge-red' };
        const logoImg = typeof agencia.logo === 'string' ? agencia.logo : (agencia.logo?.url || null);
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="position:relative;width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;border:1px solid var(--gray-200);background:var(--accent-light);display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:600;">
                        ${logoImg ? `<img src="${logoImg}" style="width:100%;height:100%;object-fit:cover;">` : (agencia.nombre || 'A').charAt(0).toUpperCase()}
                    </div>
                    <strong>${agencia.nombre || 'Sin nombre'}</strong>
                </div>
            </td>
            <td>
                <div style="font-size:0.85rem;"><i class="fas fa-phone" style="color:var(--gray-400);"></i> ${agencia.telefono || 'N/A'}</div>
                <div style="font-size:0.85rem;"><i class="fas fa-envelope" style="color:var(--gray-400);"></i> ${agencia.email || 'N/A'}</div>
            </td>
            <td><span style="font-size:0.85rem;color:var(--gray-600);">${agencia.rnt || 'N/A'}</span></td>
            <td><span class="badge ${estadoClass[agencia.estado] || 'badge-green'}">${agencia.estado || 'activo'}</span></td>
            <td class="actions-cell">
                <button class="btn btn-outline btn-sm" onclick="openAgenciaModal('${agencia._id}')" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="confirmDelete('agencias', '${agencia._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ===== INFO ITEMS (Incluye, No Incluye, Qué Traer, Requisitos) =====
let tourInfoItems = { incluye: [], noIncluye: [], queTraer: [], requisitos: [] };

function addInfoItem(type) {
    const input = document.getElementById(`tour-${type}-input`);
    const val = input.value.trim();
    if (!val) return;
    tourInfoItems[type].push(val);
    input.value = '';
    renderInfoItems(type);
    input.focus();
}

function removeInfoItem(type, index) {
    tourInfoItems[type].splice(index, 1);
    renderInfoItems(type);
}

function renderInfoItems(type) {
    const container = document.getElementById(`tour-${type}-list`);
    container.innerHTML = tourInfoItems[type].map((item, i) => `
        <span style="display:inline-flex; align-items:center; gap:0.3rem; background:var(--primary-light); color:var(--primary-dark); padding:0.3rem 0.6rem; border-radius:1rem; font-size:0.85rem; font-weight:500;">
            ${item}
            <button type="button" onclick="removeInfoItem('${type}', ${i})" style="background:none; border:none; color:var(--primary-dark); cursor:pointer; font-size:1rem; line-height:1; padding:0;">&times;</button>
        </span>
    `).join('');
}

// Enter key support for info inputs
['incluye', 'noIncluye', 'queTraer', 'requisitos'].forEach(type => {
    document.addEventListener('DOMContentLoaded', () => {
        const el = document.getElementById(`tour-${type}-input`);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addInfoItem(type); } });
    });
});

// ===== VALIDACIÓN DE IMÁGENES =====
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        showNotification(`El archivo ${file.name} no es válido. Solo se permiten formatos JPG o PNG.`, 'error');
        return false;
    }
    if (file.size > maxSize) {
        showNotification(`El archivo ${file.name} supera el límite de 5 MB.`, 'error');
        return false;
    }
    return true;
}

// Manejador de previsualización rápida de adjuntos
document.getElementById('tour-imagenes').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (!validateImageFile(file)) return;
        tourCurrentImagesState.push({
            isNew: true,
            url: URL.createObjectURL(file),
            file: file,
            id: 'new-' + Date.now() + Math.random().toString(36).substr(2, 5)
        });
    });
    // Limpiar input para permitir seleccionar la misma foto de nuevo si se eliminó
    this.value = '';
    renderTourImagesPreview();
});

function renderTourImagesPreview() {
    const container = document.getElementById('tour-images-preview');
    container.innerHTML = '';
    
    tourCurrentImagesState.forEach((imgState, index) => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'sortable-image';
        imgContainer.draggable = true;
        imgContainer.dataset.id = imgState.id;
        imgContainer.dataset.index = index;
        imgContainer.style = `position:relative; width:90px; height:90px; display:inline-block; border-radius:6px; overflow:hidden; border:${imgState.isNew ? '2px dashed var(--primary)' : '1px solid var(--gray-300)'}; cursor:grab; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
        
        // Drag events
        imgContainer.addEventListener('dragstart', handleDragStart);
        imgContainer.addEventListener('dragover', handleDragOver);
        imgContainer.addEventListener('drop', handleDrop);
        imgContainer.addEventListener('dragenter', handleDragEnter);
        imgContainer.addEventListener('dragleave', handleDragLeave);
        imgContainer.addEventListener('dragend', handleDragEnd);

        imgContainer.innerHTML = `
            <img src="${imgState.url}" style="width:100%;height:100%;object-fit:cover; pointer-events:none;">
            <button type="button" onclick="eliminarImagenTourPreview('${imgState.id}')" style="position:absolute;top:4px;right:4px;background:var(--danger);color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:11px; z-index:10;">
                <i class="fas fa-times"></i>
            </button>
            ${index === 0 ? '<div style="position:absolute;bottom:0;width:100%;background:rgba(16, 185, 129, 0.9);color:white;font-size:10px;font-weight:600;text-align:center;padding:3px 0; z-index:5;">PORTADA</div>' : ''}
            ${imgState.isNew ? '<div style="position:absolute;top:4px;left:4px;background:var(--primary);color:white;font-size:9px;padding:2px 4px;border-radius:4px; z-index:5;">NUEVA</div>' : ''}
            <div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.5);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;pointer-events:none;">${index + 1}</div>
        `;
        container.appendChild(imgContainer);
    });
}

function eliminarImagenTourPreview(id) {
    const imgIndex = tourCurrentImagesState.findIndex(img => img.id === id);
    if (imgIndex > -1) {
        const img = tourCurrentImagesState[imgIndex];
        if (!img.isNew) {
            tourImagenesEliminar.push(id);
        } else {
            URL.revokeObjectURL(img.url); // liberar memoria
        }
        tourCurrentImagesState.splice(imgIndex, 1);
        renderTourImagesPreview();
    }
}

// Drag & Drop Logic
let draggedItemIndex = null;

function handleDragStart(e) {
    draggedItemIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItemIndex);
    this.style.opacity = '0.4';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.style.transform = 'scale(1.05)';
    this.style.border = '2px solid var(--primary)';
}

function handleDragLeave(e) {
    this.style.transform = 'scale(1)';
    const imgState = tourCurrentImagesState[parseInt(this.dataset.index)];
    this.style.border = imgState && imgState.isNew ? '2px dashed var(--primary)' : '1px solid var(--gray-300)';
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    const dropIndex = parseInt(this.dataset.index);
    if (draggedItemIndex !== dropIndex) {
        // Swap or move logic
        const draggedItem = tourCurrentImagesState[draggedItemIndex];
        tourCurrentImagesState.splice(draggedItemIndex, 1); // remove from old pos
        tourCurrentImagesState.splice(dropIndex, 0, draggedItem); // insert at new pos
        renderTourImagesPreview();
    }
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    renderTourImagesPreview(); // reset styles
}

// ===== SEARCH/FILTER =====
function filterTable(type) {
    const query = document.getElementById(`search-${type}`).value.toLowerCase();
    if (type === 'tours') {
        const filtered = allTours.filter(t =>
            (t.nombre?.es || '').toLowerCase().includes(query) ||
            (t.categoria || '').toLowerCase().includes(query)
        );
        renderToursTable(filtered);
    } else if (type === 'guias') {
        const filtered = allGuias.filter(g =>
            (g.nombreCompleto || '').toLowerCase().includes(query) ||
            (g.especialidades || []).join(' ').toLowerCase().includes(query)
        );
        renderGuiasTable(filtered);
    } else if (type === 'agencias') {
        const filtered = allAgencias.filter(a =>
            (a.nombre || '').toLowerCase().includes(query) ||
            (a.rnt || '').toLowerCase().includes(query) ||
            (a.telefono || '').toLowerCase().includes(query) ||
            (a.email || '').toLowerCase().includes(query)
        );
        renderAgenciasTable(filtered);
    }
}

// ===== MODAL HELPERS =====
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===== TOUR MODAL =====
function openTourModal(tourId) {
    const isEdit = !!tourId;
    document.getElementById('tour-modal-title').textContent = isEdit ? 'Editar Tour' : 'Nuevo Tour';
    document.getElementById('tour-edit-id').value = tourId || '';

    const guiasContainer = document.getElementById('tour-guias-list');
    guiasContainer.innerHTML = '';
    
    // Generate guide checkboxes
    if (allGuias && allGuias.length > 0) {
        allGuias.forEach(g => {
            const label = document.createElement('label');
            label.className = 'checkbox-item';
            label.innerHTML = `<input type="checkbox" value="${g._id}" class="tour-guia-cb"> ${g.nombreCompleto}`;
            guiasContainer.appendChild(label);
        });
    } else {
        guiasContainer.innerHTML = '<span style="color:var(--gray-500);font-size:0.85rem;">No hay guías disponibles para asignar.</span>';
    }

    if (isEdit) {
        const tour = allTours.find(t => t._id === tourId);
        if (!tour) return;
        document.getElementById('tour-nombre-es').value = tour.nombre?.es || '';
        document.getElementById('tour-desc-corta-es').value = tour.descripcionCorta?.es || '';
        document.getElementById('tour-desc-es').value = tour.descripcion?.es || '';
        document.getElementById('tour-itinerario-es').value = tour.itinerarioBasico?.es || '';
        document.getElementById('tour-punto-encuentro-es').value = tour.puntoEncuentro?.es || '';
        document.getElementById('tour-restricciones-es').value = tour.restricciones?.es || '';
        document.getElementById('tour-politicas-es').value = tour.politicasCancelacion?.es || '';
        const categoriaSelect = document.getElementById('tour-categoria');
        const categoriaVal = tour.categoria || '';
        if (categoriaVal && !Array.from(categoriaSelect.options).some(opt => opt.value === categoriaVal)) {
            categoriaSelect.add(new Option(categoriaVal, categoriaVal));
        }
        categoriaSelect.value = categoriaVal;

        const tipoSelect = document.getElementById('tour-tipo');
        const tipoVal = tour.tipo || 'Turismo Convencional';
        if (tipoVal && !Array.from(tipoSelect.options).some(opt => opt.value === tipoVal)) {
            tipoSelect.add(new Option(tipoVal, tipoVal));
        }
        tipoSelect.value = tipoVal;
        document.getElementById('tour-precio').value = tour.precio?.amount || '';
        document.getElementById('tour-duracion').value = tour.duracion?.horas || '';
        document.getElementById('tour-dificultad').value = tour.dificultad || '';
        document.getElementById('tour-capacidad').value = tour.capacidad?.maxima || '';
        document.getElementById('tour-duracion-desc').value = tour.duracion?.descripcion || '';
        document.getElementById('tour-whatsapp').value = tour.telefonoWhatsApp || '';
        document.getElementById('tour-todo-anio').checked = tour.disponibilidad?.todoElAnio !== false;
        
        // Set day checkboxes
        const tourDias = tour.disponibilidad?.diasSemana || [];
        document.querySelectorAll('#tour-dias-semana input[type="checkbox"]').forEach(cb => {
            cb.checked = tourDias.includes(cb.value);
        });
        
        // Info items
        tourInfoItems.incluye = (tour.incluye || []).map(i => i.es || i);
        tourInfoItems.noIncluye = (tour.noIncluye || []).map(i => i.es || i);
        tourInfoItems.queTraer = (tour.queTraer || []).map(i => i.es || i);
        tourInfoItems.requisitos = (tour.requisitos || []).map(i => i.es || i);
        ['incluye', 'noIncluye', 'queTraer', 'requisitos'].forEach(t => renderInfoItems(t));
        
        // Select logic for guides
        const AssignedGuideIds = (tour.guiasAsignados || []).map(g => g._id || g);
        // Fallback for older tours that use guiaReferencia
        if (AssignedGuideIds.length === 0 && tour.guiaReferencia) {
            AssignedGuideIds.push(tour.guiaReferencia._id || tour.guiaReferencia);
        }
        document.querySelectorAll('.tour-guia-cb').forEach(cb => {
            if (AssignedGuideIds.includes(cb.value)) cb.checked = true;
        });

        window.currentEditingTour = tour;
        tourImagenesEliminar = [];
        tourCurrentImagesState = (tour.imagenes || []).map(img => ({
            id: img._id,
            isNew: false,
            url: img.url,
            file: null
        }));
        renderTourImagesPreview();
        
        tourRutasAdicionales = (tour.rutas || []).map((r, i) => ({
            id: `ruta-existente-${i}`,
            titulo: r.titulo?.es || '',
            descripcion: r.descripcion?.es || '',
            dificultad: r.dificultad || 'Moderado',
            duracion: r.duracion || '',
            kilometros: r.kilometros || '',
            imagenObj: r.imagen || null,
            nuevaImagenFile: null,
            nuevaImagenUrl: null
        }));
        renderRutas();
    } else {
        // Limpiar formulario
        ['tour-nombre-es', 'tour-desc-corta-es', 'tour-desc-es',
         'tour-precio', 'tour-duracion', 'tour-capacidad', 'tour-itinerario-es', 'tour-punto-encuentro-es', 'tour-restricciones-es', 'tour-politicas-es'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('tour-categoria').value = '';
        document.getElementById('tour-tipo').value = 'Turismo Convencional';
        document.getElementById('tour-dificultad').value = '';
        document.getElementById('tour-imagenes').value = '';
        document.getElementById('tour-duracion-desc').value = '';
        document.getElementById('tour-whatsapp').value = '';
        document.getElementById('tour-todo-anio').checked = true;
        document.querySelectorAll('#tour-dias-semana input[type="checkbox"]').forEach(cb => cb.checked = false);
        tourInfoItems = { incluye: [], noIncluye: [], queTraer: [], requisitos: [] };
        ['incluye', 'noIncluye', 'queTraer', 'requisitos'].forEach(t => renderInfoItems(t));
        
        
        window.currentEditingTour = null;
        tourImagenesEliminar = [];
        tourCurrentImagesState = [];
        renderTourImagesPreview();
        tourRutasAdicionales = [];
        renderRutas();
    }

    openModal('tour-modal');
}

// ===== SAVE TOUR =====
async function saveTour() {
    const editId = document.getElementById('tour-edit-id').value;
    const isEdit = !!editId;

    const nombreEs = document.getElementById('tour-nombre-es').value.trim();
    const categoria = document.getElementById('tour-categoria').value;
    const precio = document.getElementById('tour-precio').value;
    const duracion = document.getElementById('tour-duracion').value;
    const dificultad = document.getElementById('tour-dificultad').value;
    const capacidad = document.getElementById('tour-capacidad').value;
    const descCortaEs = document.getElementById('tour-desc-corta-es').value.trim();
    const descEs = document.getElementById('tour-desc-es').value.trim();
    const itinerarioEs = document.getElementById('tour-itinerario-es').value.trim();
    const puntoEncuentroEs = document.getElementById('tour-punto-encuentro-es').value.trim();
    const restriccionesEs = document.getElementById('tour-restricciones-es').value.trim();
    const politicasEs = document.getElementById('tour-politicas-es').value.trim();

    if (!nombreEs || !categoria || !precio || !duracion || !dificultad || !capacidad || !descCortaEs || !descEs) {
        showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('nombre', JSON.stringify({
        es: nombreEs,
        en: ''
    }));
    formData.append('descripcionCorta', JSON.stringify({
        es: descCortaEs,
        en: ''
    }));
    formData.append('descripcion', JSON.stringify({
        es: descEs,
        en: ''
    }));
    formData.append('itinerarioBasico', JSON.stringify({ es: itinerarioEs, en: '' }));
    formData.append('puntoEncuentro', JSON.stringify({ es: puntoEncuentroEs, en: '' }));
    formData.append('restricciones', JSON.stringify({ es: restriccionesEs, en: '' }));
    formData.append('politicasCancelacion', JSON.stringify({ es: politicasEs, en: '' }));
    
    const tipo = document.getElementById('tour-tipo').value;
    if (!tipo) {
        showNotification('Selecciona el tipo de Turismo', 'error');
        return;
    }
    formData.append('tipo', tipo);
    formData.append('categoria', categoria);
    
    // Numbers
    formData.append('precio[amount]', Number(precio));
    formData.append('precio[moneda]', 'MXN');
    formData.append('duracion[horas]', Number(duracion));
    formData.append('dificultad', dificultad);
    formData.append('capacidad[minima]', 1);
    formData.append('capacidad[maxima]', Number(capacidad));

    // Duration description
    const duracionDesc = document.getElementById('tour-duracion-desc').value.trim();
    if (duracionDesc) formData.append('duracion[descripcion]', duracionDesc);

    // WhatsApp
    const whatsapp = document.getElementById('tour-whatsapp').value.trim();
    formData.append('telefonoWhatsApp', whatsapp);

    // Disponibilidad
    const todoElAnio = document.getElementById('tour-todo-anio').checked;
    formData.append('disponibilidad[todoElAnio]', todoElAnio);
    const diasSeleccionados = [];
    document.querySelectorAll('#tour-dias-semana input[type="checkbox"]:checked').forEach(cb => {
        diasSeleccionados.push(cb.value);
    });
    formData.append('disponibilidad[diasSemana]', JSON.stringify(diasSeleccionados));

    // Capturar cualquier texto que el usuario haya escrito pero no haya agregado con "+"
    ['incluye', 'noIncluye', 'queTraer', 'requisitos'].forEach(type => {
        const input = document.getElementById(`tour-${type}-input`);
        if (input && input.value.trim()) {
            tourInfoItems[type].push(input.value.trim());
            input.value = ''; // limpiar
        }
    });

    // Información Útil
    formData.append('incluye', JSON.stringify(tourInfoItems.incluye.map(i => ({ es: i }))));
    formData.append('noIncluye', JSON.stringify(tourInfoItems.noIncluye.map(i => ({ es: i }))));
    formData.append('queTraer', JSON.stringify(tourInfoItems.queTraer.map(i => ({ es: i }))));
    formData.append('requisitos', JSON.stringify(tourInfoItems.requisitos.map(i => ({ es: i }))));

    // Guías Asignados
    const selectedGuias = [];
    document.querySelectorAll('.tour-guia-cb:checked').forEach(cb => selectedGuias.push(cb.value));
    formData.append('guiasAsignados', JSON.stringify(selectedGuias));

    // Archivos Nuevos y Ordenamiento
    const sortedImageIds = []; // IDs de imágenes antiguas en su nuevo orden
    
    tourCurrentImagesState.forEach(imgState => {
        if (imgState.isNew) {
            formData.append('imagenes', imgState.file);
            // Marcar en el ordenamiento que aquí va una "nueva imagen" indicando un placeholder
            sortedImageIds.push('NUEVA_IMAGEN');
        } else {
            sortedImageIds.push(imgState.id);
        }
    });

    formData.append('imagenesOrden', JSON.stringify(sortedImageIds));

    // Imágenes a eliminar
    if (isEdit && tourImagenesEliminar.length > 0) {
        formData.append('imagenesEliminar', JSON.stringify(tourImagenesEliminar));
    }

    // ===== RUTAS ADICIONALES =====
    const rutasFinales = tourRutasAdicionales.map((ruta, index) => {
        const rutaData = {
            titulo: { es: ruta.titulo, en: '', fr: '' },
            descripcion: { es: ruta.descripcion, en: '', fr: '' },
            dificultad: ruta.dificultad,
            duracion: ruta.duracion,
            kilometros: ruta.kilometros
        };
        // Preservar la imagen existente si no hay nueva
        if (ruta.imagenObj && !ruta.nuevaImagenFile) {
            rutaData.imagen = ruta.imagenObj;
        }
        // Append archivo nuevo si hay
        if (ruta.nuevaImagenFile) {
            formData.append(`ruta_imagen_${index}`, ruta.nuevaImagenFile);
        }
        return rutaData;
    });
    formData.append('rutas', JSON.stringify(rutasFinales));

    const saveBtn = document.getElementById('tour-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const url = isEdit ? `${API}/tours/${editId}` : `${API}/tours`;
        const method = isEdit ? 'PUT' : 'POST';

        // Al usar FormData, fetch calcula automáticamente The Boundary and Content-Type
        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        };

        const res = await fetch(url, {
            method,
            headers,
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            showNotification(isEdit ? 'Tour actualizado exitosamente' : 'Tour creado exitosamente', 'success');
            closeModal('tour-modal');
            loadDashboardData();
        } else {
            showNotification(data.message || 'Error al guardar el tour', 'error');
        }
    } catch (e) {
        showNotification('Error de conexión', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Tour';
    }
}

// ===== FUNCIONES DE RUTAS ADICIONALES =====
function addRuta() {
    tourRutasAdicionales.push({
        id: 'ruta-nueva-' + Date.now(),
        titulo: '',
        descripcion: '',
        dificultad: 'Moderado',
        duracion: '',
        kilometros: '',
        imagenObj: null,
        nuevaImagenFile: null,
        nuevaImagenUrl: null
    });
    renderRutas();
}

function removeRuta(index) {
    const ruta = tourRutasAdicionales[index];
    if (ruta.nuevaImagenUrl) {
        URL.revokeObjectURL(ruta.nuevaImagenUrl);
    }
    tourRutasAdicionales.splice(index, 1);
    renderRutas();
}

function updateRutaField(index, field, value) {
    if (tourRutasAdicionales[index]) {
        tourRutasAdicionales[index][field] = value;
    }
}

function handleRutaImageUpload(index, input) {
    const file = input.files[0];
    if (file) {
        if (!validateImageFile(file)) {
            input.value = '';
            return;
        }
        const ruta = tourRutasAdicionales[index];
        if (ruta.nuevaImagenUrl) URL.revokeObjectURL(ruta.nuevaImagenUrl);
        ruta.nuevaImagenFile = file;
        ruta.nuevaImagenUrl = URL.createObjectURL(file);
        renderRutas();
    }
}

function renderRutas() {
    const container = document.getElementById('tour-rutas-container');
    if (!container) return;
    
    if (tourRutasAdicionales.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; border:1px dashed var(--gray-300); border-radius:8px; color:var(--gray-400); font-size:0.9rem;">No hay rutas adicionales configuradas.</div>';
        return;
    }

    container.innerHTML = tourRutasAdicionales.map((ruta, index) => {
        const imgSrc = ruta.nuevaImagenUrl || (ruta.imagenObj ? ruta.imagenObj.url : null);
        return `
        <div style="background:var(--gray-50); padding:15px; border-radius:8px; border:1px solid var(--gray-200); position:relative;">
            <button type="button" class="btn btn-outline" style="position:absolute; top:10px; right:10px; color:var(--error); padding:5px 10px; border:none;" onclick="removeRuta(${index})" title="Eliminar Ruta">
                <i class="fas fa-trash"></i>
            </button>
            <h4 style="margin-bottom:15px; color:var(--gray-700); font-size:1rem;">Ruta ${index + 1}</h4>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                <div>
                    <label class="form-label" style="font-size:0.85rem;">Título (Español) <span style="color:red">*</span></label>
                    <input type="text" class="form-input" placeholder="Ej: Ruta Cascada Corta" value="${ruta.titulo}" onchange="updateRutaField(${index}, 'titulo', this.value)" required>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.85rem;">Duración</label>
                    <input type="text" class="form-input" placeholder="Ej: 2 horas" value="${ruta.duracion}" onchange="updateRutaField(${index}, 'duracion', this.value)">
                </div>
                <div>
                    <label class="form-label" style="font-size:0.85rem;">Kilómetros</label>
                    <input type="text" class="form-input" placeholder="Ej: 15 km" value="${ruta.kilometros || ''}" onchange="updateRutaField(${index}, 'kilometros', this.value)">
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                <div>
                    <label class="form-label" style="font-size:0.85rem;">Dificultad</label>
                    <select class="form-select" onchange="updateRutaField(${index}, 'dificultad', this.value)">
                        <option value="Fácil" ${ruta.dificultad === 'Fácil' ? 'selected' : ''}>Fácil</option>
                        <option value="Moderado" ${ruta.dificultad === 'Moderado' ? 'selected' : ''}>Moderado</option>
                        <option value="Difícil" ${ruta.dificultad === 'Difícil' ? 'selected' : ''}>Difícil</option>
                        <option value="Extremo" ${ruta.dificultad === 'Extremo' ? 'selected' : ''}>Extremo</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size:0.85rem;">Imagen representativa</label>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="file" id="ruta-img-${index}" accept="image/*" style="display:none;" onchange="handleRutaImageUpload(${index}, this)">
                        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('ruta-img-${index}').click()">
                            <i class="fas fa-upload"></i> Subir Imagen
                        </button>
                        ${imgSrc ? `<div style="width:40px; height:40px; border-radius:4px; overflow:hidden; border:1px solid var(--gray-300);"><img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;"></div>` : ''}
                    </div>
                </div>
            </div>
            
            <div style="width:100%;">
                <label class="form-label" style="font-size:0.85rem;">Descripción (Español) <span style="color:red">*</span></label>
                <textarea class="form-textarea" placeholder="Descripción de esta ruta específica..." onchange="updateRutaField(${index}, 'descripcion', this.value)" rows="2" required>${ruta.descripcion}</textarea>
            </div>
        </div>
        `;
    }).join('');
}

// ===== PREVIEW FOTO PERFIL GUIA =====
document.getElementById('guia-fotoperfil').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (!validateImageFile(file)) {
            this.value = '';
            return;
        }
        guiaEliminarFotoPerfil = false;
        renderGuiaImagePreview(URL.createObjectURL(file), true);
    }
});

function renderGuiaImagePreview(url, isNew = false) {
    const container = document.getElementById('guia-foto-preview');
    if (!url) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div style="position:relative; width:100px; height:100px; border-radius:50%; overflow:hidden; border:${isNew ? '2px dashed var(--primary)' : '1px solid var(--gray-200)'};">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover;">
            <button type="button" onclick="eliminarFotoPerfilVista()" style="position:absolute;top:5px;right:25px;background:var(--error);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:10px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

function eliminarFotoPerfilVista() {
    guiaEliminarFotoPerfil = true;
    document.getElementById('guia-fotoperfil').value = '';
    renderGuiaImagePreview(null);
}

// ===== PREVIEW GALERIA Y CERTIFICACIONES GUIA =====
let galeriaGuiaAEliminar = [];
let guiaCertificaciones = [];

function marcarEliminarGaleriaGuia(imgId, el) {
    galeriaGuiaAEliminar.push(imgId);
    el.remove();
}

document.getElementById('guia-galeria').addEventListener('change', function(e) {
    const container = document.getElementById('guia-galeria-preview');
    Array.from(this.files).forEach(file => {
        if (!validateImageFile(file)) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:2px dashed var(--primary); display:flex; align-items:center; justify-content:center; background:var(--gray-50);';
            div.innerHTML = `
                <img src="${e.target.result}" style="max-width:100%; max-height:100%; object-fit:contain;">
            `;
            container.appendChild(div);
        }
        reader.readAsDataURL(file);
    });
});

function agregarCertificacionGuia() {
    guiaCertificaciones.push({ nombre: '', institucion: '', fechaObtencion: '', vigencia: '' });
    renderCertificacionesGuia();
}

function eliminarCertificacionGuia(index) {
    guiaCertificaciones.splice(index, 1);
    renderCertificacionesGuia();
}

function renderCertificacionesGuia() {
    const container = document.getElementById('guia-certificaciones-container');
    container.innerHTML = '';
    guiaCertificaciones.forEach((cert, index) => {
        const fObt = cert.fechaObtencion ? new Date(cert.fechaObtencion).toISOString().split('T')[0] : '';
        const fVig = cert.vigencia ? new Date(cert.vigencia).toISOString().split('T')[0] : '';
        container.innerHTML += `
            <div style="background:var(--gray-50); padding:10px; border-radius:5px; border:1px solid var(--gray-200); position:relative;">
                <button type="button" class="btn btn-outline" style="position:absolute; top:5px; right:5px; color:var(--error); padding:5px; border:none;" onclick="eliminarCertificacionGuia(${index})"><i class="fas fa-trash"></i></button>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; margin-top:15px;">
                    <input type="text" class="form-input" placeholder="Nombre (Ej: WFR)" value="${cert.nombre || ''}" onchange="guiaCertificaciones[${index}].nombre=this.value">
                    <input type="text" class="form-input" placeholder="Institución" value="${cert.institucion || ''}" onchange="guiaCertificaciones[${index}].institucion=this.value">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div><label style="font-size:12px;">Fecha Obtención</label><input type="date" class="form-input" value="${fObt}" onchange="guiaCertificaciones[${index}].fechaObtencion=this.value"></div>
                    <div><label style="font-size:12px;">Vigencia</label><input type="date" class="form-input" value="${fVig}" onchange="guiaCertificaciones[${index}].vigencia=this.value"></div>
                </div>
            </div>
        `;
    });
}

// ===== GUIA MODAL =====
function openGuiaModal(guiaId) {
    const isEdit = !!guiaId;
    document.getElementById('guia-modal-title').textContent = isEdit ? 'Editar Guía' : 'Nuevo Guía';
    document.getElementById('guia-edit-id').value = guiaId || '';

    // Reset checkboxes and custom fields
    document.querySelectorAll('#guia-especialidades input[type="checkbox"]').forEach(cb => cb.checked = false);
    galeriaGuiaAEliminar = [];
    document.getElementById('guia-galeria').value = '';
    document.getElementById('guia-galeria-preview').innerHTML = '';
    guiaCertificaciones = [];

    if (isEdit) {
        const guia = allGuias.find(g => g._id === guiaId);
        if (!guia) return;
        document.getElementById('guia-nombre').value = guia.nombreCompleto || '';
        document.getElementById('guia-telefono').value = guia.telefono || '';
        document.getElementById('guia-email').value = guia.email || '';
        document.getElementById('guia-sectur').value = guia.credencialSECTUR || '';
        document.getElementById('guia-conanp').value = guia.autorizacionCONANP || '';
        document.getElementById('guia-estado').value = guia.estado || 'activo';
        document.getElementById('guia-idiomas').value = (guia.idiomas || []).join(', ');
        document.getElementById('guia-biografia').value = guia.biografia?.es || guia.biografia || '';

        document.getElementById('guia-aniosExperiencia').value = guia.aniosExperiencia || '';
        document.getElementById('guia-zonasOperacion').value = (guia.zonasOperacion || []).join(', ');
        
        document.getElementById('guia-facebook').value = guia.redesSociales?.facebook || '';
        document.getElementById('guia-instagram').value = guia.redesSociales?.instagram || '';
        document.getElementById('guia-youtube').value = guia.redesSociales?.youtube || '';
        document.getElementById('guia-tiktok').value = guia.redesSociales?.tiktok || '';

        // Certificaciones
        if (guia.certificaciones && guia.certificaciones.length > 0) {
            guiaCertificaciones = JSON.parse(JSON.stringify(guia.certificaciones));
        }

        // Check especialidades
        (guia.especialidades || []).forEach(esp => {
            const cb = document.querySelector(`#guia-especialidades input[value="${esp}"]`);
            if (cb) cb.checked = true;
        });
        
        guiaEliminarFotoPerfil = false;
        renderGuiaImagePreview(guia.fotoPerfil?.url || guia.fotoPerfil);

        // Galería existente
        if (guia.galeria && guia.galeria.length > 0) {
            const gCtrl = document.getElementById('guia-galeria-preview');
            guia.galeria.forEach(img => {
                const imgId = img._id || img.url;
                const div = document.createElement('div');
                div.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid var(--gray-300);';
                div.innerHTML = `
                    <img src="${img.url}" style="width:100%; height:100%; object-fit:cover;">
                    <button type="button" onclick="marcarEliminarGaleriaGuia('${imgId}', this.parentElement)" style="position:absolute;top:2px;right:2px;background:var(--danger);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:10px;"><i class="fas fa-times"></i></button>
                `;
                gCtrl.appendChild(div);
            });
        }
    } else {
        ['guia-nombre', 'guia-telefono', 'guia-email', 'guia-sectur', 'guia-conanp', 'guia-idiomas', 'guia-biografia', 'guia-fotoperfil', 'guia-aniosExperiencia', 'guia-zonasOperacion', 'guia-facebook', 'guia-instagram', 'guia-youtube', 'guia-tiktok'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('guia-estado').value = 'activo';
        guiaEliminarFotoPerfil = false;
        renderGuiaImagePreview(null);
    }
    
    renderCertificacionesGuia();

    openModal('guia-modal');
}

// ===== SAVE GUIA =====
async function saveGuia() {
    const editId = document.getElementById('guia-edit-id').value;
    const isEdit = !!editId;

    const nombre = document.getElementById('guia-nombre').value.trim();
    const telefono = document.getElementById('guia-telefono').value.trim();
    const sectur = document.getElementById('guia-sectur').value.trim();

    if (!nombre || !telefono || !sectur) {
        showNotification('Nombre, teléfono y credencial SECTUR son obligatorios', 'error');
        return;
    }

    const especialidades = [];
    document.querySelectorAll('#guia-especialidades input[type="checkbox"]:checked').forEach(cb => {
        especialidades.push(cb.value);
    });

    const idiomasRaw = document.getElementById('guia-idiomas').value.trim();
    const idiomas = idiomasRaw ? idiomasRaw.split(',').map(i => i.trim()).filter(Boolean) : ['Español'];

    const formData = new FormData();
    formData.append('nombreCompleto', nombre);
    formData.append('telefono', telefono);
    formData.append('email', document.getElementById('guia-email').value.trim());
    formData.append('credencialSECTUR', sectur);
    formData.append('autorizacionCONANP', document.getElementById('guia-conanp').value.trim());
    formData.append('estado', document.getElementById('guia-estado').value);
    formData.append('idiomas', JSON.stringify(idiomas));
    formData.append('biografia', document.getElementById('guia-biografia').value.trim());
    formData.append('especialidades', JSON.stringify(especialidades));

    // Data extra
    formData.append('aniosExperiencia', document.getElementById('guia-aniosExperiencia').value.trim() || 0);

    const zonasRaw = document.getElementById('guia-zonasOperacion').value.trim();
    const zonas = zonasRaw ? zonasRaw.split(',').map(z => z.trim()).filter(Boolean) : [];
    formData.append('zonasOperacion', JSON.stringify(zonas));

    const redesSociales = {
        facebook: document.getElementById('guia-facebook').value.trim(),
        instagram: document.getElementById('guia-instagram').value.trim(),
        youtube: document.getElementById('guia-youtube').value.trim(),
        tiktok: document.getElementById('guia-tiktok').value.trim()
    };
    formData.append('redesSociales', JSON.stringify(redesSociales));

    formData.append('certificaciones', JSON.stringify(guiaCertificaciones));

    if (guiaEliminarFotoPerfil && isEdit) {
        formData.append('eliminarFotoPerfil', 'true');
    }

    const fileInput = document.getElementById('guia-fotoperfil');
    if (fileInput.files.length > 0) {
        formData.append('fotoPerfil', fileInput.files[0]);
    }

    // Galería a eliminar
    if (isEdit && galeriaGuiaAEliminar.length > 0) {
        formData.append('imagenesEliminar', JSON.stringify(galeriaGuiaAEliminar));
    }

    // Archivos de Galería nuevos
    const galeriaFiles = document.getElementById('guia-galeria').files;
    if (galeriaFiles.length > 0) {
        for (let i = 0; i < galeriaFiles.length; i++) {
            formData.append('galeria', galeriaFiles[i]);
        }
    }

    const saveBtn = document.getElementById('guia-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const url = isEdit ? `${API}/guias/${editId}` : `${API}/guias`;
        const method = isEdit ? 'PUT' : 'POST';

        const headers = {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        };

        const res = await fetch(url, {
            method,
            headers,
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            showNotification(isEdit ? 'Guía actualizado exitosamente' : 'Guía creado exitosamente', 'success');
            closeModal('guia-modal');
            loadDashboardData();
        } else {
            showNotification(data.message || 'Error al guardar el guía', 'error');
        }
    } catch (e) {
        showNotification('Error de conexión', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Guía';
    }
}

// ===== AGENCIA MODAL =====
let galeriaAgenciaAEliminar = [];

function openAgenciaModal(id) {
    const isEdit = !!id;
    document.getElementById('agencia-modal-title').textContent = isEdit ? 'Editar Agencia' : 'Nueva Agencia';
    document.getElementById('agencia-edit-id').value = id || '';

    agenciaEliminarLogo = false;
    galeriaAgenciaAEliminar = [];
    document.getElementById('agencia-logo').value = '';
    document.getElementById('agencia-foto-preview').innerHTML = '';
    document.getElementById('agencia-galeria').value = '';
    document.getElementById('agencia-galeria-preview').innerHTML = '';

    if (isEdit) {
        const agencia = allAgencias.find(a => a._id === id);
        if (!agencia) return;
        
        document.getElementById('agencia-nombre').value = agencia.nombre || '';
        document.getElementById('agencia-telefono').value = agencia.telefono || '';
        document.getElementById('agencia-email').value = agencia.email || '';
        document.getElementById('agencia-direccion').value = agencia.direccion || '';
        document.getElementById('agencia-rnt').value = agencia.rnt || '';
        document.getElementById('agencia-estado').value = agencia.estado || 'activo';
        document.getElementById('agencia-descripcion').value = agencia.descripcion || '';
        document.getElementById('agencia-paginaweb').value = agencia.paginaWeb || '';
        document.getElementById('agencia-horarios').value = agencia.horariosAtencion || '';
        document.getElementById('agencia-facebook').value = agencia.redesSociales?.facebook || '';
        document.getElementById('agencia-instagram').value = agencia.redesSociales?.instagram || '';
        document.getElementById('agencia-youtube').value = agencia.redesSociales?.youtube || '';
        document.getElementById('agencia-tiktok').value = agencia.redesSociales?.tiktok || '';
        document.getElementById('agencia-idiomas').value = (agencia.idiomas || []).join(', ');
        document.getElementById('agencia-especialidades').value = (agencia.especialidades || []).join(', ');
        document.getElementById('agencia-servicios').value = (agencia.serviciosDefecto || []).join(', ');
        document.getElementById('agencia-lat').value = agencia.coordenadas?.lat || '';
        document.getElementById('agencia-lng').value = agencia.coordenadas?.lng || '';

        const logoUrl = typeof agencia.logo === 'string' ? agencia.logo : (agencia.logo?.url || null);
        if (logoUrl) {
            document.getElementById('agencia-foto-preview').innerHTML = `
                <div style="position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid var(--gray-300); display:flex; align-items:center; justify-content:center; background:var(--gray-50);">
                    <img src="${logoUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">
                    <button type="button" onclick="eliminarLogoAgencia()" style="position:absolute;top:2px;right:2px;background:var(--danger);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:10px;"><i class="fas fa-times"></i></button>
                </div>
            `;
        }

        // Galería existente
        if (agencia.galeria && agencia.galeria.length > 0) {
            const gCtrl = document.getElementById('agencia-galeria-preview');
            agencia.galeria.forEach(img => {
                const imgId = img._id || img.url;
                const div = document.createElement('div');
                div.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:1px solid var(--gray-300);';
                div.innerHTML = `
                    <img src="${img.url}" style="width:100%; height:100%; object-fit:cover;">
                    <button type="button" onclick="marcarEliminarGaleria('${imgId}', this.parentElement)" style="position:absolute;top:2px;right:2px;background:var(--danger);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:10px;"><i class="fas fa-times"></i></button>
                `;
                gCtrl.appendChild(div);
            });
        }
    } else {
        ['agencia-nombre', 'agencia-telefono', 'agencia-email', 'agencia-direccion', 'agencia-rnt', 'agencia-descripcion',
         'agencia-paginaweb', 'agencia-horarios', 'agencia-facebook', 'agencia-instagram', 'agencia-youtube', 'agencia-tiktok',
         'agencia-idiomas', 'agencia-especialidades', 'agencia-servicios', 'agencia-lat', 'agencia-lng'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('agencia-estado').value = 'activo';
    }

    openModal('agencia-modal');
}

function marcarEliminarGaleria(imgId, el) {
    galeriaAgenciaAEliminar.push(imgId);
    el.remove();
}

function eliminarLogoAgencia() {
    agenciaEliminarLogo = true;
    document.getElementById('agencia-foto-preview').innerHTML = '';
}

// Preview nueva foto agencia
document.getElementById('agencia-logo').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        if (!validateImageFile(this.files[0])) {
            this.value = '';
            return;
        }
        agenciaEliminarLogo = false; // si sube una nueva, no elimina, la reemplaza
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('agencia-foto-preview').innerHTML = `
                <div style="position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:2px dashed var(--primary); display:flex; align-items:center; justify-content:center; background:var(--gray-50);">
                    <img src="${e.target.result}" style="max-width:100%; max-height:100%; object-fit:contain;">
                </div>
            `;
        }
        reader.readAsDataURL(this.files[0]);
    }
});

// Preview galería de agencia
document.getElementById('agencia-galeria').addEventListener('change', function(e) {
    const preview = document.getElementById('agencia-galeria-preview');
    // Only add previews of NEW files (don't remove existing ones)
    Array.from(this.files).forEach(file => {
        if (!validateImageFile(file)) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const div = document.createElement('div');
            div.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px; overflow:hidden; border:2px dashed var(--primary);';
            div.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
});

// ===== SAVE AGENCIA =====
async function saveAgencia() {
    const editId = document.getElementById('agencia-edit-id').value;
    const isEdit = !!editId;

    const nombre = document.getElementById('agencia-nombre').value.trim();
    const telefono = document.getElementById('agencia-telefono').value.trim();
    const rnt = document.getElementById('agencia-rnt').value.trim();

    if (!nombre || !telefono || !rnt) {
        showNotification('Por favor completa nombre, teléfono y RNT', 'error');
        return;
    }

    const idiomasStr = document.getElementById('agencia-idiomas').value.trim();
    const especialidadesStr = document.getElementById('agencia-especialidades').value.trim();
    const serviciosStr = document.getElementById('agencia-servicios').value.trim();
    const idiomas = idiomasStr ? idiomasStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const especialidades = especialidadesStr ? especialidadesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const serviciosDefecto = serviciosStr ? serviciosStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const redesSociales = {
        facebook: document.getElementById('agencia-facebook').value.trim(),
        instagram: document.getElementById('agencia-instagram').value.trim(),
        youtube: document.getElementById('agencia-youtube').value.trim(),
        tiktok: document.getElementById('agencia-tiktok').value.trim()
    };

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('telefono', telefono);
    formData.append('email', document.getElementById('agencia-email').value.trim());
    formData.append('direccion', document.getElementById('agencia-direccion').value.trim());
    formData.append('rnt', rnt);
    formData.append('estado', document.getElementById('agencia-estado').value);
    formData.append('descripcion', document.getElementById('agencia-descripcion').value.trim());
    formData.append('paginaWeb', document.getElementById('agencia-paginaweb').value.trim());
    formData.append('horariosAtencion', document.getElementById('agencia-horarios').value.trim());
    formData.append('idiomas', JSON.stringify(idiomas));
    formData.append('especialidades', JSON.stringify(especialidades));
    formData.append('serviciosDefecto', JSON.stringify(serviciosDefecto));
    formData.append('redesSociales', JSON.stringify(redesSociales));

    const latVal = parseFloat(document.getElementById('agencia-lat').value);
    const lngVal = parseFloat(document.getElementById('agencia-lng').value);
    if (!isNaN(latVal) && !isNaN(lngVal)) {
        formData.append('coordenadas', JSON.stringify({ lat: latVal, lng: lngVal }));
    }

    if (isEdit && galeriaAgenciaAEliminar.length > 0) {
        formData.append('eliminarGaleria', JSON.stringify(galeriaAgenciaAEliminar));
    }

    if (agenciaEliminarLogo) {
        formData.append('eliminarLogo', 'true');
    }

    const fileInput = document.getElementById('agencia-logo');
    if (fileInput.files.length > 0) {
        formData.append('logo', fileInput.files[0]);
    }

    const galeriaInput = document.getElementById('agencia-galeria');
    if (galeriaInput.files.length > 0) {
        Array.from(galeriaInput.files).forEach(file => formData.append('galeria', file));
    }

    const btn = document.getElementById('agencia-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const url = isEdit ? `${API}/agencias/${editId}` : `${API}/agencias`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') },
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            showNotification(isEdit ? 'Agencia actualizada exitosamente' : 'Agencia creada exitosamente', 'success');
            closeModal('agencia-modal');
            loadDashboardData();
        } else {
            showNotification(data.message || 'Error al guardar la agencia', 'error');
        }
    } catch (e) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Guardar Agencia';
    }
}

// ===== DELETE =====
let pendingDeleteType = '';
let pendingDeleteId = '';

function confirmDelete(type, id) {
    pendingDeleteType = type;
    pendingDeleteId = id;
    document.getElementById('confirm-delete-btn').onclick = executeDelete;
    openModal('confirm-modal');
}

async function executeDelete() {
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

    try {
        const res = await fetch(`${API}/${pendingDeleteType}/${pendingDeleteId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        const data = await res.json();

        if (data.success) {
            showNotification('Elemento eliminado correctamente', 'success');
            closeModal('confirm-modal');
            loadDashboardData();
        } else {
            showNotification(data.message || 'Error al eliminar', 'error');
        }
    } catch (e) {
        showNotification('Error de conexión', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> Sí, eliminar';
    }
}

// ===== NOTIFICATION =====
function showNotification(msg, type) {
    const noti = document.getElementById('notification');
    const text = document.getElementById('notif-text');
    const icon = noti.querySelector('i');

    text.textContent = msg;
    noti.className = `notification ${type}`;
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

    // Force reflow for re-trigger
    noti.offsetHeight;
    noti.classList.add('show');

    setTimeout(() => noti.classList.remove('show'), 3500);
}

// ===== MAPBOX MAP – AGENCIA ADMIN =====
let agenciaAdminMap = null;
let agenciaAdminMarker = null;

const MAPBOX_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';
// Default center: Jalpan de Serra, Querétaro
const JALPAN_LAT = 21.2163;
const JALPAN_LNG = -99.4752;

function initAgenciaMap(lat, lng) {
    const existingLat = lat || JALPAN_LAT;
    const existingLng = lng || JALPAN_LNG;

    // Destroy previous map instance
    if (agenciaAdminMap) {
        agenciaAdminMap.remove();
        agenciaAdminMap = null;
        agenciaAdminMarker = null;
    }

    // Wait for modal DOM to be visible before Mapbox measures the container
    setTimeout(() => {
        mapboxgl.accessToken = MAPBOX_TOKEN;

        agenciaAdminMap = new mapboxgl.Map({
            container: 'agencia-map-admin',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [existingLng, existingLat],  // Mapbox uses [lng, lat]
            zoom: 15
        });

        agenciaAdminMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Draggable red marker
        agenciaAdminMarker = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
            .setLngLat([existingLng, existingLat])
            .addTo(agenciaAdminMap);

        function updateCoords(lngLat) {
            document.getElementById('agencia-lat').value = lngLat.lat.toFixed(6);
            document.getElementById('agencia-lng').value = lngLat.lng.toFixed(6);
            document.getElementById('agencia-coords-text').textContent =
                `Lat: ${lngLat.lat.toFixed(5)}, Lng: ${lngLat.lng.toFixed(5)}`;
        }

        // Update hidden inputs when marker is dragged
        agenciaAdminMarker.on('dragend', function() {
            updateCoords(agenciaAdminMarker.getLngLat());
        });

        // Click on map also moves the marker
        agenciaAdminMap.on('click', function(e) {
            agenciaAdminMarker.setLngLat(e.lngLat);
            updateCoords(e.lngLat);
        });

        // Show initial coordinates
        updateCoords({ lat: existingLat, lng: existingLng });
    }, 50);
}

// Override openAgenciaModal to initialise map after the modal opens
const _origOpenAgenciaModal = openAgenciaModal;
window.openAgenciaModal = function(id) {
    _origOpenAgenciaModal(id);
    // Give the modal a moment to populate the hidden inputs
    setTimeout(() => {
        const lat = parseFloat(document.getElementById('agencia-lat').value) || null;
        const lng = parseFloat(document.getElementById('agencia-lng').value) || null;
        initAgenciaMap(lat, lng);
    }, 80);
};
