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

// Manejar búsqueda
function handleSearch(e) {
    if (e && e.preventDefault) e.preventDefault();

    const searchQuery = document.getElementById('searchQuery')?.value.toLowerCase() || "";
    const priceRange = document.getElementById('priceRange')?.value || "";
    const guestFilter = document.getElementById('guestFilter')?.value || "";

    // Obtener categoría activa
    const activeCategoryBtn = document.querySelector('.filter-btn.active');
    const categoryFilter = activeCategoryBtn ? activeCategoryBtn.getAttribute('data-filter') : 'all';

    filteredAccommodations = allAccommodations.filter(item => {
        // Filtro por Categoría
        if (categoryFilter !== 'all' && item.tipo !== categoryFilter) return false;

        // Filtro por Búsqueda (Texto)
        const matchesSearch = !searchQuery ||
            (item.nombre && item.nombre.toLowerCase().includes(searchQuery)) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(searchQuery)) ||
            (item.ubicacion && item.ubicacion.ciudad && item.ubicacion.ciudad.toLowerCase().includes(searchQuery));

        // Precio y Huéspedes
        const precio = item.precio || (item.habitaciones && item.habitaciones[0] && item.habitaciones[0].precio) || 0;
        const matchesPrice = !priceRange || precio <= parseInt(priceRange);

        // Capacidad
        let capacidad = item.capacidad?.huespedes || item.capacidad?.personasMax || 0;
        if (item.tipo === 'hotel') {
            if (item.habitaciones && item.habitaciones.length > 0) {
                capacidad = Math.max(...item.habitaciones.map(h => h.capacidad?.huespedes || h.capacidad?.personasMax || 0));
            }
        }

        const matchesGuests = !guestFilter || capacidad >= parseInt(guestFilter);

        return matchesSearch && matchesPrice && matchesGuests;
    });

    handleSort(); // Apply sort correctly
    displayAccommodations();
    updateResultsInfo();
}

