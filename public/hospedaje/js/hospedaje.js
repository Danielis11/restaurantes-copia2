// Variables globales
let allAccommodations = [];
let filteredAccommodations = [];

// URL dinámica 
const baseURL = window.location.hostname === 'localhost'
    ? '/api/hospedaje'
    : '/api/hospedaje';

// Elementos del DOM
const loadingState = document.getElementById('loadingState');
const cabanasGrid = document.getElementById('cabanasGrid');
const emptyState = document.getElementById('emptyState');
const resultsInfo = document.getElementById('resultsInfo');
const searchForm = document.getElementById('searchForm');
const sortBy = document.getElementById('sortBy');

// Función para obtener URL de imagen
function getImageUrl(imagePath) {
    if (!imagePath) {
        return 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    return `${baseURL.replace('/api/hospedaje', '')}${imagePath}`;
}

// Manejo de errores de imágenes
function addImageErrorHandling() {
    document.addEventListener('error', function (e) {
        if (e.target.tagName === 'IMG') {
            e.target.src = 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        }
    }, true);
}

// Configurar event listeners
function setupEventListeners() {
    if (searchForm) searchForm.addEventListener('submit', handleSearch);
    if (sortBy) sortBy.addEventListener('change', handleSort);
    const limpiar = document.getElementById('hcLimpiar');
    if (limpiar) limpiar.addEventListener('click', quitarFiltros);

    const q = document.getElementById('searchQuery');
    if (q) q.addEventListener('input', debounce(handleSearch, 300));
    const pr = document.getElementById('priceRange');
    if (pr) pr.addEventListener('change', handleSearch);
    const gf = document.getElementById('guestFilter');
    if (gf) gf.addEventListener('change', handleSearch);

    // Filtros por Categoría (Botones)
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remover active class de todos
            filterBtns.forEach(b => b.classList.remove('active'));
            // Añadir active al clickeado
            e.currentTarget.classList.add('active');
            filterBtns.forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget));

            // Disparar búsqueda
            handleSearch();
        });
    });
}

// Función debounce
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

// Cargar alojamientos
async function loadAccommodations() {
    try {
        showLoading();

        // Obtener datos simultáneamente
        const [hotelesRes, cabanasRes, airbnbRes] = await Promise.all([
            fetch(`${baseURL}/hoteles`).catch(e => ({ ok: false })),
            fetch(`${baseURL}/cabanas`).catch(e => ({ ok: false })),
            fetch(`${baseURL}/airbnb`).catch(e => ({ ok: false }))
        ]);

        let hoteles = [], cabanas = [], airbnbs = [];

        if (hotelesRes.ok) {
            const dataH = await hotelesRes.json();
            if (dataH.status === 'success' && dataH.data?.hoteles) {
                hoteles = dataH.data.hoteles.map(item => ({ ...item, tipo: 'hotel' }));
            }
        }

        if (cabanasRes.ok) {
            const dataC = await cabanasRes.json();
            if (dataC.status === 'success' && dataC.data?.cabanas) {
                cabanas = dataC.data.cabanas.map(item => ({ ...item, tipo: 'cabana' }));
            }
        }

        if (airbnbRes.ok) {
            const dataA = await airbnbRes.json();
            const airbnbList = dataA.data?.airbnb || dataA.data?.alojamientos || [];
            if (dataA.status === 'success' && airbnbList.length > 0) {
                airbnbs = airbnbList.map(item => ({ ...item, tipo: 'airbnb' }));
            }
        }

        allAccommodations = [...hoteles, ...cabanas, ...airbnbs];
        filteredAccommodations = [...allAccommodations];
        prepararFiltros();
        handleSort();

        if (allAccommodations.length > 0) {
            displayAccommodations();
            updateResultsInfo();
            showAccommodations();
        } else {
            showEmpty();
        }
    } catch (error) {
        console.error('Error cargando alojamientos:', error);
        showError('Error al cargar los alojamientos: ' + error.message);
    }
}

// ===== Datos que salen de cada alojamiento (cada tipo los guarda distinto) =====
function activos(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.filter(Boolean).map(String);
    return Object.keys(obj).filter(k => obj[k] === true || (obj[k] && typeof obj[k] !== 'object'));
}

function precioDe(item) {
    let p = Number(item.precio) || Number(item.precioPorNoche) || 0;
    if (!p && Array.isArray(item.habitaciones) && item.habitaciones.length) {
        const ps = item.habitaciones.map(h => Number(h.precio) || 0).filter(Boolean);
        if (ps.length) p = Math.min(...ps);
    }
    return p;
}

