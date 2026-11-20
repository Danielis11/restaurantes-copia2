// hospedaje-detalle.js - Logic for the accommodation detail page
const baseURL = window.location.hostname === 'localhost' ? '/api/hospedaje' : '/api/hospedaje';
let currentImageIndex = 0;
let allImages = [];
let hospedajeData = null;

// API endpoints per type
const API_MAP = {
    hotel: { endpoint: 'hoteles', label: 'Hotel', icon: 'fas fa-hotel', listPage: 'hospedaje.html' },
    cabana: { endpoint: 'cabanas', label: 'Cabaña', icon: 'fas fa-campground', listPage: 'hospedaje.html' },
    airbnb: { endpoint: 'airbnb', label: 'Airbnb', icon: 'fas fa-home', listPage: 'hospedaje.html' }
};

// Service labels
const SERVICE_LABELS = {
    wifi: 'WiFi Gratis', piscina: 'Piscina', gym: 'Gimnasio', spa: 'Spa', restaurante: 'Restaurante',
    bar: 'Bar', estacionamiento: 'Estacionamiento', aireacondicionado: 'Aire Acondicionado',
    television: 'Televisión', desayuno: 'Desayuno Incluido', cocina: 'Cocina Equipada',
    lavadora: 'Lavadora', aire_acondicionado: 'Aire Acondicionado', calefaccion: 'Calefacción',
    tv: 'Televisión', balcon_terraza: 'Balcón/Terraza', jardin: 'Jardín', bbq: 'Asador/BBQ',
    chimenea: 'Chimenea', jacuzzi: 'Jacuzzi', mascotas_permitidas: 'Pet-Friendly',
    mascotas: 'Pet-Friendly', acceso_discapacitados: 'Accesibilidad', entrada_independiente: 'Entrada Independiente',
    espacio_trabajo: 'Espacio de Trabajo', servicio_transporte: 'Transporte', salon_eventos: 'Salón de Eventos',
    transporte: 'Transporte', accesibilidad: 'Accesibilidad', eventos: 'Eventos',
    gimnasio: 'Gimnasio', terraza: 'Terraza'
};

// Facility labels
const FACILITY_LABELS = {
    piscina: { icon: 'fas fa-swimming-pool', label: 'Piscina' },
    areas_verdes: { icon: 'fas fa-tree', label: 'Áreas Verdes' },
    asadores: { icon: 'fas fa-fire', label: 'Asadores' },
    gimnasio: { icon: 'fas fa-dumbbell', label: 'Gimnasio' },
    sala_estar: { icon: 'fas fa-couch', label: 'Sala de Estar' },
    terraza: { icon: 'fas fa-umbrella-beach', label: 'Terraza' },
    jardin: { icon: 'fas fa-seedling', label: 'Jardín' },
    area_juegos: { icon: 'fas fa-child', label: 'Área de Juegos' },
    salon_eventos: { icon: 'fas fa-glass-cheers', label: 'Salón de Eventos' },
    lavanderia: { icon: 'fas fa-tshirt', label: 'Lavandería' },
    zona_camping: { icon: 'fas fa-campground', label: 'Zona de Camping' },
    mirador: { icon: 'fas fa-binoculars', label: 'Mirador' }
};

// Cancellation labels
const CANCEL_LABELS = {
    flexible: 'Cancelación gratuita hasta 24h antes',
    moderada: 'Cancelación gratuita hasta 5 días antes',
    estricta: 'Sin reembolso después de reservar'
};

// Payment labels
const PAYMENT_LABELS = {
    efectivo: { icon: 'fas fa-money-bill-wave', label: 'Efectivo' },
    transferencia: { icon: 'fas fa-exchange-alt', label: 'Transferencia' },
    tarjeta: { icon: 'fas fa-credit-card', label: 'Tarjeta' }
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    const id = params.get('id');

    if (!tipo || !id || !API_MAP[tipo]) {
        showError('Parámetros inválidos. Verifica la URL.');
        return;
    }

    document.getElementById('backBtn').href = API_MAP[tipo].listPage;
    loadHospedaje(tipo, id);
    setupMobileMenu();
});

async function loadHospedaje(tipo, id) {
    try {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';

        const config = API_MAP[tipo];
        // Try public route first, then with auth
        let response = await fetch(`${baseURL}/${config.endpoint}/${id}`);
        if (!response.ok) throw new Error(`Error ${response.status}`);

        const data = await response.json();
        hospedajeData = data.data?.hotel || data.data?.cabana || data.data?.airbnb || data.data?.alojamiento || data.data;

        if (!hospedajeData) throw new Error('No se encontraron datos');

        renderPage(tipo);
    } catch (error) {
        console.error('Error cargando hospedaje:', error);
        showError(error.message);
    }
}