// Manejar ordenamiento
function handleSort() {
    if (!sortBy) return;
    const sortValue = sortBy.value;

    filteredAccommodations.sort((a, b) => {
        const precioA = a.precio || (a.habitaciones && a.habitaciones[0] && a.habitaciones[0].precio) || 0;
        const precioB = b.precio || (b.habitaciones && b.habitaciones[0] && b.habitaciones[0].precio) || 0;

        const capA = a.capacidad?.huespedes || a.capacidad?.personasMax || (a.habitaciones ? Math.max(...a.habitaciones.map(h => h.capacidad?.huespedes || h.capacidad?.personasMax || 0)) : 0);
        const capB = b.capacidad?.huespedes || b.capacidad?.personasMax || (b.habitaciones ? Math.max(...b.habitaciones.map(h => h.capacidad?.huespedes || h.capacidad?.personasMax || 0)) : 0);

        if (sortValue === 'price-low') return precioA - precioB;
        if (sortValue === 'price-high') return precioB - precioA;
        if (sortValue === 'capacity') return capB - capA;
        if (sortValue === 'name') return (a.nombre || '').localeCompare(b.nombre || '');

        // newest default
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

// Mostrar alojamientos
function displayAccommodations() {
    if (filteredAccommodations.length === 0) {
        showEmpty();
        return;
    }

    showAccommodations();

    const accommodationsHTML = filteredAccommodations.map(item => createCard(item)).join('');
    if (cabanasGrid) cabanasGrid.innerHTML = accommodationsHTML;
}

// Crear tarjeta de alojamiento
function createCard(item) {
    const imageUrl = getImageUrl(item.imagenes?.[0] || item.imagenesPrincipales?.[0]);

    let price = item.precio || 0;
    if (item.tipo === 'hotel' && item.habitaciones && item.habitaciones.length > 0) {
        price = Math.min(...item.habitaciones.map(h => h.precio || 999999));
        if (price === 999999) price = 0;
    }

    const ciudad = item.ubicacion?.ciudad || 'Ciudad no especificada';

    let capacidad = item.capacidad?.huespedes || item.capacidad?.personasMax || 0;
    if (item.tipo === 'hotel' && item.habitaciones && item.habitaciones.length > 0) {
        capacidad = Math.max(...item.habitaciones.map(h => h.capacidad?.huespedes || h.capacidad?.personasMax || 0));
    }

    let servicios = [];
    if (item.servicios) {
        if (Array.isArray(item.servicios)) servicios = item.servicios;
        else servicios = Object.keys(item.servicios).filter(key => item.servicios[key]);
    }

    // Config de ícono por tipo
    let typeIcon = 'fas fa-bed';
    let typeName = formatTipoPropiedad(item.tipo);
    if (item.tipo === 'hotel') typeIcon = 'fas fa-hotel';
    else if (item.tipo === 'cabana') { typeIcon = 'fas fa-tree'; typeName = "Cabaña"; }
    else if (item.tipo === 'airbnb') typeIcon = 'fab fa-airbnb';

    return `
        <div class="cabana-card" style="cursor: default;">
            <div class="cabana-image" onclick="window.location.href='hospedaje-detalle.html?tipo=${item.tipo}&id=${item._id}'" style="cursor: pointer;">
                <img src="${imageUrl}" alt="${item.nombre}" onerror="this.src='https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                
                ${item.esEcologico ? `
                    <div class="eco-badge">
                        <i class="fas fa-leaf"></i>
                        Ecológico
                    </div>
                ` : ''}
                
                ${price > 0 ? `<div class="price-badge">${item.tipo === 'hotel' ? 'Desde ' : ''}$${price.toLocaleString('es-MX')} MXN</div>` : ''}
                <div class="capacity-badge">
                    <i class="fas fa-users"></i> 
                    Hasta ${capacidad} huesp.
                </div>
                <div class="type-badge"><i class="${typeIcon}"></i> ${typeName}</div>
            </div>
            
            <div class="cabana-content">
                <h3 class="cabana-title">${item.nombre}</h3>
                
                <div class="cabana-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${ciudad}
                </div>
                
                ${item.descripcion ? `
                    <div class="cabana-description">
                        ${item.descripcion}
                    </div>
                ` : ''}
                
                ${servicios.length > 0 ? `
                    <div class="cabana-features">
                        ${servicios.slice(0, 3).map(s => `<span class="feature-tag">${formatServiceName(s)}</span>`).join('')}
                        ${servicios.length > 3 ? `<span class="more-features">+${servicios.length - 3} más</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="cabana-footer">
                    <div class="contact-info">
                        ${item.contacto?.telefono ? `<a href="tel:${item.contacto.telefono}" class="contact-btn" title="Llamar"><i class="fas fa-phone"></i></a>` : ''}
                        ${item.contacto?.email ? `<a href="mailto:${item.contacto.email}" class="contact-btn" title="Email"><i class="fas fa-envelope"></i></a>` : ''}
                    </div>
                    
                    <div style="display:flex;gap:8px;align-items:center;">
                        <a href="hospedaje-detalle.html?tipo=${item.tipo}&id=${item._id}" class="view-details-btn" style="text-decoration:none;">
                            <i class="fas fa-eye"></i>
                            Ver detalles
                        </a>
                        <button class="view-details-btn" onclick="event.stopPropagation(); openQuickView('${item.tipo}', '${item._id}')" title="Vista rápida" aria-label="Vista rápida">
                            <i class="fas fa-info-circle" style="margin:0;"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
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

    if (count === total) {
        resultsInfo.textContent = `Mostrando ${count} alojamiento${count !== 1 ? 's' : ''}`;
    } else {
        resultsInfo.textContent = `Mostrando ${count} de ${total} alojamiento${total !== 1 ? 's' : ''}`;
    }
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

