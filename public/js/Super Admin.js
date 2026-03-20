/* ===== SUPER ADMIN PANEL JAVASCRIPT ===== */

const API_BASE = window.location.origin + '/api';
let currentUser = null;
let charts = {};
let monitoringInterval = null;
let currentPage = {
    admins: 1,
    restaurants: 1
};
let availableAdmins = [];
let deleteConfirmation = {
    type: null,
    id: null,
    callback: null
};
let refreshIntervals = {
    monitoring: null,
    sessions: null,
    activities: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// ===== AUTHENTICATION =====
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        showNotification('No has iniciado sesión', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            currentUser = data.data.admin;
            if (currentUser.rol !== 'super-admin') {
                showNotification('Acceso denegado - Se requieren permisos de super admin', 'error');
                setTimeout(() => { window.location.href = '/admin.html'; }, 2000);
                return;
            }
            updateUserInterface();
            loadDashboard();
            showNotification(`¡Bienvenido Super Admin ${currentUser.nombre}!`, 'success');
        } else {
            const isAccountInactive = data.code === 'ACCOUNT_INACTIVE' || (data.message && data.message.includes('inactiva'));
            localStorage.removeItem('authToken');
            showNotification(isAccountInactive ? 'Tu cuenta está desactivada. Contacta a otro super administrador.' : 'Sesión expirada, redirigiendo...', 'warning');
            setTimeout(() => { window.location.href = '/login.html'; }, isAccountInactive ? 3000 : 2000);
        }
    } catch (error) {
        console.error('Error verificando auth:', error);
        localStorage.removeItem('authToken');
        showNotification('Sesión expirada, redirigiendo...', 'warning');
        setTimeout(() => { window.location.href = '/login.html'; }, 2000);
    }
}

function updateUserInterface() {
    if (!currentUser) return;

    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const userAvatar = document.getElementById('user-avatar');

    if (userName) {
        userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
    }
    
    if (userRole) {
        userRole.textContent = currentUser.rol;
    }
    
    if (userAvatar) {
        const initials = (currentUser.nombre?.charAt(0) || '') + (currentUser.apellido?.charAt(0) || '');
        userAvatar.textContent = initials.toUpperCase();
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Search inputs
    const adminSearch = document.getElementById('admin-search');
    if (adminSearch) adminSearch.addEventListener('input', debounce(searchAdmins, 500));
    const restSearch = document.getElementById('restaurant-search');
    if (restSearch) restSearch.addEventListener('input', debounce(searchRestaurants, 500));
    const restFilter = document.getElementById('restaurant-filter');
    if (restFilter) restFilter.addEventListener('change', searchRestaurants);

    // Reviews search
    const reviewSearch = document.getElementById('search-reviews');
    if (reviewSearch) reviewSearch.addEventListener('input', debounce(loadReviews, 500));

    // Notification form
    const nForm = document.getElementById('notification-form');
    if (nForm) {
        nForm.addEventListener('submit', sendNotification);
    }

    // Restaurant form (create)
    const restForm = document.getElementById('restaurant-form');
    if (restForm) restForm.addEventListener('submit', saveRestaurant);

    // Restaurant form (edit)
    const editRestForm = document.getElementById('edit-restaurant-form');
    if (editRestForm) editRestForm.addEventListener('submit', updateRestaurant);

    // Confirm delete button
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', executeDelete);

    // Guías and Tours searches
    const guiaSearch = document.getElementById('guia-search');
    if (guiaSearch) guiaSearch.addEventListener('input', debounce(loadGuias, 500));
    const tourSearch = document.getElementById('tour-search');
    if (tourSearch) tourSearch.addEventListener('input', debounce(loadTours, 500));

    // Admin type radio buttons (for restaurant modal)
    document.querySelectorAll('input[name="admin-type"]').forEach(radio => {
        radio.addEventListener('change', toggleAdminSections);
    });
}

// ===== TAB NAVIGATION =====
function switchTab(tabId) {
    clearAllIntervals();

    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Load tab content
    switch(tabId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'monitoring':
            loadMonitoring();
            break;
        case 'admins':
            loadAdmins();
            break;
        case 'restaurants':
            loadRestaurants();
            break;
        case 'reviews':
            loadReviews();
            break;
        case 'notifications':
            loadNotificationHistory();
            break;
        case 'stats':
            loadAdvancedStats();
            break;
        case 'guias':
            loadGuias();
            break;
        case 'tours':
            loadTours();
            break;
    }
}

// ===== DASHBOARD FUNCTIONS =====
async function loadDashboard() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE}/super-admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            renderDashboard(result.data);
        } else {
            throw new Error('Error cargando dashboard');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error cargando dashboard', 'error');
    } finally {
        const loadingEl = document.getElementById('dashboard-loading');
        const contentEl = document.getElementById('dashboard-content');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
    }
}

function renderDashboard(data) {
    const statsContainer = document.getElementById('dashboard-stats');
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">Total Administradores</div>
                <div class="stat-icon primary">
                    <i class="fas fa-users"></i>
                </div>
            </div>
            <div class="stat-value">${data.resumen.totalAdmins}</div>
            <div class="stat-change">
                <i class="fas fa-check-circle"></i>
                <span>${data.resumen.adminActivos} activos</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">Total Restaurantes</div>
                <div class="stat-icon success">
                    <i class="fas fa-store"></i>
                </div>
            </div>
            <div class="stat-value">${data.resumen.totalRestaurantes}</div>
            <div class="stat-change">
                <i class="fas fa-check-circle"></i>
                <span>${data.resumen.restaurantesActivos} activos</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">Super Admins</div>
                <div class="stat-icon warning">
                    <i class="fas fa-crown"></i>
                </div>
            </div>
            <div class="stat-value">3</div>
            <div class="stat-change">
                <i class="fas fa-shield-alt"></i>
                <span>Privilegios especiales</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">Estado del Sistema</div>
                <div class="stat-icon info">
                    <i class="fas fa-server"></i>
                </div>
            </div>
            <div class="stat-value" style="font-size: 1.5rem;">Óptimo</div>
            <div class="stat-change">
                <i class="fas fa-check"></i>
                <span>Todo funcionando</span>
            </div>
        </div>
    `;

    createDashboardCharts(data);
}

function createDashboardCharts(data) {
    // Growth Chart
    const growthCtx = document.getElementById('growthChart');
    if (growthCtx && charts.growthChart) {
        charts.growthChart.destroy();
    }

    charts.growthChart = new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Restaurantes',
                data: [12, 19, 25, 31, 28, 35],
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                tension: 0.4
            }, {
                label: 'Administradores',
                data: [8, 12, 15, 18, 16, 20],
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Type Distribution Chart
    const typeCtx = document.getElementById('typeChart');
    if (typeCtx && charts.typeChart) {
        charts.typeChart.destroy();
    }

    const typeData = data.estadisticasTipo || {};
    charts.typeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Restaurantes', 'Bares', 'Cafeterías'],
            datasets: [{
                data: [
                    typeData.restaurante || 0,
                    typeData.bar || 0,
                    typeData.cafeteria || 0
                ],
                backgroundColor: ['#059669', '#22c55e', '#f59e0b'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// ===== MONITORING FUNCTIONS =====
function loadMonitoring() {
    loadMonitoringStats();
    loadOnlineUsers();
    loadRecentActivities();
    loadActiveSessions();

    // Set up auto-refresh for monitoring tab
    refreshIntervals.monitoring = setInterval(() => {
        loadMonitoringStats();
        loadOnlineUsers();
        loadRecentActivities();
    }, 30000); // Refresh every 30 seconds
}

function loadMonitoringStats() {
    // Simulate real-time data
    const totalVisits = Math.floor(Math.random() * 10000) + 50000;
    const visitsToday = Math.floor(Math.random() * 500) + 1200;
    const adminsOnline = Math.floor(Math.random() * 8) + 2;
    const uptimeHours = Math.floor(Math.random() * 100) + 720;

    document.getElementById('total-visits').textContent = totalVisits.toLocaleString();
    document.getElementById('visits-today').textContent = `${visitsToday} hoy`;
    document.getElementById('admins-online').textContent = adminsOnline;
    document.getElementById('uptime-hours').textContent = `${uptimeHours} horas activo`;

    // Top restaurant (mock data)
    const topRestaurants = ['La Bella Vista', 'El Rincón Dorado', 'Café Central', 'Burger Palace'];
    const randomRestaurant = topRestaurants[Math.floor(Math.random() * topRestaurants.length)];
    const restaurantVisits = Math.floor(Math.random() * 200) + 300;
    
    document.getElementById('top-restaurant').textContent = randomRestaurant;
    document.getElementById('top-restaurant-visits').textContent = `${restaurantVisits} visitas`;
}

function loadOnlineUsers() {
    const mockUsers = [
        { nombre: 'Ana', apellido: 'García', status: 'Editando menú', lastSeen: '2 min' },
        { nombre: 'Carlos', apellido: 'López', status: 'Revisando pedidos', lastSeen: '5 min' },
        { nombre: 'María', apellido: 'Rodríguez', status: 'Actualizando horarios', lastSeen: '1 min' },
        { nombre: 'Pedro', apellido: 'Martínez', status: 'Conectado', lastSeen: 'Ahora' },
        { nombre: 'Laura', apellido: 'Sánchez', status: 'Subiendo fotos', lastSeen: '3 min' }
    ];

    const onlineUsersHtml = mockUsers.map(user => `
        <div class="user-item">
            <div class="user-avatar-small">
                ${user.nombre.charAt(0)}${user.apellido.charAt(0)}
            </div>
            <div class="user-details">
                <div class="user-details-name">${user.nombre} ${user.apellido}</div>
                <div class="user-details-status">${user.status} • ${user.lastSeen}</div>
            </div>
            <div class="online-indicator"></div>
        </div>
    `).join('');

    document.getElementById('online-users-list').innerHTML = onlineUsersHtml;
    document.getElementById('online-count').textContent = mockUsers.length;
}

function loadRecentActivities() {
    const activities = [
        { user: 'Ana García', action: 'actualizó el menú', time: '2 min', type: 'success' },
        { user: 'Carlos López', action: 'cambió horarios', time: '5 min', type: 'info' },
        { user: 'María Rodríguez', action: 'subió nueva foto', time: '8 min', type: 'primary' },
        { user: 'Pedro Martínez', action: 'inició sesión', time: '12 min', type: 'success' },
        { user: 'Laura Sánchez', action: 'editó información', time: '15 min', type: 'warning' },
        { user: 'Jorge Ruiz', action: 'cerró sesión', time: '18 min', type: 'error' }
    ];

    const activitiesHtml = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${activity.type === 'success' ? 'check' : 
                                   activity.type === 'info' ? 'info' :
                                   activity.type === 'warning' ? 'exclamation' :
                                   activity.type === 'error' ? 'times' : 'user'}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">
                    <strong>${activity.user}</strong> ${activity.action}
                </div>
                <div class="activity-time">hace ${activity.time}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('activity-list').innerHTML = activitiesHtml;
}

function loadActiveSessions() {
    const mockSessions = [
        { user: 'Ana García', ip: '192.168.1.100', device: 'Chrome - Windows', lastActivity: '2 min', location: 'Ciudad de México' },
        { user: 'Carlos López', ip: '192.168.1.101', device: 'Firefox - MacOS', lastActivity: '5 min', location: 'Guadalajara' },
        { user: 'María Rodríguez', ip: '192.168.1.102', device: 'Safari - iOS', lastActivity: '1 min', location: 'Monterrey' },
        { user: 'Pedro Martínez', ip: '192.168.1.103', device: 'Chrome - Android', lastActivity: '10 min', location: 'Puebla' }
    ];

    const sessionsHtml = `
        <table class="table">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Dispositivo</th>
                    <th>Última Actividad</th>
                    <th>Ubicación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${mockSessions.map(session => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div class="user-avatar-small">${session.user.split(' ').map(n => n.charAt(0)).join('')}</div>
                                ${session.user}
                            </div>
                        </td>
                        <td><code>${session.ip}</code></td>
                        <td>${session.device}</td>
                        <td>hace ${session.lastActivity}</td>
                        <td>${session.location}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="terminateSession('${session.user}')" title="Terminar sesión">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('sessions-table-container').innerHTML = sessionsHtml;
}

function terminateSession(userName) {
    const confirmed = confirm(`¿Terminar la sesión de ${userName}?`);
    if (confirmed) {
        showNotification(`Sesión de ${userName} terminada`, 'success');
        loadActiveSessions(); // Refresh the sessions table
    }
}

function refreshSessions() {
    document.getElementById('sessions-table-container').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Actualizando sesiones...</p>
        </div>
    `;
    setTimeout(loadActiveSessions, 1000);
}

// ===== ADMINS MANAGEMENT =====
async function loadAdmins(page = 1) {
    const token = localStorage.getItem('authToken');
    const search = document.getElementById('admin-search')?.value || '';
    try {
        const params = new URLSearchParams({
            pagina: page,
            limite: 10,
            ...(search && { buscar: search })
        });
        const response = await fetch(`${API_BASE}/super-admin/admins?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const result = await response.json();
            renderAdminsTable(result.data);
            currentPage.admins = page;
        } else {
            throw new Error('Error cargando administradores');
        }
    } catch (error) {
        console.error('Error loading admins:', error);
        showNotification('Error cargando administradores', 'error');
    }
}

