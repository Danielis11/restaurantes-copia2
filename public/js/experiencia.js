document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentTourId = urlParams.get('id');

    if (!currentTourId) {
        showError('No se proporcionó un ID de experiencia.');
        return;
    }

    loadExperienceData(currentTourId);
    setupReviewsAndLikes();
});

let currentTourId = null;
let currentUser = null;

let currentTourImages = [];
let currentTourImageIndex = 0;

function showRecommendationSkeletons(lang) {
    const container = document.getElementById('cross-recommendations');
    const recGrid = document.getElementById('recommendations-grid');
    if (!container || !recGrid) return;
    
    if (!document.getElementById('pulse-style')) {
        const style = document.createElement('style');
        style.id = 'pulse-style';
        style.innerHTML = '@keyframes pulseLoader { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }';
        document.head.appendChild(style);
    }
    
    container.style.display = 'block';
    
    // Ensure the original 'Te podría interesar' title is visible
    const h2Title = container.querySelector('h2');
    if (h2Title) h2Title.style.display = 'block';
    
    const skeletonHTML = `
        <div style="height:200px; border-radius:16px; background:#e2e8f0; animation:pulseLoader 1.5s infinite;"></div>
        <div style="height:200px; border-radius:16px; background:#e2e8f0; animation:pulseLoader 1.5s infinite; animation-delay: 0.2s;"></div>
        <div style="height:200px; border-radius:16px; background:#e2e8f0; animation:pulseLoader 1.5s infinite; animation-delay: 0.4s;"></div>
    `;
    recGrid.innerHTML = skeletonHTML;
    
    const restCercTxt = lang === 'en' ? 'Nearby Restaurants' : lang === 'fr' ? 'Restaurants à Proximité' : 'Restaurantes Cercanos';
    let restSection = document.getElementById('nearby-restaurants-section');
    if (!restSection) {
        restSection = document.createElement('div');
        restSection.id = 'nearby-restaurants-section';
        restSection.style.marginTop = '2rem';
        restSection.innerHTML = `
            <h2 style="font-size:1.4rem; font-weight:700; color:var(--gray-800); margin-bottom:1.2rem; text-align:center;">
                <i class="fas fa-utensils" style="color: var(--primary); margin-right: 0.4rem;"></i> ${restCercTxt}
            </h2>
            <div id="nearby-restaurants-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 320px)); gap:1.2rem; justify-content:center;">
                ${skeletonHTML}
            </div>
        `;
        container.appendChild(restSection);
    } else {
        restSection.style.display = 'block';
        document.getElementById('nearby-restaurants-grid').innerHTML = skeletonHTML;
    }
}

async function loadExperienceData(id) {
    try {
        const lang = localStorage.getItem('appLang') || 'es';
        showRecommendationSkeletons(lang);
        const res = await fetch(`/api/tours/${id}?lang=${lang}&allLangs=true`);
        const data = await res.json();

        if (data.success) {
            renderExperience(data.data);
            
            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('tour-content').style.display = 'block';
        } else {
            showError('No se pudo cargar la información de la experiencia.');
        }
    } catch (err) {
        console.error('Error fetching experience data:', err);
        showError('Error de conexión al cargar la experiencia.');
    }
}

function showError(msg) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('tour-content').style.display = 'none';
    const errorState = document.getElementById('error-state');
    errorState.style.display = 'flex';
    if(msg) {
        const p = errorState.querySelector('p');
        if(p) p.textContent = msg;
    }
}

