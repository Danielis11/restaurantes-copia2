// ===== VARIABLES GLOBALES =====
let currentPage = 1;
let currentFilter = 'todos';
let currentSearch = '';
let isLoading = false;

// ===== ELEMENTOS DEL DOM =====
const elements = {
    // Navegación
    navToggle: document.getElementById('nav-toggle'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),
    
    // Búsqueda
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    
    // Filtros
    filterTabs: document.querySelectorAll('.filter-tab'),
    
    // Resultados
    loading: document.getElementById('loading'),
    resultsGrid: document.getElementById('results-grid'),
    resultsCount: document.getElementById('results-count'),
    emptyState: document.getElementById('empty-state'),
    
    // Estadísticas
    totalCount: document.getElementById('total-count'),
    restaurantCount: document.getElementById('restaurant-count'),
    barCount: document.getElementById('bar-count'),
    cafeCount: document.getElementById('cafe-count'),
    
    // Tours y Guías
    toursGrid: document.getElementById('tours-grid'),
    guiasGrid: document.getElementById('guias-grid'),
    
    // Paginación
    pagination: document.getElementById('pagination'),
    paginationInfo: document.getElementById('pagination-info'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    
    // Modal
    modal: document.getElementById('restaurant-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close')
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupMobileMenu(); // ← FUNCIÓN DEL MENÚ MÓVIL INTEGRADA
    renderAuthNavbar(); // ← FUNCIÓN DE AUTENTICACIÓN
    loadStatistics();
    loadRestaurants();
    loadNoticias(); // Cargar noticias en la página principal
    updateActiveNavLink();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navegación móvil ya se maneja en setupMobileMenu()
    
    // Búsqueda
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', performSearch);
    }
    
    // Filtros
    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.dataset.filter;
            setActiveFilter(filter);
            loadRestaurants();
        });
    });
    
    // Modal
    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', closeModal);
    }
    
    if (elements.modal) {
        elements.modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // Paginación
    if (elements.prevBtn) {
        elements.prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                loadRestaurants();
            }
        });
    }
    
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', function() {
            currentPage++;
            loadRestaurants();
        });
    }
    
    // Tecla Escape para cerrar modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && elements.modal && elements.modal.style.display === 'block') {
            closeModal();
        }
    });
}

// ===== 🍔 JAVASCRIPT PARA MENÚ MÓVIL =====
function setupMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (!navToggle || !navMenu) {
        console.warn('⚠️ Elementos del menú móvil no encontrados');
        console.log('nav-toggle:', navToggle);
        console.log('nav-menu:', navMenu);
        return;
    }
    
    console.log('✅ Menú móvil inicializado correctamente');
    
    // Toggle del menú
    navToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isActive = navMenu.classList.contains('active');
        
        if (isActive) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
        
        console.log('🍔 Menú toggled:', !isActive ? 'abierto' : 'cerrado');
    });
    
    // Cerrar menú al hacer click en un enlace
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            console.log('🔗 Link clickeado, cerrando menú');
            closeMobileMenu();
        });
    });
    
    // Cerrar menú al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            if (navMenu.classList.contains('active')) {
                console.log('👆 Click fuera del menú, cerrando');
                closeMobileMenu();
            }
        }
    });
    
    // Cerrar menú con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            console.log('⌨️ Escape presionado, cerrando menú');
            closeMobileMenu();
        }
    });
    
    // Cerrar menú al redimensionar ventana
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
            console.log('📱 Pantalla redimensionada, cerrando menú');
            closeMobileMenu();
        }
    });
    
    function openMobileMenu() {
        navMenu.classList.add('active');
        updateMenuIcon(true);
    }
    
    function closeMobileMenu() {
        navMenu.classList.remove('active');
        updateMenuIcon(false);
    }
    
    function updateMenuIcon(isOpen) {
        const icon = navToggle.querySelector('i');
        if (icon) {
            if (isOpen) {
                icon.className = 'fas fa-times';
                navToggle.setAttribute('aria-label', 'Cerrar menú');
            } else {
                icon.className = 'fas fa-bars';
                navToggle.setAttribute('aria-label', 'Abrir menú');
            }
        }
    }
}

