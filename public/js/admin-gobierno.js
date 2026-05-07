/* ===== GOBIERNO ADMIN PANEL JAVASCRIPT ===== */

const API_BASE = window.location.origin + '/api';
let currentUser = null;
let charts = {};
let map = null;
let fullRestaurantsData = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadMapboxConfig();
    
    // Search listener
    document.getElementById('search-padrón')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = fullRestaurantsData.filter(r => 
            (r.nombre || '').toLowerCase().includes(term) || 
            (r.direccion?.ciudad || '').toLowerCase().includes(term) ||
            (r.tipo || '').toLowerCase().includes(term)
        );
        renderRestaurantsTable(filtered);
    });
});

let mapboxTokenPromise = null;

async function loadMapboxConfig() {
    if (mapboxTokenPromise) return mapboxTokenPromise;
    
    mapboxTokenPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE}/config/mapbox`);
            const data = await res.json();
            if (data.success && data.token) {
                mapboxgl.accessToken = data.token;
                return true;
            } else {
                console.error('Error cargando token de Mapbox');
                return false;
            }
        } catch (e) {
            console.error('Error fetching Mapbox token:', e);
            return false;
        }
    })();
    return mapboxTokenPromise;
}

// ===== AUTHENTICATION =====
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) { window.location.href = '/login.html'; return; }

    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.data && data.data.admin) {
            currentUser = data.data.admin;
            if (currentUser.rol !== 'super-admin' && currentUser.rol !== 'gobernamental') {
                window.location.href = '/admin.html';
                return;
            }
            document.getElementById('user-name').textContent = currentUser.nombre;
            loadDashboardData(); // Cargar todo al iniciar
        } else {
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        }
    } catch (error) {
        window.location.href = '/login.html';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/login.html';
}

// ===== TAB NAVIGATION =====
function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Trigger map resize Si cambiamos a tab de mapa
    if (tabId === 'heatmaps' && map) {
        setTimeout(() => map.resize(), 200);
    }
}

// ===== DATA LOADING =====
async function loadDashboardData() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE}/gobierno/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            const data = result.data;
            
            // Render everything
            renderDashboardStats(data);
            createDashboardCharts(data);
            renderRankings(data);
            renderTurismo(data);
            renderGuiasTable(data.guiasDetalle);
            renderAlertas(data);
            if(data.hospedajes) renderHospedajes(data.hospedajes);
            
            // Obtener datos detallados de restaurantes para la tabla completa
            loadRestaurants();
            
            // Inicializar Mapa
            initHeatMap(data.ubicaciones);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    } finally {
        const loadingScreen = document.getElementById('startup-loading');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.remove(), 500);
        }
    }
}

// ===== RENDER: RESUMEN EJECUTIVO =====
function renderDashboardStats(data) {
    const r = data.resumen;
    const statsContainer = document.getElementById('main-stats');
    
    // Actualizar indicador de alertas
    if (data.alertas && (data.alertas.resenasNegativasCount > 0 || data.alertas.sinActualizar > 0)) {
        document.getElementById('tab-alertas').innerHTML = `<i class="fas fa-bell"></i> Alertas y Calidad <span style="background:var(--danger);color:white;border-radius:50%;padding:2px 6px;font-size:0.7rem;margin-left:4px;">${data.alertas.resenasNegativasCount + data.alertas.sinActualizar}</span>`;
    }

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">Impacto Económico Directo</div>
                <div class="stat-icon"><i class="fas fa-briefcase"></i></div>
            </div>
            <div class="stat-value">${r.empleosEstimados} <span style="font-size:1rem;color:var(--gray-500);font-weight:400">Empleos</span></div>
            <div class="stat-sub"><i class="fas fa-chart-line" style="color:var(--success)"></i> Generados en el sector gastronómico</div>
        </div>
        
        <div class="stat-card success">
            <div class="stat-header">
                <div class="stat-title">Unidades Económicas</div>
                <div class="stat-icon"><i class="fas fa-store"></i></div>
            </div>
            <div class="stat-value">${r.totalRestaurantes}</div>
            <div class="stat-sub"><i class="fas fa-check-circle" style="color:var(--success)"></i> ${r.restaurantesActivos} Operando actualmente</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-title">Ciudadanos / Turistas</div>
                <div class="stat-icon"><i class="fas fa-users"></i></div>
            </div>
            <div class="stat-value">${r.totalUsuarios}</div>
            <div class="stat-sub"><i class="fas fa-mobile-alt" style="color:var(--info)"></i> Cuentas activas en la app</div>
        </div>

        <div class="stat-card warning">
            <div class="stat-header">
                <div class="stat-title">Calidad General (Rating)</div>
                <div class="stat-icon"><i class="fas fa-star" style="color:var(--warning)"></i></div>
            </div>
            <div class="stat-value">${r.ratingPromedio} <span style="font-size:1.2rem;color:var(--gray-500);font-weight:400">/ 5.0</span></div>
            <div class="stat-sub"><i class="fas fa-comment-dots"></i> Promediando ${r.restaurantesConRating} negocios evaluados</div>
        </div>
    `;
}