function renderExperience(tour) {
    const lang = localStorage.getItem('appLang') || 'es';
    const xpTxt = lang === 'en' ? 'Experience' : 'Experiencia';
    const noDescTxt = lang === 'en' ? 'No detailed description.' : 'Sin descripción detallada.';
    const durTxt = lang === 'en' ? 'Duration' : lang === 'fr' ? 'Durée' : 'Duración';
    const hrsTxt = lang === 'en' ? 'hours' : lang === 'fr' ? 'heures' : 'horas';
    const diffTxt = lang === 'en' ? 'Difficulty' : lang === 'fr' ? 'Difficulté' : 'Dificultad';
    const capTxt = lang === 'en' ? 'Capacity' : lang === 'fr' ? 'Capacité' : 'Capacidad';
    const persTxt = lang === 'en' ? 'people' : lang === 'fr' ? 'pers.' : 'pers.';
    const dispTxt = lang === 'en' ? 'Availability' : lang === 'fr' ? 'Disponibilité' : 'Disponibilidad';
    const todoTxt = lang === 'en' ? 'All year' : lang === 'fr' ? 'Toute l\'année' : 'Todo el año';
    const tempTxt = lang === 'en' ? 'Season' : lang === 'fr' ? 'Saison' : 'Temporada';
    const diasLabelTxt = lang === 'en' ? 'Days' : lang === 'fr' ? 'Jours' : 'Días';
    const todosDiasTxt = lang === 'en' ? 'Every day' : lang === 'fr' ? 'Tous les jours' : 'Todos los días';
    const ubiTxt = lang === 'en' ? 'Location' : lang === 'fr' ? 'Emplacement' : 'Ubicación';
    const noEspecTxt = lang === 'en' ? 'Not specified' : lang === 'fr' ? 'Non spécifié' : 'No especificado';

    // Basic Info
    document.getElementById('page-title').textContent = `${getL(tour.nombre) || xpTxt} - Jalpan de Serra`;
    document.getElementById('page-description').content = getL(tour.descripcionCorta) || (lang === 'en' ? 'Discover this experience in Jalpan de Serra.' : 'Descubre esta experiencia en Jalpan de Serra.');

    // Open Graph / Twitter Card meta tags dinámicos
    const ogTitle = `${getL(tour.nombre) || xpTxt} - Experiencia en Jalpan de Serra`;
    const ogDesc = (getL(tour.descripcionCorta) || getL(tour.descripcion) || 'Vive esta experiencia en la Sierra Gorda').substring(0, 160);
    const ogImage = (tour.imagenes && tour.imagenes.length > 0) ? tour.imagenes[0].url : '';
    const ogUrl = window.location.href;

    const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
    setMeta('og-title', ogTitle);
    setMeta('og-description', ogDesc);
    if (ogImage) { setMeta('og-image', ogImage); setMeta('tw-image', ogImage); }
    setMeta('og-url', ogUrl);
    setMeta('tw-title', ogTitle);
    setMeta('tw-description', ogDesc);
    
    document.getElementById('hero-name').textContent = getL(tour.nombre) || xpTxt;
    document.getElementById('hero-tipo').textContent = translateCategoria(tour.categoria) || 'Tour';
    document.getElementById('hero-price').textContent = `$${tour.precio?.amount || 0} ${tour.precio?.moneda || 'MXN'}`;
    document.getElementById('desc-text').textContent = getL(tour.descripcion) || getL(tour.descripcionCorta) || noDescTxt;

    // Badges
    const diffClass = { 'Fácil': 'easy', 'Moderado': 'moderate', 'Difícil': 'hard', 'Extremo': 'extreme' }[tour.dificultad] || 'moderate';
    
    // Translation dictionary for difficulty
    const diffMapEn = { 'Fácil':'Easy', 'Moderado':'Moderate', 'Difícil':'Hard', 'Extremo':'Extreme' };
    const diffMapFr = { 'Fácil':'Facile', 'Moderado':'Modéré', 'Difícil':'Difficile', 'Extremo':'Extrême' };
    const diffDisplay = lang === 'en' && diffMapEn[tour.dificultad] ? diffMapEn[tour.dificultad] : 
                        lang === 'fr' && diffMapFr[tour.dificultad] ? diffMapFr[tour.dificultad] : 
                        tour.dificultad;

    const badgesHtml = `
        <span class="detail-badge badge-cat"><i class="fas fa-tag"></i> ${translateCategoria(tour.categoria)}</span>
        <span class="detail-badge badge-diff ${diffClass}">${diffDisplay}</span>
    `;
    document.getElementById('hero-badges').innerHTML = badgesHtml;

    // Details Grid
    const diasHTML = (tour.disponibilidad?.diasSemana && tour.disponibilidad.diasSemana.length) ? 
        tour.disponibilidad.diasSemana.map(d => {
            const diasMapEn = {'Lunes':'Monday','Martes':'Tuesday','Miércoles':'Wednesday','Jueves':'Thursday','Viernes':'Friday','Sábado':'Saturday','Domingo':'Sunday'};
            const diasMapFr = {'Lunes':'Lundi','Martes':'Mardi','Miércoles':'Mercredi','Jueves':'Jeudi','Viernes':'Vendredi','Sábado':'Samedi','Domingo':'Dimanche'};
            return lang === 'en' ? (diasMapEn[d] || d) : lang === 'fr' ? (diasMapFr[d] || d) : d;
        }).join(', ') : todosDiasTxt;
        
    let detailsHtml = `
        <div class="detail-meta-item">
            <i class="fas fa-clock"></i>
            <div><div class="meta-label">${durTxt}</div><div class="meta-value">${tour.duracion?.horas || 0} ${hrsTxt}</div></div>
        </div>
        <div class="detail-meta-item">
            <i class="fas fa-signal"></i>
            <div><div class="meta-label">${diffTxt}</div><div class="meta-value">${diffDisplay}</div></div>
        </div>
        <div class="detail-meta-item">
            <i class="fas fa-users"></i>
            <div><div class="meta-label">${capTxt}</div><div class="meta-value">${tour.capacidad?.minima || 1} - ${tour.capacidad?.maxima || '?'} ${persTxt}</div></div>
        </div>
        <div class="detail-meta-item">
            <i class="fas fa-calendar-alt"></i>
            <div><div class="meta-label">${dispTxt}</div><div class="meta-value">${tour.disponibilidad?.todoElAnio ? todoTxt : tempTxt}</div></div>
        </div>
        <div class="detail-meta-item">
            <i class="fas fa-calendar-week"></i>
            <div><div class="meta-label">${diasLabelTxt}</div><div class="meta-value">${diasHTML}</div></div>
        </div>
    `;

    if (tour.direccion?.ciudad) {
        detailsHtml += `
        <div class="detail-meta-item">
            <i class="fas fa-map-marker-alt"></i>
            <div><div class="meta-label">${ubiTxt}</div><div class="meta-value">${tour.direccion.ciudad}</div></div>
        </div>`;
    }
    document.getElementById('details-grid').innerHTML = detailsHtml;

    // Lists (Includes, Excludes, Bring)
    let incluyeList = tour.incluye || [];
    let noIncluyeList = tour.noIncluye || [];

    let hasInclusions = false;
    
    if (incluyeList.length > 0) {
        document.getElementById('list-includes').innerHTML = incluyeList.map(i => `<li>${getL(i)}</li>`).join('');
        hasInclusions = true;
    } else {
        document.getElementById('list-includes').innerHTML = `<li><span class="text-muted">${noEspecTxt}</span></li>`;
    }

    if (noIncluyeList.length > 0) {
        document.getElementById('list-excludes').innerHTML = noIncluyeList.map(i => `<li>${getL(i)}</li>`).join('');
        hasInclusions = true;
    } else {
        document.getElementById('list-excludes').innerHTML = `<li><span class="text-muted">${noEspecTxt}</span></li>`;
    }

    document.getElementById('card-inclusions').style.display = hasInclusions ? 'block' : 'none';

    // Qué traer
    populateList('block-bring', 'list-bring', tour.queTraer, noEspecTxt);
    // Requisitos
    populateList('block-requisitos', 'list-requisitos', tour.requisitos, noEspecTxt);

    // Información Útil dinámica
    const itinerarioDesc = getL(tour.itinerarioBasico);
    const puntoEncuentroDesc = getL(tour.puntoEncuentro);
    const politicasDesc = getL(tour.politicasCancelacion);
    const restriccionesDesc = getL(tour.restricciones);

    const elItinerario = document.getElementById('itinerario-desc');
    const elPunto = document.getElementById('punto-encuentro-desc');
    const elPoliticas = document.getElementById('politicas-desc');
    const elRestricciones = document.getElementById('restricciones-desc');

    if (elItinerario) elItinerario.textContent = itinerarioDesc || (lang === 'en' ? 'Departure from the meeting point, transfer to the site, activity, free time for photos, and return.' : lang === 'fr' ? 'Départ du point de rendez-vous, transfert vers le site, activité, temps libre pour les photos et retour au point de départ.' : 'Salida desde el punto de encuentro, traslado al sitio, desarrollo de la actividad, tiempo libre para fotos y retorno al origen.');
    if (elPunto) elPunto.textContent = puntoEncuentroDesc || (lang === 'en' ? 'Jalpan de Serra Main Garden (in front of the Mission). It is recommended to arrive 15 minutes before.' : lang === 'fr' ? 'Jardin principal de Jalpan de Serra (devant la Mission). Il est recommandé d\'arriver 15 minutes avant.' : 'Jardín Principal de Jalpan de Serra (frente a la Misión). Se recomienda llegar 15 minutos antes.');
    if (elPoliticas) elPoliticas.textContent = politicasDesc || (lang === 'en' ? 'Full refund if canceled 24 hours in advance. No refunds for no-shows.' : lang === 'fr' ? 'Remboursement intégral en cas d\'annulation 24 heures à l\'avance. Aucun remboursement en cas de non-présentation.' : 'Reembolso completo si cancelas con 24 horas de anticipación. No hay reembolsos por no presentarse (No-show).');
    if (elRestricciones) elRestricciones.textContent = restriccionesDesc || (lang === 'en' ? 'Not recommended for people with heart problems, pregnant women, or extreme reduced mobility.' : lang === 'fr' ? 'Non recommandé aux personnes souffrant de problèmes cardiaques, aux femmes enceintes ou à mobilité réduite extrême.' : 'No recomendado para personas con problemas cardíacos, mujeres embarazadas o movilidad reducida extrema.');

    // Carousel
    currentTourImages = tour.imagenes && tour.imagenes.length > 0 
        ? tour.imagenes 
        : [{ url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&h=600&fit=crop' }];
    currentTourImageIndex = 0;

    const heroItems = currentTourImages.map((img, index) => `
        <div class="tour-carousel-item ${index === 0 ? 'active' : ''}" id="tour-slide-${index}">
            <img src="${img.url}" alt="${getL(tour.nombre) || xpTxt}" onclick="openTourLightbox('${img.url}')">
        </div>
    `).join('');
    document.getElementById('hero-carousel-items').innerHTML = heroItems;

    if (currentTourImages.length > 1) {
        document.getElementById('hero-nav-buttons').innerHTML = `
            <button class="tour-nav-btn prev" onclick="prevTourImage(event)"><i class="fas fa-chevron-left"></i></button>
            <button class="tour-nav-btn next" onclick="nextTourImage(event)"><i class="fas fa-chevron-right"></i></button>
        `;
        document.getElementById('hero-indicator').innerHTML = `<div class="tour-indicator" id="tour-slide-indicator">1 / ${currentTourImages.length}</div>`;
    } else {
        document.getElementById('hero-nav-buttons').innerHTML = '';
        document.getElementById('hero-indicator').innerHTML = '';
    }

    renderReviews(tour.resenas || [], tour.calificacionPromedio || 0, tour.numeroResenas || 0);
    renderUserGallery(tour.resenas || []);
    renderFAQ(tour);
    
    Promise.all([
        loadRecommendations(tour),
        loadNearbyRestaurants(tour)
    ]).catch(err => console.error('Error in side recommendations:', err));

    renderMeetingMap(tour);
    renderAvailability(tour);
    setupWhatsAppLinks(tour);
    renderGuides(tour);
    renderRutas(tour);

    // Guardar referencia del tour para re-renderizar al cambiar idioma
    window._currentTourData = tour;
}

// ===== EXPERIENCIA GUIDES =====
function renderRutas(tour) {
    const cardRutas = document.getElementById('card-rutas');
    const container = document.getElementById('subCabanaCarousel');
    const indicators = document.getElementById('subCabanaIndicators');
    
    if (!cardRutas || !container || !indicators) return;

    if (!tour.rutas || tour.rutas.length === 0) {
        cardRutas.style.display = 'none';
        return;
    }

    cardRutas.style.display = 'block';
    
    // Translation options
    const lang = localStorage.getItem('appLang') || 'es';
    const noDescTxt = lang === 'en' ? 'No detailed description.' : lang === 'fr' ? 'Pas de description détaillée.' : 'Sin descripción detallada.';
    const diffMapEn = { 'Fácil':'Easy', 'Moderado':'Moderate', 'Difícil':'Hard', 'Extremo':'Extreme' };
    const diffMapFr = { 'Fácil':'Facile', 'Moderado':'Modéré', 'Difícil':'Difficile', 'Extremo':'Extrême' };

    container.innerHTML = tour.rutas.map((ruta, i) => {
        const diffDisplay = lang === 'en' && diffMapEn[ruta.dificultad] ? diffMapEn[ruta.dificultad] : 
                            lang === 'fr' && diffMapFr[ruta.dificultad] ? diffMapFr[ruta.dificultad] : 
                            (ruta.dificultad || 'Moderado');
                            
        const titulo = getL(ruta.titulo) || `Ruta ${i+1}`;
        const desc = getL(ruta.descripcion) || noDescTxt;
        const duracion = ruta.duracion || (lang === 'en' ? 'N/A' : 'N/A');
        const imgUrl = ruta.imagen ? ruta.imagen.url : 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=1200&fit=crop';

        const kmTitle = lang === 'en' ? 'Kilometers' : lang === 'fr' ? 'Kilomètres' : 'Kilómetros';
        const kilometrosInfo = ruta.kilometros ? `<span title="${kmTitle}"><i class="fas fa-route"></i> ${ruta.kilometros} km</span>` : '';

        return `
            <div class="sub-cabana-slide">
                <img src="${imgUrl}" alt="${titulo}" class="sub-cabana-img">
                <div class="sub-cabana-info">
                    <h4>${titulo}</h4>
                    <p>${desc}</p>
                    <div class="sub-cabana-stats">
                        <span title="Dificultad"><i class="fas fa-signal"></i> ${diffDisplay}</span>
                        <span title="Duración"><i class="fas fa-clock"></i> ${duracion}</span>
                        ${kilometrosInfo}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    indicators.innerHTML = tour.rutas.map((_, i) => `<span class="indicator ${i === 0 ? 'active' : ''}" onclick="goToSubCabana(${i})"></span>`).join('');
    
    // Reset index
    currentSubCabanaIndex = 0;
    
    // Start or restart auto-scroll if it was previously set up
    if (typeof startSubCabanaAutoScroll === 'function') {
        startSubCabanaAutoScroll();
    }
}

// ===== EXPERIENCIA GUIDES =====
function renderGuides(tour) {
    const cardGuides = document.getElementById('card-guides');
    const container = document.getElementById('guides-container');
    if (!cardGuides || !container) return;

    // Support both new guiasAsignados array and old single guiaReferencia
    let guides = [];
    if (tour.guiasAsignados && tour.guiasAsignados.length > 0) {
        guides = tour.guiasAsignados;
    } else if (tour.guiaReferencia) {
        // Fallback for older tours
        guides = [tour.guiaReferencia];
    }

    const noGuidesMsg = document.getElementById('no-guides-message');

    if (guides.length === 0) {
        cardGuides.style.display = 'none';
        if (noGuidesMsg) noGuidesMsg.style.display = 'block';
        return;
    }

    cardGuides.style.display = 'block';
    if (noGuidesMsg) noGuidesMsg.style.display = 'none';
    
    // Translation options
    const lang = localStorage.getItem('appLang') || 'es';
    const noBioTxt = lang === 'en' ? 'Experienced local guide.' : lang === 'fr' ? 'Guide local expérimenté.' : 'Guía local experto.';

    container.innerHTML = guides.map(guia => {
        // Make sure it's an object, just in case the backend sent an ID string (which it shouldn't, due to populate)
        const g = typeof guia === 'object' ? guia : {};
        const profileImg = typeof g.fotoPerfil === 'string' ? g.fotoPerfil : (g.fotoPerfil?.url || '');
        const bio = getL(g.biografia) || noBioTxt;
        const idiomas = (g.idiomas && g.idiomas.length > 0) ? g.idiomas.join(', ') : 'Español';
        
        const tel = g.telefono ? `<a href="tel:${g.telefono}" style="color:var(--primary); text-decoration:none;"><i class="fas fa-phone"></i> ${g.telefono}</a>` : '';
        const mail = g.email ? `<a href="mailto:${g.email}" style="color:var(--primary); text-decoration:none;"><i class="fas fa-envelope"></i> ${g.email}</a>` : '';
        const contacts = [tel, mail].filter(Boolean).join(' | ');
        const contactsHtml = contacts ? `<div style="font-size:0.85rem; margin-top:0.5rem; margin-bottom:0.5rem;">${contacts}</div>` : '';
        
        const profileBtnTxt = lang === 'en' ? 'View Profile' : lang === 'fr' ? 'Voir Profil' : 'Ver Perfil';
        const verPerfilBtn = (g._id || g.id) ? `<a href="/guia.html?id=${g._id || g.id}" style="margin-top:auto; display:inline-block; padding:0.5rem 1.2rem; background:var(--primary); color:white; border-radius:2rem; font-size:0.85rem; font-weight:600; text-decoration:none; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';"><i class="fas fa-eye"></i> ${profileBtnTxt}</a>` : '';

        return `
            <div style="background:var(--white); border:1px solid var(--gray-200); border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; align-items:center; text-align:center; box-shadow:var(--shadow-sm); transition:transform 0.2s; height: 100%;">
                <div style="width:100px; height:100px; overflow:hidden; border-radius:12px; margin-bottom:1rem; border:2px solid var(--primary-light); background:var(--gray-50); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    ${profileImg 
                        ? `<img src="${profileImg}" alt="${g.nombreCompleto}" style="width:100%; height:100%; object-fit:cover;">`
                        : `<i class="fas fa-user" style="font-size:2rem; color:var(--gray-400);"></i>`
                    }
                </div>
                <h4 style="font-size:1.1rem; font-weight:700; color:var(--gray-900); margin-bottom:0.2rem;">${g.nombreCompleto || 'Guía'}</h4>
                <div style="font-size:0.8rem; color:var(--primary); font-weight:600; margin-bottom:0.75rem;"><i class="fas fa-language"></i> ${idiomas}</div>
                <p style="font-size:0.85rem; color:var(--gray-600); line-height:1.4; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:0.75rem;">${bio}</p>
                ${contactsHtml}
                ${verPerfilBtn}
            </div>
        `;
    }).join('');
}

// ===== WHATSAPP RESERVATION =====
const WHATSAPP_NUMBER_DEFAULT = '524411234567'; // ← Número por defecto si el tour no tiene uno

function setupWhatsAppLinks(tour) {
    const lang = localStorage.getItem('appLang') || 'es';
    const whatsappNumber = tour.telefonoWhatsApp || WHATSAPP_NUMBER_DEFAULT;
    const tourName = getL(tour.nombre) || (lang === 'en' ? 'this experience' : lang === 'fr' ? 'cette expérience' : 'esta experiencia');
    const price = tour.precio?.amount ? `$${tour.precio.amount} ${tour.precio.moneda || 'MXN'}` : '';
    
    const messageEn = `Hello! 👋 I'm interested in the experience "${tourName}"` + 
                      (price ? ` (${price} per person)` : '') + 
                      `. I would like to know availability and make a reservation. Thanks!`;
    const messageFr = `Bonjour! 👋 Je suis intéressé(e) par l'expérience "${tourName}"` + 
                      (price ? ` (${price} par personne)` : '') + 
                      `. Je voudrais connaître les disponibilités et réserver. Merci!`;
    const messageEs = `¡Hola! 👋 Estoy interesado(a) en la experiencia "${tourName}"` +
                      (price ? ` (${price} por persona)` : '') +
                      `. Me gustaría saber disponibilidad y reservar. ¡Gracias!`;
    
    const message = encodeURIComponent(lang === 'en' ? messageEn : lang === 'fr' ? messageFr : messageEs);
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    // Sidebar button
    const sidebarBtn = document.getElementById('sidebar-whatsapp-btn');
    if (sidebarBtn) sidebarBtn.href = whatsappUrl;
    
    // Floating button
    const floatingBtn = document.getElementById('floating-whatsapp');
    if (floatingBtn) floatingBtn.href = whatsappUrl;
}

// ===== MEETING MAP =====
function renderMeetingMap(tour) {
    const lat = tour.direccion?.coordenadas?.lat;
    const lng = tour.direccion?.coordenadas?.lng;
    
    if (!lat || !lng) return;
    
    const mapCard = document.getElementById('card-meeting-map');
    const mapContainer = document.getElementById('meeting-map-container');
    const addressEl = document.getElementById('meeting-address');
    const mapLink = document.getElementById('meeting-map-link');
    
    mapCard.style.display = 'block';
    
    const parts = [];
    if (tour.direccion?.calle) parts.push(tour.direccion.calle);
    if (tour.direccion?.ciudad) parts.push(tour.direccion.ciudad);
    addressEl.textContent = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    // Embed OpenStreetMap
    const bboxPad = 0.006;
    mapContainer.innerHTML = `
        <iframe 
            width="100%" height="100%" frameborder="0" scrolling="no" 
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-bboxPad},${lat-bboxPad},${lng+bboxPad},${lat+bboxPad}&layer=mapnik&marker=${lat},${lng}"
            style="border:0; border-radius:0.5rem;">
        </iframe>
    `;
    
    mapLink.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// ===== AVAILABILITY =====
function renderAvailability(tour) {
    const lang = localStorage.getItem('appLang') || 'es';
    const card = document.getElementById('card-availability');
    const infoDiv = document.getElementById('availability-info');
    const weekGrid = document.getElementById('week-calendar');
    
    const diasSemanaEs = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const diasCortosEs = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const diasSemanaEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const diasCortosEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const diasSemanaFr = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const diasCortosFr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    const diasSemana = lang === 'en' ? diasSemanaEn : lang === 'fr' ? diasSemanaFr : diasSemanaEs;
    const diasCortos = lang === 'en' ? diasCortosEn : lang === 'fr' ? diasCortosFr : diasCortosEs;

    // Tour dias are saved in Spanish in DB likely
    const tourDias = tour.disponibilidad?.diasSemana || [];
    const todoElAnio = tour.disponibilidad?.todoElAnio !== false;
    
    card.style.display = 'block';
    
    const dispAnioTxt = lang === 'en' ? 'Available all year' : lang === 'fr' ? 'Disponible toute l\'année' : 'Disponible todo el año';
    const tempTxt = lang === 'en' ? 'Season: ' : lang === 'fr' ? 'Saison: ' : 'Temporada: ';
    const salTxt = lang === 'en' ? 'Departures: ' : lang === 'fr' ? 'Départs: ' : 'Salidas: ';
    const prevResTxt = lang === 'en' ? 'Daily departures (reservation required)' : lang === 'fr' ? 'Départs quotidiens (réservation obligatoire)' : 'Salidas todos los días (previa reservación)';
    const durTxt = lang === 'en' ? 'Duration: ' : lang === 'fr' ? 'Durée: ' : 'Duración: ';

    let infoHtml = '';
    if (todoElAnio) {
        infoHtml += `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;"><i class="fas fa-check-circle" style="color:#10b981;"></i><span style="font-size:0.9rem; color:var(--gray-700);">${dispAnioTxt}</span></div>`;
    } else if (tour.disponibilidad?.temporada) {
        const locale = lang === 'en' ? 'en-US' : 'es-MX';
        const inicio = tour.disponibilidad.temporada.inicio ? new Date(tour.disponibilidad.temporada.inicio).toLocaleDateString(locale, {month:'long'}) : '';
        const fin = tour.disponibilidad.temporada.fin ? new Date(tour.disponibilidad.temporada.fin).toLocaleDateString(locale, {month:'long'}) : '';
        infoHtml += `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;"><i class="fas fa-calendar-check" style="color:var(--primary);"></i><span style="font-size:0.9rem; color:var(--gray-700);">${tempTxt} ${inicio} a ${fin}</span></div>`;
    }
    
    if (tourDias.length > 0 && tourDias.length < 7) {
        const localizedDias = tourDias.map(d => {
            const index = diasSemanaEs.indexOf(d);
            return index !== -1 ? diasSemana[index] : d;
        });
        infoHtml += `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;"><i class="fas fa-clock" style="color:var(--primary);"></i><span style="font-size:0.9rem; color:var(--gray-700);">${salTxt} ${localizedDias.join(', ')}</span></div>`;
    } else {
        infoHtml += `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;"><i class="fas fa-clock" style="color:#10b981;"></i><span style="font-size:0.9rem; color:var(--gray-700);">${prevResTxt}</span></div>`;
    }
    
    if (tour.duracion?.descripcion) {
        infoHtml += `<div style="display:flex; align-items:center; gap:0.5rem;"><i class="fas fa-hourglass-half" style="color:var(--primary);"></i><span style="font-size:0.9rem; color:var(--gray-700);">${durTxt} ${getL(tour.duracion.descripcion) || tour.duracion.descripcion}</span></div>`;
    }
    
    infoDiv.innerHTML = infoHtml;
    
    // Visual week calendar
    weekGrid.innerHTML = diasSemanaEs.map((dia, i) => {
        const isActive = tourDias.length === 0 || tourDias.includes(dia);
        const bg = isActive ? 'var(--primary)' : 'var(--gray-200)';
        const color = isActive ? 'white' : 'var(--gray-400)';
        return `
            <div style="text-align:center; padding:0.5rem 0.15rem; border-radius:0.4rem; background:${bg}; transition: transform 0.2s;" 
                ${isActive ? 'onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'scale(1)\'"' : ''}>
                <div style="font-size:0.65rem; font-weight:700; color:${color}; text-transform:uppercase;">${diasCortos[i]}</div>
                <div style="margin-top:0.2rem;">${isActive ? '<i class="fas fa-check" style="font-size:0.7rem; color:' + color + ';"></i>' : '<i class="fas fa-times" style="font-size:0.7rem; color:' + color + ';"></i>'}</div>
            </div>
        `;
    }).join('');
}

function populateList(cardId, listId, items, noEspecTxt) {
    const card = document.getElementById(cardId);
    const list = document.getElementById(listId);
    if (!card || !list) return;
    if (items && items.length > 0) {
        card.style.display = 'block';
        list.innerHTML = items.map(i => `<li>${getL(i)}</li>`).join('');
    } else {
        card.style.display = 'block';
        list.innerHTML = `<li><span class="text-muted">${noEspecTxt || 'No especificado'}</span></li>`;
    }
}

// Carousel functions
function showTourSlide(index) {
    const items = document.querySelectorAll('.tour-carousel-item');
    if (!items || items.length === 0) return;

    items.forEach(item => item.classList.remove('active'));
    
    const slide = document.getElementById(`tour-slide-${index}`);
    if (slide) slide.classList.add('active');

    const indicator = document.getElementById('tour-slide-indicator');
    if (indicator) {
        indicator.textContent = `${index + 1} / ${currentTourImages.length}`;
    }
}

window.nextTourImage = function(e) {
    if (e) e.stopPropagation();
    if (currentTourImages.length <= 1) return;
    currentTourImageIndex = (currentTourImageIndex + 1) % currentTourImages.length;
    showTourSlide(currentTourImageIndex);
}

window.prevTourImage = function(e) {
    if (e) e.stopPropagation();
    if (currentTourImages.length <= 1) return;
    currentTourImageIndex = (currentTourImageIndex - 1 + currentTourImages.length) % currentTourImages.length;
    showTourSlide(currentTourImageIndex);
}

// Lightbox functions
window.openTourLightbox = function(url) {
    document.getElementById('tour-lightbox-img').src = url;
    document.getElementById('tour-lightbox').classList.add('active');
}

window.closeTourLightbox = function() {
    document.getElementById('tour-lightbox').classList.remove('active');
}

// Close lightbox on backdrop click
document.getElementById('tour-lightbox')?.addEventListener('click', function (e) {
    if (e.target === this) closeTourLightbox();
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTourLightbox();
    }
});

// ===== REVIEWS AND LIKES LOGIC =====

function renderReviews(resenas, promedio, total) {
    const summaryContainer = document.getElementById('reviews-summary');
    const listContainer = document.getElementById('reviews-list');
    
    const lang = localStorage.getItem('appLang') || 'es';
    if (total > 0) {
        // Render Summary
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= promedio) {
                starsHtml += '<i class="fas fa-star" style="color: var(--warning);"></i>';
            } else if (i - 0.5 <= promedio) {
                starsHtml += '<i class="fas fa-star-half-alt" style="color: var(--warning);"></i>';
            } else {
                starsHtml += '<i class="far fa-star" style="color: var(--warning);"></i>';
            }
        }
        
        const reviewTxt = lang === 'en' ? (total === 1 ? 'review' : 'reviews') : (total === 1 ? 'reseña' : 'reseñas');
        
        summaryContainer.innerHTML = `
            <div style="font-size: 2.5rem; font-weight: 700; color: var(--gray-800);">${Number(promedio).toFixed(1)}</div>
            <div style="font-size: 1.2rem; margin: 0.5rem 0;">${starsHtml}</div>
            <div style="color: var(--gray-500);">${total} ${reviewTxt}</div>
        `;
        
        // Render List
        listContainer.innerHTML = resenas.map(r => {
            let userStars = '';
            for (let i = 1; i <= 5; i++) {
                userStars += i <= r.calificacion 
                    ? '<i class="fas fa-star" style="color: var(--warning); font-size: 0.8rem;"></i>' 
                    : '<i class="far fa-star" style="color: var(--warning); font-size: 0.8rem;"></i>';
            }
            
            const date = new Date(r.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
            
            // Fotos de la reseña
            let fotosHtml = '';
            if (r.fotos && r.fotos.length > 0) {
                fotosHtml = `
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                        ${r.fotos.map((f, idx) => `
                            <img src="${f.url}" alt="Foto de ${r.nombreUsuario}" 
                                style="width:80px; height:80px; object-fit:cover; border-radius:0.4rem; cursor:pointer; border:1px solid var(--gray-200); transition: transform 0.2s;"
                                onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                                onclick="openPhotoLightbox('${f.url}')">
                        `).join('')}
                    </div>
                `;
            }
            
            return `
                <div style="padding: 1rem; border: 1px solid var(--gray-200); border-radius: 0.5rem; background: var(--gray-50);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div>
                            <div style="font-weight: 600; color: var(--gray-800);">${r.nombreUsuario}</div>
                            <div style="margin-top: 0.2rem;">${userStars}</div>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--gray-500);">${date}</div>
                    </div>
                    <p style="color: var(--gray-700); font-size: 0.95rem; margin-top: 0.5rem; line-height: 1.5;">${r.comentario}</p>
                    ${fotosHtml}
                </div>
            `;
        }).join('');
    } else {
        const noReviewsTxt = lang === 'en' ? 'No reviews yet. Be the first to review!' : 'Aún no hay reseñas. ¡Sé el primero en opinar!';
        summaryContainer.innerHTML = `<p style="color: var(--gray-500); padding: 1rem 0;">${noReviewsTxt}</p>`;
        listContainer.innerHTML = '';
    }
}

function renderUserGallery(resenas) {
    const galleryCard = document.getElementById('card-user-gallery');
    const grid = document.getElementById('user-gallery-grid');
    const countEl = document.getElementById('gallery-user-count');
    
    // Collect all photos from all reviews
    const allPhotos = [];
    resenas.forEach(r => {
        if (r.fotos && r.fotos.length > 0) {
            r.fotos.forEach(f => {
                allPhotos.push({ url: f.url, usuario: r.nombreUsuario, fecha: r.fecha });
            });
        }
    });
    
    if (allPhotos.length === 0) {
        galleryCard.style.display = 'none';
        return;
    }
    
    galleryCard.style.display = 'block';
    const lang = localStorage.getItem('appLang') || 'es';
    const photosTxt = lang === 'en' ? (allPhotos.length === 1 ? 'traveler photo' : 'traveler photos') : (allPhotos.length === 1 ? 'foto de viajeros' : 'fotos de viajeros');
    countEl.textContent = `${allPhotos.length} ${photosTxt}`;
    
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

// ===== FAQ ACCORDION =====
function renderFAQ(tour) {
    const faqList = document.getElementById('faq-list');
    const lang = localStorage.getItem('appLang') || 'es';
    
    const faqsEs = [
        {
            q: '¿Puedo llevar a mi mascota?',
            a: 'En la mayoría de nuestras experiencias al aire libre se permiten mascotas con correa. Sin embargo, en recorridos dentro de cuevas o zonas protegidas no está permitido. Consulte antes de reservar.'
        },
        {
            q: '¿Hay baños disponibles durante el recorrido?',
            a: 'Depende de la ruta. Algunas experiencias cuentan con acceso a sanitarios en puntos intermedios, mientras que en rutas más remotas no hay instalaciones. Su guía le informará antes de iniciar.'
        },
        {
            q: '¿Qué pasa si llueve?',
            a: 'Si las condiciones climáticas representan un riesgo, la experiencia se reprograma sin costo. En caso de lluvia ligera, la mayoría de recorridos se realizan con normalidad. Se recomienda traer impermeable.'
        },
        {
            q: '¿Necesito experiencia previa?',
            a: `Esta experiencia tiene dificultad "${tour.dificultad || 'Moderado'}". Las experiencias de nivel Fácil no requieren experiencia previa. Para Moderado y superior, se recomienda condición física adecuada.`
        },
        {
            q: '¿Qué incluye el precio?',
            a: 'El precio incluye el servicio de guía certificado y los elementos indicados en la sección "Incluye". Los elementos de la sección "No Incluye" son responsabilidad del visitante (ej. transporte, alimentos).'
        },
        {
            q: '¿Puedo cancelar mi reservación?',
            a: 'Sí, las cancelaciones realizadas con al menos 24 horas de anticipación reciben un reembolso completo. Cancelaciones tardías están sujetas a política del operador.'
        }
    ];

    const diffMapEn = { 'Fácil':'Easy', 'Moderado':'Moderate', 'Difícil':'Hard', 'Extremo':'Extreme' };
    const diffMapFr = { 'Fácil':'Facile', 'Moderado':'Modéré', 'Difícil':'Difficile', 'Extremo':'Extrême' };
    const diffDisplay = lang === 'en' && diffMapEn[tour.dificultad] ? diffMapEn[tour.dificultad] : 
                        lang === 'fr' && diffMapFr[tour.dificultad] ? diffMapFr[tour.dificultad] : 
                        tour.dificultad;

    const faqsEn = [
        {
            q: 'Can I bring my pet?',
            a: 'Pets on a leash are allowed on most of our outdoor experiences. However, they are not permitted in caves or protected areas. Please inquire before booking.'
        },
        {
            q: 'Are there bathrooms available during the tour?',
            a: 'It depends on the route. Some experiences have access to restrooms at intermediate points, while more remote routes do not. Your guide will inform you before start.'
        },
        {
            q: 'What happens if it rains?',
            a: 'If weather conditions pose a risk, the experience is rescheduled at no cost. In case of light rain, most tours proceed normally. Bringing a raincoat is recommended.'
        },
        {
            q: 'Do I need previous experience?',
            a: `This experience is rated "${diffDisplay || 'Moderate'}". Easy level experiences do not require previous experience. For Moderate and above, a suitable physical condition is recommended.`
        },
        {
            q: 'What does the price include?',
            a: 'The price includes certified guide service and the items listed in the "Included" section. Items in the "Not Included" section are visitor\'s responsibility (e.g., transport, food).'
        },
        {
            q: 'Can I cancel my reservation?',
            a: 'Yes, cancellations made at least 24 hours in advance receive a full refund. Late cancellations are subject to the operator\'s policy.'
        }
    ];

    const faqsFr = [
        {
            q: 'Puis-je amener mon animal de compagnie?',
            a: 'La plupart de nos expériences en plein air acceptent les animaux tenus en laisse. Cependant, ils ne sont pas autorisés dans les grottes ou les zones protégées. Veuillez vous renseigner avant de réserver.'
        },
        {
            q: 'Y a-t-il des toilettes disponibles pendant l\'excursion ?',
            a: 'Cela dépend de l\'itinéraire. Certaines expériences donnent accès à des toilettes à des points intermédiaires, tandis que les itinéraires plus reculés n\'en ont pas. Votre guide vous en informera avant le départ.'
        },
        {
            q: 'Que se passe-t-il s\'il pleut ?',
            a: 'Si les conditions météorologiques présentent un risque, l\'expérience est reprogrammée sans frais. En cas de pluie légère, la plupart des excursions se déroulent normalement. Il est recommandé d\'apporter un imperméable.'
        },
        {
            q: 'Ai-je besoin d\'une expérience préalable ?',
            a: `Cette expérience est classée "${diffDisplay || 'Modéré'}". Les expériences de niveau Facile ne nécessitent aucune expérience préalable. Pour le niveau Modéré et supérieur, une bonne condition physique est recommandée.`
        },
        {
            q: 'Que comprend le prix ?',
            a: 'Le prix comprend le service d\'un guide certifié et les articles énumérés dans la section "Comprend". Les articles de la section "Ne comprend pas" sont à la charge du visiteur (ex: transport, repas).'
        },
        {
            q: 'Puis-je annuler ma réservation ?',
            a: 'Oui, les annulations effectuées au moins 24 heures à l\'avance bénéficient d\'un remboursement complet. Les annulations tardives sont soumises à la politique de l\'opérateur.'
        }
    ];

    const faqs = lang === 'en' ? faqsEn : lang === 'fr' ? faqsFr : faqsEs;
    
    faqList.innerHTML = faqs.map((faq, i) => `
        <div class="faq-item" style="border-bottom: 1px solid var(--gray-200);">
            <button class="faq-toggle" onclick="toggleFaq(this)" style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:1rem 0.25rem; background:none; border:none; cursor:pointer; text-align:left; gap:1rem;">
                <span style="font-weight:600; color:var(--gray-800); font-size:0.95rem;">${faq.q}</span>
                <i class="fas fa-chevron-down" style="color:var(--primary); transition: transform 0.3s; flex-shrink:0;"></i>
            </button>
            <div class="faq-answer" style="max-height:0; overflow:hidden; transition: max-height 0.35s ease, padding 0.35s ease; padding:0 0.25rem;">
                <p style="color:var(--gray-600); font-size:0.9rem; line-height:1.6; padding-bottom:1rem;">${faq.a}</p>
            </div>
        </div>
    `).join('');
}

function toggleFaq(btn) {
    const answer = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
    
    // Close all others
    document.querySelectorAll('.faq-answer').forEach(a => {
        a.style.maxHeight = '0px';
    });
    document.querySelectorAll('.faq-toggle i').forEach(ic => {
        ic.style.transform = 'rotate(0deg)';
    });
    
    if (!isOpen) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

// ===== CROSS-RECOMMENDATIONS =====
function getTourImage(tour) {
    // Priority: admin-uploaded images > imagenPrincipal > fallback
    if (tour.imagenes && tour.imagenes.length > 0 && tour.imagenes[0].url) {
        return tour.imagenes[0].url;
    }
    if (tour.imagenPrincipal && tour.imagenPrincipal.url) {
        return tour.imagenPrincipal.url;
    }
    return '/images/PueblosMágicos.svg.png';
}

async function loadRecommendations(currentTour) {
    try {
        const lang = localStorage.getItem('appLang') || 'es';
        const tipo = currentTour.tipo; // Assuming 'tipo' is a property of currentTour
        const res = await fetch(`/api/tours?tipo=${encodeURIComponent(tipo)}&limit=3&lang=${lang}&allLangs=true`);
        const data = await res.json();
        
        if (!data.success || !data.data) return;
        
        const currentId = currentTour._id || currentTour.id;
        
        // Filter: same category or same type, excluding current tour
        let similar = data.data.filter(t => {
            const tId = t._id || t.id;
            return tId !== currentId && (
                t.categoria === currentTour.categoria || t.tipo === currentTour.tipo
            );
        });
        
        // Shuffle and take up to 3
        similar = similar.sort(() => Math.random() - 0.5).slice(0, 3);
        
        const container = document.getElementById('cross-recommendations');
        const grid = document.getElementById('recommendations-grid');
        
        if (similar.length === 0) {
            grid.innerHTML = '';
            const t = container.querySelector('h2');
            if (t) t.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        grid.innerHTML = similar.map(tour => {
            const img = getTourImage(tour);
            
            let iconClass = 'fas fa-map-marked-alt';
            if (tour.categoria) {
                const catLower = tour.categoria.toLowerCase();
                if (catLower.includes('cultural') || catLower.includes('arqueolog') || catLower.includes('historia')) iconClass = 'fas fa-landmark';
                else if (catLower.includes('naturaleza') || catLower.includes('eco')) iconClass = 'fas fa-leaf';
                else if (catLower.includes('aventura')) iconClass = 'fas fa-hiking';
                else if (catLower.includes('acu') || catLower.includes('rio') || catLower.includes('cascada')) iconClass = 'fas fa-water';
                else if (catLower.includes('gastro')) iconClass = 'fas fa-utensils';
                else if (catLower.includes('religios')) iconClass = 'fas fa-church';
            }
            const cleanTitle = getL(tour.nombre) || 'Experiencia';
            
            return `
                <a href="/experiencia.html?id=${tour._id || tour.id}" style="text-decoration:none;">
                    <div style="height:200px; border-radius:16px; position:relative; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.15); transition:all 0.3s ease;"
                        onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(0,0,0,0.15)'">
                        <div style="background-image:url('${img}'); position:absolute; inset:0; background-size:cover; background-position:center; filter:brightness(0.85);"></div>
                        <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%);"></div>
                        
                        <div style="position:absolute; top:0.8rem; right:0.8rem; z-index:2;">
                            <span style="background:var(--primary); color:white; padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.7rem; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.3);"><i class="fas fa-tag" style="margin-right:0.3rem;"></i>${translateCategoria(tour.categoria)}</span>
                        </div>

                        <div style="position:relative; z-index:2; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.2rem; text-align:center;">
                            <i class="${iconClass}" style="color:white; font-size:2.5rem; margin-bottom:1rem; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6));"></i>
                            <span style="color:white; font-weight:700; font-size:1.1rem; text-shadow:0 2px 4px rgba(0,0,0,0.9); line-height:1.2;">${cleanTitle}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading recommendations:', err);
    }
}

// ===== NEARBY RESTAURANTS =====
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadNearbyRestaurants(currentTour) {
    try {
        const lang = localStorage.getItem('appLang') || 'es';
        const response = await fetch(`/api/restaurants?limit=3&sort=-calificacion&lang=${lang}`);
        const data = await response.json();
        
        const hideRest = () => {
            const r = document.getElementById('nearby-restaurants-section');
            if (r) r.style.display = 'none';
        };

        if (!data.success || !data.data || !data.data.restaurantes) {
            hideRest();
            return;
        }
        
        let restaurants = data.data.restaurantes.filter(r => r.activo !== false);
        
        // If tour has coordinates, sort by distance
        const tourLat = currentTour.direccion?.coordenadas?.lat;
        const tourLng = currentTour.direccion?.coordenadas?.lng;
        
        if (tourLat && tourLng) {
            restaurants = restaurants.map(r => {
                const rLat = r.direccion?.coordenadas?.lat;
                const rLng = r.direccion?.coordenadas?.lng;
                r._distance = (rLat && rLng) ? haversineDistance(tourLat, tourLng, rLat, rLng) : 9999;
                return r;
            }).sort((a, b) => a._distance - b._distance);
        } else {
            // Random selection
            restaurants = restaurants.sort(() => Math.random() - 0.5);
        }
        
        // Take up to 3
        restaurants = restaurants.slice(0, 3);
        if (restaurants.length === 0) {
            const r = document.getElementById('nearby-restaurants-section');
            if (r) r.style.display = 'none';
            return;
        }
        
        // Show container and populate grid
        const container = document.getElementById('cross-recommendations');
        container.style.display = 'block';
        
        const restCercTxt = lang === 'en' ? 'Nearby Restaurants' : 'Restaurantes Cercanos';

        // Add heading and grid for restaurants
        let restaurantSection = document.getElementById('nearby-restaurants-section');
        if (!restaurantSection) {
            restaurantSection = document.createElement('div');
            restaurantSection.id = 'nearby-restaurants-section';
            restaurantSection.style.marginTop = '2rem';
            container.appendChild(restaurantSection);
        }
        restaurantSection.innerHTML = `
            <h2 style="font-size:1.4rem; font-weight:700; color:var(--gray-800); margin-bottom:1.2rem; text-align:center;">
                <i class="fas fa-utensils" style="color: var(--primary); margin-right: 0.4rem;"></i> ${restCercTxt}
            </h2>
            <div id="nearby-restaurants-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 320px)); gap:1.2rem; justify-content:center;"></div>
        `;
        
        const grid = document.getElementById('nearby-restaurants-grid');
        if (!grid) return;
        
        grid.innerHTML = restaurants.map(rest => {
            const img = (rest.imagenes && rest.imagenes.length > 0 && rest.imagenes[0].url) 
                ? rest.imagenes[0].url 
                : '/images/PueblosMágicos.svg.png';
            const distTxt = rest._distance && rest._distance < 9999 
                ? `<div style="position:absolute; top:0.8rem; right:0.8rem; background:rgba(0,0,0,0.7); color:white; padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.75rem; font-weight:600; z-index:3; backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.2);"><i class="fas fa-map-marker-alt" style="margin-right:0.3rem;"></i>${rest._distance.toFixed(1)} km</div>`
                : '';
                
            const cleanTitle = getL(rest.nombre) || 'Restaurante';
            
            return `
                <a href="/restaurante.html?id=${rest._id || rest.id}" style="text-decoration:none;">
                     <div style="height:200px; border-radius:16px; position:relative; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.15); transition:all 0.3s ease;"
                        onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 10px rgba(0,0,0,0.15)'">
                        <div style="background-image:url('${img}'); position:absolute; inset:0; background-size:cover; background-position:center; filter:brightness(0.85);"></div>
                        <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%);"></div>
                        
                        ${distTxt}
                        <div style="position:absolute; top:0.8rem; left:0.8rem; z-index:2;">
                            <span style="background:#eab308; color:white; padding:0.2rem 0.6rem; border-radius:1rem; font-size:0.75rem; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.3);"><i class="fas fa-star" style="margin-right:0.3rem;"></i>${rest.calificacionPromedio || 'N/A'}</span>
                        </div>

                        <div style="position:relative; z-index:2; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.2rem; text-align:center;">
                            <i class="fas fa-utensils" style="color:white; font-size:2.5rem; margin-bottom:1rem; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6));"></i>
                            <span style="color:white; font-weight:700; font-size:1.1rem; text-shadow:0 2px 4px rgba(0,0,0,0.9); line-height:1.2;">${cleanTitle}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading nearby restaurants:', err);
    }
}

async function setupReviewsAndLikes() {
    const token = localStorage.getItem('authToken');
    
    // UI Elements
    const btnWriteReview = document.getElementById('btn-write-review');
    const formContainer = document.getElementById('review-form-container');
    const btnToggleLike = document.getElementById('btn-toggle-like');
    
    // Check Auth
    if (token) {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) currentUser = JSON.parse(stored);
            
            if (currentUser && currentUser.rol === 'turista') {
                // UI Changes - Logged in Tourist
                if (btnWriteReview) btnWriteReview.style.display = 'block';
                if (btnToggleLike) btnToggleLike.style.display = 'inline-flex';
                
                // Fetch User Favorites to update Like button state
                const res = await fetch('/api/auth/user/profile', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const favs = data.data.experienciasFavoritas || [];
                    const fav = favs.find(f => f.tourId === currentTourId);
                    
                    if (fav) {
                        setLikeButtonState(true);
                    }
                }
            } else {
               if (btnToggleLike) {
                   btnToggleLike.style.display = 'none';
               }
            }
        } catch(e) { console.error('Error setup auth', e); }
    } else {
        if (btnToggleLike) {
            btnToggleLike.style.display = 'none';
        }
    }
    
    // Setup Review Form Toggle
    if (btnWriteReview) {
        btnWriteReview.addEventListener('click', () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    const btnCancel = document.getElementById('btn-cancel-review');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            formContainer.style.display = 'none';
        });
    }
    
    // ===== Photo upload preview logic =====
    let reviewPhotos = [];
    const photoInput = document.getElementById('review-photo-input');
    const photoPreview = document.getElementById('review-photo-preview');
    const photoZone = document.getElementById('review-photo-zone');
    
    function addReviewPhotos(files) {
        const remaining = 5 - reviewPhotos.length;
        const toAdd = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining);
        
        toAdd.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`"${file.name}" supera los 5MB.`);
                return;
            }
            reviewPhotos.push(file);
        });
        
        renderPhotoPreview();
    }
    
    function renderPhotoPreview() {
        if (!photoPreview || !photoZone) return;
        photoPreview.innerHTML = reviewPhotos.map((file, i) => {
            const url = URL.createObjectURL(file);
            return `
                <div style="position:relative; width:70px; height:70px; border-radius:0.4rem; overflow:hidden; border:2px solid var(--primary);">
                    <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                    <button type="button" onclick="removeReviewPhoto(${i})" style="position:absolute; top:2px; right:2px; width:20px; height:20px; border-radius:50%; background:rgba(239,68,68,0.9); color:white; border:none; cursor:pointer; font-size:0.6rem; display:flex; align-items:center; justify-content:center;"><i class="fas fa-times"></i></button>
                </div>
            `;
        }).join('');
        
        if (reviewPhotos.length >= 5) {
            photoZone.style.display = 'none';
        } else {
            photoZone.style.display = 'block';
        }
    }
    
    // Make removeReviewPhoto global
    window.removeReviewPhoto = function(index) {
        reviewPhotos.splice(index, 1);
        renderPhotoPreview();
    };
    
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            addReviewPhotos(e.target.files);
            e.target.value = '';
        });
    }
    
    if (photoZone) {
        // Drag and drop
        photoZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoZone.style.borderColor = 'var(--primary)';
            photoZone.style.background = 'var(--gray-50)';
        });
        photoZone.addEventListener('dragleave', () => {
            photoZone.style.borderColor = 'var(--gray-300)';
            photoZone.style.background = 'transparent';
        });
        photoZone.addEventListener('drop', (e) => {
            e.preventDefault();
            photoZone.style.borderColor = 'var(--gray-300)';
            photoZone.style.background = 'transparent';
            addReviewPhotos(e.dataTransfer.files);
        });
    }
    
    const reviewForm = document.getElementById('form-nueva-resena');
    if (reviewForm) {
        // Setup Review Submit (with FormData for photos)
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = document.getElementById('review-rating').value;
            const comentario = document.getElementById('review-comment').value;
            
            try {
                const btn = e.target.querySelector('button[type="submit"]');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Enviando...';
                }
                
                const formData = new FormData();
                formData.append('rating', rating);
                formData.append('comentario', comentario);
                reviewPhotos.forEach(file => formData.append('fotos', file));
                
                const res = await fetch(`/api/tours/${currentTourId}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    },
                    body: formData
                });
                
                const data = await res.json();
                if (data.success) {
                    alert('¡Reseña enviada con éxito!');
                    reviewPhotos = [];
                    renderPhotoPreview();
                    loadExperienceData(currentTourId);
                    if (formContainer) formContainer.style.display = 'none';
                    e.target.reset();
                } else {
                    alert(data.message || 'Error al enviar la reseña');
                }
            } catch (error) {
                console.error(error);
                alert('Error al enviar la reseña');
            } finally {
                const btn = e.target.querySelector('button[type="submit"]');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Enviar Reseña';
                }
            }
        });
    }

    // Setup Like Toggle
    if (btnToggleLike && !btnToggleLike.disabled) {
        btnToggleLike.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!token || !currentUser || currentUser.rol !== 'turista') return;
            
            try {
                const res = await fetch(`/api/user/tour-favorites/${currentTourId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ tipoMeGusta: 'Favorito general' })
                });
                
                const data = await res.json();
                if (data.success) {
                    setLikeButtonState(data.isFavorite);
                }
            } catch(err) {
                console.error('Error toggling like:', err);
            }
        });
    }
}