function capacidadDe(item) {
    let c = Number(item.capacidad?.huespedes) || Number(item.capacidad?.personasMax) || 0;
    if (Array.isArray(item.habitaciones) && item.habitaciones.length) {
        c = Math.max(c, ...item.habitaciones.map(h => Number(h.capacidad?.huespedes || h.capacidad?.personasMax) || 0));
    }
    return c;
}

function calificacionDe(item) {
    const c = item.calificacion || {};
    return { prom: Number(c.promedio) || 0, total: Number(c.totalReviews || c.numeroReviews) || (Array.isArray(item.reviews) ? item.reviews.length : 0) };
}

// Todo lo que ofrece: servicios + instalaciones, con nombres normalizados
const ALIAS_SERV = { aire_acondicionado: 'aireacondicionado', tv: 'television', alberca: 'piscina' };
function ofreceDe(item) {
    const set = new Set();
    [...activos(item.servicios), ...activos(item.instalaciones)].forEach(k => {
        const n = String(k).toLowerCase();
        set.add(ALIAS_SERV[n] || n);
    });
    if (item.esEcologico) set.add('ecologico');
    return set;
}

const SERV = {
    piscina: ['Alberca', 'fas fa-person-swimming'],
    mascotas: ['Mascotas', 'fas fa-paw'],
    cocina: ['Cocina', 'fas fa-blender'],
    restaurante: ['Restaurante', 'fas fa-utensils'],
    estacionamiento: ['Estacionamiento', 'fas fa-square-parking'],
    wifi: ['WiFi', 'fas fa-wifi'],
    aireacondicionado: ['A/C', 'fas fa-snowflake'],
    television: ['TV', 'fas fa-tv'],
    areas_verdes: ['Áreas verdes', 'fas fa-seedling'],
    asadores: ['Asador', 'fas fa-fire'],
    terraza: ['Terraza', 'fas fa-umbrella-beach'],
    zona_camping: ['Camping', 'fas fa-campground'],
    chimenea: ['Chimenea', 'fas fa-fire-flame-curved'],
    bar: ['Bar', 'fas fa-martini-glass'],
    salon_eventos: ['Salón de eventos', 'fas fa-champagne-glasses'],
    gimnasio: ['Gimnasio', 'fas fa-dumbbell'],
    lavadora: ['Lavadora', 'fas fa-shirt'],
    ecologico: ['Ecológico', 'fas fa-leaf']
};
// Orden en que se ofrecen como filtro rápido
const CHIPS = ['piscina', 'mascotas', 'cocina', 'restaurante', 'areas_verdes', 'ecologico', 'estacionamiento', 'asadores', 'zona_camping'];
const chipsActivos = new Set();

function escHTML(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function capital(t) {
    t = String(t || '').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

// Contadores de las pestañas y chips que sí tienen lugares
function prepararFiltros() {
    const n = { all: allAccommodations.length, hotel: 0, cabana: 0, airbnb: 0 };
    allAccommodations.forEach(a => { if (n[a.tipo] !== undefined) n[a.tipo]++; });
    document.querySelectorAll('.hc-n').forEach(el => { el.textContent = n[el.dataset.n] || ''; });
    document.querySelectorAll('.hc-tab').forEach(b => {
        const k = b.dataset.filter;
        if (k !== 'all' && !n[k]) b.hidden = true;
    });

    const cont = document.getElementById('hcChips');
    if (!cont) return;
    const cuenta = {};
    allAccommodations.forEach(a => ofreceDe(a).forEach(k => { cuenta[k] = (cuenta[k] || 0) + 1; }));
    cont.innerHTML = CHIPS.filter(k => cuenta[k] && cuenta[k] < allAccommodations.length).map(k =>
        `<button type="button" class="hc-chip" data-chip="${k}" aria-pressed="false"><i class="${SERV[k][1]}" aria-hidden="true"></i>${SERV[k][0]}</button>`
    ).join('');
    cont.querySelectorAll('.hc-chip').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.chip;
        if (chipsActivos.has(k)) chipsActivos.delete(k); else chipsActivos.add(k);
        b.classList.toggle('activo', chipsActivos.has(k));
        b.setAttribute('aria-pressed', chipsActivos.has(k));
        handleSearch();
    }));
}

function quitarFiltros() {
    chipsActivos.clear();
    document.querySelectorAll('.hc-chip').forEach(b => { b.classList.remove('activo'); b.setAttribute('aria-pressed', 'false'); });
    document.querySelectorAll('.filter-btn').forEach(b => {
        const on = b.dataset.filter === 'all';
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
    });
    handleSearch();
}

