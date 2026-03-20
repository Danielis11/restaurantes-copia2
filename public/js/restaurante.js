// ===== restaurante.js =====
// Página de detalle individual de un restaurante

// Safe getL fallback if i18n.js hasn't loaded yet — handles deeply nested bilingual objects
if (typeof window.getL !== 'function') {
    window.getL = function(obj) {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        const lang = localStorage.getItem('appLang') || 'es';
        let val = obj[lang] || obj['es'] || obj['en'] || '';
        // Recursively unwrap deeply nested objects like {es: {es: {es: "text"}}}
        for (let i = 0; i < 10 && typeof val === 'object' && val !== null; i++) {
            val = val[lang] || val['es'] || val['en'] || '';
        }
        return typeof val === 'string' ? val : '';
    };
}
const getL = window.getL;
let restaurantData = null;
let currentEditSection = null;
let isAdmin = false;
let currentGalleryIndex = 0;

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABELS = {
    lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
};
const DIAS_LABELS_EN = {
    lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday', jueves: 'Thursday', 
    viernes: 'Friday', sabado: 'Saturday', domingo: 'Sunday'
};
const DIAS_LABELS_FR = {
    lunes: 'Lundi', martes: 'Mardi', miercoles: 'Mercredi', jueves: 'Jeudi', 
    viernes: 'Vendredi', sabado: 'Samedi', domingo: 'Dimanche'
};

const TYPE_ICONS = {
    restaurante: 'fas fa-utensils',
    bar: 'fas fa-cocktail',
    cafeteria: 'fas fa-coffee',
    'comida-rapida': 'fas fa-hamburger',
    panaderia: 'fas fa-bread-slice',
    otro: 'fas fa-store'
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
        showError();
        return;
    }

    await loadRestaurant(id);
});

// Verifica si el admin autenticado es propietario de ESTE restaurante
async function checkAdminOwnership(restaurantId) {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const res = await fetch('/api/restaurants/my-restaurant', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return false;

        const data = await res.json();
        if (!data.success || !data.data) return false;

        const myRestaurant = data.data.restaurant || data.data;
        const myId = myRestaurant._id || myRestaurant.id;

        // Solo es admin de ESTE restaurante si el ID coincide
        return myId && myId.toString() === restaurantId.toString();
    } catch (err) {
        return false;
    }
}

// ===== CARGA DE DATOS =====
async function loadRestaurant(id) {
    try {
        const lang = localStorage.getItem('appLang') || 'es';
        const res = await fetch(`/api/restaurants/${id}?lang=${lang}`);
        if (!res.ok) throw new Error('No encontrado');
        const data = await res.json();

        if (!data.success || !data.data) throw new Error('Sin datos');

        restaurantData = data.data.restaurant || data.data;

        // Registrar vista del perfil (fire and forget)
        fetch(`/api/restaurants/${id}/view`, { method: 'POST' }).catch(err => console.error('Error registrando vista:', err));

        // Verificar si el admin autenticado es propietario de este restaurante
        isAdmin = await checkAdminOwnership(id);

        renderPage();
    } catch (err) {
        console.error('Error cargando restaurante:', err);
        showError();
    }
}

// ===== RENDERIZADO PRINCIPAL =====
function renderPage() {
    const r = restaurantData;

    // Título de la pestaña
    document.getElementById('page-title').textContent = `${r.nombre} - Jalpan de Serra`;

    // Open Graph / Twitter Card meta tags dinámicos
    const ogTitle = `${r.nombre} - Restaurante en Jalpan de Serra`;
    const ogDesc = (getL(r.descripcion) || 'Descubre este restaurante en Jalpan de Serra').substring(0, 160);
    const ogImage = (r.imagenes && r.imagenes.length > 0) ? r.imagenes[0].url : '';
    const ogUrl = window.location.href;

    const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
    setMeta('og-title', ogTitle);
    setMeta('og-description', ogDesc);
    if (ogImage) { setMeta('og-image', ogImage); setMeta('tw-image', ogImage); }
    setMeta('og-url', ogUrl);
    setMeta('tw-title', ogTitle);
    setMeta('tw-description', ogDesc);

    // Hero
    renderHero(r);

    // Descripción
    const lang = localStorage.getItem('appLang') || 'es';
    const noDescLabel = lang === 'en' ? 'No description available.' : lang === 'fr' ? 'Aucune description disponible.' : 'Sin descripción disponible.';
    document.getElementById('desc-text').textContent = getL(r.descripcion) || noDescLabel;

    // Horarios
    renderHorarios(r.horarios);

    // Menú
    if (r.menu && r.menu.length > 0) {
        renderMenu(r.menu);
        document.getElementById('menu-card').style.display = 'block';
    }

    // Galería
    if (r.imagenes && r.imagenes.length > 0) {
        renderGallery(r.imagenes);
        document.getElementById('gallery-card').style.display = 'block';
    }

    // Info Adicional
    renderInfoAdicional(r);

    // Promociones
    renderPromociones(r.promociones);

    // Contacto
    renderContacto(r);

    // Dirección
    renderDireccion(r.direccion);

    // Mini Mapa
    renderMiniMap(r.direccion);

    // Redes sociales
    if (r.redes && Object.values(r.redes).some(v => v)) {
        renderRedes(r.redes);
        document.getElementById('redes-card').style.display = 'block';
    }

    // Panel admin: solo si este restaurante le pertenece al admin autenticado
    if (isAdmin) {
        document.getElementById('admin-panel').classList.add('visible');
    }
    
    // Renderizar Navbar dependiendo de la sesión actual
    renderAuthNavbar();
    
    // Inicializar el botón de Favoritos
    initFavoriteButton();

    // Mostrar contenido
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('restaurant-content').style.display = 'block';

    // Cargar widgets de reseñas (Elfsight / Trustmary)
    initReviewWidgets();
}

// ===== HERO =====
function renderHero(r) {
    // Badge tipo
    const icon = TYPE_ICONS[r.tipo] || 'fas fa-store';
    document.getElementById('hero-badge').innerHTML = `<i class="${icon}"></i> <span>${capitalizeFirst(r.tipo)}</span>`;
    document.getElementById('hero-name').textContent = r.nombre;
    document.getElementById('hero-ciudad').textContent = r.direccion?.ciudad || 'Jalpan de Serra';
    document.getElementById('hero-telefono').textContent = formatPhone(r.telefono);

    // Estado abierto/cerrado
    const statusEl = document.getElementById('hero-status');
    const abierto = estaAbiertoAhora(r.horarios);
    statusEl.innerHTML = abierto
        ? `<span class="status-badge open"><i class="fas fa-circle" style="font-size:0.5rem;"></i> Abierto ahora</span>`
        : `<span class="status-badge closed"><i class="fas fa-circle" style="font-size:0.5rem;"></i> Cerrado</span>`;

    // Imágenes en hero
    if (r.imagenes && r.imagenes.length > 0) {
        const gallery = document.getElementById('hero-gallery');
        const placeholder = document.getElementById('hero-placeholder');
        placeholder.style.display = 'none';

        // 1. Fondo borroso (misma imagen, estirada y desenfocada)
        const imgBg = document.createElement('img');
        imgBg.className = 'hero-img-bg';
        imgBg.src = r.imagenes[0].url;
        imgBg.alt = '';
        imgBg.setAttribute('aria-hidden', 'true');
        gallery.insertBefore(imgBg, gallery.firstChild);

        // 2. Imagen principal (resolución real, sin recorte)
        const img = document.createElement('img');
        img.className = 'hero-img';
        img.src = r.imagenes[0].url;
        img.alt = r.nombre;
        img.onerror = () => { placeholder.style.display = 'flex'; img.remove(); imgBg.remove(); };
        gallery.insertBefore(img, gallery.children[1]); // después del fondo

        // Función para cambiar imagen con transición suave
        function changeHeroImage(url) {
            img.style.opacity = '0';
            imgBg.style.opacity = '0';
            setTimeout(() => {
                img.src = url;
                imgBg.src = url;
                img.style.opacity = '1';
                imgBg.style.opacity = '1';
            }, 250);
        }

        // Miniaturas y swiping
        if (r.imagenes.length > 1) {
            let currentHeroIndex = 0;
            let touchStartX = 0;
            let touchEndX = 0;

            gallery.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            gallery.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX - 40) { // Swipe left (next image)
                    currentHeroIndex = (currentHeroIndex + 1) % r.imagenes.length;
                    changeHeroImage(r.imagenes[currentHeroIndex].url);
                    updateThumbnails();
                }
                if (touchEndX > touchStartX + 40) { // Swipe right (prev image)
                    currentHeroIndex = (currentHeroIndex - 1 + r.imagenes.length) % r.imagenes.length;
                    changeHeroImage(r.imagenes[currentHeroIndex].url);
                    updateThumbnails();
                }
            }, { passive: true });

            function updateThumbnails() {
                document.querySelectorAll('.hero-thumb').forEach((t, i) => {
                    t.classList.toggle('active', i === currentHeroIndex);
                });
            }

            const thumbsContainer = document.getElementById('hero-thumbnails');
            r.imagenes.slice(0, 5).forEach((imagen, i) => {
                const thumb = document.createElement('div');
                thumb.className = `hero-thumb ${i === 0 ? 'active' : ''}`;
                thumb.innerHTML = `<img src="${imagen.url}" alt="">`;
                thumb.addEventListener('click', () => {
                    currentHeroIndex = i;
                    changeHeroImage(imagen.url);
                    updateThumbnails();
                });
                thumbsContainer.appendChild(thumb);
            });
        }
    }
}