function setLikeButtonState(isFavorite) {
    const cb = document.getElementById('favorite-checkbox');
    if (cb) {
        cb.checked = isFavorite;
    }
}

// ===== PHOTO LIGHTBOX =====
function openPhotoLightbox(url) {
    const lb = document.getElementById('photo-lightbox');
    const img = document.getElementById('photo-lightbox-img');
    img.src = url;
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePhotoLightbox() {
    const lb = document.getElementById('photo-lightbox');
    lb.style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePhotoLightbox();
});

// Re-renderizar contenido dinámico cuando cambie el idioma
document.addEventListener('languageChanged', () => {
    if (currentTourId) {
        loadExperienceData(currentTourId);
    }
});

// ===== SUB-CABAÑA CAROUSEL LOGIC =====
let subCabanaInterval;
let currentSubCabanaIndex = 0;

// Botones siguiente/anterior
function scrollSubCabana(direction) {
    const carousel = document.getElementById('subCabanaCarousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.sub-cabana-slide');
    const total = slides.length;
    if (total <= 1) return;

    currentSubCabanaIndex = (currentSubCabanaIndex + direction + total) % total;
    goToSubCabana(currentSubCabanaIndex);
}

// Ir a un índice específico (Usado por los botones y puntos indicadores)
function goToSubCabana(index) {
    const carousel = document.getElementById('subCabanaCarousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.sub-cabana-slide');
    if (index < 0 || index >= slides.length) return;

    currentSubCabanaIndex = index;
    const slideWidth = slides[0].offsetWidth; // Calculamos el ancho del slide al momento
    
    carousel.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
    updateSubCabanaIndicators(index);
    resetSubCabanaAutoScroll();
}