// Manejar búsqueda / filtros
function handleSearch(e) {
    if (e && e.preventDefault) e.preventDefault();

    const searchQuery = document.getElementById('searchQuery')?.value.toLowerCase() || "";
    const priceRange = document.getElementById('priceRange')?.value || "";
    const guestFilter = document.getElementById('guestFilter')?.value || "";

    const activeCategoryBtn = document.querySelector('.filter-btn.active');
    const categoryFilter = activeCategoryBtn ? activeCategoryBtn.getAttribute('data-filter') : 'all';

    filteredAccommodations = allAccommodations.filter(item => {
        if (categoryFilter !== 'all' && item.tipo !== categoryFilter) return false;

        const matchesSearch = !searchQuery ||
            (item.nombre && item.nombre.toLowerCase().includes(searchQuery)) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(searchQuery)) ||
            (item.ubicacion && item.ubicacion.ciudad && item.ubicacion.ciudad.toLowerCase().includes(searchQuery));

        const matchesPrice = !priceRange || precioDe(item) <= parseInt(priceRange);
        const matchesGuests = !guestFilter || capacidadDe(item) >= parseInt(guestFilter);

        if (chipsActivos.size) {
            const ofrece = ofreceDe(item);
            for (const k of chipsActivos) if (!ofrece.has(k)) return false;
        }
        return matchesSearch && matchesPrice && matchesGuests;
    });

    handleSort();
    displayAccommodations();
    updateResultsInfo();
}