// ===== FUNCIONES DE RESTAURANTES (TU CÓDIGO EXISTENTE) =====

// ===== main.js - Función actualizada para mostrar restaurantes =====
function createRestaurantCard(restaurant) {
    const typeIcon = getTypeIcon(restaurant.tipo);
    const statusIcon = restaurant.activo ? 
        '<i class="fas fa-check-circle" style="color: var(--success);"></i>' : 
        '<i class="fas fa-times-circle" style="color: var(--error);"></i>';
    
    // 🖼️ GESTIÓN DE IMÁGENES ACTUALIZADA
    let imageContent = '';
    if (restaurant.imagenes && restaurant.imagenes.length > 0) {
        const mainImage = restaurant.imagenes[0];
        // Verificar que la imagen tenga URL válida
        if (mainImage.url) {
            imageContent = `
                <img 
                    src="${mainImage.url}" 
                    alt="${restaurant.nombre}"
                    style="width: 100%; height: 100%; object-fit: cover;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div style="display: none; align-items: center; justify-content: center; height: 100%; background: var(--gray-100);">
                    <i class="${typeIcon}" style="font-size: 2rem; color: var(--gray-400);"></i>
                </div>
            `;
        } else {
            // Fallback si no hay URL válida
            imageContent = `<i class="${typeIcon}"></i>`;
        }
    } else {
        // Sin imágenes, mostrar icono
        imageContent = `<i class="${typeIcon}"></i>`;
    }
    
    const restaurantId = restaurant._id || restaurant.id;
    return `
        <div class="restaurant-card" data-id="${restaurantId}">
            <div class="card-image">
                ${imageContent}
            </div>
            <div class="card-content">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${getL(restaurant.nombre)}</h3>
                        <span class="card-type ${restaurant.tipo}">
                            <i class="${typeIcon}"></i>
                            ${getL(restaurant.tipo)}
                        </span>
                    </div>
                    ${statusIcon}
                </div>
                <p class="card-description">${getL(restaurant.descripcion)}</p>
                <div class="card-info">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${restaurant.direccion?.ciudad || 'Ciudad no especificada'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span>${formatPhone(restaurant.telefono)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${restaurant.email}</span>
                    </div>
                    ${restaurant.imagenes && restaurant.imagenes.length > 0 ? `
                    <div class="info-item">
                        <i class="fas fa-images"></i>
                        <span>${restaurant.imagenes.length} imagen(es)</span>
                    </div>
                    ` : ''}
                </div>
                <div class="card-actions" style="display:flex; gap:0.5rem; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--gray-100);">
                    <a href="/restaurante.html?id=${restaurantId}"
                       class="card-detail-btn"
                       style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem;
                              padding:0.55rem 1rem; background:var(--primary); color:white; border-radius:0.5rem;
                              font-size:0.85rem; font-weight:600; text-decoration:none;
                              transition:all 0.2s ease; border:none; cursor:pointer;"
                       onmouseover="this.style.background='var(--primary-dark)'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='var(--primary)'; this.style.transform='translateY(0)'">
                        <i class="fas fa-external-link-alt"></i>
                        Ver página
                    </a>
                    <button onclick="openRestaurantModal('${restaurantId}')"
                            style="padding:0.55rem 0.9rem; background:var(--gray-100); color:var(--gray-700);
                                   border:1px solid var(--gray-200); border-radius:0.5rem; font-size:0.85rem;
                                   font-weight:600; cursor:pointer; transition:all 0.2s ease;"
                            onmouseover="this.style.background='var(--gray-200)'"
                            onmouseout="this.style.background='var(--gray-100)'">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== FUNCIÓN PARA MOSTRAR DETALLES CON GALERÍA DE IMÁGENES =====
function displayRestaurantDetails(restaurant) {
    if (!elements.modalBody) return;
    
    const typeIcon = getTypeIcon(restaurant.tipo);
    
    // 🖼️ CREAR GALERÍA DE IMÁGENES
    let galleryHtml = '';
    if (restaurant.imagenes && restaurant.imagenes.length > 0) {
        galleryHtml = `
            <div class="detail-section">
                <h4><i class="fas fa-images"></i> Galería de Imágenes</h4>
                <div class="image-gallery">
                    ${restaurant.imagenes.map((imagen, index) => `
                        <div class="gallery-item ${index === 0 ? 'main-image' : ''}">
                            <img 
                                src="${imagen.url}" 
                                alt="${restaurant.nombre} - Imagen ${index + 1}"
                                onclick="openImageModal('${imagen.url}', '${restaurant.nombre}')"
                                onerror="this.parentElement.style.display='none'"
                            >
                            ${index === 0 ? '<span class="main-badge">Principal</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    elements.modalBody.innerHTML = `
        <div class="restaurant-details">
            <div class="detail-header">
                <h2>${restaurant.nombre}</h2>
                <span class="card-type ${restaurant.tipo}">
                    <i class="${typeIcon}"></i>
                    ${capitalizeFirst(restaurant.tipo)}
                </span>
            </div>
            
            ${galleryHtml}
            
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Descripción</h4>
                <p>${restaurant.descripcion}</p>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-map-marker-alt"></i> Dirección</h4>
                <p>
                    ${restaurant.direccion?.calle || ''}<br>
                    ${restaurant.direccion?.ciudad || ''}, ${restaurant.direccion?.codigoPostal || ''}
                </p>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-phone"></i> Contacto</h4>
                <p>
                    <strong>Teléfono:</strong> ${formatPhone(restaurant.telefono)}<br>
                    <strong>Email:</strong> ${restaurant.email}
                </p>
            </div>
            
            ${restaurant.horarios ? displayHorarios(restaurant.horarios) : ''}
            
            ${restaurant.menu && restaurant.menu.length > 0 ? displayMenu(restaurant.menu) : ''}
            
            ${restaurant.redes ? displayRedesSociales(restaurant.redes) : ''}
        </div>
    `;
}

// ===== FUNCIÓN PARA ABRIR MODAL DE IMAGEN =====
function openImageModal(imageUrl, restaurantName) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <span class="image-modal-close">&times;</span>
            <img src="${imageUrl}" alt="${restaurantName}">
            <div class="image-modal-info">
                <h3>${restaurantName}</h3>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal
    modal.querySelector('.image-modal-close').onclick = () => {
        document.body.removeChild(modal);
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// ===== FUNCIONES AUXILIARES =====
function getTypeIcon(tipo) {
    const icons = {
        'restaurante': 'fas fa-utensils',
        'bar': 'fas fa-cocktail',
        'cafeteria': 'fas fa-coffee'
    };
    return icons[tipo] || 'fas fa-store';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPhone(phone) {
    if (!phone) return 'No disponible';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

// ===== FUNCIONES DE CARGA DE DATOS =====
async function loadStatistics() {
    // Tu código para cargar estadísticas
}

async function loadRestaurants() {
    // Tu código para cargar restaurantes
}

function updateActiveNavLink() {
    // Tu código para actualizar navegación activa
}

// ===== FUNCIONES PARA TOURS =====
async function loadTours() {
    try {
        const lang = localStorage.getItem('appLang') || 'es';
        const res = await fetch(`/api/tours?limit=3&lang=${lang}&allLangs=true`);
        const data = await res.json();
        
        if (data.success) {
            renderTours(data.data);
        }
    } catch (error) {
        console.error('Error cargando tours:', error);
        if (elements.toursGrid) {
            elements.toursGrid.innerHTML = '<p class="error">Error al cargar las rutas turísticas.</p>';
        }
    }
}

// Re-cargar tours cuando cambie el idioma
document.addEventListener('languageChanged', () => {
    if (elements.toursGrid) {
        loadTours();
    }
});

function renderTours(tours) {
    if (!elements.toursGrid) return;
    
    if (tours.length === 0) {
        elements.toursGrid.innerHTML = '<p class="empty">No hay rutas turísticas disponibles en este momento.</p>';
        return;
    }
    
    elements.toursGrid.innerHTML = tours.map(tour => `
        <div class="restaurant-card tour-card" data-id="${tour._id}">
            <div class="card-image">
                <img src="${tour.imagenPrincipal?.url || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000'}" alt="${tour.nombre}" onerror="this.src='https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000'">
                <div class="tour-price-badge">$${tour.precio.amount} ${tour.precio.moneda}</div>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${getL(tour.nombre)}</h3>
                        <span class="card-type">
                            <i class="fas fa-tag"></i>
                            ${Object.prototype.toString.call(tour.categoria) === '[object String]' ? translateCategoria(tour.categoria) : getL(tour.categoria)}
                        </span>
                    </div>
                </div>
                <p class="card-description">${getL(tour.descripcionCorta)}</p>
                <div class="card-info">
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span><i class="fas fa-clock"></i> ${lang === 'en' ? 'Duration' : lang === 'fr' ? 'Durée' : 'Duración'}: ${tour.duracion.horas}h</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-signal"></i>
                        <span>${lang === 'en' ? 'Difficulty' : lang === 'fr' ? 'Difficulté' : 'Dificultad'}: ${
                            tour.dificultad === 'Fácil' ? (lang === 'en' ? 'Easy' : lang === 'fr' ? 'Facile' : 'Fácil') :
                            tour.dificultad === 'Moderado' ? (lang === 'en' ? 'Moderate' : lang === 'fr' ? 'Modéré' : 'Moderado') :
                            tour.dificultad === 'Difícil' ? (lang === 'en' ? 'Hard' : lang === 'fr' ? 'Difficile' : 'Difícil') :
                            tour.dificultad === 'Extremo' ? (lang === 'en' ? 'Extreme' : lang === 'fr' ? 'Extrême' : 'Extremo') : tour.dificultad
                        }</span>
                    </div>
                </div>
                <div class="card-actions" style="display:flex; gap:0.5rem; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--gray-100);">
                    <button class="card-detail-btn"
                       style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem;
                              padding:0.55rem 1rem; background:var(--primary); color:white; border-radius:0.5rem;
                              font-size:0.85rem; font-weight:600; text-decoration:none;
                              transition:all 0.2s ease; border:none; cursor:pointer;"
                       onmouseover="this.style.background='var(--primary-dark)'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='var(--primary)'; this.style.transform='translateY(0)'"
                       onclick="alert('${lang === 'en' ? 'Booking functionality coming soon' : lang === 'fr' ? 'Fonctionnalité de réservation prochainement' : 'Funcionalidad de reserva próximamente'}')">
                        <i class="fas fa-calendar-check"></i>
                        ${lang === 'en' ? 'Book' : lang === 'fr' ? 'Réserver' : 'Reservar'}
                    </button>
                    <button onclick="alert('${lang === 'en' ? 'Details coming soon' : lang === 'fr' ? 'Détails prochainement' : 'Detalles próximamente'}')"
                            style="padding:0.55rem 0.9rem; background:var(--gray-100); color:var(--gray-700);
                                   border:1px solid var(--gray-200); border-radius:0.5rem; font-size:0.85rem;
                                   font-weight:600; cursor:pointer; transition:all 0.2s ease;"
                            onmouseover="this.style.background='var(--gray-200)'"
                            onmouseout="this.style.background='var(--gray-100)'">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== FUNCIONES PARA GUÍAS =====
async function loadGuias() {
    try {
        const response = await fetch('/api/guias');
        const data = await response.json();
        
        if (data.success) {
            renderGuias(data.data);
        }
    } catch (error) {
        console.error('Error cargando guías:', error);
        if (elements.guiasGrid) {
            elements.guiasGrid.innerHTML = '<p class="error">Error al cargar los guías.</p>';
        }
    }
}

function renderGuias(guias) {
    if (!elements.guiasGrid) return;
    
    if (guias.length === 0) {
        elements.guiasGrid.innerHTML = '<p class="empty">No hay guías certificados disponibles en este momento.</p>';
        return;
    }
    
    elements.guiasGrid.innerHTML = guias.map(guia => `
        <div class="restaurant-card guia-card" data-id="${guia._id}">
            <div class="card-image">
                <img src="${guia.fotoPerfil?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000'}" alt="${guia.nombreCompleto}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000'">
                <div class="guia-badge">
                    <i class="fas fa-star"></i> ${guia.calificacionPromedio || 'Nuevo'}
                </div>
            </div>
            <div class="card-content">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${guia.nombreCompleto}</h3>
                        <span class="card-type">
                            <i class="fas fa-user-check"></i>
                            Guía Certificado
                        </span>
                    </div>
                </div>
                <p class="card-description">${guia.biografia || 'Guía local experto apasionado por compartir las maravillas de Jalpan de Serra.'}</p>
                <div class="card-info">
                    <div class="info-item">
                        <i class="fas fa-hiking"></i>
                        <span>${guia.especialidades.slice(0, 2).join(', ')}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-language"></i>
                        <span>${guia.idiomas.join(', ')}</span>
                    </div>
                </div>
                <div class="card-actions" style="display:flex; gap:0.5rem; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--gray-100);">
                    <button class="card-detail-btn"
                       style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem;
                              padding:0.55rem 1rem; background:var(--primary); color:white; border-radius:0.5rem;
                              font-size:0.85rem; font-weight:600; text-decoration:none;
                              transition:all 0.2s ease; border:none; cursor:pointer;"
                       onmouseover="this.style.background='var(--primary-dark)'; this.style.transform='translateY(-1px)'"
                       onmouseout="this.style.background='var(--primary)'; this.style.transform='translateY(0)'"
                       onclick="alert('Contacto con guía próximamente')">
                        <i class="fas fa-envelope"></i>
                        Contactar
                    </button>
                    <button onclick="alert('Perfil del guía próximamente')"
                            style="padding:0.55rem 0.9rem; background:var(--gray-100); color:var(--gray-700);
                                   border:1px solid var(--gray-200); border-radius:0.5rem; font-size:0.85rem;
                                   font-weight:600; cursor:pointer; transition:all 0.2s ease;"
                            onmouseover="this.style.background='var(--gray-200)'"
                            onmouseout="this.style.background='var(--gray-100)'">
                        <i class="fas fa-user"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== FUNCIONES PARA NOTICIAS Y EVENTOS =====
async function loadNoticias() {
    const noticiasGrid = document.getElementById('noticias-grid');
    const noticiasSection = document.getElementById('noticias-eventos');
    
    // Solo continuar si los elementos están en la página (ej. index.html)
    if (!noticiasGrid || !noticiasSection) return;

    try {
        const lang = localStorage.getItem('appLang') || 'es';
        const response = await fetch('/api/noticias?limit=6');
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            noticiasSection.style.display = 'block'; // Mostrar la sección si hay noticias
            renderNoticias(data.data, lang);
        } else {
            // Mostrar la sección con estado vacío
            noticiasSection.style.display = 'block';
            noticiasGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: var(--gray-50); border-radius: var(--radius-xl);">
                    <i class="fas fa-newspaper" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 1rem; display: block;"></i>
                    <h3 style="color: var(--gray-800); font-size: 1.25rem;">${lang === 'en' ? 'No recent news' : lang === 'fr' ? 'Aucune nouvelle récente' : 'No hay noticias recientes'}</h3>
                    <p style="color: var(--gray-600);">${lang === 'en' ? 'Check back later for updates and local events.' : lang === 'fr' ? 'Revenez plus tard pour des mises à jour et des événements locaux.' : 'Vuelve pronto para enterarte de novedades y eventos locales.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando noticias:', error);
        // Show error for debugging purposes instead of hiding the section
        if (noticiasSection && noticiasGrid) {
            noticiasSection.style.display = 'block';
            noticiasGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 1rem; color: #dc2626; background: #fee2e2; border-radius: var(--radius-md);">
                    <strong>Error:</strong> ${error.message} <br>
                    <small>Por favor mira la consola para más detalles.</small>
                </div>
            `;
        }
    }
}

// Escuchar cambios de idioma para recargar noticias
document.addEventListener('languageChanged', () => {
    loadNoticias();
});

function renderNoticias(noticias, currentLang = 'es') {
    const noticiasGrid = document.getElementById('noticias-grid');
    if (!noticiasGrid) return;

    noticiasGrid.innerHTML = noticias.map(noticia => {
        // Formatear la fecha
        const fechaObj = new Date(noticia.fecha);
        const fecha = fechaObj.toLocaleDateString(currentLang === 'es' ? 'es-MX' : currentLang === 'en' ? 'en-US' : 'fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        
        // Obtener contenido en el idioma correcto (o fallback a es)
        const titulo = (noticia.titulo && noticia.titulo[currentLang]) ? noticia.titulo[currentLang] : (noticia.titulo && noticia.titulo['es']) ? noticia.titulo['es'] : '';
        const descripcion = (noticia.descripcion && noticia.descripcion[currentLang]) ? noticia.descripcion[currentLang] : (noticia.descripcion && noticia.descripcion['es']) ? noticia.descripcion['es'] : '';
        // Evitamos el optional chaining (?.) por si el navegador es antiguo
        const imagenUrl = (noticia.imagen && noticia.imagen.url) ? noticia.imagen.url : noticia.imagenUrl || 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80';

        return `
            <div class="noticia-card">
                <img src="${imagenUrl}" alt="${titulo}" class="noticia-imagen" onerror="this.src='https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80'">
                <div class="noticia-contenido">
                    <div class="noticia-fecha">${fecha}</div>
                    <h3 class="noticia-titulo">${titulo}</h3>
                    <p class="noticia-descripcion">${descripcion && descripcion.length > 150 ? descripcion.substring(0, 150) + '...' : descripcion}</p>
                    <button class="btn btn-outline mt-3" style="align-self: flex-start;" onclick="alert('Detalles de la noticia próximamente')">
                        ${currentLang === 'en' ? 'Read More' : currentLang === 'fr' ? 'Lire plus' : 'Leer Más'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function performSearch() {
    // Tu código para realizar búsqueda
}

function setActiveFilter(filter) {
    // Tu código para filtros
}

function openRestaurantModal(id) {
    // Buscar el restaurante en el DOM y abrir el modal de detalle existente
    const card = document.querySelector(`.restaurant-card[data-id="${id}"]`);
    if (!card) return;
    // Disparar click en la tarjeta para abrir el modal (comportamiento existente)
    // Si el proyecto tiene un handler de click en tarjetas, lo reutilizamos
    fetch(`/api/restaurants/${id}`)
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data) {
                const restaurant = data.data.restaurant || data.data;
                if (elements.modal && elements.modalTitle && elements.modalBody) {
                    elements.modalTitle.textContent = restaurant.nombre;
                    displayRestaurantDetails(restaurant);
                    elements.modal.style.display = 'block';
                }
            }
        })
        .catch(err => console.error('Error abriendo modal:', err));
}

function closeModal() {
    if (elements.modal) {
        elements.modal.style.display = 'none';
    }
}

function displayHorarios(horarios) {
    // Tu código para mostrar horarios
    return '';
}

function displayMenu(menu) {
    // Tu código para mostrar menú
    return '';
}

function displayRedesSociales(redes) {
    // Tu código para mostrar redes sociales
    return '';
}

// ===== 🐛 FUNCIÓN PARA DETECTAR OVERFLOW (DEBUGGING) =====
function detectOverflow() {
    console.log('🔍 Detectando elementos que causan overflow...');
    const elements = document.querySelectorAll('*');
    let problemElements = [];
    
    elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            console.log('❌ Elemento problemático:', el, 'Ancho:', rect.width, 'Right:', rect.right);
            el.style.border = '2px solid red';
            problemElements.push(el);
        }
    });
    
    if (problemElements.length === 0) {
        console.log('✅ No se encontraron elementos que causen overflow');
    } else {
        console.log(`❌ Se encontraron ${problemElements.length} elementos problemáticos`);
    }
    
    return problemElements;
}

// ===== 🔧 FUNCIÓN PARA DEBUG DEL MENÚ =====
function debugMenu() {
    console.log('🔍 DEBUG DEL MENÚ:');
    console.log('nav-toggle:', document.getElementById('nav-toggle'));
    console.log('nav-menu:', document.getElementById('nav-menu'));
    console.log('Ancho de pantalla:', window.innerWidth);
    console.log('Menú activo:', document.getElementById('nav-menu')?.classList.contains('active'));
    console.log('CSS aplicado al toggle:', getComputedStyle(document.getElementById('nav-toggle')).display);
    console.log('CSS aplicado al menu:', getComputedStyle(document.getElementById('nav-menu')).transform);
}

// ===== NAVBAR AUTH =====
async function renderAuthNavbar() {
    const nav = document.getElementById('navbar-actions');
    if (!nav) return;
    const toggleBtn = document.getElementById('nav-toggle');
    const toggleHtml = toggleBtn ? toggleBtn.outerHTML : '<button class="nav-toggle" id="nav-toggle" aria-label="Abrir menú"><i class="fas fa-bars"></i></button>';

    let currentUser = null;
    const token = localStorage.getItem('authToken');

    try {
        const stored = localStorage.getItem('currentUser');
        if (stored) currentUser = JSON.parse(stored);
    } catch(e) {}

    // 1. Mostrar skeleton loader inmediatamente si hay un token que validar
    if (token) {
        nav.innerHTML = `
            <div style="display:flex; align-items:center; gap:1rem;">
                <div class="skeleton" style="width:30px; height:30px; border-radius:50%; margin:0;"></div>
                <div class="skeleton" style="width:120px; height:38px; border-radius:0.5rem; margin:0;"></div>
            </div>
            ${toggleHtml}
        `;
        
        try {
            const endpoint = (currentUser && currentUser.rol === 'turista') ? '/api/auth/user/profile' : '/api/auth/profile';
            const res = await fetch(endpoint, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                currentUser = data.data && data.data.admin ? data.data.admin : data.data;
                if(currentUser) {
                     localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
            } else {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                currentUser = null;
            }
        } catch (e) {
            console.error('Error validating session:', e);
            // Fallback a currentUser si falló la red
        }
    }

    let buttonHtml = '';
    let notificationsHtml = '';
    
    if (currentUser) {
        // Está logueado
        const nombreMostrar = currentUser.nombre ? currentUser.nombre.split(' ')[0] : 'Usuario';
        const iniciales = (currentUser.nombre?.charAt(0) || '') + (currentUser.apellido?.charAt(0) || '');
        const badgeColor = currentUser.rol === 'super-admin' ? '#ec4899' :
                           currentUser.rol === 'admin-turismo' ? '#0d9488' :
                           currentUser.rol === 'admin' ? '#10b981' : 'var(--primary)';
        
        let rolDisplay = currentUser.rol || '';
        if (rolDisplay === 'super-admin') rolDisplay = 'Super Admin';
        else if (rolDisplay === 'admin-turismo') rolDisplay = 'Admin Turismo';
        else if (rolDisplay === 'admin') rolDisplay = 'Administrador';
        else if (rolDisplay === 'turista') rolDisplay = 'Turista';

        let links = '';
        if (currentUser.rol === 'turista') {
            links = `
                <a href="/user-panel.html" class="profile-dropdown-link"><i class="fas fa-th-large"></i> Mi Panel</a>
                <a href="/user-panel.html#favoritos" class="profile-dropdown-link"><i class="fas fa-heart"></i> Mis Favoritos</a>
                <a href="/user-panel.html#opiniones" class="profile-dropdown-link"><i class="fas fa-star"></i> Mis Opiniones</a>
            `;
        } else if (currentUser.rol === 'super-admin') {
            links = `<a href="/super-admin.html" class="profile-dropdown-link"><i class="fas fa-crown"></i> Panel Super Admin</a>`;
        } else if (currentUser.rol === 'admin-turismo') {
            links = `<a href="/admin-turismo.html" class="profile-dropdown-link"><i class="fas fa-compass"></i> Panel Turismo</a>`;
        } else {
            links = `<a href="/admin.html" class="profile-dropdown-link"><i class="fas fa-cog"></i> Panel Admin</a>`;
        }

        notificationsHtml = `
            <div class="notifications-wrapper profile-menu-container" style="margin-right:0.5rem; display:flex; align-items:center;">
                <button class="notification-btn" id="nav-notification-btn" title="Notificaciones" style="background:none;border:none;color:var(--gray-600);font-size:1.2rem;cursor:pointer;position:relative;padding:0.4rem;transition:all 0.2s;" onclick="document.getElementById('nav-notifications-dropdown').classList.toggle('show'); event.stopPropagation();">
                    <i class="fas fa-bell"></i>
                    <span id="nav-notification-badge" style="display:none;position:absolute;top:-2px;right:-2px;background:var(--error);color:white;font-size:0.6rem;padding:0.15rem 0.35rem;border-radius:50%;font-weight:bold; border:2px solid white;">0</span>
                </button>
                <div class="profile-dropdown" id="nav-notifications-dropdown" style="right:-10px; width:280px; transform-origin: top right;">
                    <div class="profile-dropdown-header" style="justify-content:space-between; padding:1rem;">
                        <span style="font-weight:600; font-size:0.95rem; color:var(--gray-800);">Notificaciones</span>
                        <span style="font-size:0.75rem; color:var(--primary); cursor:pointer; font-weight:500;">Marcar leídas</span>
                    </div>
                    <div class="profile-dropdown-body" id="nav-notifications-list" style="max-height:300px; overflow-y:auto; padding:0;">
                        <div style="padding:2rem 1rem; text-align:center; color:var(--gray-500); font-size:0.85rem;">
                            <i class="far fa-bell-slash" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.5; display:block;"></i>
                            No tienes notificaciones nuevas
                        </div>
                    </div>
                </div>
            </div>
        `;

        buttonHtml = `
            <div class="profile-menu-container">
                <button class="profile-menu-btn" style="background-color: ${badgeColor};" onclick="document.getElementById('profile-dropdown-main').classList.toggle('show'); event.stopPropagation();">
                    <i class="fas fa-user-circle"></i> <span class="mobile-hide">${nombreMostrar}</span> <i class="fas fa-chevron-down" style="font-size: 0.8em; margin-left: 4px;"></i>
                </button>
                <div class="profile-dropdown" id="profile-dropdown-main">
                    <div class="profile-dropdown-header">
                        <div class="profile-avatar" style="background-color: ${badgeColor};">${iniciales || '<i class="fas fa-user"></i>'}</div>
                        <div class="profile-info">
                            <div class="profile-name">${currentUser.nombre} ${currentUser.apellido || ''}</div>
                            <div class="profile-role">${rolDisplay}</div>
                        </div>
                    </div>
                    <div class="profile-dropdown-body">
                        ${links}
                        <div class="dropdown-divider"></div>
                        <a href="#" onclick="if(window.AuthManager){ new AuthManager().handleLogout() } else { window.location.href='/login.html'; localStorage.clear(); }; return false;" class="profile-dropdown-link text-danger"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
                    </div>
                </div>
            </div>
        `;
    } else {
        // No está logueado
        buttonHtml = `
            <a href="/login.html" class="btn-login"><i class="fas fa-user-circle"></i> Iniciar Sesión</a>
        `;
    }

    nav.innerHTML = `
        <div style="display:flex; align-items:center;">
            ${notificationsHtml}
            ${buttonHtml}
        </div>
        ${toggleHtml}
    `;
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('profile-dropdown-main');
        const container = event.target.closest('.profile-menu-container');
        if (dropdown && dropdown.classList.contains('show') && !container) {
            dropdown.classList.remove('show');
        }
    });

    // Reiniciar event listeners para el botón hamburguesa porque lo reemplazamos
    setupMobileMenu();
}