// ===== HORARIOS =====
function renderHorarios(horarios) {
    const grid = document.getElementById('horarios-grid');
    const lang = localStorage.getItem('appLang') || 'es';
    const noHoursLabel = lang === 'en' ? 'No hours registered' : lang === 'fr' ? 'Aucun horaire enregistré' : 'Sin horarios registrados';
    
    if (!horarios) {
        grid.innerHTML = `<p class="empty-section"><i class="fas fa-clock"></i><br>${noHoursLabel}</p>`;
        return;
    }

    const hoy = DIAS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

    grid.innerHTML = DIAS.map(dia => {
        const h = horarios[dia];
        const isHoy = dia === hoy;
        const diaLabel = lang === 'en' ? DIAS_LABELS_EN[dia] : lang === 'fr' ? DIAS_LABELS_FR[dia] : DIAS_LABELS[dia];
        const hoyTag = lang === 'en' ? 'Today' : lang === 'fr' ? 'Aujourd\'hui' : 'Hoy';
        const cerradoTag = lang === 'en' ? 'Closed' : lang === 'fr' ? 'Fermé' : 'Cerrado';
        return `
            <div class="horario-row ${isHoy ? 'today' : ''}">
                <span class="horario-dia ${isHoy ? 'today-label' : ''}">
                    ${diaLabel}
                    ${isHoy ? `<span class="today-tag">${hoyTag}</span>` : ''}
                </span>
                ${h && h.abierto
                    ? `<span class="horario-horas">${h.apertura || '09:00'} – ${h.cierre || '22:00'}</span>`
                    : `<span class="horario-cerrado">${cerradoTag}</span>`
                }
            </div>
        `;
    }).join('');
}