// Manejar ordenamiento
function handleSort(e) {
    if (!sortBy) return;
    const sortValue = sortBy.value;

    filteredAccommodations.sort((a, b) => {
        const pa = precioDe(a), pb = precioDe(b);
        if (sortValue === 'price-low') return (pa || Infinity) - (pb || Infinity);
        if (sortValue === 'price-high') return pb - pa;
        if (sortValue === 'capacity') return capacidadDe(b) - capacidadDe(a);
        if (sortValue === 'rating') {
            const ca = calificacionDe(a), cb = calificacionDe(b);
            return (cb.prom - ca.prom) || (cb.total - ca.total);
        }
        if (sortValue === 'name') return (a.nombre || '').localeCompare(b.nombre || '', 'es');
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Al cambiar el orden desde el menú, volver a pintar
    if (e && e.type === 'change') displayAccommodations();
}

// Mostrar alojamientos
function displayAccommodations() {
    if (filteredAccommodations.length === 0) {
        showEmpty();
        return;
    }

    showAccommodations();

    const accommodationsHTML = filteredAccommodations.map(item => createCard(item)).join('');
    if (cabanasGrid) {
        cabanasGrid.innerHTML = accommodationsHTML;
        cabanasGrid.querySelectorAll('.hc-card').forEach(card => {
            card.addEventListener('click', ev => {
                if (ev.target.closest('a, button')) return;
                window.location.href = card.dataset.href;
            });
        });
    }
}

// Tarjeta como las de Restaurantes: solo muestra lo que tenga cada lugar
function createCard(item) {
    const fotos = (item.imagenes && item.imagenes.length ? item.imagenes : item.imagenesPrincipales) || [];
    const foto = fotos[0] ? getImageUrl(fotos[0].url || fotos[0]) : '';
    const href = `hospedaje-detalle.html?tipo=${item.tipo}&id=${item._id}`;

    const tipos = {
        hotel: ['Hotel', 'fas fa-hotel'],
        cabana: ['Cabaña', 'fas fa-tree'],
        airbnb: [item.tipoPropiedad === 'zona_camping' ? 'Camping' : item.tipoPropiedad === 'casa' ? 'Casa' : 'Airbnb',
                 item.tipoPropiedad === 'zona_camping' ? 'fas fa-campground' : item.tipoPropiedad === 'casa' ? 'fas fa-house' : 'fab fa-airbnb']
    };
    const [tipoNombre, tipoIcono] = tipos[item.tipo] || [formatTipoPropiedad(item.tipo), 'fas fa-bed'];

    const precio = precioDe(item);
    const cap = capacidadDe(item);
    const hab = Number(item.capacidad?.habitaciones) || 0;
    const banos = Number(item.capacidad?.banos) || 0;
    const cal = calificacionDe(item);

    const u = item.ubicacion || {};
    const lugar = [u.colonia, u.ciudad].map(capital).filter(Boolean).join(', ') || capital(u.direccion) || 'Jalpan de Serra';

    // Hasta 4 cosas que ofrece, primero las más buscadas
    const ofrece = ofreceDe(item);
    const orden = ['piscina', 'mascotas', 'cocina', 'restaurante', 'wifi', 'estacionamiento', 'aireacondicionado', 'areas_verdes', 'asadores', 'terraza', 'chimenea', 'zona_camping', 'bar', 'television', 'lavadora', 'gimnasio', 'salon_eventos'];
    const lista = orden.filter(k => ofrece.has(k));
    const servicios = lista.slice(0, 4);
    const mas = lista.length - servicios.length;

    const datos = [];
    datos.push(`<li><i class="fas fa-location-dot" aria-hidden="true"></i><span>${escHTML(lugar)}</span></li>`);
    const partes = [];
    if (cap) partes.push(`Hasta ${cap} huéspedes`);
    if (hab) partes.push(`${hab} ${item.tipo === 'hotel' ? 'habitaciones' : hab === 1 ? 'recámara' : 'recámaras'}`);
    if (banos) partes.push(`${banos} ${banos === 1 ? 'baño' : 'baños'}`);
    if (partes.length) datos.push(`<li><i class="fas fa-user-group" aria-hidden="true"></i><span>${partes.join(' · ')}</span></li>`);
    const ci = item.politicas?.checkIn, co = item.politicas?.checkOut;
    if (ci && co) datos.push(`<li><i class="fas fa-clock" aria-hidden="true"></i><span>Entrada ${escHTML(ci)} · Salida ${escHTML(co)}</span></li>`);

    return `
        <article class="hc-card" data-href="${href}">
            <div class="hc-foto">
                ${foto
                    ? `<img src="${escHTML(foto)}" alt="${escHTML(item.nombre)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;hc-foto-vacia&quot;><i class=&quot;${tipoIcono}&quot;></i></div>'">`
                    : `<div class="hc-foto-vacia"><i class="${tipoIcono}"></i></div>`}
                ${item.esEcologico ? `<span class="hc-eco"><i class="fas fa-leaf" aria-hidden="true"></i> Ecológico</span>` : ''}
                ${fotos.length > 1 ? `<span class="hc-fotos-n"><i class="fas fa-images" aria-hidden="true"></i> ${fotos.length}</span>` : ''}
            </div>
            <div class="hc-cuerpo">
                <h3 class="hc-nombre">${escHTML(item.nombre)}</h3>
                <div class="hc-meta">
                    <span class="hc-tipo ${item.tipo}"><i class="${tipoIcono}" aria-hidden="true"></i> ${tipoNombre}</span>
                    ${cal.prom > 0
                        ? `<span class="hc-estrellas" title="Calificación"><i class="fas fa-star" aria-hidden="true"></i><b>${cal.prom.toFixed(1)}</b>${cal.total ? `<small>(${cal.total})</small>` : ''}</span>`
                        : `<span class="hc-nuevo">Nuevo</span>`}
                </div>
                ${item.descripcion ? `<p class="hc-desc">${escHTML(item.descripcion)}</p>` : ''}
                <ul class="hc-datos">${datos.join('')}</ul>
                ${servicios.length ? `
                <div class="hc-servicios">
                    ${servicios.map(k => `<span class="hc-serv"><i class="${SERV[k][1]}" aria-hidden="true"></i>${SERV[k][0]}</span>`).join('')}
                    ${mas > 0 ? `<span class="hc-serv">+${mas}</span>` : ''}
                </div>` : ''}
                <div class="hc-pie">
                    ${precio > 0
                        ? `<div class="hc-precio"><small>${item.tipo === 'hotel' ? 'Desde' : 'Precio'}</small><b>$${precio.toLocaleString('es-MX')}</b> <span>/ noche</span></div>`
                        : `<div class="hc-precio sin">Pregunta el precio</div>`}
                    <a href="${href}" class="hc-btn ver"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Ver página</a>
                    <button type="button" class="hc-btn info" onclick="openQuickView('${item.tipo}', '${item._id}')" title="Vista rápida" aria-label="Vista rápida de ${escHTML(item.nombre)}"><i class="fas fa-circle-info"></i></button>
                </div>
            </div>
        </article>
    `;
}

// Formatear tipo de propiedad
function formatTipoPropiedad(tipo) {
    if (!tipo) return '';
    const tipos = {
        'cabana': 'Cabaña',
        'hotel': 'Hotel',
        'airbnb': 'Airbnb',
        'casa_rural': 'Casa Rural',
        'chalet': 'Chalet',
        'bungalow': 'Bungalow'
    };
    return tipos[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

// Formatear nombres de servicios
function formatServiceName(service) {
    if (!service) return '';
    const services = {
        'wifi': 'WiFi',
        'estacionamiento': 'Estacionamiento',
        'aireacondicionado': 'A/C',
        'restaurante': 'Restaurante',
        'piscina': 'Piscina',
        'mascotas': 'Mascotas'
    };
    return services[service] || service.charAt(0).toUpperCase() + service.slice(1);
}

// Actualizar información de resultados
function updateResultsInfo() {
    if (!resultsInfo) return;
    const count = filteredAccommodations.length;
    const total = allAccommodations.length;
    resultsInfo.textContent = count === total
        ? `${count} lugar${count !== 1 ? 'es' : ''}`
        : `${count} de ${total} lugares`;
}

// Estados de la interfaz
function showLoading() {
    if (loadingState) loadingState.style.display = 'block';
    if (cabanasGrid) cabanasGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
}

function showAccommodations() {
    if (loadingState) loadingState.style.display = 'none';
    if (cabanasGrid) cabanasGrid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
}

function showEmpty() {
    if (loadingState) loadingState.style.display = 'none';
    if (cabanasGrid) cabanasGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

function showError(message) {
    if (loadingState) loadingState.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
        <h3>Error</h3>
        <p>${message}</p>
    `;
    showLoading();
}

// Inicializar en DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Iniciando hospedaje.js...');
    addImageErrorHandling();
    setupEventListeners();
    loadAccommodations();

    // Configuración del menú móvil
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            if (mobileOverlay) mobileOverlay.classList.toggle('active');

            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
            mobileOverlay.classList.remove('active');
        });
    }

    // Boton cerrar nav
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
        });
    }
});

// Quick View Modal
function openQuickView(tipo, id) {
    const item = allAccommodations.find(a => a._id === id && a.tipo === tipo);
    if (!item) return;

    let modal = document.getElementById('quickViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quickViewModal';
        modal.style.position = 'fixed';
        modal.style.top = '0'; modal.style.left = '0';
        modal.style.width = '100%'; modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '1rem';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }

    const price = item.precio || (item.habitaciones && item.habitaciones[0] && item.habitaciones[0].precio) || 0;
    let cap = item.capacidad?.huespedes || item.capacidad?.personasMax || 0;
    if (item.tipo === 'hotel' && item.habitaciones && item.habitaciones.length > 0) cap = Math.max(...item.habitaciones.map(h => h.capacidad?.huespedes || h.capacidad?.personasMax || 0));

    modal.innerHTML = `
        <div style="background:white; border-radius:15px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <div style="position:relative;">
                <img src="${getImageUrl(item.imagenes?.[0] || item.imagenesPrincipales?.[0])}" style="width:100%; height:200px; object-fit:cover; border-radius:15px 15px 0 0;" alt="${item.nombre}">
                <button onclick="document.getElementById('quickViewModal').style.display='none'" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:30px; height:30px; cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:20px;">
                <h2 style="margin-top:0; color:#333; display:flex; justify-content:space-between; align-items:flex-start;">
                    ${item.nombre}
                </h2>
                <p style="color:#666; margin-bottom:15px;"><i class="fas fa-map-marker-alt"></i> ${item.ubicacion?.ciudad || 'Jalpan de Serra'}</p>
                <div style="display:flex; justify-content:space-between; background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:15px;">
                    <div><i class="fas fa-coins" style="color:#2563eb;"></i> ${price > 0 ? `$${price} MXN` : 'Consultar'}</div>
                    <div><i class="fas fa-user" style="color:#FF5A5F;"></i> Hasta ${cap} per.</div>
                </div>
                <p style="font-size:0.95rem; line-height:1.5; color:#444;">${item.descripcion || 'Sin descripción detallada.'}</p>
                
                ${item.contacto?.telefono ? `<p style="margin-top:10px;"><i class="fas fa-phone"></i> <strong>Teléfono:</strong> <a href="tel:${item.contacto.telefono}">${item.contacto.telefono}</a></p>` : ''}
                
                <div style="margin-top:20px; text-align:center;">
                    <a href="hospedaje-detalle.html?tipo=${item.tipo}&id=${item._id}" style="display:inline-block; background:linear-gradient(135deg, var(--primary, #0F52BA), #1565C0); color:white; padding:10px 25px; border-radius:25px; text-decoration:none; font-weight:bold;">Ver toda la información</a>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