// Pintar el puntito correspondiente
function updateSubCabanaIndicators(index) {
    const indicators = document.querySelectorAll('#subCabanaIndicators .indicator');
    indicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
    });
}

// Opcional: Auto-Scroll cada 5 segundos
function startSubCabanaAutoScroll() {
    clearInterval(subCabanaInterval);
    const carousel = document.getElementById('subCabanaCarousel');
    if (carousel && carousel.querySelectorAll('.sub-cabana-slide').length > 1) {
        subCabanaInterval = setInterval(() => {
            scrollSubCabana(1);
        }, 5000); 
    }
}

function resetSubCabanaAutoScroll() {
    startSubCabanaAutoScroll();
}

/** 
 * EVENT LISTENERS:
 * Lógica para detectar cuando arrastras con el dedo en el móvil
 * o el trackpad en PC, lo cual actualiza el indicador activo visualmente
 */
document.addEventListener('DOMContentLoaded', () => {
    startSubCabanaAutoScroll(); // Iniciamos auto-rotación
    
    const carousel = document.getElementById('subCabanaCarousel');
    if (carousel) {
        carousel.addEventListener('scroll', (e) => {
             // Agregamos un pequeó retardo (debounce)
            clearTimeout(e.target.scrollTimeout);
            e.target.scrollTimeout = setTimeout(() => {
                const slides = e.target.querySelectorAll('.sub-cabana-slide');
                if (slides.length > 0) {
                    const slideWidth = slides[0].offsetWidth;
                    // Calcula qué slide está visible
                    const index = Math.round(e.target.scrollLeft / slideWidth);
                    if (index !== currentSubCabanaIndex) {
                        currentSubCabanaIndex = index;
                        updateSubCabanaIndicators(index);
                        resetSubCabanaAutoScroll(); // Al interactuar reseteamos el temporizador
                    }
                }
            }, 50);
        }, { passive: true });
    }
});