function renderAdminsTable(data) {
    const container = document.getElementById('admins-table-container');
    
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último Acceso</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${data.admins.map(admin => `
                    <tr>
                        <td>${admin.nombre} ${admin.apellido}</td>
                        <td>${admin.email}</td>
                        <td>${admin.telefono}</td>
                        <td>
                            <span class="badge ${admin.rol === 'super-admin' ? 'badge-primary' : 'badge-success'}">
                                ${admin.rol === 'super-admin' ? '👑 Super Admin' : '👤 Admin'}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${admin.activo ? 'badge-success' : 'badge-error'}">
                                ${admin.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td>${new Date(admin.ultimoAcceso).toLocaleDateString('es-ES')}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="editAdmin('${admin._id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm ${admin.activo ? 'btn-warning' : 'btn-success'}" onclick="toggleAdminStatus('${admin._id}', ${admin.activo})" title="${admin.activo ? 'Desactivar' : 'Activar'}">
                                    <i class="fas fa-${admin.activo ? 'ban' : 'check'}"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${admin._id}', '${admin.nombre} ${admin.apellido}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// ===== RESTAURANTS MANAGEMENT =====
async function loadRestaurants(page = 1) {
    const token = localStorage.getItem('authToken');
    const search = document.getElementById('restaurant-search')?.value || '';
    const filter = document.getElementById('restaurant-filter')?.value || '';
    try {
        const params = new URLSearchParams({
            pagina: page,
            limite: 10,
            ...(search && { buscar: search }),
            ...(filter && filter !== 'todos' && { tipo: filter })
        });
        const response = await fetch(`${API_BASE}/super-admin/restaurants?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const result = await response.json();
            renderRestaurantsTable(result.data);
            currentPage.restaurants = page;
        } else {
            throw new Error('Error cargando restaurantes');
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        showNotification('Error cargando restaurantes', 'error');
    }
}

function renderRestaurantsTable(data) {
    const container = document.getElementById('restaurants-table-container');
    if (!container) return;
    const restaurantes = data.restaurantes || data.restaurants || data;
    if (!Array.isArray(restaurantes) || restaurantes.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-500);padding:2rem;">No se encontraron restaurantes.</p>';
        return;
    }
    
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Ciudad</th>
                    <th>Administrador</th>
                    <th>Estado</th>
                    <th>Última Act.</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${restaurantes.map(rest => `
                    <tr>
                        <td>
                            <strong>${rest.nombre}</strong><br>
                            <small>${rest.contacto?.telefono || ''}</small>
                        </td>
                        <td>
                            <span class="badge badge-info">
                                ${rest.detalles?.tipo || rest.tipo || 'Normal'}
                            </span>
                        </td>
                        <td>${rest.direccion?.ciudad || 'N/A'}</td>
                        <td>
                            ${rest.restaurantAdmin ?
                            `${rest.restaurantAdmin.nombre || ''} ${rest.restaurantAdmin.apellido || ''}` :
                            (rest.adminId ? `${rest.adminId.nombre || ''} ${rest.adminId.apellido || ''}` :
                            '<span class="text-danger">Sin asignar</span>')}
                        </td>
                        <td>
                            <span class="badge ${rest.activo ? 'badge-success' : 'badge-error'}">
                                ${rest.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td>${new Date(rest.updatedAt || rest.createdAt || rest.fechaCreacion).toLocaleDateString('es-ES')}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="editRestaurant('${rest._id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm ${rest.activo ? 'btn-warning' : 'btn-success'}"
                                    onclick="toggleRestaurantStatus('${rest._id}', ${rest.activo})"
                                    title="${rest.activo ? 'Desactivar' : 'Activar'}">
                                    <i class="fas fa-${rest.activo ? 'ban' : 'check'}"></i>
                                </button>
                                <button class="btn btn-sm btn-danger"
                                    onclick="confirmDeleteRestaurant('${rest._id}', '${rest.nombre}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// ===== NOTIFICATIONS SYSTEM =====
async function sendNotification(e) {
    e.preventDefault();
    
    const formData = {
        type: document.getElementById('notification-type').value,
        priority: document.getElementById('notification-priority').value,
        title: document.getElementById('notification-title').value,
        message: document.getElementById('notification-message').value,
        target: document.getElementById('notification-target').value
    };

    try {
        showNotification('Enviando notificación...', 'info');
        
        setTimeout(() => {
            showNotification(`Notificación enviada exitosamente a ${getTargetText(formData.target)}`, 'success');
            document.getElementById('notification-form').reset();
            loadNotificationHistory();
        }, 1500);
        
    } catch (error) {
        console.error('Error sending notification:', error);
        showNotification('Error enviando notificación', 'error');
    }
}

function getTargetText(target) {
    const targets = {
        'all': 'todos los administradores',
        'super-admins': 'los super administradores',
        'regular-admins': 'los administradores regulares',
        'online': 'los usuarios conectados'
    };
    return targets[target] || 'los destinatarios seleccionados';
}

function loadNotificationHistory() {
    const mockHistory = [
        { 
            title: 'Mantenimiento Programado', 
            type: 'maintenance', 
            priority: 'high', 
            target: 'all', 
            sent: new Date(Date.now() - 3600000),
            status: 'sent'
        },
        { 
            title: 'Nueva Función Disponible', 
            type: 'update', 
            priority: 'medium', 
            target: 'all', 
            sent: new Date(Date.now() - 86400000),
            status: 'sent'
        },
        { 
            title: 'Recordatorio de Backup', 
            type: 'warning', 
            priority: 'low', 
            target: 'super-admins', 
            sent: new Date(Date.now() - 172800000),
            status: 'sent'
        }
    ];

    const typeIcons = {
        'info': '📢',
        'warning': '⚠️',
        'success': '✅',
        'update': '🔄',
        'maintenance': '🛠️'
    };

    const priorityColors = {
        'high': 'badge-error',
        'medium': 'badge-warning',
        'low': 'badge-success'
    };

    const historyHtml = `
        <table class="table">
            <thead>
                <tr>
                    <th>Notificación</th>
                    <th>Tipo</th>
                    <th>Prioridad</th>
                    <th>Destinatarios</th>
                    <th>Enviado</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${mockHistory.map(notification => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span>${typeIcons[notification.type]}</span>
                                <strong>${notification.title}</strong>
                            </div>
                        </td>
                        <td>
                            <span class="badge badge-primary">${notification.type}</span>
                        </td>
                        <td>
                            <span class="badge ${priorityColors[notification.priority]}">${notification.priority}</span>
                        </td>
                        <td>${getTargetText(notification.target)}</td>
                        <td>${notification.sent.toLocaleString('es-ES')}</td>
                        <td>
                            <span class="badge badge-success">
                                <i class="fas fa-check"></i> Enviado
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('notification-history-container').innerHTML = historyHtml;
}

// ===== ADVANCED STATISTICS =====
async function loadAdvancedStats() {
    try {
        const mockData = await generateMockAdvancedStats();
        renderAdvancedStats(mockData);
        createAdvancedCharts(mockData);
    } catch (error) {
        console.error('Error loading advanced stats:', error);
        showNotification('Error cargando estadísticas avanzadas', 'error');
    } finally {
        document.getElementById('stats-loading').style.display = 'none';
        document.getElementById('stats-content').style.display = 'block';
        // Initialize heatmap after container is visible
        if (!heatmapMap) {
            initHeatmap();
        } else {
            // Resize map if already initialized
            setTimeout(() => heatmapMap.resize(), 100);
        }
    }
}

async function generateMockAdvancedStats() {
    return {
        performanceMetrics: {
            avgResponseTime: 245,
            uptime: 99.8,
            totalRequests: 15678,
            errorRate: 0.2
        },
        growthMetrics: {
            monthlyGrowthRate: 12.5,
            yearlyGrowthRate: 145.3,
            userRetention: 89.2,
            conversionRate: 34.7
        },
        geographicData: {
            'Ciudad de México': 45,
            'Guadalajara': 23,
            'Monterrey': 18,
            'Puebla': 12,
            'Otros': 15
        },
        monthlyActivity: [
            { month: 'Ene', admins: 5, restaurants: 12, activity: 85 },
            { month: 'Feb', admins: 8, restaurants: 18, activity: 92 },
            { month: 'Mar', admins: 12, restaurants: 25, activity: 88 },
            { month: 'Abr', admins: 15, restaurants: 31, activity: 95 },
            { month: 'May', admins: 18, restaurants: 28, activity: 91 },
            { month: 'Jun', admins: 22, restaurants: 35, activity: 97 }
        ],
        yearlyComparison: [
            { year: '2022', restaurants: 85, admins: 45, revenue: 125000 },
            { year: '2023', restaurants: 142, admins: 78, revenue: 289000 },
            { year: '2024', restaurants: 267, admins: 124, revenue: 456000 },
            { year: '2025', restaurants: 398, admins: 189, revenue: 678000 }
        ],
        hourlyActivity: [
            { hour: '00:00', activity: 12 },
            { hour: '03:00', activity: 8 },
            { hour: '06:00', activity: 25 },
            { hour: '09:00', activity: 78 },
            { hour: '12:00', activity: 95 },
            { hour: '15:00', activity: 87 },
            { hour: '18:00', activity: 92 },
            { hour: '21:00', activity: 65 }
        ],
        userTrends: [
            { period: 'Q1', newUsers: 45, activeUsers: 123, churned: 8 },
            { period: 'Q2', newUsers: 67, activeUsers: 156, churned: 12 },
            { period: 'Q3', newUsers: 89, activeUsers: 198, churned: 15 },
            { period: 'Q4', newUsers: 112, activeUsers: 245, churned: 18 }
        ]
    };
}

function renderAdvancedStats(data) {
    const container = document.getElementById('advanced-stats');
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">⚡ Tiempo de Respuesta Promedio</div>
                <div class="stat-icon success">
                    <i class="fas fa-tachometer-alt"></i>
                </div>
            </div>
            <div class="stat-value">${data.performanceMetrics.avgResponseTime}ms</div>
            <div class="stat-change">
                <i class="fas fa-arrow-down"></i>
                <span>15% mejor que el mes pasado</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">🟢 Tiempo de Actividad</div>
                <div class="stat-icon primary">
                    <i class="fas fa-server"></i>
                </div>
            </div>
            <div class="stat-value">${data.performanceMetrics.uptime}%</div>
            <div class="stat-change">
                <i class="fas fa-check-circle"></i>
                <span>Excelente estabilidad</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">📈 Crecimiento Mensual</div>
                <div class="stat-icon accent">
                    <i class="fas fa-chart-line"></i>
                </div>
            </div>
            <div class="stat-value">+${data.growthMetrics.monthlyGrowthRate}%</div>
            <div class="stat-change">
                <i class="fas fa-arrow-up"></i>
                <span>Superando objetivos</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">🎯 Retención de Usuarios</div>
                <div class="stat-icon warning">
                    <i class="fas fa-users"></i>
                </div>
            </div>
            <div class="stat-value">${data.growthMetrics.userRetention}%</div>
            <div class="stat-change">
                <i class="fas fa-heart"></i>
                <span>Alta satisfacción</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">🚀 Total de Solicitudes</div>
                <div class="stat-icon info">
                    <i class="fas fa-exchange-alt"></i>
                </div>
            </div>
            <div class="stat-value">${data.performanceMetrics.totalRequests.toLocaleString()}</div>
            <div class="stat-change">
                <i class="fas fa-fire"></i>
                <span>Alto tráfico</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">💯 Tasa de Conversión</div>
                <div class="stat-icon success">
                    <i class="fas fa-bullseye"></i>
                </div>
            </div>
            <div class="stat-value">${data.growthMetrics.conversionRate}%</div>
            <div class="stat-change">
                <i class="fas fa-trophy"></i>
                <span>Por encima del promedio</span>
            </div>
        </div>
    `;
}

function createAdvancedCharts(data) {
    // Monthly Activity Chart
    const monthlyCtx = document.getElementById('monthlyActivityChart');
    if (monthlyCtx && charts.monthlyActivityChart) {
        charts.monthlyActivityChart.destroy();
    }

    charts.monthlyActivityChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: data.monthlyActivity.map(item => item.month),
            datasets: [{
                label: 'Restaurantes',
                data: data.monthlyActivity.map(item => item.restaurants),
                backgroundColor: '#059669',
                borderRadius: 6
            }, {
                label: 'Administradores',
                data: data.monthlyActivity.map(item => item.admins),
                backgroundColor: '#22c55e',
                borderRadius: 6
            }, {
                label: 'Actividad (%)',
                data: data.monthlyActivity.map(item => item.activity),
                backgroundColor: '#84cc16',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Geographic Distribution Chart
    const geoCtx = document.getElementById('geographicChart');
    if (geoCtx && charts.geographicChart) {
        charts.geographicChart.destroy();
    }

    charts.geographicChart = new Chart(geoCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(data.geographicData),
            datasets: [{
                data: Object.values(data.geographicData),
                backgroundColor: [
                    '#059669',
                    '#22c55e',
                    '#84cc16',
                    '#f59e0b',
                    '#06b6d4'
                ],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    // Yearly Growth Chart
    const yearlyCtx = document.getElementById('yearlyGrowthChart');
    if (yearlyCtx && charts.yearlyGrowthChart) {
        charts.yearlyGrowthChart.destroy();
    }

    charts.yearlyGrowthChart = new Chart(yearlyCtx, {
        type: 'line',
        data: {
            labels: data.yearlyComparison.map(item => item.year),
            datasets: [{
                label: 'Restaurantes',
                data: data.yearlyComparison.map(item => item.restaurants),
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Administradores',
                data: data.yearlyComparison.map(item => item.admins),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Ingresos (K)',
                data: data.yearlyComparison.map(item => item.revenue / 1000),
                borderColor: '#84cc16',
                backgroundColor: 'rgba(132, 204, 22, 0.1)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    // Hourly Activity Chart
    const hourlyCtx = document.getElementById('hourlyActivityChart');
    if (hourlyCtx && charts.hourlyActivityChart) {
        charts.hourlyActivityChart.destroy();
    }

    charts.hourlyActivityChart = new Chart(hourlyCtx, {
        type: 'radar',
        data: {
            labels: data.hourlyActivity.map(item => item.hour),
            datasets: [{
                label: 'Actividad por Hora',
                data: data.hourlyActivity.map(item => item.activity),
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.2)',
                pointBackgroundColor: '#22c55e',
                pointBorderColor: '#059669',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // User Trends Chart
    const trendsCtx = document.getElementById('userTrendsChart');
    if (trendsCtx && charts.userTrendsChart) {
        charts.userTrendsChart.destroy();
    }

    charts.userTrendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: data.userTrends.map(item => item.period),
            datasets: [{
                label: 'Nuevos Usuarios',
                data: data.userTrends.map(item => item.newUsers),
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                tension: 0.4
            }, {
                label: 'Usuarios Activos',
                data: data.userTrends.map(item => item.activeUsers),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4
            }, {
                label: 'Usuarios Perdidos',
                data: data.userTrends.map(item => item.churned),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ===== MODAL FUNCTIONS =====
function openCreateAdminModal() {
    document.getElementById('admin-form').reset();
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-modal-title').textContent = 'Nuevo Administrador';
    document.getElementById('password-group').style.display = 'block';
    document.getElementById('admin-password').required = true;
    document.getElementById('admin-password').placeholder = 'Mínimo 6 caracteres';
    const pwHint = document.getElementById('password-hint');
    if (pwHint) pwHint.textContent = 'Mínimo 6 caracteres';
    const modal = document.getElementById('admin-modal');
    modal.classList.add('show');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
}

const adminFormEl = document.getElementById('admin-form');
if (adminFormEl) {
    adminFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const adminId = document.getElementById('admin-id').value;
    const isEditing = !!adminId;
    const url = isEditing ? `${API_BASE}/super-admin/admins/${adminId}` : `${API_BASE}/super-admin/admins`;
    const method = isEditing ? 'PUT' : 'POST';

    const formData = {
        nombre: document.getElementById('admin-nombre').value,
        apellido: document.getElementById('admin-apellido').value,
        email: document.getElementById('admin-email').value,
        telefono: document.getElementById('admin-telefono').value,
        rol: document.getElementById('admin-rol').value
    };

    if (!isEditing) {
        formData.password = document.getElementById('admin-password').value;
    } else if (document.getElementById('admin-password').value) {
        formData.password = document.getElementById('admin-password').value;
    }

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        
        if (result.success) {
            showNotification(isEditing ? 'Administrador actualizado' : 'Administrador creado', 'success');
            closeAdminModal();
            loadAdmins();
        } else {
            showNotification(result.message || 'Error guardando administrador', 'error');
        }
    } catch (error) {
        console.error('Error saving admin:', error);
        showNotification('Error de conexión', 'error');
    }
});
}

async function editAdmin(adminId) {
    try {
        const response = await fetch(`${API_BASE}/super-admin/admins`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        const adminList = data.data.admins || data.data;
        const admin = adminList.find(a => a._id === adminId);
        
        if (!admin) return showNotification('Administrador no encontrado', 'error');
        
        document.getElementById('admin-id').value = admin._id;
        document.getElementById('admin-nombre').value = admin.nombre || '';
        document.getElementById('admin-apellido').value = admin.apellido || '';
        document.getElementById('admin-email').value = admin.email || '';
        document.getElementById('admin-telefono').value = admin.telefono || '';
        document.getElementById('admin-rol').value = admin.rol || 'admin';
        
        // Mostrar contraseña actual si existe
        const pwField = document.getElementById('admin-password');
        pwField.required = false;
        if (admin.passwordPlano) {
            pwField.value = admin.passwordPlano;
            pwField.placeholder = 'Contraseña actual mostrada';
        } else {
            pwField.value = '';
            pwField.placeholder = 'Dejar vacío para mantener la actual';
        }
        const pwHint = document.getElementById('password-hint');
        if (pwHint) pwHint.textContent = admin.passwordPlano ? 'Contraseña actual. Modifícala si deseas cambiarla.' : 'Dejar vacío para mantener la contraseña actual';
        document.getElementById('password-group').style.display = 'block';
        
        document.getElementById('admin-modal-title').textContent = 'Editar Administrador';
        const modal = document.getElementById('admin-modal');
        modal.classList.add('show');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    } catch (error) {
        console.error('Error opening edit admin:', error);
        showNotification('Error cargando datos del administrador', 'error');
    }
}

async function searchAdmins() {
    const searchTerm = document.getElementById('admin-search').value.toLowerCase();
    
    try {
        const response = await fetch(`${API_BASE}/super-admin/admins`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let filteredAdmins = data.data.admins || data.data;
            if (searchTerm) {
                filteredAdmins = filteredAdmins.filter(admin => 
                    (admin.nombre || '').toLowerCase().includes(searchTerm) || 
                    (admin.apellido || '').toLowerCase().includes(searchTerm) ||
                    (admin.email || '').toLowerCase().includes(searchTerm)
                );
            }
            renderAdminsTable({ admins: filteredAdmins });
        }
    } catch (error) {
        console.error('Error searching admins:', error);
    }
}

async function toggleAdminStatus(adminId, currentStatus) {
    const action = currentStatus ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que quieres ${action} este administrador?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/super-admin/admins/${adminId}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Administrador ${action}do exitosamente`, 'success');
            loadAdmins();
        } else {
            showNotification(data.message || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        console.error('Error toggling admin status:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function deleteAdmin(adminId, adminName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar al administrador "${adminName}"?\n\n⚠️ Esta acción no se puede deshacer.`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/super-admin/admins/${adminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Administrador "${adminName}" eliminado exitosamente`, 'success');
            loadAdmins();
        } else {
            showNotification(data.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        showNotification('Error de conexión', 'error');
    }
}

function openCreateRestaurantModal() {
    const modal = document.getElementById('restaurant-modal');
    if (modal) {
        const form = document.getElementById('restaurant-form');
        if (form) form.reset();
        // Reset radio to existing admin
        const existingRadio = document.getElementById('admin-existing');
        if (existingRadio) existingRadio.checked = true;
        // Show/hide correct sections
        const existingSection = document.getElementById('existing-admin-section');
        const newSection = document.getElementById('new-admin-section');
        if (existingSection) existingSection.style.display = 'block';
        if (newSection) newSection.style.display = 'none';
        // Show modal
        modal.classList.add('show');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        // Load admins for select
        fetchAdminsForSelect();
        // Init map after modal is visible
        setTimeout(() => initCreateRestaurantMap(), 300);
    } else {
        showNotification('Función de "Crear Restaurante" en desarrollo', 'info');
    }
}

// ===== RESTAURANT MAP PICKERS =====
let createRestaurantMap = null;
let createRestaurantMarker = null;
let editRestaurantMap = null;
let editRestaurantMarker = null;

function initCreateRestaurantMap() {
    const container = document.getElementById('create-restaurant-map');
    if (!container || createRestaurantMap) return;

    mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

    createRestaurantMap = new mapboxgl.Map({
        container: 'create-restaurant-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-99.4752, 21.2185],
        zoom: 14
    });

    createRestaurantMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    createRestaurantMarker = new mapboxgl.Marker({ draggable: true, color: '#059669' })
        .setLngLat([-99.4752, 21.2185])
        .addTo(createRestaurantMap);

    // Update hidden inputs on marker drag
    createRestaurantMarker.on('dragend', () => {
        const lngLat = createRestaurantMarker.getLngLat();
        document.getElementById('restaurant-lat').value = lngLat.lat;
        document.getElementById('restaurant-lng').value = lngLat.lng;
    });

    // Click on map to move marker
    createRestaurantMap.on('click', (e) => {
        createRestaurantMarker.setLngLat(e.lngLat);
        document.getElementById('restaurant-lat').value = e.lngLat.lat;
        document.getElementById('restaurant-lng').value = e.lngLat.lng;
    });

    // Resize map after it's visible
    setTimeout(() => createRestaurantMap.resize(), 200);
}

function initEditRestaurantMap(lat, lng) {
    const container = document.getElementById('edit-restaurant-map');
    if (!container) return;

    // Remove old map if exists
    if (editRestaurantMap) {
        editRestaurantMap.remove();
        editRestaurantMap = null;
        editRestaurantMarker = null;
    }

    mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

    const center = [lng || -99.4752, lat || 21.2185];

    editRestaurantMap = new mapboxgl.Map({
        container: 'edit-restaurant-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: 14
    });

    editRestaurantMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

    editRestaurantMarker = new mapboxgl.Marker({ draggable: true, color: '#059669' })
        .setLngLat(center)
        .addTo(editRestaurantMap);

    editRestaurantMarker.on('dragend', () => {
        const lngLat = editRestaurantMarker.getLngLat();
        document.getElementById('edit-restaurant-lat').value = lngLat.lat;
        document.getElementById('edit-restaurant-lng').value = lngLat.lng;
    });

    editRestaurantMap.on('click', (e) => {
        editRestaurantMarker.setLngLat(e.lngLat);
        document.getElementById('edit-restaurant-lat').value = e.lngLat.lat;
        document.getElementById('edit-restaurant-lng').value = e.lngLat.lng;
    });

    setTimeout(() => editRestaurantMap.resize(), 200);
}

function closeRestaurantModal() {
    const modal = document.getElementById('restaurant-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
    // Clean up map
    if (createRestaurantMap) {
        createRestaurantMap.remove();
        createRestaurantMap = null;
        createRestaurantMarker = null;
    }
}

function closeModal(element) {
    const modal = element.closest('.modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
}

async function searchRestaurants() {
    const searchTerm = document.getElementById('restaurant-search').value.toLowerCase();
    const filterType = document.getElementById('restaurant-filter').value;
    
    try {
        const response = await fetch(`${API_BASE}/super-admin/restaurants`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let filteredRestaurants = data.data.restaurants || data.data.restaurantes || data.data;
            if (!Array.isArray(filteredRestaurants)) filteredRestaurants = [];
            if (searchTerm) {
                filteredRestaurants = filteredRestaurants.filter(r => 
                    (r.nombre || '').toLowerCase().includes(searchTerm) ||
                    (r.direccion?.ciudad || '').toLowerCase().includes(searchTerm)
                );
            }
            if (filterType && filterType !== 'todos') {
                filteredRestaurants = filteredRestaurants.filter(r => r.tipo === filterType);
            }
            renderRestaurantsTable({ restaurantes: filteredRestaurants });
        }
    } catch (error) {
        console.error('Error searching restaurants:', error);
    }
}

async function toggleRestaurantStatus(restaurantId, currentStatus) {
    const action = currentStatus ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que quieres ${action} este restaurante?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/super-admin/restaurants/${restaurantId}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Restaurante ${action}do exitosamente`, 'success');
            loadRestaurants();
        } else {
            showNotification(data.message || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        console.error('Error toggling restaurant status:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function deleteRestaurant(restaurantId, restaurantName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el restaurante "${restaurantName}"?\n\n⚠️ Esta acción eliminará también todas las imágenes y datos asociados.`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/super-admin/restaurants/${restaurantId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Restaurante "${restaurantName}" eliminado exitosamente`, 'success');
            loadRestaurants();
        } else {
            showNotification(data.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        showNotification('Error de conexión', 'error');
    }
}

// ===== UTILITY FUNCTIONS =====
function clearAllIntervals() {
    Object.values(refreshIntervals).forEach(interval => {
        if (interval) clearInterval(interval);
    });
    refreshIntervals = { monitoring: null, sessions: null, activities: null };
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="notification-message">${message}</span>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    notification.querySelector('.notification-close').onclick = () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    };
}

function logout() {
    const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
    
    if (confirmed) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        showNotification('Sesión cerrada correctamente', 'info');
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        switchTab('monitoring');
        showNotification('Atajo de teclado: Monitoreo activado', 'info');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        switchTab('notifications');
        showNotification('Atajo de teclado: Notificaciones activadas', 'info');
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        switchTab('stats');
        showNotification('Atajo de teclado: Estadísticas activadas', 'info');
    }
});


// ===== GUÍAS MANAGEMENT =====
async function loadGuias() {
    const search = document.getElementById('guia-search')?.value || '';
    const container = document.getElementById('guias-table-container');

    try {
        const response = await fetch(`${API_BASE}/guias?search=${search}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();

        if (data.success) {
            renderGuiasTable(data.data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading guias:', error);
        showNotification('Error cargando guías', 'error');
    }
}

function renderGuiasTable(guias) {
    const container = document.getElementById('guias-table-container');
    if (!guias || guias.length === 0) {
        container.innerHTML = '<div class="loading"><p>No se encontraron guías.</p></div>';
        return;
    }

    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Guía</th>
                    <th>Especialidad</th>
                    <th>Idiomas</th>
                    <th>Estado</th>
                    <th>Calificación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${guias.map(guia => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="${guia.fotoPerfil?.url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(guia.nombreCompleto || 'Guia') + '&background=random'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                                <div>
                                    <strong>${guia.nombreCompleto}</strong><br>
                                    <small>${guia.email}</small>
                                </div>
                            </div>
                        </td>
                        <td>${guia.especialidades?.join(', ') || '-'}</td>
                        <td>${guia.idiomas?.join(', ') || '-'}</td>
                        <td>
                            <span class="badge ${guia.estado === 'activo' ? 'badge-success' : 'badge-warning'}">
                                ${guia.estado}
                            </span>
                        </td>
                        <td>⭐ ${guia.rating?.promedio || 0} (${guia.rating?.totalReseñas || 0})</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="editGuia('${guia._id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteGuia('${guia._id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tableHTML;
}

// ===== TOURS (RUTAS) MANAGEMENT =====
async function loadTours() {
    const search = document.getElementById('tour-search')?.value || '';

    try {
        const response = await fetch(`${API_BASE}/tours?search=${search}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();

        if (data.success) {
            renderToursTable(data.data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Error loading tours:', error);
        showNotification('Error cargando rutas', 'error');
    }
}

function renderToursTable(tours) {
    const container = document.getElementById('tours-table-container');
    if (!tours || tours.length === 0) {
        container.innerHTML = '<div class="loading"><p>No se encontraron rutas.</p></div>';
        return;
    }

    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Ruta</th>
                    <th>Categoría</th>
                    <th>Duración</th>
                    <th>Precio</th>
                    <th>Dificultad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${tours.map(tour => `
                    <tr>
                        <td>
                            <strong>${tour.nombre?.es || tour.nombre}</strong><br>
                            <small>${tour.puntoEncuentro?.es || '-'}</small>
                        </td>
                        <td>${tour.categoria || '-'}</td>
                        <td>${tour.duracion?.horas || '-'} hrs</td>
                        <td>$${tour.precio?.amount ?? tour.precio?.monto ?? 0} ${tour.precio?.moneda || 'MXN'}</td>
                        <td>
                            <span class="badge badge-info">${tour.dificultad}</span>
                        </td>
                        <td>
                            <span class="badge ${tour.activo ? 'badge-success' : 'badge-error'}">
                                ${tour.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="editTour('${tour._id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteTour('${tour._id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tableHTML;
}

// ===== GUÍAS ACTIONS =====
function openGuiaModal(guiaId = null) {
    const modal = document.getElementById('guia-modal');
    const form = document.getElementById('guia-form');
    const title = document.getElementById('guia-modal-title');
    
    form.reset();
    document.getElementById('guia-id').value = '';
    title.textContent = 'Nuevo Guía';

    if (guiaId) {
        title.textContent = 'Editar Guía';
        fetchGuiaData(guiaId);
    }

    modal.classList.add('show');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
}

function closeGuiaModal() {
    const modal = document.getElementById('guia-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
}

async function fetchGuiaData(id) {
    try {
        const response = await fetch(`${API_BASE}/guias/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        if (data.success) {
            const guia = data.data;
            document.getElementById('guia-id').value = guia._id;
            document.getElementById('guia-nombre').value = guia.nombreCompleto;
            document.getElementById('guia-email').value = guia.email;
            document.getElementById('guia-telefono').value = guia.telefono || '';
            document.getElementById('guia-especialidades').value = guia.especialidades?.join(', ') || '';
            document.getElementById('guia-idiomas').value = guia.idiomas?.join(', ') || '';
        }
    } catch (error) {
        console.error('Error fetching guia:', error);
    }
}

function editGuia(id) {
    openGuiaModal(id);
}

const guiaFormEl = document.getElementById('guia-form');
if (guiaFormEl) {
    guiaFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const guiaId = document.getElementById('guia-id').value;
    const method = guiaId ? 'PUT' : 'POST';
    const url = guiaId ? `${API_BASE}/guias/${guiaId}` : `${API_BASE}/guias`;

    const formData = {
        nombreCompleto: document.getElementById('guia-nombre').value,
        email: document.getElementById('guia-email').value,
        telefono: document.getElementById('guia-telefono').value,
        especialidades: document.getElementById('guia-especialidades').value.split(',').map(s => s.trim()).filter(s => s),
        idiomas: document.getElementById('guia-idiomas').value.split(',').map(s => s.trim()).filter(s => s)
    };

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
            showNotification(guiaId ? 'Guía actualizado' : 'Guía creado', 'success');
            closeGuiaModal();
            loadGuias();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Error guardando guía', 'error');
    }
});
}

async function deleteGuia(id) {
    if (!confirm('¿Estás seguro de eliminar este guía?')) return;
    try {
        const response = await fetch(`${API_BASE}/guias/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const result = await response.json();
        if (result.success) {
            showNotification('Guía eliminado', 'success');
            loadGuias();
        }
    } catch (error) {
        showNotification('Error eliminando guía', 'error');
    }
}

// ===== TOURS ACTIONS =====
function openTourModal(tourId = null) {
    const modal = document.getElementById('tour-modal');
    const form = document.getElementById('tour-form');
    const title = document.getElementById('tour-modal-title');
    
    form.reset();
    document.getElementById('tour-id').value = '';
    title.textContent = 'Nueva Ruta';

    // Load guias list for the select
    loadGuiasForSelect();

    if (tourId) {
        title.textContent = 'Editar Ruta';
        fetchTourData(tourId);
    }

    modal.classList.add('show');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
}

function closeTourModal() {
    const modal = document.getElementById('tour-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
}

async function loadGuiasForSelect() {
    const select = document.getElementById('tour-guia');
    try {
        const response = await fetch(`${API_BASE}/guias`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        if (data.success) {
            select.innerHTML = '<option value="">Seleccione un guía...</option>' + 
                data.data.map(g => `<option value="${g._id}">${g.nombreCompleto}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading guias for select:', error);
    }
}

async function fetchTourData(id) {
    try {
        const response = await fetch(`${API_BASE}/tours/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        if (data.success) {
            const tour = data.data;
            document.getElementById('tour-id').value = tour._id;
            document.getElementById('tour-nombre').value = tour.nombre?.es || tour.nombre;
            document.getElementById('tour-categoria').value = tour.categoria || '';
            document.getElementById('tour-descripcion-corta').value = tour.descripcionCorta?.es || '';
            document.getElementById('tour-descripcion').value = tour.descripcion?.es || '';
            document.getElementById('tour-duracion').value = tour.duracion?.horas || 1;
            document.getElementById('tour-precio').value = tour.precio?.amount || tour.precio?.monto || '';
            document.getElementById('tour-dificultad').value = tour.dificultad || 'Fácil';
            document.getElementById('tour-guia').value = tour.guiaReferencia?._id || tour.guiaReferencia || '';
        }
    } catch (error) {
        console.error('Error fetching tour:', error);
    }
}

function editTour(id) {
    openTourModal(id);
}

const tourFormEl = document.getElementById('tour-form');
if (tourFormEl) {
    tourFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const tourId = document.getElementById('tour-id').value;
    const method = tourId ? 'PUT' : 'POST';
    const url = tourId ? `${API_BASE}/tours/${tourId}` : `${API_BASE}/tours`;
    const formData = new FormData();
    formData.append('nombre', JSON.stringify({ es: document.getElementById('tour-nombre').value }));
    formData.append('descripcionCorta', JSON.stringify({ es: document.getElementById('tour-descripcion-corta').value }));
    formData.append('descripcion', JSON.stringify({ es: document.getElementById('tour-descripcion').value }));
    formData.append('categoria', document.getElementById('tour-categoria').value);
    formData.append('duracion', JSON.stringify({ horas: parseFloat(document.getElementById('tour-duracion').value) || 1 }));
    formData.append('precio', JSON.stringify({ amount: parseFloat(document.getElementById('tour-precio').value) || 0, moneda: 'MXN' }));
    formData.append('dificultad', document.getElementById('tour-dificultad').value);
    const guiaId = document.getElementById('tour-guia').value;
    if (guiaId) formData.append('guiaReferencia', guiaId);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            showNotification(tourId ? 'Ruta actualizada' : 'Ruta creada', 'success');
            closeTourModal();
            loadTours();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Error guardando ruta', 'error');
    }
});
}

async function deleteTour(id) {
    if (!confirm('¿Estás seguro de eliminar esta ruta?')) return;
    try {
        const response = await fetch(`${API_BASE}/tours/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const result = await response.json();
        if (result.success) {
            showNotification('Ruta eliminada', 'success');
            loadTours();
        }
    } catch (error) {
        showNotification('Error eliminando ruta', 'error');
    }
}

// ===== REVIEWS MANAGEMENT =====
async function loadReviews() {
    const token = localStorage.getItem('authToken');
    const searchInput = document.getElementById('search-reviews');
    const tbody = document.getElementById('reviews-table-body');
    const loading = document.getElementById('loading-reviews');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (loading) loading.style.display = 'block';
    try {
        const response = await fetch(`${API_BASE}/super-admin/reviews`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const result = await response.json();
            let reviews = result.data || [];
            if (searchInput && searchInput.value.trim()) {
                const s = searchInput.value.toLowerCase().trim();
                reviews = reviews.filter(r =>
                    (r.comentario && r.comentario.toLowerCase().includes(s)) ||
                    (r.restaurantId && r.restaurantId.nombre && r.restaurantId.nombre.toLowerCase().includes(s)) ||
                    (r.userId && r.userId.nombre && r.userId.nombre.toLowerCase().includes(s))
                );
            }
            renderReviewsTable(reviews);
        } else {
            showNotification('Error cargando reseñas', 'error');
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showNotification('Error cargando reseñas', 'error');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function renderReviewsTable(reviews) {
    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;
    if (reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron reseñas.</td></tr>';
        return;
    }
    tbody.innerHTML = reviews.map(r => {
        let entidadHtml = '-', entidadType = 'Desconocida';
        if (r.restaurantId) { entidadHtml = r.restaurantId.nombre || 'Restaurante'; entidadType = 'Restaurante'; }
        else if (r.agenciaId) { entidadHtml = r.agenciaId.nombre || 'Agencia'; entidadType = 'Agencia'; }
        else if (r.experienciaId) { entidadHtml = r.experienciaId.nombre || 'Experiencia'; entidadType = 'Experiencia'; }
        else if (r.guiaId) { entidadHtml = r.guiaId.nombreCompleto || 'Guía'; entidadType = 'Guía'; }
        
        let userHtml = r.userId ? `${r.userId.nombre || ''} ${r.userId.apellido || ''}`.trim() || 'Anónimo' : '-';
        let starsHtml = '';
        const calificacion = r.calificacion || r.rating || 0;
        for (let i = 1; i <= 5; i++) starsHtml += `<i class="${i <= calificacion ? 'fas' : 'far'} fa-star" style="color: var(--warning-color);"></i>`;
        
        // Formato condicional del estado
        let statusBadge = '';
        if(r.estado === 'aprobada') statusBadge = '<span class="status-badge status-active">Aprobada</span>';
        else if(r.estado === 'rechazada') statusBadge = '<span class="status-badge status-inactive">Rechazada</span>';
        else statusBadge = '<span class="status-badge" style="background:#fff3cd; color:#856404;">Pendiente</span>';

        // Formato fecha
        let dateFormatted = new Date(r.createdAt || Date.now()).toLocaleString('es-ES', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });

        // Botones de acción dinámicos
        let actionButtons = '';
        if(r.estado !== 'aprobada') {
            actionButtons += `<button class="btn btn-sm btn-success" onclick="changeReviewStatus('${r._id}', 'aprobada')" title="Aprobar"><i class="fas fa-check"></i></button>`;
        }
        if(r.estado !== 'rechazada') {
            actionButtons += `<button class="btn btn-sm btn-warning" onclick="changeReviewStatus('${r._id}', 'rechazada')" title="Rechazar"><i class="fas fa-times"></i></button>`;
        }
        actionButtons += `<button class="btn btn-sm btn-danger" onclick="deleteReview('${r._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>`;

        return `<tr>
            <td><strong>${entidadHtml}</strong><br><small style="color:var(--gray-500);">${entidadType}</small></td>
            <td>${userHtml}</td>
            <td>${starsHtml}</td>
            <td style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${r.comentario || ''}">${r.comentario || '<em>Sin comentario</em>'}</td>
            <td>${statusBadge}<br><small class="text-muted"><i class="far fa-clock"></i> ${dateFormatted}</small></td>
            <td><div class="action-buttons">${actionButtons}</div></td>
        </tr>`;
    }).join('');
}

window.deleteReview = async function(reviewId) {
    if (!confirm('¿Estás seguro de eliminar esta reseña permanentemente?')) return;
    try {
        const response = await fetch(`${API_BASE}/super-admin/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            showNotification('Reseña eliminada con éxito', 'success');
            loadReviews();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Error al eliminar reseña', 'error');
        }
    } catch (error) {
        console.error('Delete review error:', error);
        showNotification('Error de conexión al eliminar', 'error');
    }
};

window.changeReviewStatus = async function(reviewId, status) {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${status}?`)) return;
    try {
        const response = await fetch(`${API_BASE}/super-admin/reviews/${reviewId}/status`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: status })
        });
        if (response.ok) {
            showNotification(`Estado de reseña actualizado a ${status}`, 'success');
            loadReviews();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Error al actualizar estado', 'error');
        }
    } catch (error) {
        console.error('Update review status error:', error);
        showNotification('Error de conexión al actualizar', 'error');
    }
};

// ===== CONFIRMATION MODAL =====
function confirmDelete(type, id, itemName, callback) {
    deleteConfirmation = { type, id, callback };
    const modal = document.getElementById('confirmation-modal');
    const messageEl = document.getElementById('confirmation-message');
    const detailsEl = document.getElementById('confirmation-details');
    if (messageEl) messageEl.textContent = `¿Estás seguro que deseas eliminar este ${type}?`;
    if (detailsEl) detailsEl.innerHTML = `<strong>${itemName}</strong>`;
    if (modal) modal.classList.add('show');
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) modal.classList.remove('show');
    deleteConfirmation = { type: null, id: null, callback: null };
}

async function executeDelete() {
    if (deleteConfirmation.callback) {
        const btn = document.getElementById('confirm-delete-btn');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...'; btn.disabled = true; }
        try {
            await deleteConfirmation.callback(deleteConfirmation.id);
        } finally {
            if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
            closeConfirmationModal();
        }
    }
}

// ===== TOGGLE ADMIN SECTIONS =====
function toggleAdminSections() {
    const checked = document.querySelector('input[name="admin-type"]:checked');
    if (!checked) return;
    const adminType = checked.value;
    const existingSection = document.getElementById('existing-admin-section');
    const newSection = document.getElementById('new-admin-section');
    if (adminType === 'existing') {
        if (existingSection) existingSection.style.display = 'block';
        if (newSection) newSection.style.display = 'none';
        const sel = document.getElementById('restaurant-admin-select');
        if (sel) sel.required = true;
        ['new-admin-nombre','new-admin-apellido','new-admin-email','new-admin-password','new-admin-telefono'].forEach(id => {
            const el = document.getElementById(id); if (el) el.required = false;
        });
    } else {
        if (existingSection) existingSection.style.display = 'none';
        if (newSection) newSection.style.display = 'block';
        const sel = document.getElementById('restaurant-admin-select');
        if (sel) sel.required = false;
        ['new-admin-nombre','new-admin-apellido','new-admin-email','new-admin-password','new-admin-telefono'].forEach(id => {
            const el = document.getElementById(id); if (el) el.required = true;
        });
    }
}

// ===== ADMIN MODAL (alias) =====
function openAdminModal() { openCreateAdminModal(); }

// ===== FETCH ADMINS FOR SELECT =====
async function fetchAdminsForSelect() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE}/super-admin/admins?limite=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const result = await response.json();
            availableAdmins = (result.data.admins || result.data).filter(a => a.rol === 'admin' && a.activo);
            const select = document.getElementById('restaurant-admin-select');
            if (select) {
                select.innerHTML = '<option value="">Seleccionar administrador...</option>';
                availableAdmins.forEach(admin => {
                    select.innerHTML += `<option value="${admin._id}">${admin.nombre} ${admin.apellido} (${admin.email})</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error fetching admins for select:', error);
    }
}

// ===== RESTAURANT MODAL =====
function openRestaurantModal() {
    const form = document.getElementById('restaurant-form');
    if (form) form.reset();
    const igContainer = document.getElementById('restaurant-instagram-container');
    if (igContainer) igContainer.innerHTML = '';
    const newSection = document.getElementById('new-admin-section');
    const existingSection = document.getElementById('existing-admin-section');
    if (newSection) newSection.style.display = 'none';
    if (existingSection) existingSection.style.display = 'block';
    const modal = document.getElementById('restaurant-modal');
    if (modal) modal.classList.add('show');
    fetchAdminsForSelect();
}

function closeEditRestaurantModal() {
    const modal = document.getElementById('edit-restaurant-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
    if (editRestaurantMap) {
        editRestaurantMap.remove();
        editRestaurantMap = null;
        editRestaurantMarker = null;
    }
}

async function editRestaurant(id) {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE}/super-admin/restaurants/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const result = await response.json();
            const rest = result.data;
            document.getElementById('edit-restaurant-id').value = rest._id;
            document.getElementById('edit-restaurant-nombre').value = rest.nombre || '';
            document.getElementById('edit-restaurant-tipo').value = rest.tipo || rest.detalles?.tipo || 'restaurante';

            // Descripción (bilingüe — solo español en este modal)
            const descEl = document.getElementById('edit-restaurant-descripcion');
            if (descEl) descEl.value = rest.descripcion?.es || (typeof rest.descripcion === 'string' ? rest.descripcion : '') || '';

            // Teléfono y Email (campos raíz del modelo)
            document.getElementById('edit-restaurant-telefono').value = rest.telefono || rest.contacto?.telefono || '';
            const emailEl = document.getElementById('edit-restaurant-email');
            if (emailEl) emailEl.value = rest.email || rest.contacto?.email || '';

            // Dirección
            document.getElementById('edit-restaurant-calle').value = rest.direccion?.calle || '';
            document.getElementById('edit-restaurant-ciudad').value = rest.direccion?.ciudad || '';
            document.getElementById('edit-restaurant-cp').value = rest.direccion?.codigoPostal || rest.direccion?.cp || '';

            // Redes sociales (campos raíz del modelo bajo `redes`)
            const fbField = document.getElementById('edit-restaurant-facebook');
            if (fbField) fbField.value = rest.redes?.facebook || rest.contacto?.redesSociales?.facebook || '';
            const igField = document.getElementById('edit-restaurant-instagram');
            if (igField) {
                const ig = rest.redes?.instagram || rest.contacto?.redesSociales?.instagram || '';
                igField.value = Array.isArray(ig) ? (ig[0] || '') : ig;
            }
            const twField = document.getElementById('edit-restaurant-twitter');
            if (twField) twField.value = rest.redes?.twitter || '';
            const webField = document.getElementById('edit-restaurant-website');
            if (webField) webField.value = rest.redes?.website || '';

            // Google Reviews URL
            const grField = document.getElementById('edit-restaurant-google-reviews');
            if (grField) grField.value = rest.googleReviewsUrl || '';

            // Instagram Embeds
            const igContainer = document.getElementById('edit-instagram-inputs-container');
            if (igContainer) {
                igContainer.innerHTML = '';
                if (rest.instagramEmbeds && rest.instagramEmbeds.length > 0) {
                    rest.instagramEmbeds.forEach(url => {
                        addInstagramLink(igContainer, url);
                    });
                }
            }

            const editModal = document.getElementById('edit-restaurant-modal');
            editModal.classList.add('show');
            editModal.style.display = 'flex';
            editModal.style.opacity = '1';
            editModal.style.visibility = 'visible';
            // Init map with restaurant coordinates
            const lat = rest.direccion?.coordenadas?.lat;
            const lng = rest.direccion?.coordenadas?.lng;
            document.getElementById('edit-restaurant-lat').value = lat || '';
            document.getElementById('edit-restaurant-lng').value = lng || '';
            setTimeout(() => initEditRestaurantMap(lat, lng), 300);
        }
    } catch (error) {
        console.error('Edit restaurant error:', error);
        showNotification('Error cargando datos del restaurante', 'error');
    }
}

async function saveRestaurant(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const adminType = document.querySelector('input[name="admin-type"]:checked')?.value || 'existing';
    const formData = {
        restaurantData: {
            nombre: document.getElementById('restaurant-nombre').value,
            detalles: { tipo: document.getElementById('restaurant-tipo').value },
            direccion: {
                calle: document.getElementById('restaurant-calle').value,
                colonia: document.getElementById('restaurant-colonia').value,
                ciudad: document.getElementById('restaurant-ciudad').value,
                cp: document.getElementById('restaurant-cp').value,
                coordenadas: {
                    lat: parseFloat(document.getElementById('restaurant-lat').value) || 0,
                    lng: parseFloat(document.getElementById('restaurant-lng').value) || 0
                }
            },
            contacto: {
                telefono: document.getElementById('restaurant-telefono').value,
                redesSociales: { instagram: [] }
            }
        }
    };
    const mainIg = document.getElementById('restaurant-instagram')?.value?.trim();
    if (mainIg) formData.restaurantData.contacto.redesSociales.instagram.push(mainIg);
    if (adminType === 'new') {
        formData.adminData = {
            nombre: document.getElementById('new-admin-nombre').value,
            apellido: document.getElementById('new-admin-apellido').value,
            email: document.getElementById('new-admin-email').value,
            password: document.getElementById('new-admin-password').value,
            telefono: document.getElementById('new-admin-telefono').value
        };
    } else {
        formData.adminId = document.getElementById('restaurant-admin-select').value;
    }
    try {
        const response = await fetch(`${API_BASE}/super-admin/restaurants-with-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (response.ok) {
            showNotification('Restaurante creado exitosamente', 'success');
            closeRestaurantModal();
            loadRestaurants(currentPage.restaurants);
            loadDashboard();
        } else {
            throw new Error(result.message || 'Error creando restaurante');
        }
    } catch (error) {
        console.error('Create restaurant error:', error);
        showNotification(error.message, 'error');
    }
}

async function updateRestaurant(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const id = document.getElementById('edit-restaurant-id').value;

    // Recopilar Instagram Embeds
    const igEmbeds = [];
    const igContainer = document.getElementById('edit-instagram-inputs-container');
    if (igContainer) {
        igContainer.querySelectorAll('input').forEach(input => {
            const val = input.value.trim();
            if (val) igEmbeds.push(val);
        });
    }

    const formData = {
        nombre: document.getElementById('edit-restaurant-nombre').value,
        tipo: document.getElementById('edit-restaurant-tipo').value,
        descripcion: {
            es: document.getElementById('edit-restaurant-descripcion')?.value || ''
        },
        telefono: document.getElementById('edit-restaurant-telefono').value,
        email: document.getElementById('edit-restaurant-email')?.value || '',
        direccion: {
            calle: document.getElementById('edit-restaurant-calle').value,
            ciudad: document.getElementById('edit-restaurant-ciudad').value,
            codigoPostal: document.getElementById('edit-restaurant-cp').value,
            coordenadas: {
                lat: parseFloat(document.getElementById('edit-restaurant-lat').value) || 0,
                lng: parseFloat(document.getElementById('edit-restaurant-lng').value) || 0
            }
        },
        redes: {
            facebook: document.getElementById('edit-restaurant-facebook')?.value?.trim() || '',
            instagram: document.getElementById('edit-restaurant-instagram')?.value?.trim() || '',
            twitter: document.getElementById('edit-restaurant-twitter')?.value?.trim() || '',
            website: document.getElementById('edit-restaurant-website')?.value?.trim() || ''
        },
        googleReviewsUrl: document.getElementById('edit-restaurant-google-reviews')?.value?.trim() || '',
        instagramEmbeds: igEmbeds
    };

    try {
        const response = await fetch(`${API_BASE}/super-admin/restaurants/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (response.ok) {
            showNotification('Restaurante actualizado exitosamente', 'success');
            closeEditRestaurantModal();
            loadRestaurants(currentPage.restaurants);
        } else {
            throw new Error(result.message || 'Error actualizando restaurante');
        }
    } catch (error) {
        console.error('Update restaurant error:', error);
        showNotification(error.message, 'error');
    }
}

function confirmDeleteAdmin(id, name, email) {
    if (currentUser && id === currentUser.id) {
        showNotification('No puedes eliminar tu propia cuenta', 'error');
        return;
    }
    confirmDelete('Administrador', id, `${name} (${email})`, async (adminId) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/super-admin/admins/${adminId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showNotification('Administrador eliminado exitosamente', 'success');
            loadAdmins(currentPage.admins);
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Error eliminando administrador');
        }
    });
}

function confirmDeleteRestaurant(id, nombre) {
    confirmDelete('Restaurante', id, nombre, async (restId) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/super-admin/restaurants/${restId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showNotification('Restaurante eliminado exitosamente', 'success');
            loadRestaurants(currentPage.restaurants);
            loadDashboard();
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Error eliminando restaurante');
        }
    });
}

// ===== ADVANCED STATS (HEATMAP) =====
let heatmapMap = null;
async function initHeatmap() {
    const mapContainer = document.getElementById('map-heatmap');
    if (!mapContainer) return;

    const loadingEl = document.getElementById('heatmap-loading');
    
    try {
        // Fetch all restaurants to plot
        const response = await fetch(`${API_BASE}/restaurants?limite=500&compact=true`);
        const json = await response.json();
        const restaurants = json.success ? json.data.restaurantes : [];

        // Configure Mapbox
        mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
        
        heatmapMap = new mapboxgl.Map({
            container: 'map-heatmap',
            style: 'mapbox://styles/mapbox/dark-v11', // Dark style looks better for heatmaps
            center: [-99.4752, 21.2185], // Jalpan de Serra
            zoom: 12,
            pitch: 30
        });

        heatmapMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

        heatmapMap.on('load', () => {
            // Hide loading
            if (loadingEl) loadingEl.style.display = 'none';

            // Create GeoJSON source
            const geojson = {
                type: 'FeatureCollection',
                features: restaurants
                    .filter(r => r.direccion && r.direccion.coordenadas && r.direccion.coordenadas.lat && r.direccion.coordenadas.lng)
                    .map(r => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [r.direccion.coordenadas.lng, r.direccion.coordenadas.lat]
                        },
                        properties: {
                            mag: r.googleTotalReviews || 10, // Use reviews as weight if available
                            nombre: r.nombre
                        }
                    }))
            };

            heatmapMap.addSource('restaurants-source', {
                type: 'geojson',
                data: geojson
            });

            // Add heatmap layer
            heatmapMap.addLayer({
                id: 'restaurants-heat',
                type: 'heatmap',
                source: 'restaurants-source',
                maxzoom: 15,
                paint: {
                    // Increase weight as magnitude increases
                    'heatmap-weight': [
                        'interpolate',
                        ['linear'],
                        ['get', 'mag'],
                        0, 0,
                        1000, 1
                    ],
                    // Increase intensity as zoom increases
                    'heatmap-intensity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 1,
                        15, 3
                    ],
                    // Assign color values
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(33,102,172,0)',
                        0.2, 'rgb(103,169,207)',
                        0.4, 'rgb(209,229,240)',
                        0.6, 'rgb(253,219,199)',
                        0.8, 'rgb(239,138,98)',
                        1, 'rgb(178,24,43)'
                    ],
                    // Adjust heatmap radius by zoom
                    'heatmap-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 2,
                        15, 20
                    ],
                    // Transition heatmap opacity by zoom level to points
                    'heatmap-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        14, 1,
                        16, 0
                    ]
                }
            });

            // Add circle layer for points when zoomed in closer
            heatmapMap.addLayer({
                id: 'restaurants-point',
                type: 'circle',
                source: 'restaurants-source',
                minzoom: 14,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        14, 4,
                        16, 8
                    ],
                    'circle-color': 'rgb(178,24,43)',
                    'circle-stroke-color': 'white',
                    'circle-stroke-width': 1,
                    'circle-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        14, 0,
                        16, 1
                    ]
                }
            });

            // Add popup on click
            heatmapMap.on('click', 'restaurants-point', (e) => {
                const coordinates = e.features[0].geometry.coordinates.slice();
                const nombre = e.features[0].properties.nombre;
                const mag = e.features[0].properties.mag;

                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(`<strong>${nombre}</strong><br>Peso/Reseñas: ${mag}`)
                    .addTo(heatmapMap);
            });

            heatmapMap.on('mouseenter', 'restaurants-point', () => {
                heatmapMap.getCanvas().style.cursor = 'pointer';
            });
            heatmapMap.on('mouseleave', 'restaurants-point', () => {
                heatmapMap.getCanvas().style.cursor = '';
            });
        });
    } catch (error) {
        console.error('Error inicializando heatmap:', error);
        if (loadingEl) loadingEl.innerHTML = '<p class="text-error">Error al cargar el mapa.</p>';
    }
}

// ===== CLEANUP =====
window.addEventListener('beforeunload', () => {
    clearAllIntervals();
});

// ===== CONSOLE WELCOME MESSAGE =====
console.log(`
🎉 Super Admin Panel Cargado Exitosamente!

🔗 Atajos de Teclado:
• Ctrl+Shift+M: Monitoreo
• Ctrl+Shift+N: Notificaciones  
• Ctrl+Shift+S: Estadísticas

🛠️ Funcionalidades Disponibles:
• Monitoreo en tiempo real
• Gestión de administradores
• Control de restaurantes
• Control de guías y rutas
• Sistema de notificaciones
• Estadísticas avanzadas

📧 Soporte: soporte@restauranteweb.com
`);

// ===== INSTAGRAM EMBED LINKS HELPER =====
function addInstagramLink(container, value) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;gap:0.5rem;align-items:center;';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = 'https://www.instagram.com/p/...';
    if (value) input.value = value;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = () => wrapper.remove();
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
}

// ===== EXPORT FUNCTIONS =====
function escapeCSVCell(cell) {
    const cellStr = cell === null || cell === undefined ? '' : String(cell);
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

function buildCSVString(rows) {
    return rows.map(row => row.map(escapeCSVCell).join(',')).join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ---- Fetch helpers to get ALL records ----
async function fetchAllRestaurants() {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/super-admin/restaurants?limite=9999`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.success ? (data.data.restaurants || data.data.restaurantes || (Array.isArray(data.data) ? data.data : [])) : [];
}

async function fetchAllAdmins() {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/super-admin/admins?limite=9999`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.success ? (data.data.admins || data.data) : [];
}

// ========================================================
// EXPORT RESTAURANTES (agrupados por tipo) — botón principal
// ========================================================
async function exportRestaurantsCSVMinimal() {
    try {
        showNotification('Generando CSV completo…', 'success');
        const restaurants = await fetchAllRestaurants();
        if (!restaurants || restaurants.length === 0) {
            showNotification('No hay establecimientos para exportar', 'error');
            return;
        }
        // Agrupar por tipo
        const tipoMap = {};
        restaurants.forEach(r => {
            const tipo = (r.detalles?.tipo || r.tipo || 'otro').toLowerCase();
            if (!tipoMap[tipo]) tipoMap[tipo] = [];
            tipoMap[tipo].push(r);
        });

        // Orden preferido
        const tipoOrden = ['restaurante', 'cafeteria', 'bar', 'comida-rapida', 'panaderia', 'hotel', 'cabaña', 'otro'];
        const tipoLabels = {
            'restaurante': 'RESTAURANTES',
            'cafeteria': 'CAFETERÍAS',
            'bar': 'BARES',
            'comida-rapida': 'COMIDA RÁPIDA',
            'panaderia': 'PANADERÍAS',
            'hotel': 'HOTELES',
            'cabaña': 'CABAÑAS',
            'otro': 'OTROS'
        };

        const headers = [
            'Nombre', 'Dirección', 'Teléfono(s)', 'Administrador/Propietario',
            'RNT / Registro', 'Pet Friendly', 'Se admiten mascotas', 'Capacidad',
            'Correo', 'Facebook', 'Instagram'
        ];

        const allRows = [];
        // Título general
        allRows.push(['ALIMENTOS Y BEBIDAS  -  JALPAN DE SERRA', '', '', '', '', '', '', '', '', '', '']);
        allRows.push([]); // fila vacía
        allRows.push(headers);

        // Recorrer tipos en orden
        const tiposPresentes = tipoOrden.filter(t => tipoMap[t] && tipoMap[t].length > 0);
        // Agregar tipos no previstos
        Object.keys(tipoMap).forEach(t => { if (!tiposPresentes.includes(t)) tiposPresentes.push(t); });

        tiposPresentes.forEach(tipo => {
            const items = tipoMap[tipo];
            const label = tipoLabels[tipo] || tipo.toUpperCase();
            // Fila separadora con el nombre del tipo
            allRows.push([label, '', '', '', '', '', '', '', '', '', '']);

            items.forEach(r => {
                const adminName = r.adminId
                    ? `${r.adminId.nombre || ''} ${r.adminId.apellido || ''}`.trim()
                    : '';

                const direccionParts = [];
                if (r.direccion?.calle) direccionParts.push(r.direccion.calle);
                if (r.direccion?.colonia) direccionParts.push(r.direccion.colonia);
                if (r.direccion?.ciudad) direccionParts.push(r.direccion.ciudad);
                if (r.direccion?.cp) direccionParts.push('C.P. ' + r.direccion.cp);
                const direccion = direccionParts.join(', ');

                const telefono = r.contacto?.telefono || '';
                const rnt = r.detalles?.rnt || r.rnt || '';
                const petFriendly = r.detalles?.petFriendly ? 'Sí' : 'No';
                const admiteMascotas = r.detalles?.admiteMascotas ? 'Sí' : 'No';
                const capacidad = r.detalles?.capacidad || r.capacidad || '';
                const correo = r.contacto?.email || r.adminId?.email || '';

                let facebook = '';
                let instagram = '';
                if (r.contacto?.redesSociales) {
                    facebook = Array.isArray(r.contacto.redesSociales.facebook)
                        ? r.contacto.redesSociales.facebook.join(', ')
                        : (r.contacto.redesSociales.facebook || '');
                    instagram = Array.isArray(r.contacto.redesSociales.instagram)
                        ? r.contacto.redesSociales.instagram.join(', ')
                        : (r.contacto.redesSociales.instagram || '');
                }

                allRows.push([
                    r.nombre || '',
                    direccion,
                    telefono,
                    adminName,
                    rnt,
                    petFriendly,
                    admiteMascotas,
                    capacidad,
                    correo,
                    facebook,
                    instagram
                ]);
            });

            allRows.push([]); // fila vacía entre secciones
        });

        downloadCSV(buildCSVString(allRows), 'establecimientos_completo.csv');
        showNotification(`Exportados ${restaurants.length} establecimientos exitosamente`, 'success');
    } catch (error) {
        console.error('Export Error:', error);
        showNotification('Error al exportar establecimientos', 'error');
    }
}

// Alias para el botón de Estadísticas
window.exportarRestaurantesCSV = exportRestaurantsCSVMinimal;

// ========================================================
// EXPORT ADMINISTRADORES — completo
// ========================================================
async function exportAdminsCSVMinimal() {
    try {
        showNotification('Generando CSV de administradores…', 'success');
        const admins = await fetchAllAdmins();
        if (!admins || admins.length === 0) {
            showNotification('No hay administradores para exportar', 'error');
            return;
        }

        const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'Rol', 'Estado', 'Restaurante Asignado'];
        const allRows = [headers];

        admins.forEach(a => {
            const restName = a.restaurantId?.nombre || a.restauranteNombre || '';
            allRows.push([
                a.nombre || '',
                a.apellido || '',
                a.email || '',
                a.telefono || '',
                a.rol || '',
                a.activo ? 'Activo' : 'Inactivo',
                restName
            ]);
        });

        downloadCSV(buildCSVString(allRows), 'administradores_completo.csv');
        showNotification(`Exportados ${admins.length} administradores exitosamente`, 'success');
    } catch (error) {
        console.error('Export Error:', error);
        showNotification('Error al exportar administradores', 'error');
    }
}

// Alias para el botón de Estadísticas
window.exportarAdminsCSV = exportAdminsCSVMinimal;

// ========================================================
// EXPORT GUÍAS — completo
// ========================================================
async function exportGuiasCSV() {
    try {
        showNotification('Generando CSV de guías…', 'success');
        const response = await fetch(`${API_BASE}/guias?allLangs=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        const guias = data.success ? data.data : [];
        if (guias.length === 0) {
            showNotification('No hay guías para exportar', 'error');
            return;
        }

        const headers = ['Nombre Completo', 'Email', 'Teléfono', 'Credencial SECTUR', 'Estado', 'Idiomas', 'Especialidades', 'Años Exp.', 'Zonas'];
        const allRows = [headers];

        guias.forEach(g => {
            allRows.push([
                g.nombreCompleto || '',
                g.email || '',
                g.telefono || '',
                g.credencialSECTUR || '',
                g.estado || '',
                (g.idiomas || []).join('; '),
                (g.especialidades || []).join('; '),
                g.aniosExperiencia || '',
                (g.zonasOperacion || []).join('; ')
            ]);
        });

        downloadCSV(buildCSVString(allRows), 'guias_completo.csv');
        showNotification(`Exportados ${guias.length} guías exitosamente`, 'success');
    } catch (error) {
        console.error('Export Error:', error);
        showNotification('Error al exportar guías', 'error');
    }
}

// ========================================================
// EXPORT TOURS / RUTAS — completo
// ========================================================
async function exportToursCSV() {
    try {
        showNotification('Generando CSV de rutas…', 'success');
        const response = await fetch(`${API_BASE}/tours?allLangs=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await response.json();
        const tours = data.success ? data.data : [];
        if (tours.length === 0) {
            showNotification('No hay rutas para exportar', 'error');
            return;
        }

        const headers = ['Nombre Ruta', 'Categoría', 'Tipo', 'Precio', 'Moneda', 'Duración (hrs)', 'Dificultad', 'Capacidad Máx', 'WhatsApp', 'Estado'];
        const allRows = [headers];

        tours.forEach(t => {
            allRows.push([
                t.nombre?.es || t.nombre || '',
                t.categoria || '',
                t.tipo || '',
                t.precio?.amount ?? t.precio?.monto ?? 0,
                t.precio?.moneda || 'MXN',
                t.duracion?.horas || '',
                t.dificultad || '',
                t.capacidad?.maxima || '',
                t.telefonoWhatsApp || '',
                t.activo !== false ? 'Activo' : 'Inactivo'
            ]);
        });

        downloadCSV(buildCSVString(allRows), 'rutas_completo.csv');
        showNotification(`Exportadas ${tours.length} rutas exitosamente`, 'success');
    } catch (error) {
        console.error('Export Error:', error);
        showNotification('Error al exportar rutas', 'error');
    }
}