function renderPage(tipo) {
    const d = hospedajeData;
    const config = API_MAP[tipo];

    // Hero images
    allImages = d.imagenes || [];
    const heroImg = document.getElementById('heroImage');
    const heroGallery = document.querySelector('.hero-gallery');

    const initialImg = allImages.length > 0 ? getImgUrl(allImages[0]) : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80';
    heroImg.src = initialImg;
    if (heroGallery) heroGallery.style.backgroundImage = `url(${initialImg})`;

    heroImg.onerror = () => {
        const fallback = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80';
        heroImg.src = fallback;
        if (heroGallery) heroGallery.style.backgroundImage = `url(${fallback})`;
    };
    renderThumbnails();
    updateHeroCounter();

    // Info card
    document.getElementById('tipoBadge').innerHTML = `<i class="${config.icon}"></i> ${config.label}`;
    document.getElementById('hospedajeName').textContent = d.nombre || 'Sin nombre';

    const meta = document.getElementById('infoMeta');
    const ciudad = d.ubicacion?.ciudad || 'Ubicación no especificada';
    const tel = d.contacto?.telefono || '';
    const rating = d.calificacion?.promedio || 0;
    const reviews = d.calificacion?.totalReviews || d.calificacion?.numeroReviews || 0;

    let metaHTML = `<span style="font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-map-marker-alt" style="color: #666;"></i> ${ciudad}</span>`;
    if (tel) metaHTML += `<span style="font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-phone-alt" style="color: #666;"></i> ${tel}</span>`;
    if (rating > 0) metaHTML += `<span class="rating-stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))} <span class="count">${rating.toFixed(1)} (${reviews})</span></span>`;
    
    // Social / Contact Buttons in Header
    let socialHTML = `<div style="display: flex; gap: 8px; margin-left: 10px;">`;
    if (d.reservaciones?.whatsapp || (d.contacto?.whatsapp)) {
        const waNumber = (d.reservaciones?.whatsapp || d.contacto?.whatsapp).replace(/\D/g, '');
        socialHTML += `<a href="https://wa.me/${waNumber}" target="_blank" style="width: 32px; height: 32px; border-radius: 50%; background: #25D366; color: white; display: flex; align-items: center; justify-content: center; text-decoration: none;"><i class="fab fa-whatsapp"></i></a>`;
    }
    if (d.contacto?.redesSociales?.facebook) {
        socialHTML += `<a href="${d.contacto.redesSociales.facebook}" target="_blank" style="width: 32px; height: 32px; border-radius: 50%; background: #1877F2; color: white; display: flex; align-items: center; justify-content: center; text-decoration: none;"><i class="fab fa-facebook-f"></i></a>`;
    }
    if (d.contacto?.sitioWeb) {
        socialHTML += `<a href="${d.contacto.sitioWeb}" target="_blank" style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; color: #4b5563; display: flex; align-items: center; justify-content: center; text-decoration: none;"><i class="fas fa-link"></i></a>`;
    }
    socialHTML += `</div>`;
    
    metaHTML += socialHTML;
    meta.innerHTML = metaHTML;

    // About
    document.getElementById('aboutText').textContent = d.descripcion || 'Sin descripción disponible.';

    // Check-in / Check-out
    const politicas = d.politicas || {};
    const formatTime = (val, fallback) => {
        if (!val) return fallback;
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.hora || val.time || val.horario || fallback;
        return String(val);
    };
    document.getElementById('checkInTime').textContent = formatTime(politicas.checkIn, '15:00');
    document.getElementById('checkOutTime').textContent = formatTime(politicas.checkOut, '12:00');
    document.getElementById('recepcionInfo').textContent = typeof politicas.recepcion === 'string' ? politicas.recepcion : 'Consultar horarios';

    // Policies
    const cancelText = CANCEL_LABELS[politicas.cancelacion] || 'Política moderada';
    document.getElementById('cancelPolicy').textContent = cancelText;

    // Rules
    const rulesContainer = document.getElementById('rulesContainer');
    const reglas = politicas.reglasAdicionales || [];
    const servicios = d.servicios || [];
    let rulesHTML = '';
    if (servicios.includes('mascotas') || servicios.includes('mascotas_permitidas')) {
        rulesHTML += '<span class="rule-tag positive"><i class="fas fa-paw"></i> Pet-Friendly</span>';
    }
    reglas.forEach(r => {
        const isNeg = r.toLowerCase().includes('no ');
        rulesHTML += `<span class="rule-tag ${isNeg ? 'negative' : 'neutral'}"><i class="fas fa-${isNeg ? 'times-circle' : 'check-circle'}"></i> ${r}</span>`;
    });
    if (!rulesHTML) rulesHTML = '<span class="rule-tag neutral"><i class="fas fa-info-circle"></i> Consultar reglas al momento de reservar</span>';
    rulesContainer.innerHTML = rulesHTML;

    // Room Description (Nuevo)
    if (d.descripcionHabitaciones) {
        const roomsDescSect = document.getElementById('roomsDescSection');
        const roomsDescText = document.getElementById('roomsDescText');
        if (roomsDescSect && roomsDescText) {
            // Replace newlines with <br> for proper formatting
            roomsDescText.innerHTML = d.descripcionHabitaciones.replace(/\n/g, '<br>');
            roomsDescSect.style.display = 'block';
        }
    }

    // Facilities data variable for later
    const instalaciones = d.instalaciones || [];

    // Accessibility
    const accContainer = document.getElementById('accessContainer');
    const acc = d.accesibilidad || {};
    const accItems = [
        { key: 'rampas', label: 'Rampas de acceso', icon: 'fas fa-wheelchair' },
        { key: 'plantaBaja', label: 'Habitaciones en planta baja', icon: 'fas fa-building' },
        { key: 'banoAdaptado', label: 'Baño adaptado', icon: 'fas fa-restroom' },
        { key: 'elevador', label: 'Elevador', icon: 'fas fa-elevator' },
        { key: 'senalizacionBraille', label: 'Señalización Braille', icon: 'fas fa-braille' }
    ];
    const hasAcc = accItems.some(a => acc[a.key]);
    accContainer.innerHTML = accItems.map(a => {
        const available = acc[a.key] || false;
        return `<div class="access-item ${available ? 'available' : 'unavailable'}"><i class="${a.icon}"></i><span>${a.label}</span><i class="fas fa-${available ? 'check-circle' : 'times-circle'}" style="margin-left:auto"></i></div>`;
    }).join('');
    if (hasAcc) document.getElementById('accessSection').style.display = 'block';

    // Distances
    const distContainer = document.getElementById('distancesContainer');
    const dist = d.distancias || {};
    const distItems = [
        { key: 'misiones', label: 'Misiones', icon: 'fas fa-church' },
        { key: 'naturaleza', label: 'Atractivo Natural', icon: 'fas fa-leaf' },
        { key: 'centroHistorico', label: 'Centro Histórico', icon: 'fas fa-landmark' },
        { key: 'zonaTuristica', label: 'Zona Turística', icon: 'fas fa-map-signs' },
        { key: 'terminalAutobuses', label: 'Terminal de Autobuses', icon: 'fas fa-bus' },
        { key: 'aeropuerto', label: 'Aeropuerto', icon: 'fas fa-plane' }
    ];
    let distHTML = distItems.filter(di => dist[di.key]).map(di =>
        `<div class="distance-item"><i class="${di.icon}"></i><div><div class="dist-label">${di.label}</div><div class="dist-value">${dist[di.key]}</div></div></div>`
    ).join('');

    // Puntos Extra Dinámicos
    if (dist.puntosExtra && dist.puntosExtra.length > 0) {
        distHTML += dist.puntosExtra.map(punto =>
            `<div class="distance-item"><i class="fas fa-map-marker-alt"></i><div><div class="dist-label">${punto.nombre}</div><div class="dist-value">${punto.distancia}</div></div></div>`
        ).join('');
    }

    if (distHTML) { distContainer.innerHTML = distHTML; document.getElementById('distancesSection').style.display = 'block'; }

    // Comodidades e Instalaciones (Unificadas)
    const amenitiesContainer = document.getElementById('amenitiesContainer');
    const comodidadesExtra = d.comodidadesExtra || [];

    const allAmenities = [];

    // 1. Agregar Servicios
    if (servicios.length > 0) {
        servicios.forEach(s => {
            allAmenities.push({ icon: 'fas fa-check', label: SERVICE_LABELS[s] || s });
        });
    }

    // 2. Agregar Instalaciones
    if (instalaciones.length > 0) {
        instalaciones.forEach(inst => {
            const f = FACILITY_LABELS[inst] || { icon: 'fas fa-building', label: inst };
            allAmenities.push({ icon: f.icon, label: f.label });
        });
    }

    // 3. Agregar Comodidades Extra
    if (comodidadesExtra.length > 0) {
        comodidadesExtra.forEach(c => {
            allAmenities.push({ icon: 'fas fa-star', label: c });
        });
    }

    if (allAmenities.length > 0) {
        if (amenitiesContainer) {
            amenitiesContainer.innerHTML = allAmenities.map(amenity =>
                `<div class="service-item"><i class="${amenity.icon} service-check"></i><span>${amenity.label}</span></div>`
            ).join('');
        }
        const section = document.getElementById('amenitiesSection');
        if (section) section.style.display = 'block';
    }

    // Detalles Cabañas Individuales (Sólo Conjuntos)
    if (d.caracteristicas?.esConjunto && d.detallesCabanas && d.detallesCabanas.length > 0) {
        const cabanasContainer = document.getElementById('cabanasIndividualesContainer');
        const cabanasSect = document.getElementById('cabanasIndividualesSection');

        if (cabanasContainer && cabanasSect) {
            const slidesStr = d.detallesCabanas.map((cab, index) => {
                const img = cab.imagen ? `<img src="${getImgUrl(cab.imagen)}" alt="${cab.nombre}" class="sub-cabana-img">` : '';
                return `
                <div class="sub-cabana-slide" data-index="${index}">
                    ${img}
                    <div class="sub-cabana-info">
                        <h4>${cab.nombre || 'Cabaña'}</h4>
                        ${cab.descripcion ? `<p>${cab.descripcion}</p>` : ''}
                        <div class="sub-cabana-stats">
                            ${cab.capacidad?.huespedes ? `<span title="Huéspedes"><i class="fas fa-users"></i> ${cab.capacidad.huespedes}</span>` : ''}
                            ${cab.capacidad?.habitaciones ? `<span title="Habitaciones"><i class="fas fa-door-open"></i> ${cab.capacidad.habitaciones}</span>` : ''}
                            ${cab.capacidad?.camas ? `<span title="Camas"><i class="fas fa-bed"></i> ${cab.capacidad.camas}</span>` : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');

            cabanasContainer.innerHTML = `
                <div class="sub-cabana-carousel-wrapper">
                    ${d.detallesCabanas.length > 1 ? '<button class="sub-cabana-nav prev" onclick="scrollSubCabana(-1)"><i class="fas fa-chevron-left"></i></button>' : ''}
                    <div class="sub-cabana-carousel" id="subCabanaCarousel">
                        ${slidesStr}
                    </div>
                    ${d.detallesCabanas.length > 1 ? '<button class="sub-cabana-nav next" onclick="scrollSubCabana(1)"><i class="fas fa-chevron-right"></i></button>' : ''}
                    ${d.detallesCabanas.length > 1 ? `
                    <div class="sub-cabana-indicators" id="subCabanaIndicators">
                        ${d.detallesCabanas.map((_, i) => `<span class="indicator ${i === 0 ? 'active' : ''}" onclick="goToSubCabana(${i})"></span>`).join('')}
                    </div>
                    ` : ''}
                </div>
            `;

            cabanasContainer.style.display = 'block';
            cabanasContainer.style.gridTemplateColumns = '';
            cabanasContainer.style.gap = '';

            if (typeof startSubCabanaAutoScroll === 'function') {
                setTimeout(startSubCabanaAutoScroll, 100);
            }

            cabanasSect.style.display = 'block';
        }
    }

    // SIDEBAR
    const precio = d.precio || d.precioPorNoche || 0;
    const hab = d.capacidad?.habitaciones || 0;
    const personas = d.capacidad?.personasMax || d.capacidad?.huespedes || 0;
    const sidebarInfo = document.getElementById('sidebarInfo');
    let sideHTML = '';
    if (precio > 0) sideHTML += sidebarItem('fas fa-tag', 'Precio', `$${precio.toLocaleString('es-MX')} / noche`);
    if (hab > 0) sideHTML += sidebarItem('fas fa-bed', 'Habitaciones', hab);
    if (personas > 0) sideHTML += sidebarItem('fas fa-users', 'Capacidad', `${personas} huéspedes`);
    if (d.capacidad?.camas) sideHTML += sidebarItem('fas fa-bed', 'Camas', d.capacidad.camas);
    if (d.capacidad?.banos) sideHTML += sidebarItem('fas fa-bath', 'Baños', d.capacidad.banos);
    sidebarInfo.innerHTML = sideHTML;

    // Payment
    const metodos = d.metodosPago || [];
    const payContainer = document.getElementById('paymentContainer');
    if (metodos.length > 0) {
        payContainer.innerHTML = metodos.map(m => {
            const p = PAYMENT_LABELS[m] || { icon: 'fas fa-credit-card', label: m };
            return `<div class="payment-item"><i class="${p.icon}"></i><span>${p.label}</span></div>`;
        }).join('');
        document.getElementById('paymentSection').style.display = 'block';
    }

    // Reservations (Nuevo)
    const resv = d.reservaciones;
    const resSect = document.getElementById('reservationsSection');
    const resContainer = document.getElementById('reservationsContainer');
    if (resv && (resv.whatsapp || resv.telefono || resv.url || resv.indicaciones) && resSect && resContainer) {
        let resHTML = '';

        if (resv.whatsapp) {
            // Eliminar caracteres no numéricos para el link de WhatsApp
            const waNumber = resv.whatsapp.replace(/\D/g, '');
            // Construir mensaje predeterminado
            const waMessage = encodeURIComponent(`Hola, me interesa reservar en ${d.nombre || 'su alojamiento'}.`);
            resHTML += `
                <a href="https://wa.me/${waNumber}?text=${waMessage}" target="_blank" class="contact-btn phone" style="background-color: #25D366; color: white;">
                    <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i>
                    <div>
                        <div class="contact-type" style="color: rgba(255,255,255,0.9);">WhatsApp</div>
                        <div class="contact-value" style="color: white; font-weight: bold;">${resv.whatsapp}</div>
                    </div>
                </a>
            `;
        }

        if (resv.telefono) {
            resHTML += `
                <a href="tel:${resv.telefono}" class="contact-btn phone">
                    <i class="fas fa-phone"></i>
                    <div>
                        <div class="contact-type">Teléfono</div>
                        <div class="contact-value">${resv.telefono}</div>
                    </div>
                </a>
            `;
        }

        if (resv.url) {
            resHTML += `
                <a href="${resv.url}" target="_blank" class="contact-btn web" style="background-color: #2563eb; color: white;">
                    <i class="fas fa-calendar-plus" style="font-size: 1.2rem;"></i>
                    <div>
                        <div class="contact-type" style="color: rgba(255,255,255,0.9);">Reserva en Línea</div>
                        <div class="contact-value" style="color: white; font-size: 0.85rem; word-break: break-all;">${resv.url.replace(/^https?:\/\/(www\.)?/, '')}</div>
                    </div>
                </a>
            `;
        }

        if (resv.indicaciones) {
            resHTML += `
                <div class="contact-btn" style="cursor: default; display: flex; align-items: flex-start;">
                    <i class="fas fa-info-circle" style="color: var(--primary-color, #1f2937); margin-top: 4px;"></i>
                    <div style="flex:1;">
                        <div class="contact-type">Indicaciones</div>
                        <div class="contact-value" style="font-size: 0.9rem; line-height: 1.4;">${resv.indicaciones}</div>
                    </div>
                </div>
            `;
        }

        resContainer.innerHTML = resHTML;
        resSect.style.display = 'block';
    }

    // Promociones
    const promos = d.promociones || [];
    const promosSection = document.getElementById('promotionsSection');
    const promosContainer = document.getElementById('promotionsContainer');
    const promoPrevBtn = document.getElementById('promoPrevBtn');
    const promoNextBtn = document.getElementById('promoNextBtn');
    const promoDots = document.getElementById('promoDots');

    if (promos.length > 0 && promosSection && promosContainer) {
        // Filtrar promociones activas y vigentes
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const activePromos = promos.filter(p => {
            if (p.activo === false) return false;
            // Manejar fechas guardadas como strings ISO "YYYY-MM-DD"
            if (p.fechaFin) {
                // Agregar el timezone offset o interpretarlo como local para evitar que "2024-02-15" falle si hoy es 15 en UTC
                const [year, month, day] = p.fechaFin.split('T')[0].split('-');
                const endDate = new Date(year, month - 1, day);
                if (endDate < today) return false;
            }
            return true;
        });

        if (activePromos.length > 0) {
            promosSection.style.display = 'block';
            let promoHTML = '';
            let dotsHTML = '';
            
            activePromos.forEach((p, idx) => {
                const img = p.imagen ? `<img src="${getImgUrl(p.imagen)}" alt="${p.titulo}" style="width: 100%; height: 220px; object-fit: cover; display: block;">` : '';
                const desc = p.descripcion ? `<p style="margin: 8px 0 0; font-size: 0.95rem; color: #7f4410; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.descripcion}</p>` : '';
                
                let validez = '';
                if (p.fechaInicio || p.fechaFin) {
                    const formatFecha = (f) => {
                        const [year, month, day] = f.split('T')[0].split('-');
                        return new Date(year, month - 1, day).toLocaleDateString('es-MX', {day: 'numeric', month: 'short'});
                    };
                    const fInicio = p.fechaInicio ? formatFecha(p.fechaInicio) : '';
                    const fFin = p.fechaFin ? formatFecha(p.fechaFin) : '';
                    if (fInicio && fFin) validez = `Válido: ${fInicio} al ${fFin}`;
                    else if (fInicio) validez = `A partir del ${fInicio}`;
                    else validez = `Válido hasta ${fFin}`;
                    
                    validez = `<div style="font-size: 0.85rem; margin-top: 10px; color: #b05c1d; font-weight: bold;"><i class="fas fa-calendar-alt"></i> ${validez}</div>`;
                }

                promoHTML += `
                <div class="promo-slide" style="min-width: 100%; box-sizing: border-box; display: flex; flex-direction: column; background: white; position: relative;">
                    <div style="background-color: #fcedb3; padding: 12px 15px; color: #b05c1d; font-weight: bold; font-size: 1.05rem;">
                        <i class="fas fa-tag" style="margin-right: 5px;"></i> Promociones Activas
                    </div>
                    ${img}
                    <div style="padding: 15px 15px 25px 15px; background: white;">
                        <h4 style="margin: 0; font-size: 1.1rem; color: #b05c1d; font-weight: bold;"><i class="fas fa-tag" style="margin-right: 5px;"></i> ${p.titulo}</h4>
                        ${desc}
                        ${validez}
                    </div>
                </div>`;
                
                dotsHTML += `<button class="promo-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="cursor: pointer; padding: 0; border: none; width: 10px; height: 10px; border-radius: 50%; background: ${idx === 0 ? '#b05c1d' : '#ddd'}; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.3s ease;"></button>`;
            });

            promosContainer.innerHTML = promoHTML;
            if (promoDots) promoDots.innerHTML = dotsHTML;
            
            // Carousel Logic
            if (activePromos.length > 1) {
                if (promoPrevBtn) promoPrevBtn.style.display = 'flex';
                if (promoNextBtn) promoNextBtn.style.display = 'flex';
                if (promoDots) promoDots.style.display = 'flex';
                
                let currentPromo = 0;
                let autoPromoInterval;
                
                const showPromo = (index) => {
                    if (index < 0) index = activePromos.length - 1;
                    if (index >= activePromos.length) index = 0;
                    currentPromo = index;
                    
                    promosContainer.style.transform = `translateX(-${currentPromo * 100}%)`;
                    
                    // Update dots
                    if (promoDots) {
                        const dots = promoDots.querySelectorAll('.promo-dot');
                        dots.forEach((dot, i) => {
                            dot.style.background = i === currentPromo ? '#b05c1d' : '#ddd';
                            dot.style.transform = i === currentPromo ? 'scale(1.2)' : 'scale(1)';
                        });
                    }
                };
                
                const nextPromo = () => showPromo(currentPromo + 1);
                const prevPromo = () => showPromo(currentPromo - 1);
                
                const startPromoAuto = () => {
                    stopPromoAuto();
                    autoPromoInterval = setInterval(nextPromo, 5000);
                };
                
                const stopPromoAuto = () => {
                    if (autoPromoInterval) clearInterval(autoPromoInterval);
                };
                
                if (promoPrevBtn) promoPrevBtn.onclick = () => { prevPromo(); startPromoAuto(); };
                if (promoNextBtn) promoNextBtn.onclick = () => { nextPromo(); startPromoAuto(); };
                
                if (promoDots) {
                    promoDots.querySelectorAll('.promo-dot').forEach(dot => {
                        dot.onclick = (e) => {
                            showPromo(parseInt(e.target.dataset.index));
                            startPromoAuto();
                        };
                    });
                }
                
                // Pause on hover
                promosSection.onmouseenter = stopPromoAuto;
                promosSection.onmouseleave = startPromoAuto;
                
                // Touch support
                let pTouchStartX = 0;
                let pTouchEndX = 0;
                
                promosContainer.addEventListener('touchstart', e => {
                    pTouchStartX = e.changedTouches[0].screenX;
                    stopPromoAuto();
                }, { passive: true });
                
                promosContainer.addEventListener('touchend', e => {
                    pTouchEndX = e.changedTouches[0].screenX;
                    if (pTouchEndX < pTouchStartX - 50) nextPromo();
                    if (pTouchEndX > pTouchStartX + 50) prevPromo();
                    startPromoAuto();
                }, { passive: true });
                
                startPromoAuto();
            } else {
                if (promoPrevBtn) promoPrevBtn.style.display = 'none';
                if (promoNextBtn) promoNextBtn.style.display = 'none';
                if (promoDots) promoDots.style.display = 'none';
            }
        }
    }

    // Contact
    const contactHTML = document.getElementById('topContactContainer');
    let cHTML = '';
    if (d.contacto?.telefono) cHTML += `<a href="tel:${d.contacto.telefono}" class="contact-btn phone"><i class="fas fa-phone"></i><div><div class="contact-type">Teléfono</div><div class="contact-value">${d.contacto.telefono}</div></div></a>`;
    if (d.contacto?.email) cHTML += `<a href="mailto:${d.contacto.email}" class="contact-btn email"><i class="fas fa-envelope"></i><div><div class="contact-type">Email</div><div class="contact-value">${d.contacto.email}</div></div></a>`;
    if (d.contacto?.sitioWeb) {
        let cleanUrl = d.contacto.sitioWeb.replace(/^https?:\/\/(www\.)?/, '').split('?')[0];
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        cHTML += `<a href="${d.contacto.sitioWeb}" target="_blank" class="contact-btn web"><i class="fas fa-globe"></i><div style="overflow: hidden;"><div class="contact-type">Sitio Web</div><div class="contact-value" title="${d.contacto.sitioWeb}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cleanUrl}</div></div></a>`;
    }

    // Check for social media
    if (d.contacto?.redesSociales) {
        if (d.contacto.redesSociales.facebook) cHTML += `<a href="${d.contacto.redesSociales.facebook}" target="_blank" class="contact-btn red-facebook"><i class="fab fa-facebook"></i><div><div class="contact-type">Facebook</div><div class="contact-value">Ver Perfil</div></div></a>`;
        if (d.contacto.redesSociales.instagram) cHTML += `<a href="${d.contacto.redesSociales.instagram}" target="_blank" class="contact-btn red-instagram"><i class="fab fa-instagram"></i><div><div class="contact-type">Instagram</div><div class="contact-value">Ver Perfil</div></div></a>`;
        if (d.contacto.redesSociales.twitter) cHTML += `<a href="${d.contacto.redesSociales.twitter}" target="_blank" class="contact-btn red-twitter"><i class="fab fa-twitter"></i><div><div class="contact-type">X / Twitter</div><div class="contact-value">Ver Perfil</div></div></a>`;
        if (d.contacto.redesSociales.tiktok) cHTML += `<a href="${d.contacto.redesSociales.tiktok}" target="_blank" class="contact-btn red-tiktok"><i class="fab fa-tiktok"></i><div><div class="contact-type">TikTok</div><div class="contact-value">Ver Perfil</div></div></a>`;
    }

    if (!cHTML) cHTML = '<p style="color:#888;text-align:center;padding:1rem">Contacto no disponible</p>';
    contactHTML.innerHTML = cHTML;

    // Eco
    if (d.esEcologico) {
        document.getElementById('ecoSection').style.display = 'block';
        const ecoContainer = document.getElementById('ecoContainer');
        const practices = ['Uso de energías renovables', 'Reciclaje y separación de residuos', 'Productos biodegradables', 'Ahorro de agua', 'Apoyo a productores locales'];
        ecoContainer.innerHTML = practices.map(p => `<div class="eco-practice"><i class="fas fa-leaf"></i><span>${p}</span></div>`).join('');
    }

    // ⭐ Reseñas
    renderReviews(d.reviews || []);
    checkLoginForReviews(tipo, d._id);

    // Cargar experiencias del compañero
    loadExperiencias();

    // Ubicación Mapbox
    if (d.ubicacion && d.ubicacion.lat && d.ubicacion.lng) {
        const locSection = document.getElementById('locationSection');
        if (locSection) {
            locSection.style.display = 'block';
            
            // Mapbox
            mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuaWVsMTIzMiIsImEiOiJjbWlnb2R3MW4wM21nM2VwcmZ3ZnIxd3QzIn0.zyMq4wzSi9Zi7CuWo6oDCQ';
            
            const map = new mapboxgl.Map({
                container: 'mapboxContainer',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [d.ubicacion.lng, d.ubicacion.lat],
                zoom: 15,
                interactive: true // Enable interactions, but users can zoom
            });
            
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            // Custom Marker
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.backgroundColor = '#f39c12';
            el.style.width = '30px';
            el.style.height = '30px';
            el.style.borderRadius = '50% 50% 50% 0';
            el.style.transform = 'rotate(-45deg)';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            el.style.display = 'flex';
            el.style.justifyContent = 'center';
            el.style.alignItems = 'center';
            el.style.cursor = 'pointer';
            
            const icon = document.createElement('i');
            let faIcon = 'fa-bed';
            if (tipo === 'hotel') faIcon = 'fa-hotel';
            else if (tipo === 'cabana') faIcon = 'fa-campground';
            else if (tipo === 'airbnb') faIcon = 'fa-home';
            
            icon.className = `fas ${faIcon}`;
            icon.style.transform = 'rotate(45deg)';
            icon.style.color = 'white';
            icon.style.fontSize = '14px';
            el.appendChild(icon);

            new mapboxgl.Marker({element: el})
                .setLngLat([d.ubicacion.lng, d.ubicacion.lat])
                .addTo(map);
                
            // Set link to Google Maps for convenience since it's common for tourists, or simple map link
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${d.ubicacion.lat},${d.ubicacion.lng}`;
            const btnMapa = document.getElementById('verMapaBtn');
            if (btnMapa) {
                btnMapa.href = mapLink;
            }
        }
    }

    // Show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

function sidebarItem(icon, label, value) {
    return `<div class="sidebar-info-item"><div class="info-icon"><i class="${icon}"></i></div><div><div class="info-label">${label}</div><div class="info-value">${value}</div></div></div>`;
}

function getImgUrl(url) {
    if (!url) return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return url.startsWith('/') ? url : '/' + url;
}

// Gallery functions
function renderThumbnails() {
    const container = document.getElementById('heroThumbnails');
    if (!container || allImages.length <= 1) { if (container) container.style.display = 'none'; return; }
    container.innerHTML = allImages.slice(0, 5).map((img, i) =>
        `<div class="hero-thumb ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"><img src="${getImgUrl(img)}" alt="Miniatura ${i + 1}"></div>`
    ).join('');
}

function updateHeroCounter() {
    const counter = document.getElementById('heroCounter');
    if (counter && allImages.length > 1) counter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
    else if (counter) counter.style.display = 'none';
}

function changeSlide(dir) {
    if (allImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + dir + allImages.length) % allImages.length;
    const imgUrl = getImgUrl(allImages[currentImageIndex]);
    document.getElementById('heroImage').src = imgUrl;
    const heroGallery = document.querySelector('.hero-gallery');
    if (heroGallery) heroGallery.style.backgroundImage = `url(${imgUrl})`;
    updateHeroCounter();
    document.querySelectorAll('.hero-thumb').forEach((t, i) => t.classList.toggle('active', i === currentImageIndex));
}

function goToSlide(i) {
    currentImageIndex = i;
    const imgUrl = getImgUrl(allImages[i]);
    document.getElementById('heroImage').src = imgUrl;
    const heroGallery = document.querySelector('.hero-gallery');
    if (heroGallery) heroGallery.style.backgroundImage = `url(${imgUrl})`;
    updateHeroCounter();
    document.querySelectorAll('.hero-thumb').forEach((t, idx) => t.classList.toggle('active', idx === i));
}

// Touch support for swipeable gallery
let touchstartX = 0;
let touchendX = 0;

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.hero-gallery');
    if (gallery) {
        gallery.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, { passive: true });

        gallery.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
});

function handleSwipe() {
    const swipeThreshold = 50; // Minimum distance to be considered a swipe
    if (touchendX < touchstartX - swipeThreshold) {
        // Swiped left
        changeSlide(1);
    }
    if (touchendX > touchstartX + swipeThreshold) {
        // Swiped right
        changeSlide(-1);
    }
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    const err = document.getElementById('errorState');
    err.style.display = 'block';
    err.querySelector('p').textContent = msg;
}

function setupMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('navMenu');
    const overlay = document.getElementById('mobileOverlay');
    const dropdown = document.getElementById('hospedajeDropdown');

    if (toggle) toggle.addEventListener('click', () => {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
        const icon = toggle.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

    if (overlay) overlay.addEventListener('click', () => {
        menu.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Cerrar menú con botón X
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => {
        menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        const icon = toggle?.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    if (dropdown) dropdown.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && e.target.closest('.nav-link') && !e.target.closest('.dropdown-item')) {
            e.preventDefault();
            dropdown.classList.toggle('active');
        }
    });
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') changeSlide(-1);
    if (e.key === 'ArrowRight') changeSlide(1);
});

// ====== LÓGICA DE RESEÑAS (mismo sistema que el resto del sitio) ======
// Solo viajeros con cuenta del sitio pueden opinar; una opinión por lugar.
// Si no hay sesión, se invita a iniciar sesión o crear cuenta (AccesoResena).
let resenasActuales = [];
let resenaDestino = null; // { tipo, itemId }

function escHtml(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function usuarioViajero() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (e) { return null; }
}

function yaOpine() {
    const u = usuarioViajero();
    if (!u || !localStorage.getItem('authToken')) return false;
    const id = String(u.id || u._id || '');
    return !!id && resenasActuales.some(r => String(r.user?._id || r.user || r.userId || '') === id);
}

function renderReviews(reviews) {
    resenasActuales = reviews || [];
    const list = document.getElementById('reviewsList');
    const resumen = document.getElementById('resumenResenas');

    if (resenasActuales.length === 0) {
        if (resumen) resumen.innerHTML = '';
        list.innerHTML = '<p class="resena-vacia"><i class="far fa-comment-dots"></i> Aún no hay opiniones de este lugar. ¡Sé el primero en contar cómo te fue!</p>';
        actualizarBotonResena();
        return;
    }

    // Resumen: promedio y barras por estrellas (como en restaurantes)
    const total = resenasActuales.length;
    const promedio = resenasActuales.reduce((a, r) => a + (Number(r.rating) || 0), 0) / total;
    if (resumen) {
        const barras = [5, 4, 3, 2, 1].map(n => {
            const cuantos = resenasActuales.filter(r => Math.round(r.rating) === n).length;
            const pct = Math.round((cuantos / total) * 100);
            return `<div class="resena-barra"><span>${n}</span><div class="resena-barra-fondo"><div style="width:${pct}%"></div></div><span>${cuantos}</span></div>`;
        }).join('');
        resumen.innerHTML = `
            <div class="resena-resumen">
                <div class="resena-promedio">
                    <strong>${promedio.toFixed(1)}</strong>
                    <div class="resena-estrellas">${estrellasHtml(Math.round(promedio))}</div>
                    <span>${total} opinion${total !== 1 ? 'es' : ''}</span>
                </div>
                <div class="resena-barras">${barras}</div>
            </div>`;
    }

    const ordenadas = [...resenasActuales].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    list.innerHTML = ordenadas.map(r => {
        const nombre = escHtml(r.nombreUsuario || 'Viajero');
        const inicial = escHtml((r.nombreUsuario || 'V').trim().charAt(0).toUpperCase());
        const fecha = r.fecha ? new Date(r.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        return `
        <div class="resena-tarjeta">
            <div class="resena-cabecera">
                <div class="resena-avatar">${inicial}</div>
                <div>
                    <div class="resena-nombre">${nombre}</div>
                    <div class="resena-fecha">${fecha}</div>
                </div>
                <div class="resena-estrellas">${estrellasHtml(r.rating)}</div>
            </div>
            <p class="resena-texto">${escHtml(r.comentario)}</p>
            ${r.respuesta ? `<div class="resena-respuesta"><b><i class="fas fa-reply"></i> Respuesta del establecimiento</b><p>${escHtml(r.respuesta)}</p></div>` : ''}
        </div>`;
    }).join('');
    actualizarBotonResena();
}

function estrellasHtml(n) {
    let html = '';
    for (let i = 1; i <= 5; i++) html += `<i class="${i <= n ? 'fas' : 'far'} fa-star"></i>`;
    return html;
}

function actualizarBotonResena() {
    const boton = document.getElementById('btnEscribirResena');
    const invitacion = document.getElementById('loginPromptContainer');
    const opinado = document.getElementById('resenaYaOpinaste');
    const viajero = window.AccesoResena ? AccesoResena.esViajero() : !!localStorage.getItem('authToken');
    const ya = yaOpine();
    if (boton) boton.style.display = ya ? 'none' : 'inline-flex';
    if (opinado) opinado.style.display = ya ? 'block' : 'none';
    if (invitacion) invitacion.style.display = (!viajero && !ya) ? 'block' : 'none';
}

function checkLoginForReviews(tipo, itemId) {
    resenaDestino = { tipo, itemId };
    const pedirYAbrir = () => {
        if (window.AccesoResena) AccesoResena.pedir(abrirFormularioResena);
        else window.location.href = '/login.html';
    };
    const boton = document.getElementById('btnEscribirResena');
    if (boton) boton.onclick = pedirYAbrir;
    document.querySelectorAll('[data-invitar-resena]').forEach(b => {
        b.onclick = (e) => {
            e.preventDefault();
            if (!window.AccesoResena) { window.location.href = '/login.html'; return; }
            AccesoResena.pedir(abrirFormularioResena);
            // Abre directamente la pestaña pedida (entrar / crear)
            const pestana = document.querySelector(`.acr-pestana[data-modo="${b.dataset.invitarResena}"]`);
            if (pestana) pestana.click();
        };
    });
    const cancelar = document.getElementById('btnCancelarResena');
    if (cancelar) cancelar.onclick = cerrarFormularioResena;
    setupReviewForm();
    actualizarBotonResena();
}

function abrirFormularioResena() {
    if (yaOpine()) { actualizarBotonResena(); return; }
    const cont = document.getElementById('reviewFormContainer');
    const u = usuarioViajero();
    const autor = document.getElementById('resenaAutor');
    if (autor) autor.textContent = (u && u.nombre) || 'Viajero';
    cont.style.display = 'block';
    document.getElementById('btnEscribirResena').style.display = 'none';
    document.getElementById('loginPromptContainer').style.display = 'none';
    setTimeout(() => {
        cont.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('reviewComment').focus({ preventScroll: true });
    }, 100);
}

function cerrarFormularioResena() {
    document.getElementById('reviewFormContainer').style.display = 'none';
    document.getElementById('reviewError').textContent = '';
    actualizarBotonResena();
}

function setupReviewForm() {
    const stars = document.querySelectorAll('#starSelect .fa-star');
    const ratingInput = document.getElementById('reviewRating');
    const comentario = document.getElementById('reviewComment');
    const contador = document.getElementById('reviewCount');
    const error = document.getElementById('reviewError');

    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-val'));
        star.onclick = () => { ratingInput.value = val; updateStarsDisplay(stars, val); error.textContent = ''; };
        star.onmouseover = () => updateStarsDisplay(stars, val);
        star.onmouseout = () => updateStarsDisplay(stars, parseInt(ratingInput.value) || 0);
    });
    updateStarsDisplay(stars, parseInt(ratingInput.value) || 0);

    comentario.oninput = () => { contador.textContent = comentario.value.length; };

    const form = document.getElementById('reviewForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        error.textContent = '';
        const rating = parseInt(ratingInput.value) || 0;
        const texto = comentario.value.trim();
        if (rating < 1) { error.textContent = 'Elige de 1 a 5 estrellas.'; return; }
        if (texto.length < 10) { error.textContent = 'Cuéntanos un poco más (mínimo 10 caracteres).'; return; }

        const token = localStorage.getItem('authToken');
        if (!token || !resenaDestino) { AccesoResena.pedir(abrirFormularioResena); return; }

        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
        try {
            const res = await fetch(`${baseURL}/${API_MAP[resenaDestino.tipo].endpoint}/${resenaDestino.itemId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ rating, comentario: texto, sitioWeb: document.getElementById('reviewSitio').value })
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) {
                // Sesión vencida o de administrador: volver a pedir acceso de viajero
                localStorage.removeItem('authToken');
                AccesoResena.pedir(abrirFormularioResena);
                return;
            }
            if (data.code === 'EMAIL_NO_VERIFICADO') {
                // Falta confirmar el correo: se pide el código y se reintenta
                AccesoResena.verificar(() => form.requestSubmit());
                return;
            }
            if (!res.ok) { error.textContent = data.message || 'No se pudo publicar tu opinión.'; return; }
            form.reset();
            ratingInput.value = 0;
            contador.textContent = '0';
            cerrarFormularioResena();
            const aviso = document.getElementById('resenaGracias');
            if (aviso) { aviso.style.display = 'block'; setTimeout(() => { aviso.style.display = 'none'; }, 6000); }
            loadHospedaje(resenaDestino.tipo, resenaDestino.itemId);
        } catch (err) {
            console.error('Error al enviar reseña:', err);
            error.textContent = 'Error de conexión. Intenta de nuevo.';
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    };
}