function createDashboardCharts(data) {
    // 1. Growth Chart
    const growthCtx = document.getElementById('growthChart')?.getContext('2d');
    if (growthCtx) {
        if (charts.growthChart) charts.growthChart.destroy();
        const growthData = data.crecimiento || [];
        charts.growthChart = new Chart(growthCtx, {
            type: 'bar',
            data: {
                labels: growthData.map(d => d.period),
                datasets: [
                    {
                        label: 'Nuevos Negocios',
                        data: growthData.map(d => d.nuevosRestaurantes),
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Nuevos Turistas',
                        data: growthData.map(d => d.nuevosUsuarios),
                        backgroundColor: '#1e3a8a',
                        borderRadius: 4,
                        type: 'line',
                        tension: 0.4
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Type Configuration Chart
    const typeCtx = document.getElementById('typeChart')?.getContext('2d');
    if (typeCtx) {
        if (charts.typeChart) charts.typeChart.destroy();
        const typeData = data.estadisticasTipo || {};
        const labels = Object.keys(typeData).map(k => k.charAt(0).toUpperCase() + k.slice(1));
        const values = Object.values(typeData);
        charts.typeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['Sin Datos'],
                datasets: [{
                    data: values.length ? values : [1],
                    backgroundColor: ['#1e3a8a', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'],
                    borderWidth: 2, borderColor: '#ffffff'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
}

function renderRankings(data) {
    // Top 5
    const topContainer = document.getElementById('top-restaurants');
    if (topContainer) {
        let html = '';
        (data.topRestaurantes || []).forEach((r, i) => {
            const loc = r.direccion?.ciudad ? r.direccion.ciudad : 'Jalpan';
            const ratingNumber = r.estadisticas?.rating || 0;
            const resenasNumber = r.estadisticas?.totalResenas || 0;
            html += `
                <li class="ranking-item">
                    <div class="ranking-info">
                        <span class="ranking-name">${i+1}. ${r.nombre} <span class="badge success" style="margin-left:8px;font-size:0.6rem;">${r.tipo}</span></span>
                        <span class="ranking-desc"><i class="fas fa-map-marker-alt"></i> ${loc}</span>
                    </div>
                    <div class="ranking-score">
                        ${ratingNumber.toFixed(1)} <i class="fas fa-star"></i>
                        <span style="font-size:0.75rem;color:var(--gray-400);font-weight:400;margin-left:4px;">(${resenasNumber})</span>
                    </div>
                </li>`;
        });
        topContainer.innerHTML = html || '<p style="color:var(--gray-500);text-align:center;padding:2rem 0;">No hay datos suficientes</p>';
    }

    // Bottom 5
    const bottomContainer = document.getElementById('bottom-restaurants');
    if (bottomContainer) {
        let html = '';
        (data.bottomRestaurantes || []).forEach((r, i) => {
            const loc = r.direccion?.ciudad ? r.direccion.ciudad : 'Jalpan';
            const ratingNumber = r.estadisticas?.rating || 0;
            const resenasNumber = r.estadisticas?.totalResenas || 0;
            html += `
                <li class="ranking-item">
                    <div class="ranking-info">
                        <span class="ranking-name">${r.nombre}</span>
                        <span class="ranking-desc">${r.tipo} en ${loc}</span>
                    </div>
                    <div class="ranking-score" style="color:var(--danger)">
                        ${ratingNumber.toFixed(1)} <i class="fas fa-star" style="color:var(--danger)"></i>
                        <span style="font-size:0.75rem;color:var(--gray-400);font-weight:400;margin-left:4px;">(${resenasNumber})</span>
                    </div>
                </li>`;
        });
        bottomContainer.innerHTML = html || '<p style="color:var(--gray-500);text-align:center;padding:2rem 0;">No hay datos suficientes</p>';
    }
}

// ===== RENDER: TURISMO Y GUÍAS =====
function renderTurismo(data) {
    const r = data.resumen;
    const statsContainer = document.getElementById('turismo-stats');
    if (statsContainer) {
        const pctCertificados = r.totalGuias > 0 ? Math.round((r.guiasCertificados / r.totalGuias) * 100) : 0;
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Guías de Turistas</div>
                    <div class="stat-icon"><i class="fas fa-user-tie"></i></div>
                </div>
                <div class="stat-value">${r.totalGuias}</div>
                <div class="stat-sub"><i class="fas fa-certificate" style="color:var(--warning)"></i> ${r.guiasCertificados} con Certificación SECTUR (${pctCertificados}%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Oferta de Tours (Recorridos)</div>
                    <div class="stat-icon"><i class="fas fa-hiking"></i></div>
                </div>
                <div class="stat-value">${r.totalTours}</div>
                <div class="stat-sub"><i class="fas fa-route" style="color:var(--primary)"></i> Rutas turísticas activas</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Agencias Operadoras</div>
                    <div class="stat-icon"><i class="fas fa-building"></i></div>
                </div>
                <div class="stat-value">${r.totalAgencias}</div>
                <div class="stat-sub"><i class="fas fa-umbrella-beach" style="color:var(--success)"></i> Empresas registradas</div>
            </div>
        `;
    }

    // Gráficos de Turismo
    const catCtx = document.getElementById('tourCatChart')?.getContext('2d');
    if (catCtx) {
        if (charts.tourCatChart) charts.tourCatChart.destroy();
        const cats = data.toursPorCategoria || {};
        charts.tourCatChart = new Chart(catCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(cats).length ? Object.keys(cats) : ['Sin datos'],
                datasets: [{ data: Object.values(cats).length ? Object.values(cats) : [1], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const typeCtx = document.getElementById('tourTypeChart')?.getContext('2d');
    if (typeCtx) {
        if (charts.tourTypeChart) charts.tourTypeChart.destroy();
        const types = data.toursPorTipo || {};
        charts.tourTypeChart = new Chart(typeCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(types).length ? Object.keys(types) : ['Ninguno'],
                datasets: [{ label: 'Cantidad', data: Object.values(types).length ? Object.values(types) : [0], backgroundColor: '#1e3a8a' }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}

function renderGuiasTable(guias) {
    const tbody = document.querySelector('#guias-table tbody');
    if (!tbody) return;

    if (!guias || guias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No hay guías registrados</td></tr>';
        return;
    }

    let html = '';
    guias.forEach(g => {
        const certBadge = g.credencialSECTUR ? '<span class="badge success"><i class="fas fa-check"></i> SECTUR</span>' : '<span class="badge warning"><i class="fas fa-exclamation-triangle"></i> Pendiente</span>';
        const estadoBadge = g.estado === 'activo' ? '<span class="badge success">Activo</span>' : '<span class="badge gray">Inactivo</span>';
        const esps = (g.especialidades || []).join(', ') || 'General';
        const rating = g.calificacionPromedio ? `${g.calificacionPromedio.toFixed(1)} <i class="fas fa-star" style="color:var(--warning)"></i>` : 'S/R';
        const date = new Date(g.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

        html += `
            <tr>
                <td style="font-weight:500">${g.nombreCompleto}</td>
                <td>${estadoBadge}</td>
                <td>${certBadge} <br><small style="color:var(--gray-500);font-size:0.75rem;">${g.credencialSECTUR || ''}</small></td>
                <td style="font-size:0.85rem">${esps}</td>
                <td style="font-weight:600">${rating}</td>
                <td style="font-size:0.85rem;color:var(--gray-500)">${date}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ===== RENDER: ALERTAS =====
function renderAlertas(data) {
    const resenasContainer = document.getElementById('alertas-reseñas');
    const funcContainer = document.getElementById('alertas-operativas');
    
    // Reseñas
    if (resenasContainer) {
        let h = '';
        if (data.resenasNegativas && data.resenasNegativas.length > 0) {
            data.resenasNegativas.forEach(rev => {
                const nombreLocal = rev.restaurante?.nombre || 'Establecimiento Borrado';
                const date = new Date(rev.createdAt).toLocaleDateString('es-MX');
                h += `
                    <div class="alert-item">
                        <div class="alert-icon"><i class="fas fa-star-half-alt"></i></div>
                        <div class="alert-content">
                            <h4>${nombreLocal}</h4>
                            <p>"${rev.comentario || 'Sin comentario, solo calificación baja'}"</p>
                            <div class="alert-meta">
                                <span>Rating: <strong>${rev.rating}/5</strong></span>
                                <span>Fecha: ${date}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            h = '<p style="color:var(--gray-500);text-align:center;padding:2rem 0;"><i class="fas fa-check-circle" style="color:var(--success);font-size:2rem;margin-bottom:1rem;display:block;"></i> Excelentes noticias. No hay reportes críticos recientes.</p>';
        }
        resenasContainer.innerHTML = h;
    }

    // Operativas
    if (funcContainer) {
        let h = '';
        const a = data.alertas || {};
        
        if (a.sinActualizar > 0) {
            h += `
                <div class="alert-item warning">
                    <div class="alert-icon"><i class="fas fa-store-slash"></i></div>
                    <div class="alert-content">
                        <h4>Establecimientos Inactivos</h4>
                        <p>Hay <strong>${a.sinActualizar} establecimientos</strong> que no han actualizado su perfil, menú ni información en más de 30 días. Posible abandono de negocio o negligencia.</p>
                    </div>
                </div>
            `;
        }
        
        if (a.guiasSinCertificar > 0) {
            h += `
                <div class="alert-item warning">
                    <div class="alert-icon"><i class="fas fa-id-card-alt"></i></div>
                    <div class="alert-content">
                        <h4>Guías Sin Registro SECTUR</h4>
                        <p>Hay <strong>${a.guiasSinCertificar} perfiles de guías</strong> operando en la plataforma que no han registrado su credencial SECTUR o autorización CONANP.</p>
                    </div>
                </div>
            `;
        }

        if (h === '') {
            h = '<p style="color:var(--gray-500);text-align:center;padding:2rem 0;"><i class="fas fa-clipboard-check" style="color:var(--success);font-size:2rem;margin-bottom:1rem;display:block;"></i> Padrón completamente regularizado. Sin advertencias operativas.</p>';
        }
        funcContainer.innerHTML = h;
    }
}

// ===== MAPA =====
async function initHeatMap(locations) {
    await loadMapboxConfig(); // Esperar a que el token se cargue primero (condición de carrera resuelta)

    if (!mapboxgl.accessToken) {
        document.getElementById('heatMap').innerHTML = '<div style="padding:2rem;text-align:center;color:var(--danger)">Error: Mapbox token no configurado. Verifica el .env</div>';
        return;
    }

    const validLocations = locations ? locations.filter(l => l.ubicacion?.coordinates?.length === 2 && l.ubicacion.coordinates[0] !== null) : [];

    // Coordenadas centrales por defecto (Jalpan)
    const center = [-99.475, 21.218];
    
    document.getElementById('heatMap').innerHTML = ''; // Clear prior if any
    
    map = new mapboxgl.Map({
        container: 'heatMap',
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: 13
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
        const geojson = {
            type: 'FeatureCollection',
            features: validLocations.map(l => ({
                type: 'Feature',
                properties: {
                    title: l.nombre,
                    rating: l.estadisticas?.rating || 0,
                    type: l.tipo || 'Desconocido'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [l.ubicacion.coordinates[0], l.ubicacion.coordinates[1]]
                }
            }))
        };

        map.addSource('restaurants', { type: 'geojson', data: geojson });

        // Heatmap layer
        map.addLayer({
            id: 'restaurants-heat',
            type: 'heatmap',
            source: 'restaurants',
            maxzoom: 15,
            paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'rating'], 0, 0, 5, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 3],
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)',
                    0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)',
                    1, 'rgb(178,24,43)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 15, 15, 40],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 14, 1, 15, 0]
            }
        });

        // Circle layer for close zoom
        map.addLayer({
            id: 'restaurants-point',
            type: 'circle',
            source: 'restaurants',
            minzoom: 14,
            paint: {
                'circle-radius': 6,
                'circle-color': [
                    'match', ['get', 'type'], 
                    'restaurante', '#ef4444', 
                    'cafeteria', '#f59e0b', 
                    'bar', '#8b5cf6', 
                    'hotel', '#3b82f6', 
                    'cabaña', '#0ea5e9', 
                    'airbnb', '#0284c7', 
                    '#10b981'
                ],
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
            }
        });

        // Tooltip on click
        map.on('click', 'restaurants-point', (e) => {
            const props = e.features[0].properties;
            new mapboxgl.Popup()
                .setLngLat(e.features[0].geometry.coordinates)
                .setHTML(`<strong>${props.title}</strong><br>Tipo: ${props.type}<br>Reseñas: ${props.rating} ⭐`)
                .addTo(map);
        });
        map.on('mouseenter', 'restaurants-point', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'restaurants-point', () => map.getCanvas().style.cursor = '');
    });
}

// ===== RESTAURANTES (TABLA GENERAL) =====
async function loadRestaurants() {
    const tableBody = document.querySelector('#padrón-table tbody');
    if(tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;"><div class="spinner" style="width:30px;height:30px;margin:0 auto"></div></td></tr>';

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_BASE}/gobierno/restaurants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            fullRestaurantsData = result.data;
            renderRestaurantsTable(fullRestaurantsData);
            renderGastronomia(fullRestaurantsData);
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger)">Error al cargar directorio</td></tr>';
    }
}

function renderRestaurantsTable(restaurants) {
    const tableBody = document.querySelector('#padrón-table tbody');
    if (!tableBody) return;

    if (!restaurants || restaurants.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--gray-500)">No se encontraron registros.</td></tr>';
        return;
    }

    let html = '';
    restaurants.forEach(r => {
        const type = r.tipo ? r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1) : 'S/N';
        const location = r.direccion?.ciudad ? `${r.direccion.ciudad}` : 'Ubicación Desconocida';
        const status = r.activo ? '<span class="badge success">Operando</span>' : '<span class="badge gray">Inactivo</span>';
        const adminName = r.adminId ? `${r.adminId.nombre} ${r.adminId.apellido}` : '<span style="color:var(--danger);font-size:0.8rem">Sin Asignar</span>';
        const rating = r.estadisticas?.rating > 0 ? `${r.estadisticas.rating.toFixed(1)} <i class="fas fa-star" style="color:var(--warning)"></i>` : 'N/A';

        html += `
            <tr>
                <td style="font-weight: 500">${r.nombre}</td>
                <td><span style="font-size:0.85rem; background:var(--gray-100); padding:2px 8px; border-radius:4px;">${type}</span></td>
                <td><i class="fas fa-map-marker-alt" style="color:var(--gray-400);font-size:0.9rem;"></i> ${location}</td>
                <td style="font-weight:600">${rating}</td>
                <td>${status}</td>
                <td style="font-size:0.9rem;">${adminName}</td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

// ===== RENDER: HOSPEDAJES =====
function renderHospedajes(h) {
    const statsContainer = document.getElementById('hospedajes-stats');
    if (!statsContainer) return;

    // Resumen Rápido
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-hotel"></i></div>
            <div class="stat-info">
                <div class="stat-label">Capacidad Registrada</div>
                <div class="stat-value">${h.hoteles.total + h.cabanas.total + h.airbnbs.total}</div>
                <div class="stat-desc">Establecimientos totales</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="fas fa-door-open"></i></div>
            <div class="stat-info">
                <div class="stat-label">Establecimientos Activos</div>
                <div class="stat-value">${h.hoteles.activos + h.cabanas.activos + h.airbnbs.activos}</div>
                <div class="stat-desc">Operando en plataforma</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="fas fa-star-half-alt"></i></div>
            <div class="stat-info">
                <div class="stat-label">Calidad Promedio</div>
                <div class="stat-value">${((h.hoteles.promedio + h.cabanas.promedio + h.airbnbs.promedio) / 3).toFixed(1)} <i class="fas fa-star" style="font-size:1rem;color:var(--warning)"></i></div>
                <div class="stat-desc">Evaluación del sector</div>
            </div>
        </div>
    `;

    // Gráfico de Distribución (Pastel)
    const ctxType = document.getElementById('hospedajesTypeChart');
    if (ctxType) {
        if (charts.hospType) charts.hospType.destroy();
        charts.hospType = new Chart(ctxType, {
            type: 'doughnut',
            data: {
                labels: ['Hoteles', 'Cabañas', 'Alojamientos (Airbnb)'],
                datasets: [{
                    data: [h.hoteles.total, h.cabanas.total, h.airbnbs.total],
                    backgroundColor: ['#3b82f6', '#0ea5e9', '#0284c7'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // Gráfico de Calificaciones (Barras)
    const ctxRating = document.getElementById('hospedajesRatingChart');
    if (ctxRating) {
        if (charts.hospRating) charts.hospRating.destroy();
        charts.hospRating = new Chart(ctxRating, {
            type: 'bar',
            data: {
                labels: ['Hoteles', 'Cabañas', 'Alojamientos (Airbnb)'],
                datasets: [{
                    label: 'Calificación Promedio',
                    data: [h.hoteles.promedio, h.cabanas.promedio, h.airbnbs.promedio],
                    backgroundColor: 'rgba(245, 158, 11, 0.8)'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { y: { beginAtZero: true, max: 5 } },
                plugins: { legend: { display: false } } 
            }
        });
    }

    // Llenar Tabla Desglose
    const tableBody = document.querySelector('#hospedajes-summary-table tbody');
    if (tableBody) {
        const createRow = (nombre, datos) => {
            const tasaActiva = datos.total > 0 ? ((datos.activos / datos.total) * 100).toFixed(0) : 0;
            return `
                <tr>
                    <td style="font-weight: 500">${nombre}</td>
                    <td>${datos.total}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.5rem">
                            <div style="flex:1;background:var(--gray-200);height:6px;border-radius:3px;overflow:hidden">
                                <div style="width:${tasaActiva}%;background:var(--success);height:100%"></div>
                            </div>
                            <span style="font-size:0.85rem">${tasaActiva}%</span>
                        </div>
                    </td>
                    <td style="font-weight:600">${datos.promedio > 0 ? `${datos.promedio} <i class="fas fa-star" style="color:var(--warning)"></i>` : 'N/A'}</td>
                </tr>
            `;
        };
        tableBody.innerHTML = createRow('Hoteles', h.hoteles) + createRow('Cabañas', h.cabanas) + createRow('Alojamientos (Airbnb)', h.airbnbs);
    }
}

// ===== EXPORTACIONES CSV =====
function exportRestaurantesCSV() {
    if (!fullRestaurantsData || fullRestaurantsData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    let csv = 'Nombre,Tipo,Ciudad,Codigo Postal,Teléfono,Estado,Rating,Total Reseñas,Administrador,Email Admin\n';
    fullRestaurantsData.forEach(r => {
        const n = `"${r.nombre || ''}"`;
        const t = `"${r.tipo || ''}"`;
        const m = `"${r.direccion?.ciudad || ''}"`;
        const cp = `"${r.direccion?.codigoPostal || r.direccion?.cp || ''}"`;
        const tel = `"${r.telefono || ''}"`;
        const e = r.activo ? '"Operando"' : '"Inactivo"';
        const rate = r.estadisticas?.rating || 0;
        const resCnt = r.estadisticas?.totalResenas || 0;
        const aName = `"${r.adminId ? r.adminId.nombre + ' ' + r.adminId.apellido : ''}"`;
        const aEmail = `"${r.adminId ? r.adminId.email : ''}"`;
        
        csv += `${n},${t},${m},${cp},${tel},${e},${rate},${resCnt},${aName},${aEmail}\n`;
    });

    downloadCSV(csv, 'padron_establecimientos_jalpan.csv');
}

function exportGuiasCSV() {
    fetch(`${API_BASE}/gobierno/dashboard`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } })
        .then(res => res.json())
        .then(result => {
            const guias = result.data.guiasDetalle;
            if (!guias || guias.length === 0) return alert('No hay guías para exportar');
            
            let csv = 'Nombre Completo,Estado,Credencial SECTUR,Autorizacion CONANP,Idiomas,Especialidades,Calificacion,Fecha Registro\n';
            guias.forEach(g => {
                const n = `"${g.nombreCompleto || ''}"`;
                const e = `"${g.estado || ''}"`;
                const sec = `"${g.credencialSECTUR || ''}"`;
                const conanp = `"${g.autorizacionCONANP || ''}"`;
                const idio = `"${(g.idiomas || []).join('; ')}"`;
                const esp = `"${(g.especialidades || []).join('; ')}"`;
                const rate = g.calificacionPromedio || 0;
                const fech = `"${new Date(g.createdAt).toLocaleDateString()}"`;
                
                csv += `${n},${e},${sec},${conanp},${idio},${esp},${rate},${fech}\n`;
            });
            downloadCSV(csv, 'padron_guias_turismo.csv');
        }).catch(err => {
            console.error(err);
            alert('Error al descargar guías');
        });
}

function downloadCSV(csv, filename) {
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ===== RENDER: GASTRONOMÍA =====
function renderGastronomia(restaurants) {
    if (!restaurants) return;

    const statsObj = { 
        restaurante: { total: 0, activos: 0, inactivos: 0, ratingSum: 0, conRating: 0 },
        bar: { total: 0, activos: 0, inactivos: 0, ratingSum: 0, conRating: 0 },
        cafeteria: { total: 0, activos: 0, inactivos: 0, ratingSum: 0, conRating: 0 },
        otro: { total: 0, activos: 0, inactivos: 0, ratingSum: 0, conRating: 0 }
    };

    let totalGastro = restaurants.length;
    let totalActivos = 0;

    restaurants.forEach(r => {
        let type = (r.tipo || 'otro').toLowerCase();
        if (!statsObj[type]) type = 'otro';
        
        statsObj[type].total++;
        if (r.activo) {
            statsObj[type].activos++;
            totalActivos++;
        } else {
            statsObj[type].inactivos++;
        }
        
        let rate = r.estadisticas?.rating || 0;
        if (rate > 0) {
            statsObj[type].ratingSum += rate;
            statsObj[type].conRating++;
        }
    });

    const tb = document.querySelector('#gastro-summary-table tbody');
    if (tb) {
        let h = '';
        ['restaurante', 'bar', 'cafeteria', 'otro'].forEach(k => {
            const s = statsObj[k];
            if (s.total === 0) return;
            const rt = s.conRating > 0 ? (s.ratingSum / s.conRating).toFixed(1) : 'S/R';
            const iconColor = k==='restaurante'?'#ef4444':k==='bar'?'#8b5cf6':k==='cafeteria'?'#f59e0b':'#64748b';
            
            h += `<tr>
                <td style="text-transform:capitalize; font-weight:500;">
                  <i class="fas fa-circle" style="color:${iconColor}; font-size:0.6rem; margin-right:4px;"></i> ${k}
                </td>
                <td>${s.total}</td>
                <td><span class="badge success">${s.activos}</span></td>
                <td><span class="badge gray">${s.inactivos}</span></td>
                <td><i class="fas fa-star" style="color:var(--warning)"></i> ${rt}</td>
            </tr>`;
        });
        tb.innerHTML = h;
    }

    const gStats = document.getElementById('gastro-stats');
    if (gStats) {
        gStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-title">Unidades Totales</div>
                    <div class="stat-icon"><i class="fas fa-store"></i></div>
                </div>
                <div class="stat-value">${totalGastro}</div>
                <div class="stat-sub"><i class="fas fa-layer-group"></i> Locales registrados</div>
            </div>
            <div class="stat-card success">
                <div class="stat-header">
                    <div class="stat-title">Operatividad</div>
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                </div>
                <div class="stat-value">${totalActivos} <span style="font-size:1rem;color:var(--gray-500);font-weight:400">Activos</span></div>
                <div class="stat-sub"><i class="fas fa-chart-pie"></i> ${totalGastro > 0 ? Math.round((totalActivos/totalGastro)*100) : 0}% del sector en operación</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-header">
                    <div class="stat-title">Restaurantes</div>
                    <div class="stat-icon"><i class="fas fa-utensils"></i></div>
                </div>
                <div class="stat-value">${statsObj.restaurante.total}</div>
                <div class="stat-sub"><i class="fas fa-star"></i> Promedio ${(statsObj.restaurante.conRating > 0 ? (statsObj.restaurante.ratingSum/statsObj.restaurante.conRating).toFixed(1) : '0')} / 5.0</div>
            </div>
            <div class="stat-card primary">
                <div class="stat-header">
                    <div class="stat-title">Cafeterías y Bares</div>
                    <div class="stat-icon"><i class="fas fa-coffee"></i></div>
                </div>
                <div class="stat-value">${statsObj.cafeteria.total + statsObj.bar.total}</div>
                <div class="stat-sub"><i class="fas fa-cocktail"></i> Diversificación de oferta</div>
            </div>
        `;
    }

    // Gráfico de Rating
    const rCtx = document.getElementById('gastroRatingChart')?.getContext('2d');
    if (rCtx) {
        if (charts.gastroRatingChart) charts.gastroRatingChart.destroy();
        charts.gastroRatingChart = new Chart(rCtx, {
            type: 'bar',
            data: {
                labels: ['Restaurantes', 'Bares', 'Cafeterías'],
                datasets: [{
                    label: 'Calificación Promedio',
                    data: [
                        statsObj.restaurante.conRating > 0 ? (statsObj.restaurante.ratingSum/statsObj.restaurante.conRating).toFixed(1) : 0,
                        statsObj.bar.conRating > 0 ? (statsObj.bar.ratingSum/statsObj.bar.conRating).toFixed(1) : 0,
                        statsObj.cafeteria.conRating > 0 ? (statsObj.cafeteria.ratingSum/statsObj.cafeteria.conRating).toFixed(1) : 0
                    ],
                    backgroundColor: ['#ef4444', '#8b5cf6', '#f59e0b']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 5, beginAtZero: true } } }
        });
    }

    // Gráfico de Estado Operativo
    const sCtx = document.getElementById('gastroStatusChart')?.getContext('2d');
    if (sCtx) {
        if (charts.gastroStatusChart) charts.gastroStatusChart.destroy();
        charts.gastroStatusChart = new Chart(sCtx, {
            type: 'doughnut',
            data: {
                labels: ['Operando', 'Inactivos / Pausados'],
                datasets: [{
                    data: [totalActivos, totalGastro - totalActivos],
                    backgroundColor: ['#10b981', '#94a3b8']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}