// ===== INFORMACIÓN ADICIONAL =====
function renderInfoAdicional(r) {
    const infoCard = document.getElementById('info-adicional-card');
    const infoBody = document.getElementById('info-adicional-body');
    
    if (!infoCard || !infoBody) return;
    
    let html = '';
    let hasInfo = false;
    
    if (r.tipoComida) {
        hasInfo = true;
        html += `
            <div class="contact-item">
                <div class="contact-icon"><i class="fas fa-utensils"></i></div>
                <div>
                    <div class="contact-label">Especialidad</div>
                    <div class="contact-value">${r.tipoComida}</div>
                </div>
            </div>
        `;
    }
    
    if (r.precioPromedio && r.precioPromedio > 0) {
        hasInfo = true;
        html += `
            <div class="contact-item">
                <div class="contact-icon"><i class="fas fa-money-bill-wave" style="color:var(--success)"></i></div>
                <div>
                    <div class="contact-label">Precio Promedio</div>
                    <div class="contact-value">$${r.precioPromedio} MXN</div>
                </div>
            </div>
        `;
    }
    
    if (r.opcionesPago) {
        hasInfo = true;
        const pagos = r.opcionesPago;
        const metodos = [];
        if (pagos.efectivo !== false) metodos.push('<i class="fas fa-coins" title="Efectivo"></i> Efectivo');
        if (pagos.tarjeta) metodos.push('<i class="fas fa-credit-card" title="Tarjeta"></i> Tarjeta');
        if (pagos.transferencia) metodos.push('<i class="fas fa-exchange-alt" title="Transferencia"></i> Transf.');
        
        if (metodos.length > 0) {
            html += `
                <div class="contact-item">
                    <div class="contact-icon"><i class="fas fa-wallet" style="color:#8b5cf6"></i></div>
                    <div>
                        <div class="contact-label">Opciones de Pago</div>
                        <div class="contact-value" style="display:flex; flex-wrap:wrap; gap:0.5rem; font-size:0.8rem;">
                            ${metodos.join(' | ')}
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    if (r.servicios) {
        hasInfo = true;
        const srv = [];
        if(r.servicios.petFriendly) srv.push('<i class="fas fa-paw" title="Pet Friendly"></i> Pet Friendly');
        if(r.servicios.estacionamiento) srv.push('<i class="fas fa-parking" title="Estacionamiento"></i> Estacionamiento');
        if(r.servicios.musicaEnVivo) srv.push('<i class="fas fa-music" title="Música en Vivo"></i> Música en Vivo');
        if(r.servicios.opcionesVeganas) srv.push('<i class="fas fa-leaf" title="Opción Vegana" style="color:var(--success)"></i> Vegano');
        if(r.servicios.areaInfantil) srv.push('<i class="fas fa-child" title="Área Infantil"></i> Área Infantil');
        if(r.servicios.wifiGratis) srv.push('<i class="fas fa-wifi" title="WiFi Gratis"></i> WiFi');
        
        if (srv.length > 0) {
            html += `
                <div class="contact-item">
                    <div class="contact-icon"><i class="fas fa-concierge-bell" style="color:var(--primary)"></i></div>
                    <div>
                        <div class="contact-label">Servicios</div>
                        <div class="contact-value" style="display:flex; flex-wrap:wrap; gap:0.5rem; font-size:0.8rem;">
                            ${srv.join(' | ')}
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    if (hasInfo) {
        infoBody.innerHTML = html;
        infoCard.style.display = 'block';
    } else {
        infoCard.style.display = 'none';
    }
}

// ===== MENÚ =====
function renderMenu(menu) {
    const body = document.getElementById('menu-body');
    body.innerHTML = menu.map((cat, cIdx) => `
        <div class="menu-category">
            <div class="menu-category-title">${getL(cat.categoria)}</div>
            <div class="menu-items-list">
                ${(cat.items || []).map((item, iIdx) => `
                    <div class="menu-item">
                        ${item.imagen 
                           ? `<img src="${item.imagen.url}" class="menu-item-img" alt="${getL(item.nombre)}" style="cursor: pointer; transition: transform 0.2s;" onclick="openMenuLightbox(${cIdx}, ${iIdx})" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">`
                           : `<div class="menu-item-img" style="display:flex; align-items:center; justify-content:center; color:var(--gray-400); font-size:3rem; background: var(--gray-100);"><i class="fas fa-utensils"></i></div>`
                        }
                        <div class="menu-item-content">
                            <div class="menu-item-header">
                                <div class="menu-item-name">
                                    ${getL(item.nombre)}
                                    ${item.esEspecialidad ? `<span style="font-size:0.65rem; background:#fef3c7; color:#d97706; padding:0.15rem 0.5rem; border-radius:999px; vertical-align:middle; margin-left:0.4rem; white-space:nowrap; border:1px solid #fde68a;"><i class="fas fa-star" style="margin-right:2px;"></i> Especialidad</span>` : ''}
                                </div>
                                <div class="menu-item-price">$${Number(item.precio).toFixed(2)}</div>
                            </div>
                            ${item.descripcion ? `<div class="menu-item-desc">${getL(item.descripcion)}</div>` : `<div class="menu-item-desc"></div>`}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ===== GALERÍA =====
function renderGallery(imagenes) {
    const grid = document.getElementById('gallery-grid');
    const count = document.getElementById('gallery-count');
    count.textContent = `${imagenes.length} foto${imagenes.length !== 1 ? 's' : ''}`;

    grid.innerHTML = imagenes.map((img, i) => `
        <div class="gallery-item" onclick="openLightbox(${i})">
            <img src="${img.url}" alt="Foto ${i + 1}" loading="lazy"
                 onerror="this.parentElement.style.display='none'">
        </div>
    `).join('');
}

// ===== CONTACTO =====
function renderContacto(r) {
    const body = document.getElementById('contacto-body');
    const lang = localStorage.getItem('appLang') || 'es';
    
    const phoneLabel = lang === 'en' ? 'Phone' : lang === 'fr' ? 'Téléphone' : 'Teléfono';
    const photosLabel = lang === 'en' ? 'Photos' : lang === 'fr' ? 'Photos' : 'Fotos';
    const imgLabel = lang === 'en' ? 'image(s)' : lang === 'fr' ? 'image(s)' : 'imagen(es)';
    const statusLabel = lang === 'en' ? 'Status' : lang === 'fr' ? 'Statut' : 'Estado';
    const activeLabel = lang === 'en' ? '✓ Active' : lang === 'fr' ? '✓ Actif' : '✓ Activo';
    const inactiveLabel = lang === 'en' ? '✗ Inactive' : lang === 'fr' ? '✗ Inactif' : '✗ Inactivo';
    
    body.innerHTML = `
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-phone"></i></div>
            <div>
                <div class="contact-label">${phoneLabel}</div>
                <div class="contact-value">
                    <a href="tel:${r.telefono}">${formatPhone(r.telefono)}</a>
                </div>
            </div>
        </div>
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-envelope"></i></div>
            <div>
                <div class="contact-label">Email</div>
                <div class="contact-value">
                    <a href="mailto:${r.email}">${r.email}</a>
                </div>
            </div>
        </div>
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-images"></i></div>
            <div>
                <div class="contact-label">${photosLabel}</div>
                <div class="contact-value">${r.imagenes?.length || 0} ${imgLabel}</div>
            </div>
        </div>
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-toggle-on"></i></div>
            <div>
                <div class="contact-label">${statusLabel}</div>
                <div class="contact-value" style="color: ${r.activo ? 'var(--success)' : 'var(--error)'}">
                    ${r.activo ? activeLabel : inactiveLabel}
                </div>
            </div>
        </div>
        ${r.whatsappPedidos ? `
        <div class="contact-item">
            <div class="contact-icon" style="color:#25D366; background:rgba(37,211,102,0.1)"><i class="fab fa-whatsapp"></i></div>
            <div>
                <div class="contact-label">${lang === 'en' ? 'WhatsApp' : lang === 'fr' ? 'WhatsApp' : 'Pedidos por WhatsApp'}</div>
                <div class="contact-value">
                    <a href="https://wa.me/${r.whatsappPedidos.replace(/[^0-9]/g, '')}" target="_blank" onclick="registrarClicWhatsapp('${r._id || r.id}')" style="color: #25D366; font-weight:700;">${formatPhone(r.whatsappPedidos)}</a>
                </div>
            </div>
        </div>
        ` : ''}
    `;
}

async function registrarClicWhatsapp(id) {
    if(!id) return;
    try {
        await fetch(`/api/restaurants/${id}/click-whatsapp`, { method: 'POST' });
    } catch(err) {
        console.error('Error registrando clic a WhatsApp:', err);
    }
}

// ===== PROMOCIONES =====
function renderPromociones(promociones) {
    const card = document.getElementById('promotions-card');
    const body = document.getElementById('promotions-body');
    const sidebarCard = document.getElementById('sidebar-promotions-card');
    const sidebarBody = document.getElementById('sidebar-promotions-body');

    if (!promociones || promociones.length === 0) {
        if (card) card.style.display = 'none';
        if (sidebarCard) sidebarCard.style.display = 'none';
        return;
    }

    const now = new Date();
    const activas = promociones.filter(p => {
        if (!p.activa) return false;
        if (p.fechaInicio && new Date(p.fechaInicio) > now) return false;
        if (p.fechaFin) {
            // Set expiration to the end of the day for fechaFin
            const fin = new Date(p.fechaFin);
            fin.setHours(23, 59, 59, 999);
            if (fin < now) return false;
        }
        return true;
    });

    if (activas.length === 0) {
        if (card) card.style.display = 'none';
        if (sidebarCard) sidebarCard.style.display = 'none';
        return;
    }

    // Main column card
    if (card && body) {
        card.style.display = 'block';
        body.innerHTML = activas.map(p => {
            let fechaText = '';
            if (p.fechaFin) {
                fechaText = `<div style="font-size: 0.75rem; color: var(--error); font-weight: 600; margin-top: 0.5rem;"><i class="fas fa-clock"></i> Válido hasta: ${new Date(p.fechaFin).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</div>`;
            }
            return `
                <div style="background: linear-gradient(to right, #fef3c7, #fde68a); border: 1px dashed #f59e0b; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; align-items: start; gap: 1rem;">
                        <div style="flex-shrink: 0; width: 40px; height: 40px; background: #fffbeb; color: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            <i class="fas fa-ticket-alt"></i>
                        </div>
                        <div>
                            <h4 style="color: #b45309; font-weight: 700; margin: 0 0 0.25rem 0; font-size: 1rem;">${getL(p.titulo)}</h4>
                            <p style="color: #92400e; font-size: 0.85rem; margin: 0;">${getL(p.descripcion)}</p>
                            ${fechaText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Sidebar card (below address) with image support
    if (sidebarCard && sidebarBody) {
        sidebarCard.style.display = 'block';
        sidebarBody.innerHTML = activas.map(p => {
            const imgHtml = p.imagen ? `<img src="${p.imagen}" alt="${getL(p.titulo)}" style="width:100%; max-height:160px; object-fit:cover;">` : '';
            let fechaText = '';
            if (p.fechaFin) {
                fechaText = `<div style="font-size: 0.72rem; color: #b91c1c; margin-top: 0.4rem;"><i class="fas fa-clock"></i> Hasta: ${new Date(p.fechaFin).toLocaleDateString('es-MX', {timeZone: 'UTC'})}</div>`;
            }
            return `
                <div style="border-bottom: 1px solid #fde68a;">
                    ${imgHtml}
                    <div style="padding: 0.85rem 1rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
                            <i class="fas fa-tag" style="color: #d97706; font-size: 0.8rem;"></i>
                            <strong style="color: #b45309; font-size: 0.9rem;">${getL(p.titulo)}</strong>
                        </div>
                        <p style="color: #92400e; font-size: 0.82rem; margin: 0; line-height: 1.4;">${getL(p.descripcion)}</p>
                        ${fechaText}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ===== DIRECCIÓN =====
function renderDireccion(dir) {
    const body = document.getElementById('direccion-body');
    const lang = localStorage.getItem('appLang') || 'es';
    const noAddrLabel = lang === 'en' ? 'No address registered' : lang === 'fr' ? 'Aucune adresse enregistrée' : 'Sin dirección registrada';
    
    if (!dir) {
        body.innerHTML = `<p class="empty-section">${noAddrLabel}</p>`;
        return;
    }
    
    const strLabel = lang === 'en' ? 'Street' : lang === 'fr' ? 'Rue' : 'Calle';
    const cityLabel = lang === 'en' ? 'City' : lang === 'fr' ? 'Ville' : 'Ciudad';
    const zipLabel = lang === 'en' ? 'ZIP Code' : lang === 'fr' ? 'Code Postal' : 'Código Postal';
    
    body.innerHTML = `
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-road"></i></div>
            <div>
                <div class="contact-label">${strLabel}</div>
                <div class="contact-value">${dir.calle || '—'}</div>
            </div>
        </div>
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-city"></i></div>
            <div>
                <div class="contact-label">${cityLabel}</div>
                <div class="contact-value">${dir.ciudad || '—'}</div>
            </div>
        </div>
        <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-mail-bulk"></i></div>
            <div>
                <div class="contact-label">${zipLabel}</div>
                <div class="contact-value">${dir.codigoPostal || '—'}</div>
            </div>
        </div>
    `;
}

// ===== MINI MAPA =====
function renderMiniMap(dir) {
    const mapCard = document.getElementById('restaurant-map-card');
    if (!mapCard) return;

    if (!dir || !dir.coordenadas || !dir.coordenadas.lat || !dir.coordenadas.lng) {
        mapCard.style.display = 'none';
        return;
    }

    const lat = dir.coordenadas.lat;
    const lng = dir.coordenadas.lng;

    mapCard.style.display = 'block';

    // Wait for DOM to render before initializing map
    setTimeout(() => {
        mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

        const miniMap = new mapboxgl.Map({
            container: 'restaurant-minimap',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lng, lat],
            zoom: 15,
            interactive: true
        });

        miniMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Color based on restaurant type
        const tipo = restaurantData.tipo ? restaurantData.tipo.toLowerCase() : 'otro';
        let color;
        switch(tipo) {
            case 'restaurante': color = '#f59e0b'; break;
            case 'cafeteria': color = '#06b6d4'; break;
            case 'bar': color = '#8b5cf6'; break;
            case 'comida-rapida': color = '#ef4444'; break;
            case 'panaderia': color = '#d97706'; break;
            case 'obrador-artesanal': color = '#a16207'; break;
            default: color = '#6b7280'; break;
        }

        // Create custom pin marker
        const el = document.createElement('div');
        const pin = document.createElement('div');
        pin.style.cssText = `background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.3); border: 2px solid white;`;
        const icon = document.createElement('i');
        icon.className = 'fas fa-utensils';
        icon.style.cssText = 'color: white; transform: rotate(45deg); font-size: 12px;';
        pin.appendChild(icon);
        el.appendChild(pin);

        new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(miniMap);

        // Resize map when it becomes visible
        miniMap.on('load', () => miniMap.resize());
    }, 300);
}

// ===== REDES SOCIALES =====
function renderRedes(redes) {
    const container = document.getElementById('social-links');
    const lang = localStorage.getItem('appLang') || 'es';
    const links = [];

    const webLabel = lang === 'en' ? 'Website' : lang === 'fr' ? 'Site Web' : 'Sitio web';

    if (redes.facebook) links.push(`<a href="${redes.facebook}" target="_blank" class="social-link-btn facebook"><i class="fab fa-facebook-f"></i> Facebook</a>`);
    if (redes.instagram) links.push(`<a href="${redes.instagram}" target="_blank" class="social-link-btn instagram"><i class="fab fa-instagram"></i> Instagram</a>`);
    if (redes.twitter) links.push(`<a href="${redes.twitter}" target="_blank" class="social-link-btn twitter"><i class="fab fa-twitter"></i> Twitter</a>`);
    if (redes.website) links.push(`<a href="${redes.website}" target="_blank" class="social-link-btn website"><i class="fas fa-globe"></i> ${webLabel}</a>`);

    container.innerHTML = links.join('');
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
    
    if (isAdmin) {
        // Es administrador de este restaurante
        buttonHtml = `
            <span style="font-size:0.8rem; color:var(--gray-500);" class="mobile-hide">
                <i class="fas fa-shield-alt" style="color:var(--primary);"></i> Propietario
            </span>
            <a href="/admin.html" class="btn" style="background-color: var(--primary); color: white; display:flex;align-items:center;gap:0.4rem;padding:0.4rem 0.8rem; border-radius: 0.5rem;" title="Mi Panel">
                <i class="fas fa-tachometer-alt"></i> Panel
            </a>
        `;
    } else if (currentUser) {
        // Está logueado pero no es admin de este restaurante
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
                <button class="notification-btn" id="nav-notification-btn" title="Notificaciones" style="background:none;border:none;color:var(--gray-600);font-size:1.2rem;cursor:pointer;position:relative;padding:0.4rem;transition:all 0.2s;" onclick="document.getElementById('nav-notifications-dropdown-restaurante').classList.toggle('show'); event.stopPropagation();">
                    <i class="fas fa-bell"></i>
                    <span id="nav-notification-badge" style="display:none;position:absolute;top:-2px;right:-2px;background:var(--error);color:white;font-size:0.6rem;padding:0.15rem 0.35rem;border-radius:50%;font-weight:bold; border:2px solid white;">0</span>
                </button>
                <div class="profile-dropdown" id="nav-notifications-dropdown-restaurante" style="right:-10px; width:280px; transform-origin: top right;">
                    <div class="profile-dropdown-header" style="justify-content:space-between; padding:1rem;">
                        <span style="font-weight:600; font-size:0.95rem; color:var(--gray-800);">Notificaciones</span>
                        <span style="font-size:0.75rem; color:var(--primary); cursor:pointer; font-weight:500;">Marcar leídas</span>
                    </div>
                    <div class="profile-dropdown-body" id="nav-notifications-list-restaurante" style="max-height:300px; overflow-y:auto; padding:0;">
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
                <button class="profile-menu-btn" style="background-color: ${badgeColor};" onclick="document.getElementById('profile-dropdown-restaurante').classList.toggle('show'); event.stopPropagation();">
                    <i class="fas fa-user-circle"></i> <span class="mobile-hide">${nombreMostrar}</span> <i class="fas fa-chevron-down" style="font-size: 0.8em; margin-left: 4px;"></i>
                </button>
                <div class="profile-dropdown" id="profile-dropdown-restaurante">
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
        const dropdownProfile = document.getElementById('profile-dropdown-restaurante');
        const dropdownNotif = document.getElementById('nav-notifications-dropdown-restaurante');
        
        const containerProfile = event.target.closest('.profile-menu-container');
        
        if (dropdownProfile && dropdownProfile.classList.contains('show') && (!containerProfile || containerProfile.querySelector('.profile-menu-btn') !== event.target.closest('.profile-menu-btn'))) {
            dropdownProfile.classList.remove('show');
        }
        
        if (dropdownNotif && dropdownNotif.classList.contains('show') && (!containerProfile || containerProfile.querySelector('.notification-btn') !== event.target.closest('.notification-btn'))) {
            dropdownNotif.classList.remove('show');
        }
    });
}

// ===== FAVORITOS =====
let isFavorite = false;

async function initFavoriteButton() {
    const btnFavorite = document.getElementById('btn-favorite');
    const favCheckbox = document.getElementById('favorite-checkbox');
    if (!btnFavorite) return;

    let currentUser = null;
    try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            currentUser = JSON.parse(stored);
        }
    } catch(e) {}

    // Mostrar el botón solo si es turista (o admin/super-admin si queremos que también puedan guardar)
    if (currentUser && currentUser.rol === 'turista') {
        btnFavorite.style.display = 'inline-flex';
        
        // Cargar estado inicial (saber si ya es favorito o no)
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/user/favorites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                // Verificar si el ID del restaurante actual está en el array populado o simple
                const currentId = restaurantData._id || restaurantData.id;
                const restaurantesFavs = data.data.restaurantes || [];
                const found = restaurantesFavs.find(fav => {
                    const favId = typeof fav === 'object' ? (fav._id || fav.id) : fav;
                    return favId.toString() === currentId.toString();
                });
                
                if (found) {
                    isFavorite = true;
                    if (favCheckbox) favCheckbox.checked = true;
                }
            }
        } catch (error) {
            console.error('Error cargando favoritos:', error);
        }

        // Event listener para alternar favorito
        btnFavorite.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent native checkbox checking before API completes
            toggleFavorite();
        });
    }
}