function updateStarsDisplay(stars, val) {
    stars.forEach(s => {
        const activa = parseInt(s.getAttribute('data-val')) <= val;
        s.classList.toggle('fas', activa);
        s.classList.toggle('far', !activa);
        s.style.color = activa ? '#f59e0b' : '#d1d5db';
    });
}

// ====== EXPERIENCIAS DEL COMPAÑERO ======
const CATEGORIA_ICONS = {
    'Turismo Cultural': 'fas fa-landmark',
    'Senderismo': 'fas fa-hiking',
    'Aviturismo': 'fas fa-map',
    'Ciclismo': 'fas fa-biking',
    'Rappel': 'fas fa-mountain',
    'Cabalgata': 'fas fa-horse',
    'Espeleología': 'fas fa-mountain',
    'Kayak': 'fas fa-water',
    'Campismo': 'fas fa-campground',
    'Fotografía': 'fas fa-camera',
    'Gastronomía': 'fas fa-utensils'
};

async function loadExperiencias() {
    const container = document.getElementById('experienciasContainer');
    if (!container) return;

    try {
        const res = await fetch(`${baseURL}/experiencias-partner?limit=6`);
        const json = await res.json();

        if (!json.success || !json.data || json.data.length === 0) {
            document.getElementById('experienciasSection').style.display = 'none';
            return;
        }

        // Mezclar aleatoriamente y tomar máximo 6
        const shuffled = json.data.sort(() => 0.5 - Math.random()).slice(0, 6);

        container.innerHTML = shuffled.map((tour, index) => {
            const nombre = tour.nombre?.es || tour.nombre || 'Experiencia';
            const categoria = tour.categoria || tour.tipo || 'Aventura';
            const iconClass = CATEGORIA_ICONS[categoria] || 'fas fa-compass';

            // Imagen: principal o primera del array
            let imgUrl = '';
            if (tour.imagenPrincipal?.url) {
                imgUrl = tour.imagenPrincipal.url;
            } else if (tour.imagenes && tour.imagenes.length > 0) {
                imgUrl = tour.imagenes[0].url || tour.imagenes[0];
            }

            const hasImage = imgUrl && /^(https?:)?\//.test(imgUrl) && !imgUrl.includes('default');
            const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            const textoCategoria = String(categoria).replace(/[-_]/g, ' ');
            const enlace = tour._id ? `/experiencia.html?id=${encodeURIComponent(tour._id)}` : '/experiencias.html';

            return `
                <a href="${enlace}" class="interes-card">
                    <div class="interes-foto">
                        ${hasImage
                            ? `<img src="${esc(imgUrl)}" alt="${esc(nombre)}" loading="lazy" onerror="this.remove()">`
                            : ''}
                        <i class="${iconClass}" aria-hidden="true"></i>
                    </div>
                    <div class="interes-texto">
                        <span class="interes-categoria"><i class="${iconClass}"></i> ${esc(textoCategoria)}</span>
                        <h4 class="interes-nombre">${esc(nombre)}</h4>
                        <span class="interes-ver">Ver experiencia <i class="fas fa-arrow-right"></i></span>
                    </div>
                </a>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando experiencias:', error);
        document.getElementById('experienciasSection').style.display = 'none';
    }
}