async function toggleFavorite() {
    const btnFavorite = document.getElementById('btn-favorite');
    const favCheckbox = document.getElementById('favorite-checkbox');
    const token = localStorage.getItem('authToken');
    const currentId = restaurantData._id || restaurantData.id;

    if (!token) return;

    // Deshabilitar botón temporalmente para evitar doble click
    btnFavorite.style.pointerEvents = 'none';
    btnFavorite.style.opacity = '0.7';

    try {
        const res = await fetch(`/api/user/favorites/${currentId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            isFavorite = data.isFavorite;
            if (favCheckbox) {
                favCheckbox.checked = isFavorite;
            }
        } else {
            console.error('No se pudo guardar:', data.message);
        }
    } catch (error) {
        console.error('Error al alternar favorito:', error);
    } finally {
        btnFavorite.style.pointerEvents = 'auto';
        btnFavorite.style.opacity = '1';
    }
}

// ===== LIGHTBOX =====
function openLightbox(index) {
    if (!restaurantData?.imagenes) return;
    currentGalleryIndex = index;
    const img = restaurantData.imagenes[index];
    document.getElementById('lightbox-img').src = img.url;
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
});

// Re-renderizar cuando el usuario cambie el idioma
document.addEventListener('languageChanged', () => {
    if (restaurantData) {
        const lang = localStorage.getItem('appLang') || 'es';
        const noDescLabel = lang === 'en' ? 'No description available.' : lang === 'fr' ? 'Aucune description disponible.' : 'Sin descripción disponible.';
        // Re-renderizar los campos traducibles y estáticos que dependen de js
        document.getElementById('desc-text').textContent = getL(restaurantData.descripcion) || noDescLabel;
        if (restaurantData.menu && restaurantData.menu.length > 0) {
            renderMenu(restaurantData.menu);
        }
        if (restaurantData.horarios) {
            renderHorarios(restaurantData.horarios);
        }
        renderContacto(restaurantData);
        if (restaurantData.direccion) {
            renderDireccion(restaurantData.direccion);
        }
        renderInfoAdicional(restaurantData);
        if (restaurantData.redes) {
            renderRedes(restaurantData.redes);
        }
    }
});


// ===== MODALES DE EDICIÓN =====
function openEditModal(section) {
    currentEditSection = section;
    const overlay = document.getElementById('edit-modal-overlay');
    const title = document.getElementById('edit-modal-title');
    const body = document.getElementById('edit-modal-body');

    const titles = {
        info: 'Editar información básica',
        horarios: 'Editar horarios de atención',
        menu: 'Editar menú',
        imagenes: 'Gestionar imágenes',
        redes: 'Editar redes sociales'
    };

    title.textContent = titles[section] || 'Editar';
    body.innerHTML = buildEditForm(section);

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    document.getElementById('edit-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    currentEditSection = null;
}

document.getElementById('edit-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
});

// ===== FORMULARIOS DE EDICIÓN =====
function buildEditForm(section) {
    const r = restaurantData;

    if (section === 'info') {
        const pagos = r.opcionesPago || { efectivo: true, tarjeta: false, transferencia: false };
        return `
            <div class="form-group">
                <label class="form-label">Nombre del establecimiento *</label>
                <input type="text" class="form-input" id="edit-nombre" value="${r.nombre || ''}" placeholder="Nombre">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Tipo de establecimiento *</label>
                    <select class="form-select" id="edit-tipo">
                        ${['restaurante','bar','cafeteria','comida-rapida','panaderia','otro'].map(t =>
                            `<option value="${t}" ${r.tipo === t ? 'selected' : ''}>${capitalizeFirst(t)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Especialidad (Tipo de Comida)</label>
                    <input type="text" class="form-input" id="edit-tipo-comida" value="${r.tipoComida || ''}" placeholder="Ej. Mexicana, Mariscos, Internacional">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción *</label>
                <textarea class="form-textarea" id="edit-descripcion" rows="4" placeholder="Descripción del lugar...">${r.descripcion?.es || r.descripcion || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Teléfono *</label>
                    <input type="tel" class="form-input" id="edit-telefono" value="${r.telefono || ''}" placeholder="Ej: 4411234567">
                </div>
                <div class="form-group">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-input" id="edit-email" value="${r.email || ''}" placeholder="correo@ejemplo.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Precio Promedio ($ MXN)</label>
                    <input type="number" class="form-input" id="edit-precio-promedio" value="${r.precioPromedio || 0}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Opciones de Pago</label>
                    <div style="display:flex; gap:1rem; padding-top:0.5rem;">
                        <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="edit-pago-efectivo" ${pagos.efectivo !== false ? 'checked' : ''}> Efectivo
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="edit-pago-tarjeta" ${pagos.tarjeta ? 'checked' : ''}> Tarjeta
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem; cursor:pointer;">
                            <input type="checkbox" id="edit-pago-transfer" ${pagos.transferencia ? 'checked' : ''}> Transf.
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    if (section === 'horarios') {
        const h = r.horarios || {};
        return `
            <p style="font-size:0.85rem; color:var(--gray-500); margin-bottom:1rem;">
                Configura los horarios de apertura y cierre para cada día de la semana.
            </p>
            ${DIAS.map(dia => {
                const d = h[dia] || { abierto: true, apertura: '09:00', cierre: '22:00' };
                return `
                    <div style="display:grid; grid-template-columns:110px 1fr 1fr 80px; gap:0.75rem; align-items:center; margin-bottom:0.75rem; padding:0.5rem; border-radius:var(--radius-md); border:1px solid var(--gray-100);">
                        <label style="font-size:0.88rem; font-weight:600; color:var(--gray-700);">${DIAS_LABELS[dia]}</label>
                        <input type="time" class="form-input" id="h-${dia}-apertura" value="${d.apertura || '09:00'}" ${!d.abierto ? 'disabled' : ''}>
                        <input type="time" class="form-input" id="h-${dia}-cierre" value="${d.cierre || '22:00'}" ${!d.abierto ? 'disabled' : ''}>
                        <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.8rem; cursor:pointer;">
                            <input type="checkbox" id="h-${dia}-abierto" ${d.abierto ? 'checked' : ''}
                                onchange="toggleDiaHorario('${dia}', this.checked)">
                            Abierto
                        </label>
                    </div>
                `;
            }).join('')}
        `;
    }

    if (section === 'menu') {
        const menu = r.menu || [];
        return `
            <p style="font-size:0.85rem; color:var(--gray-500); margin-bottom:1rem;">
                Agrega categorías y platillos a tu menú.
            </p>
            <div id="menu-editor">
                ${menu.map((cat, ci) => buildMenuCategoryEditor(cat, ci)).join('')}
            </div>
            <button type="button" class="btn btn-secondary" style="width:100%; margin-top:1rem;" onclick="addMenuCategory()">
                <i class="fas fa-plus"></i> Agregar categoría
            </button>
        `;
    }

    if (section === 'imagenes') {
        const imgs = r.imagenes || [];
        return `
            <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-input').click()"
                 ondragover="event.preventDefault(); this.classList.add('dragover')"
                 ondragleave="this.classList.remove('dragover')"
                 ondrop="handleDrop(event)">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Arrastra imágenes aquí o <span>haz clic para seleccionar</span></p>
                <p style="font-size:0.78rem; margin-top:0.25rem;">JPG, PNG, WebP · Máx. 5MB por imagen</p>
            </div>
            <input type="file" id="file-input" accept="image/*" multiple style="display:none" onchange="handleFileSelect(this.files)">
            
            ${imgs.length > 0 ? `
                <div style="margin-top:1.25rem;">
                    <p style="font-size:0.85rem; font-weight:600; color:var(--gray-700); margin-bottom:0.75rem;">
                        Imágenes actuales (${imgs.length})
                    </p>
                    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem;" id="current-images">
                        ${imgs.map((img, i) => `
                            <div style="position:relative; aspect-ratio:1; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--gray-200);">
                                <img src="${img.url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'">
                                <button onclick="deleteImage('${img._id}', this)" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:0.7rem; display:flex; align-items:center; justify-content:center;">
                                    <i class="fas fa-times"></i>
                                </button>
                                ${i === 0 ? '<span style="position:absolute; bottom:4px; left:4px; background:var(--primary); color:white; font-size:0.65rem; padding:2px 6px; border-radius:999px; font-weight:600;">Principal</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            <div id="upload-preview" style="margin-top:1rem; display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem;"></div>
        `;
    }

    if (section === 'redes') {
        const redes = r.redes || {};
        return `
            <div class="form-group">
                <label class="form-label"><i class="fab fa-facebook-f" style="color:#1877f2;"></i> Facebook</label>
                <input type="url" class="form-input" id="edit-facebook" value="${redes.facebook || ''}" placeholder="https://facebook.com/tu-pagina">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fab fa-instagram" style="color:#e1306c;"></i> Instagram</label>
                <input type="url" class="form-input" id="edit-instagram" value="${redes.instagram || ''}" placeholder="https://instagram.com/tu-cuenta">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fab fa-twitter" style="color:#1da1f2;"></i> Twitter</label>
                <input type="url" class="form-input" id="edit-twitter" value="${redes.twitter || ''}" placeholder="https://twitter.com/tu-cuenta">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-globe" style="color:var(--primary);"></i> Sitio web</label>
                <input type="url" class="form-input" id="edit-website" value="${redes.website || ''}" placeholder="https://tu-sitio.com">
            </div>
        `;
    }

    return '<p>Sección no disponible</p>';
}

function buildMenuCategoryEditor(cat, ci) {
    return `
        <div class="menu-category-editor" data-cat="${ci}" style="border:1px solid var(--gray-200); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.75rem;">
            <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
                <input type="text" class="form-input" placeholder="Nombre de categoría (ej: Entradas)" value="${cat.categoria || ''}" data-field="categoria">
                <button type="button" onclick="removeCat(this)" style="background:none; border:none; color:var(--error); cursor:pointer; padding:0 0.5rem; font-size:1rem;"><i class="fas fa-trash"></i></button>
            </div>
            <div class="items-editor">
                ${(cat.items || []).map((item, ii) => buildMenuItemEditor(item, ii)).join('')}
            </div>
            <button type="button" onclick="addMenuItem(this)" class="btn btn-secondary btn-sm" style="margin-top:0.5rem;">
                <i class="fas fa-plus"></i> Agregar platillo
            </button>
        </div>
    `;
}

function buildMenuItemEditor(item, ii) {
    return `
        <div class="menu-item-editor" style="display:grid; grid-template-columns:1fr 1fr 80px 30px; gap:0.4rem; margin-bottom:0.4rem; align-items:center;">
            <input type="text" class="form-input" placeholder="Nombre" value="${item.nombre || ''}" data-field="nombre" style="font-size:0.82rem; padding:0.4rem 0.6rem;">
            <input type="text" class="form-input" placeholder="Descripción" value="${item.descripcion || ''}" data-field="descripcion" style="font-size:0.82rem; padding:0.4rem 0.6rem;">
            <input type="number" class="form-input" placeholder="Precio" value="${item.precio || ''}" data-field="precio" min="0" step="0.5" style="font-size:0.82rem; padding:0.4rem 0.6rem;">
            <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--error); cursor:pointer;"><i class="fas fa-times"></i></button>
        </div>
    `;
}

function addMenuCategory() {
    const editor = document.getElementById('menu-editor');
    const ci = editor.children.length;
    const div = document.createElement('div');
    div.innerHTML = buildMenuCategoryEditor({ categoria: '', items: [] }, ci);
    editor.appendChild(div.firstElementChild);
}

function addMenuItem(btn) {
    const itemsEditor = btn.previousElementSibling;
    const div = document.createElement('div');
    div.innerHTML = buildMenuItemEditor({}, 0);
    itemsEditor.appendChild(div.firstElementChild);
}

function removeCat(btn) {
    btn.closest('.menu-category-editor').remove();
}

function toggleDiaHorario(dia, abierto) {
    const ap = document.getElementById(`h-${dia}-apertura`);
    const ci = document.getElementById(`h-${dia}-cierre`);
    if (ap) ap.disabled = !abierto;
    if (ci) ci.disabled = !abierto;
}

// ===== SUBIDA DE IMÁGENES =====
function handleFileSelect(files) {
    uploadImages(Array.from(files));
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-zone').classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    uploadImages(files);
}

async function uploadImages(files) {
    if (!files.length) return;

    const preview = document.getElementById('upload-preview');
    const token = localStorage.getItem('authToken');

    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            alert(`"${file.name}" supera los 5MB.`);
            continue;
        }

        // Preview local
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.style.cssText = 'position:relative; aspect-ratio:1; border-radius:var(--radius-md); overflow:hidden; border:2px solid var(--primary);';
            div.innerHTML = `
                <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; inset:0; background:rgba(37,99,235,0.3); display:flex; align-items:center; justify-content:center;">
                    <div style="width:24px; height:24px; border:2px solid white; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
                </div>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);

        // Subir al servidor
        try {
            const formData = new FormData();
            formData.append('images', file);

            const res = await fetch(`/api/restaurants/images/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Recargar datos del restaurante
                    await loadRestaurant(restaurantData._id);
                }
            }
        } catch (err) {
            console.error('Error subiendo imagen:', err);
        }
    }

    // Recargar después de subir
    setTimeout(() => {
        closeEditModal();
        loadRestaurant(restaurantData._id);
    }, 1500);
}

async function deleteImage(imageId, btn) {
    if (!confirm('¿Eliminar esta imagen?')) return;

    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/restaurants/images/${imageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            btn.closest('div[style]').remove();
            restaurantData.imagenes = restaurantData.imagenes.filter(i => i._id !== imageId);
        } else {
            alert('Error al eliminar la imagen');
        }
    } catch (err) {
        alert('Error de conexión');
    }
}

// ===== GUARDAR CAMBIOS =====
async function saveChanges() {
    const token = localStorage.getItem('authToken');
    const id = restaurantData._id;
    const saveBtn = document.getElementById('save-btn');

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        let endpoint = '';
        let body = {};

        if (currentEditSection === 'info') {
            endpoint = `/api/restaurants/my-restaurant/basic-info`;
            body = {
                nombre: document.getElementById('edit-nombre').value.trim(),
                tipo: document.getElementById('edit-tipo').value,
                descripcion: document.getElementById('edit-descripcion').value.trim(),
                telefono: document.getElementById('edit-telefono').value.trim(),
                email: document.getElementById('edit-email').value.trim(),
                tipoComida: document.getElementById('edit-tipo-comida')?.value.trim() || '',
                precioPromedio: parseFloat(document.getElementById('edit-precio-promedio')?.value) || 0,
                opcionesPago: {
                    efectivo: document.getElementById('edit-pago-efectivo')?.checked ?? true,
                    tarjeta: document.getElementById('edit-pago-tarjeta')?.checked ?? false,
                    transferencia: document.getElementById('edit-pago-transfer')?.checked ?? false
                }
            };
        }

        if (currentEditSection === 'horarios') {
            endpoint = `/api/restaurants/my-restaurant/schedule`;
            const horarios = {};
            DIAS.forEach(dia => {
                horarios[dia] = {
                    abierto: document.getElementById(`h-${dia}-abierto`)?.checked || false,
                    apertura: document.getElementById(`h-${dia}-apertura`)?.value || '09:00',
                    cierre: document.getElementById(`h-${dia}-cierre`)?.value || '22:00'
                };
            });
            body = { horarios };
        }

        if (currentEditSection === 'menu') {
            endpoint = `/api/restaurants/my-restaurant/menu`;
            const cats = Array.from(document.querySelectorAll('.menu-category-editor'));
            const menu = cats.map(cat => ({
                categoria: cat.querySelector('[data-field="categoria"]')?.value || '',
                items: Array.from(cat.querySelectorAll('.menu-item-editor')).map(item => ({
                    nombre: item.querySelector('[data-field="nombre"]')?.value || '',
                    descripcion: item.querySelector('[data-field="descripcion"]')?.value || '',
                    precio: parseFloat(item.querySelector('[data-field="precio"]')?.value) || 0
                })).filter(i => i.nombre)
            })).filter(c => c.categoria);
            body = { menu };
        }

        if (currentEditSection === 'redes') {
            endpoint = `/api/restaurants/my-restaurant/social-media`;
            body = {
                redes: {
                    facebook: document.getElementById('edit-facebook')?.value.trim() || '',
                    instagram: document.getElementById('edit-instagram')?.value.trim() || '',
                    twitter: document.getElementById('edit-twitter')?.value.trim() || '',
                    website: document.getElementById('edit-website')?.value.trim() || ''
                }
            };
        }

        if (currentEditSection === 'imagenes') {
            closeEditModal();
            return;
        }

        if (!endpoint) return;

        const res = await fetch(endpoint, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            restaurantData = data.data?.restaurant || data.data || restaurantData;
            closeEditModal();
            renderPage();
            showToast('¡Cambios guardados correctamente!', 'success');
        } else {
            showToast(data.message || 'Error al guardar', 'error');
        }
    } catch (err) {
        console.error('Error guardando:', err);
        showToast('Error de conexión', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
    }
}

// ===== WIDGETS Y FOTOS (Google / Instagram) =====
function initReviewWidgets() {
    loadNativeReviews();
    const r = restaurantData;
    const card = document.getElementById('reviews-widget-card');
    const gbContainer = document.getElementById('google-badge-container');
    const igContainer = document.getElementById('instagram-container');
    const igWrapper = document.getElementById('instagram-wrapper');
    const igPrevBtn = document.getElementById('ig-prev-btn');
    const igNextBtn = document.getElementById('ig-next-btn');
    const separator = document.getElementById('widget-separator');

    if (!card || !r) return;

    let hasGoogleBadge = false;
    let hasIG = false;

    // Google Reviews Badge
    if (r.googleReviewsUrl && r.googleReviewsUrl.trim() !== '') {
        const reviewCount = r.googleReviews?.totalReviews ? `<div style="margin-top: 0.75rem; color: var(--gray-600); font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.3rem;"><i class="fas fa-star" style="color: #f59e0b;"></i> Basado en <strong>${r.googleReviews.totalReviews}</strong> opiniones reales</div>` : '';
        gbContainer.innerHTML = `
            <a href="${r.googleReviewsUrl}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.75rem; background: #fff; border: 2px solid #e2e8f0; border-radius: 2rem; padding: 0.75rem 1.5rem; text-decoration: none; color: #1e293b; font-weight: 500; font-size: 1.05rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: all 0.2s;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Logo" style="width: 24px; height: 24px;">
                Ver opiniones en Google Maps
                <i class="fas fa-external-link-alt" style="color: var(--gray-400); font-size: 0.85rem; margin-left: 0.25rem;"></i>
            </a>
            ${reviewCount}
        `;
        gbContainer.style.display = 'block';
        hasGoogleBadge = true;
    }

    // Instagram: inyectar los blockquotes y cargar el script (en modo carrusel)
    if (r.instagramEmbeds && r.instagramEmbeds.length > 0) {
        // Wrap each embed in a container for the horizontal css carousel
        const processedEmbeds = r.instagramEmbeds.map(embedStr => {
            const trimmed = embedStr.trim();
            // Si el admin pegó solo le enlace, generamos el html
            let embedHtml = trimmed;
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                embedHtml = `<blockquote class="instagram-media" data-instgrm-permalink="${trimmed}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:auto; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"></blockquote>`;
            }
            return `<div class="instagram-carousel-item" style="scroll-snap-align: center; flex: 0 0 auto; width: 330px; max-width: 85vw; min-width: 0; overflow: hidden; display: flex; flex-direction: column;">${embedHtml}</div>`;
        });

        igContainer.innerHTML = processedEmbeds.join('');
        igWrapper.style.display = 'block';
        hasIG = true;

        // Configuramos los botones de scroll
        if (processedEmbeds.length > 2) {
            igPrevBtn.style.display = 'flex';
            igNextBtn.style.display = 'flex';

            igPrevBtn.onclick = () => {
                igContainer.scrollBy({ left: -340, behavior: 'smooth' });
            };
            igNextBtn.onclick = () => {
                igContainer.scrollBy({ left: 340, behavior: 'smooth' });
            };
        }

        // Cargar script de Instagram si no está cargado
        if (!window.instgrm) {
            const script = document.createElement('script');
            script.src = "https://www.instagram.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
        } else {
            // Si ya está, forzar proceso de los nuevos widgets
            window.instgrm.Embeds.process();
        }
    }

    if (hasGoogleBadge && hasIG) {
        separator.style.display = 'block';
    }

    // Solo mostrar la tarjeta si hay al menos un widget
    if (hasGoogleBadge || hasIG) {
        card.style.display = 'block';
    }
}

// ===== UTILIDADES =====
function showError() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPhone(phone) {
    if (!phone) return 'No disponible';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    return phone;
}

function estaAbiertoAhora(horarios) {
    if (!horarios) return false;
    const diasJS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const hoy = diasJS[new Date().getDay()];
    const h = horarios[hoy];
    if (!h || !h.abierto) return false;

    const ahora = new Date();
    const minActual = ahora.getHours() * 60 + ahora.getMinutes();
    const [ah, am] = (h.apertura || '09:00').split(':').map(Number);
    const [ch, cm] = (h.cierre || '22:00').split(':').map(Number);
    return minActual >= ah * 60 + am && minActual <= ch * 60 + cm;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = { success: '#10b981', error: '#ef4444', info: '#2563eb', warning: '#f59e0b' };
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
        background: white; border-left: 4px solid ${colors[type]};
        padding: 1rem 1.5rem; border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        font-size: 0.9rem; font-weight: 500; color: #1f2937;
        transform: translateY(20px); opacity: 0;
        transition: all 0.3s ease; max-width: 350px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 50);
    setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================
// RESEÑAS NATIVAS Y AUTENTICACIÓN TOURISTA
// ==========================================

// Carga las reseñas aprobadas y las renderiza
async function loadNativeReviews() {
    const rId = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('native-reviews-container');
    const summaryEl = document.getElementById('reviews-summary-native');
    if (!rId || !container) return;

    try {
        const res = await fetch(`/api/restaurants/${rId}/reviews`);
        if (!res.ok) throw new Error('Error fetching reviews');
        const data = await res.json();
        const reviews = data.data || [];

        // Renderizar galería de viajeros con las fotos de todas las reseñas
        renderUserGallery(reviews);

        if (reviews.length === 0) {
            if (summaryEl) summaryEl.innerHTML = '<p style="color: var(--gray-500); padding: 1rem 0;">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';
            container.innerHTML = '';
            return;
        }

        // Resumen de calificaciones
        const totalReviews = reviews.length;
        const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews;
        
        // Calcular distribución de estrellas
        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) {
                ratingCounts[Math.floor(r.rating)]++;
            }
        });

        if (summaryEl) {
            summaryEl.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 2rem;">
                        <div style="text-align: left; min-width: 120px;">
                            <div style="font-size: 3rem; font-weight: 700; color: var(--gray-900); line-height: 1;">${avgRating.toFixed(1)}</div>
                            <div style="display: flex; gap: 0.25rem; margin: 0.5rem 0;">
                                ${Array(5).fill(0).map((_, i) => `<i class="fas fa-star" style="color: ${i < avgRating ? '#f59e0b' : '#e5e7eb'}; font-size: 1.125rem;"></i>`).join('')}
                            </div>
                            <p style="color: var(--gray-500); font-size: 0.875rem; margin: 0;">Basado en ${totalReviews} opinion${totalReviews !== 1 ? 'es' : ''}</p>
                        </div>
                        
                        <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 0.875rem; padding: 0 0.5rem;">
                            ${[5, 4, 3, 2, 1].map(stars => {
                                const count = ratingCounts[stars];
                                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                return `
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="display: flex; align-items: center; gap: 0.25rem; width: 45px; justify-content: flex-end;">
                                        <span style="font-size: 0.875rem; font-weight: 500; color: var(--gray-700);">${stars}</span>
                                        <i class="fas fa-star" style="color: #f59e0b; font-size: 0.75rem;"></i>
                                    </div>
                                    <div style="flex: 1; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden;">
                                        <div style="height: 100%; background: #f59e0b; border-radius: 4px; width: ${percentage}%;"></div>
                                    </div>
                                    <span style="font-size: 0.875rem; color: var(--gray-500); width: 28px; text-align: left;">${count}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Renderizar cada reseña
        container.innerHTML = reviews.map(r => {
            const fecha = new Date(r.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
            const userName = r.userId?.nombre || 'Anónimo';
            const userInitial = userName.charAt(0).toUpperCase();

            // Fotos de la reseña (multi-photo)
            let fotosHtml = '';
            if (r.fotos && r.fotos.length > 0) {
                fotosHtml = `
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                        ${r.fotos.map(f => `
                            <img src="${f.url}" alt="Foto de ${userName}"
                                style="width:80px; height:80px; object-fit:cover; border-radius:0.4rem; cursor:pointer; border:1px solid var(--gray-200); transition: transform 0.2s;"
                                onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                                onclick="openPhotoLightbox('${f.url}')">
                        `).join('')}
                    </div>
                `;
            } else if (r.imagenUrl) {
                // Compatibilidad con reseñas antiguas (campo imagenUrl único)
                fotosHtml = `
                    <div style="margin-top:0.75rem;">
                        <img src="${r.imagenUrl}" alt="Foto de ${userName}"
                            style="max-height:200px; border-radius:0.4rem; cursor:pointer; object-fit:cover; max-width:100%; border:1px solid var(--gray-200);"
                            onclick="openPhotoLightbox('${r.imagenUrl}')">
                    </div>
                `;
            }

            // Determinar si el usuario actual ya dio like
            let isLiked = false;
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if (currentUser && r.likedBy && r.likedBy.includes(currentUser._id)) {
                    isLiked = true;
                }
            } catch(e) {}

            // Admin reply button (only if admin and no existing reply)
            let replyBtnHtml = '';
            try {
                const cu = JSON.parse(localStorage.getItem('currentUser'));
                if (cu && (cu.rol === 'admin' || cu.rol === 'admin-turismo' || cu.rol === 'super-admin') && !r.respuestaAdmin) {
                    replyBtnHtml = `
                        <button onclick="toggleReplyForm('${r._id}')" class="btn" style="background: transparent; border: 1px solid var(--gray-200); color: var(--primary); padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.375rem; margin-left: 0.5rem;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='transparent'">
                            <i class="fas fa-reply" style="transform: translateY(-1px);"></i>
                            <span>Responder</span>
                        </button>
                    `;
                }
            } catch(e) {}

            return `
                <div style="padding: 1.5rem; background: white; border: 1px solid var(--gray-200); border-radius: 1rem; position: relative; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'" onmouseout="this.style.boxShadow='none'">
                    ${r.destacada ? '<span style="position: absolute; top: -10px; right: 1.5rem; background: #f59e0b; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);"><i class="fas fa-star" style="font-size: 10px; margin-right: 4px;"></i> Destacada</span>' : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.125rem;">
                                ${userInitial}
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--gray-900);">${userName}</h4>
                                <span style="font-size: 0.8125rem; color: var(--gray-500);">${fecha}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.125rem;">
                            ${Array(5).fill(0).map((_, i) => `<i class="fas fa-star" style="color: ${i < r.rating ? '#f59e0b' : '#e5e7eb'}; font-size: 0.875rem;"></i>`).join('')}
                        </div>
                    </div>
                    
                    <div style="padding-left: 3.5rem;">
                        <p style="color: var(--gray-700); font-size: 0.95rem; margin: 0; line-height: 1.6;">${r.comentario}</p>
                        ${fotosHtml}
                        ${r.respuestaAdmin ? `
                        <div style="margin-top: 1.25rem; padding: 1rem 1.25rem; background: var(--gray-50); border-radius: 0.75rem; border: 1px solid var(--gray-100);">
                            <div style="font-weight: 600; color: var(--gray-900); font-size: 0.875rem; margin-bottom: 0.375rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-reply" style="color: var(--primary);"></i> Respuesta del propietario
                            </div>
                            <p style="color: var(--gray-700); font-size: 0.9rem; line-height: 1.5; margin: 0;">${r.respuestaAdmin}</p>
                        </div>
                        ` : ''}
                        
                        <!-- Reply form (hidden by default) -->
                        <div id="reply-form-${r._id}" style="display: none; margin-top: 1rem; padding: 1rem; background: #f0f4ff; border-radius: 0.75rem; border: 1px solid #dbeafe;">
                            <textarea id="reply-text-${r._id}" placeholder="Escribe tu respuesta como propietario..." maxlength="500" style="width: 100%; min-height: 80px; border: 1px solid var(--gray-200); border-radius: 0.5rem; padding: 0.75rem; font-family: inherit; font-size: 0.9rem; resize: vertical; outline: none;"></textarea>
                            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
                                <button onclick="toggleReplyForm('${r._id}')" style="background: transparent; border: 1px solid var(--gray-200); border-radius: 0.5rem; padding: 0.4rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.85rem; color: var(--gray-600);">Cancelar</button>
                                <button onclick="submitReply('${r._id}')" style="background: var(--primary); color: white; border: none; border-radius: 0.5rem; padding: 0.4rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 600;">Publicar</button>
                            </div>
                        </div>
                        
                        <div style="margin-top: 1.25rem; display: flex; align-items: center;">
                            <button onclick="likeReview('${r._id}', this)" class="btn" style="background: transparent; border: 1px solid ${isLiked ? '#ef4444' : 'var(--gray-200)'}; color: ${isLiked ? '#ef4444' : 'var(--gray-600)'}; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.375rem;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='transparent'">
                                <i class="${isLiked ? 'fas' : 'far'} fa-heart" style="transform: translateY(-1px);"></i>
                                <span>Me gusta (<span id="like-count-${r._id}">${r.likes || 0}</span>)</span>
                            </button>
                            ${replyBtnHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error fetching reviews:', e);
        container.innerHTML = '<p style="color: var(--error); text-align: center;">Error al cargar reseñas.</p>';
    }
}

// Botón Escribir Opinión Global Handler
window.handleEscribirOpinion = function() {
    console.log("handleEscribirOpinion clicked!");
    const token = localStorage.getItem('authToken');
    if (token) {
        openReviewModal();
    } else {
        window.location.href = '/login.html';
    }
};

// Modales de Auth
function openAuthModal() {
    switchAuthTab('login');
    document.getElementById('tourist-auth-modal').classList.add('show');
}
function closeAuthModal() {
    document.getElementById('tourist-auth-modal').classList.remove('show');
}
function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-login').style.borderBottomColor = isLogin ? 'var(--primary)' : 'transparent';
    document.getElementById('tab-login').style.color = isLogin ? 'var(--gray-900)' : 'var(--gray-500)';

    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('tab-register').style.borderBottomColor = !isLogin ? 'var(--primary)' : 'transparent';
    document.getElementById('tab-register').style.color = !isLogin ? 'var(--gray-900)' : 'var(--gray-500)';

    document.getElementById('group-nombre').style.display = isLogin ? 'none' : 'block';
    document.getElementById('tourist-nombre').required = !isLogin;
    document.getElementById('auth-modal-title').textContent = isLogin ? 'Iniciar Sesión' : 'Registrarse';
    document.getElementById('btn-auth-submit').textContent = isLogin ? 'Entrar' : 'Crear Cuenta';
    
    // Save state in dataset for the submit handler
    document.getElementById('tourist-auth-form').dataset.mode = tab;
}

// Form Submission para Auth Turista
async function handleTouristAuth(e) {
    e.preventDefault();
    const mode = e.target.dataset.mode || 'login';
    const email = document.getElementById('tourist-email').value;
    const password = document.getElementById('tourist-password').value;
    const nombre = document.getElementById('tourist-nombre').value;

    const payload = mode === 'login' ? { email, password } : { nombre, email, password };
    const url = mode === 'login' ? '/api/auth/user/login' : '/api/auth/user/register';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.data.user));
            showToast(`Bienvenido, ${data.data.user.nombre}`, 'success');
            renderAuthNavbar(); // Update navbar immediately 
            closeAuthModal();
            // Automatically open review modal since they probably clicked "Escribir Opnion" to get here
            setTimeout(openReviewModal, 300);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

// Interacción de Modales de Reseña (ahora form en línea)
function openReviewModal() {
    // Resetear form de reseña
    document.getElementById('write-review-form').reset();
    selectStar(0); // Resetear estrellas
    window._reviewPhotosFiles = []; // Clear photos array
    const preview = document.getElementById('review-photo-preview-rest');
    if (preview) preview.innerHTML = '';
    
    // Set active user name
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const authorEl = document.getElementById('review-author-name');
        if (user && authorEl) authorEl.textContent = user.nombre || 'Usuario';
    } catch(e){}

    // Toggle forms
    document.getElementById('review-form-container').style.display = 'block';
    const writeBtn = document.getElementById('btn-write-review');
    if (writeBtn) writeBtn.style.display = 'none';
    
    // Smooth scroll
    setTimeout(() => {
        document.getElementById('review-form-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function closeReviewModal() {
    document.getElementById('review-form-container').style.display = 'none';
    const writeBtn = document.getElementById('btn-write-review');
    if (writeBtn) writeBtn.style.display = 'inline-block';
    
    document.getElementById('write-review-form').reset();
    window._reviewPhotosFiles = []; // Clear photos array on close
    const preview = document.getElementById('review-photo-preview-rest');
    if (preview) preview.innerHTML = '';
}

// Sistema de calificación de estrellas
function resetRiviewStars() {
    document.getElementById('review-rating-value').value = '';
    document.querySelectorAll('#star-rating-selector i').forEach(s => s.style.color = 'var(--gray-300)');
}

window.selectStar = function(val) {
    document.getElementById('review-rating-value').value = val;
    document.querySelectorAll('#star-rating-selector i').forEach((s, idx) => {
        s.style.color = idx < val ? '#f59e0b' : 'var(--gray-300)';
    });
};

// Envio final de reseña (multi-foto)
async function submitReview(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Debes iniciar sesión primero', 'error');
        return;
    }

    const rId = new URLSearchParams(window.location.search).get('id');
    const rating = document.getElementById('review-rating-value').value;
    const comentario = document.getElementById('review-comment').value;

    if (!rating) {
        showToast('Por favor, selecciona una calificación (estrellas)', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('rating', rating);
    formData.append('comentario', comentario);

    // Adjuntar todas las fotos seleccionadas
    if (window._reviewPhotosFiles && window._reviewPhotosFiles.length > 0) {
        window._reviewPhotosFiles.forEach(file => {
            formData.append('fotos', file);
        });
    }

    try {
        const res = await fetch(`/api/restaurants/${rId}/reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast('¡Reseña enviada! Aparecerá cuando sea aprobada por un moderador.', 'success');
            closeReviewModal();
            window._reviewPhotosFiles = [];
            loadNativeReviews();
        } else {
            showToast(data.message || 'Error al enviar la reseña', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

// Dar "Me gusta" a una reseña
window.likeReview = async function(reviewId, btnElement) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Debes iniciar sesión para ayudar a otros usuarios y dar me gusta.', 'warning');
        handleEscribirOpinion(); // Use the existing auth redirect logic
        return;
    }

    const rId = new URLSearchParams(window.location.search).get('id');
    try {
        const res = await fetch(`/api/restaurants/${rId}/reviews/${reviewId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        
        if (data.success) {
            const countSpan = document.getElementById(`like-count-${reviewId}`);
            if (countSpan) countSpan.textContent = data.likes;
            
            const icon = btnElement.querySelector('i');
            if (data.isLiked) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                btnElement.style.color = '#ef4444';
                btnElement.style.borderColor = '#ef4444';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                btnElement.style.color = 'var(--gray-600)';
                btnElement.style.borderColor = 'var(--gray-200)';
            }
        } else {
            showToast(data.message || 'Error al procesar la acción', 'error');
        }
    } catch (e) {
        showToast('Error de conexión al dar me gusta', 'error');
    }
};

// Mostrar/ocultar formulario de respuesta de admin
window.toggleReplyForm = function(reviewId) {
    const form = document.getElementById(`reply-form-${reviewId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            form.querySelector('textarea').focus();
        }
    }
};

// Enviar respuesta del propietario
window.submitReply = async function(reviewId) {
    const textarea = document.getElementById(`reply-text-${reviewId}`);
    const respuesta = textarea?.value?.trim();

    if (!respuesta) {
        showToast('Escribe una respuesta antes de publicar.', 'warning');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Debes iniciar sesión como administrador.', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/reviews/${reviewId}/reply`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ respuesta })
        });
        const data = await res.json();

        if (data.success) {
            showToast('✅ Respuesta publicada exitosamente', 'success');
            // Recargar las reseñas para mostrar la respuesta
            const rId = new URLSearchParams(window.location.search).get('id');
            loadNativeReviews(rId);
        } else {
            showToast(data.message || 'Error al publicar la respuesta', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
};

// ===== GALERÍA DE VIAJEROS =====
function renderUserGallery(reviews) {
    const galleryCard = document.getElementById('card-user-gallery');
    const grid = document.getElementById('user-gallery-grid');
    const countEl = document.getElementById('gallery-user-count');
    if (!galleryCard || !grid) return;

    // Collect all photos from all reviews
    const allPhotos = [];
    reviews.forEach(r => {
        const userName = r.userId?.nombre || 'Anónimo';
        if (r.fotos && r.fotos.length > 0) {
            r.fotos.forEach(f => {
                allPhotos.push({ url: f.url, usuario: userName });
            });
        } else if (r.imagenUrl) {
            allPhotos.push({ url: r.imagenUrl, usuario: userName });
        }
    });

    if (allPhotos.length === 0) {
        galleryCard.style.display = 'none';
        return;
    }

    galleryCard.style.display = 'block';
    if (countEl) countEl.textContent = `${allPhotos.length} foto${allPhotos.length !== 1 ? 's' : ''} de viajeros`;

    grid.innerHTML = allPhotos.map(p => `
        <div style="position:relative; aspect-ratio:1; border-radius:0.5rem; overflow:hidden; cursor:pointer; border:1px solid var(--gray-200);" onclick="openPhotoLightbox('${p.url}')">
            <img src="${p.url}" alt="Foto de ${p.usuario}" style="width:100%; height:100%; object-fit:cover; transition: transform 0.3s;"
                onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
            <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent, rgba(0,0,0,0.6)); padding:0.4rem 0.5rem;">
                <span style="color:white; font-size:0.7rem; font-weight:500;"><i class="fas fa-user" style="margin-right:0.2rem;"></i>${p.usuario}</span>
            </div>
        </div>
    `).join('');
}

// ===== PHOTO LIGHTBOX =====
function openPhotoLightbox(url) {
    const lb = document.getElementById('photo-lightbox');
    const img = document.getElementById('photo-lightbox-img');
    if (!lb || !img) return;
    img.src = url;
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePhotoLightbox() {
    const lb = document.getElementById('photo-lightbox');
    if (!lb) return;
    lb.style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePhotoLightbox();
});

// ===== LIGHTBOX DEL MENÚ =====
let menuGalleryImages = [];
let currentMenuIndex = 0;

function buildMenuGallery() {
    menuGalleryImages = [];
    if (!restaurantData || !restaurantData.menu) return;
    
    restaurantData.menu.forEach((cat, cIdx) => {
        if (!cat.items) return;
        cat.items.forEach((item, iIdx) => {
            if (item.imagen && item.imagen.url) {
                menuGalleryImages.push({
                    url: item.imagen.url,
                    nombre: item.nombre || 'Platillo',
                    cIdx,
                    iIdx
                });
            }
        });
    });
}

window.openMenuLightbox = function(cIdx, iIdx) {
    buildMenuGallery();
    if (menuGalleryImages.length === 0) return;

    const targetIndex = menuGalleryImages.findIndex(img => img.cIdx === cIdx && img.iIdx === iIdx);
    if (targetIndex !== -1) {
        currentMenuIndex = targetIndex;
        updateMenuLightboxUI();
        const lb = document.getElementById('menu-lightbox');
        if (lb) {
            lb.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
};

window.closeMenuLightbox = function() {
    const lb = document.getElementById('menu-lightbox');
    if (lb) lb.style.display = 'none';
    document.body.style.overflow = '';
};

window.nextMenuImage = function(e) {
    if (e) e.stopPropagation();
    if (menuGalleryImages.length <= 1) return;
    currentMenuIndex = (currentMenuIndex + 1) % menuGalleryImages.length;
    updateMenuLightboxUI();
};

window.prevMenuImage = function(e) {
    if (e) e.stopPropagation();
    if (menuGalleryImages.length <= 1) return;
    currentMenuIndex = (currentMenuIndex - 1 + menuGalleryImages.length) % menuGalleryImages.length;
    updateMenuLightboxUI();
};

function updateMenuLightboxUI() {
    if (menuGalleryImages.length === 0) return;
    const info = menuGalleryImages[currentMenuIndex];
    
    const imgEl = document.getElementById('menu-lightbox-img');
    const capEl = document.getElementById('menu-lightbox-caption');
    const nextBtn = document.getElementById('menu-lightbox-next');
    const prevBtn = document.getElementById('menu-lightbox-prev');
    
    if (imgEl) imgEl.src = info.url;
    if (capEl) capEl.textContent = `${info.nombre} (${currentMenuIndex + 1} de ${menuGalleryImages.length})`;
    
    const displayArrows = menuGalleryImages.length > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = displayArrows;
    if (prevBtn) prevBtn.style.display = displayArrows;
}

// Event Listeners for Menu Lightbox
document.addEventListener('DOMContentLoaded', () => {
    const menuLb = document.getElementById('menu-lightbox');
    if (menuLb) {
        menuLb.addEventListener('click', function(e) {
            if (e.target === this) closeMenuLightbox();
        });
    }
    
    document.addEventListener('keydown', (e) => {
        const lb = document.getElementById('menu-lightbox');
        if (lb && lb.style.display === 'flex') {
            if (e.key === 'Escape') closeMenuLightbox();
            if (e.key === 'ArrowRight') nextMenuImage();
            if (e.key === 'ArrowLeft') prevMenuImage();
        }
    });
});

// ==========================================
// CREADOR DE ITINERARIOS
// ==========================================

async function initItineraryButton() {
    const btnItinerary = document.getElementById('btn-add-itinerary');
    if (!btnItinerary) return;

    let currentUser = null;
    try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            currentUser = JSON.parse(stored);
        }
    } catch(e) {}

    // Mostrar el botón solo si es turista
    // Si queremos habilitarlo para admin también, cambiar la condición
    if (currentUser && currentUser.rol === 'turista') {
        btnItinerary.style.display = 'inline-flex';
    }
}

// Inicializar el botón al cargar
document.addEventListener('DOMContentLoaded', () => {
    // Retrasar un poco para asegurar que currentUser esté cargado
    setTimeout(initItineraryButton, 500);
});

// Abrir el modal y cargar la lista
window.abrirModalItinerarios = async function() {
    const modal = document.getElementById('modal-agregar-itinerario');
    const loading = document.getElementById('itinerarios-loading');
    const list = document.getElementById('itinerarios-list');
    const form = document.getElementById('form-agregar-itinerario');
    const empty = document.getElementById('itinerarios-empty');
    const token = localStorage.getItem('authToken');

    if (!token) {
        showToast('Debes iniciar sesión para guardar en tu itinerario', 'warning');
        openAuthModal(); // o redirigir a login
        return;
    }

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }
    document.body.style.overflow = 'hidden';

    loading.style.display = 'block';
    list.style.display = 'none';
    form.style.display = 'none';
    empty.style.display = 'none';

    try {
        const res = await fetch('/api/itinerarios/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        loading.style.display = 'none';

        if (data.success && data.data && data.data.length > 0) {
            list.innerHTML = data.data.map(iti => `
                <div style="padding: 1rem; border: 1px solid var(--gray-200); border-radius: var(--radius-md); margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.backgroundColor='var(--gray-50)'" onmouseout="this.style.borderColor='var(--gray-200)'; this.style.backgroundColor='transparent'" onclick="seleccionarItinerario('${iti._id}', '${iti.nombre}')">
                    <div style="font-weight: 600; color: var(--gray-900); font-size: 0.95rem;">${iti.nombre}</div>
                    <div style="font-size: 0.8rem; color: var(--gray-500); margin-top: 0.2rem;">${iti.dias ? iti.dias.length : 0} días • ${iti.descripcion || 'Sin descripción'}</div>
                </div>
            `).join('');
            list.style.display = 'block';
        } else {
            empty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar itinerarios:', error);
        loading.style.display = 'none';
        showToast('Error de conexión', 'error');
    }
};

window.cerrarModalItinerarios = function() {
    const modal = document.getElementById('modal-agregar-itinerario');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
    document.body.style.overflow = '';
    
    // Resetear formulario
    document.getElementById('form-agregar-itinerario').reset();
    document.getElementById('form-agregar-itinerario').style.display = 'none';
    document.getElementById('itinerarios-list').style.display = 'block';
};

window.seleccionarItinerario = function(id, nombre) {
    document.getElementById('itinerarios-list').style.display = 'none';
    document.getElementById('form-agregar-itinerario').style.display = 'block';
    
    document.getElementById('select-itinerario-id').value = id;
    document.getElementById('select-itinerario-nombre').textContent = nombre;
    
    // Set default date to today or leave empty
    document.getElementById('itinerario-fecha').value = new Date().toISOString().split('T')[0];
};

window.volverListaItinerarios = function() {
    document.getElementById('form-agregar-itinerario').style.display = 'none';
    document.getElementById('form-agregar-itinerario').reset();
    document.getElementById('itinerarios-list').style.display = 'block';
};

window.guardarEnItinerario = async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const btnSubmit = document.getElementById('btn-submit-itinerario');
    const originalText = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const itinerarioId = document.getElementById('select-itinerario-id').value;
    const currentId = restaurantData._id || restaurantData.id;
    
    const bodyArgs = {
        fecha: document.getElementById('itinerario-fecha').value,
        hora: document.getElementById('itinerario-hora').value,
        tipoLugar: 'Restaurante',
        lugarId: currentId,
        notas: document.getElementById('itinerario-notas').value
    };

    try {
        const res = await fetch(`/api/itinerarios/${itinerarioId}/actividad`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyArgs)
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast('Lugar agregado al itinerario exitosamente', 'success');
            cerrarModalItinerarios();
        } else {
            showToast(data.message || 'Error al guardar en el itinerario', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = originalText;
    }
};

