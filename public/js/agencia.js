// ===== AGENCY DETAIL PAGE =====
let currentAgenciaId = null;
let selectedStars = 0;
let galleryImages = [];
let reviewGalleryImages = [];
let currentLightboxGallery = [];
let lightboxIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentAgenciaId = urlParams.get('id');

    if (!currentAgenciaId) { showError(); return; }

    loadAgenciaDetails(currentAgenciaId);

    document.addEventListener('languageChanged', (e) => {
        if (window.currentAgencia) renderAgenciaData(window.currentAgencia, e.detail.lang);
    });

    // Star picker interaction
    const stars = document.querySelectorAll('#star-picker .fa-star');
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.val)));
        star.addEventListener('mouseleave', () => highlightStars(selectedStars));
        star.addEventListener('click', () => {
            selectedStars = parseInt(star.dataset.val);
            highlightStars(selectedStars);
        });
    });

    // Close lightbox with ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxMove(-1);
        if (e.key === 'ArrowRight') lightboxMove(1);
    });
});

async function loadAgenciaDetails(id) {
    try {
        const response = await fetch(`/api/agencias/${id}`);
        const data = await response.json();

        if (data.success && data.data) {
            window.currentAgencia = data.data;
            const lang = localStorage.getItem('appLang') || 'es';
            renderAgenciaData(window.currentAgencia, lang);

            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('agency-content').style.display = 'block';

            // Load reviews and tours after main data
            loadReviews(id);
            loadTours(id);
            loadCalendario(id);
            checkFavoriteStatus();
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error fetching agency info:', error);
        showError();
    }
}

function renderAgenciaData(agencia, lang) {
    const name = agencia.nombre || '';

    // Title & SEO
    document.getElementById('page-title').textContent = `${name} - Jalpan de Serra`;
    const metaDesc = document.getElementById('page-description');
    if (metaDesc) metaDesc.content = `Información sobre ${name}. Agencia local en Jalpan de Serra.`;

    // Breadcrumb name
    const breadcrumbName = document.getElementById('breadcrumb-name');
    if (breadcrumbName) breadcrumbName.textContent = name;

    // Agency name in hero
    document.getElementById('agency-name').textContent = name;

    // Logo & Background
    const defaultImg = '/images/PueblosMágicos.svg.png';
    const logoEl = document.getElementById('agency-logo');
    const bgEl = document.getElementById('agency-bg');
    if (agencia.logo && agencia.logo.url) {
        logoEl.src = agencia.logo.url;
        bgEl.src = agencia.logo.url;
    } else {
        logoEl.src = defaultImg;
        bgEl.src = defaultImg;
    }

    // RNT
    const rntBadge = document.getElementById('agency-rnt-badge');
    if (agencia.rnt && rntBadge) {
        document.getElementById('agency-rnt-val').textContent = agencia.rnt;
        rntBadge.style.display = 'inline-flex';
    } else if (rntBadge) {
        rntBadge.style.display = 'none';
    }

    // Hero star rating (from data already in agencia)
    if (agencia.calificacionPromedio && agencia.numeroResenas) {
        const heroStarsSection = document.getElementById('agency-hero-stars');
        if (heroStarsSection) {
            document.getElementById('hero-stars').innerHTML = buildStarsHTML(agencia.calificacionPromedio);
            document.getElementById('hero-rating-text').textContent =
                `${agencia.calificacionPromedio.toFixed(1)} / 5 (${agencia.numeroResenas} reseñas)`;
            heroStarsSection.style.display = 'flex';
        }
    }

    // Description
    let desc = agencia.descripcion || '';
    if (typeof desc === 'object') desc = desc[lang] || desc.es || desc.en || '';
    document.getElementById('agency-desc').textContent = desc || (lang === 'en' ? 'No description available.' : 'Descripción no disponible.');

    // Share buttons
    const pageUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(`Conoce ${name} - Agencia en Jalpan de Serra`);
    const waBtn = document.getElementById('share-wa');
    const fbBtn = document.getElementById('share-fb');
    if (waBtn) waBtn.href = `https://wa.me/?text=${shareText}%20${pageUrl}`;
    if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;

    // --- MINI MAPA Mapbox ---
    const mapSection = document.getElementById('agency-map-section');
    if (mapSection) {
        const lat = agencia.coordenadas?.lat;
        const lng = agencia.coordenadas?.lng;
        if (lat && lng) {
            mapSection.style.display = 'block';
            if (window._agenciaPublicMap) { window._agenciaPublicMap.remove(); window._agenciaPublicMap = null; }
            mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
            const publicMap = new mapboxgl.Map({
                container: 'agency-mapbox-map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [lng, lat], zoom: 15, interactive: false
            });
            new mapboxgl.Marker({ color: '#ef4444' }).setLngLat([lng, lat]).addTo(publicMap);
            window._agenciaPublicMap = publicMap;
        } else {
            mapSection.style.display = 'none';
        }
    }

    // --- GALERÍA ---
    galleryImages = agencia.galeria || [];
    const galeriaSection = document.getElementById('agency-gallery-section');
    if (galeriaSection) {
        if (galleryImages.length > 0) {
            galeriaSection.style.display = 'block';
            document.getElementById('agency-gallery').innerHTML = galleryImages.map((img, i) => `
                <div class="gallery-item" onclick="openLightbox(${i})">
                    <img src="${img.url}" alt="${name}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>
            `).join('');
        } else {
            galeriaSection.style.display = 'none';
        }
    }

    // --- ETIQUETAS: Idiomas, Especialidades, Servicios ---
    const badgesSection = document.getElementById('agency-badges-section');
    if (badgesSection) {
        let badgesHTML = '';
        if (agencia.idiomas?.length) {
            badgesHTML += `<div class="badges-group"><h4><i class="fas fa-language"></i> ${lang==='en'?'Languages':'Idiomas'}</h4><div class="badge-list">`;
            badgesHTML += agencia.idiomas.map(i => `<span class="badge-item badge-blue"><i class="fas fa-comment"></i> ${i}</span>`).join('');
            badgesHTML += `</div></div>`;
        }
        if (agencia.especialidades?.length) {
            badgesHTML += `<div class="badges-group"><h4><i class="fas fa-mountain"></i> ${lang==='en'?'Specialties':'Especialidades'}</h4><div class="badge-list">`;
            badgesHTML += agencia.especialidades.map(e => `<span class="badge-item badge-green"><i class="fas fa-tag"></i> ${e}</span>`).join('');
            badgesHTML += `</div></div>`;
        }
        if (agencia.serviciosDefecto?.length) {
            badgesHTML += `<div class="badges-group"><h4><i class="fas fa-check-circle"></i> ${lang==='en'?'Included Services':'Servicios Incluidos'}</h4><div class="badge-list">`;
            badgesHTML += agencia.serviciosDefecto.map(s => `<span class="badge-item badge-amber"><i class="fas fa-check"></i> ${s}</span>`).join('');
            badgesHTML += `</div></div>`;
        }
        badgesSection.style.display = badgesHTML ? 'block' : 'none';
        badgesSection.innerHTML = badgesHTML ? `<h3><i class="fas fa-info"></i> Información</h3>${badgesHTML}` : '';
    }

    // --- CONTACTO ---
    const contactContainer = document.getElementById('contact-info-container');
    let contactHTML = '';
    if (agencia.telefono) {
        contactHTML += `<div class="contact-item"><i class="fas fa-phone-alt"></i><div><strong>${lang==='en'?'Phone':'Teléfono'}</strong><br><a href="tel:${agencia.telefono}">${agencia.telefono}</a></div></div>`;
        const waBtn2 = document.getElementById('btn-whatsapp');
        if (waBtn2) { waBtn2.style.display = 'block'; waBtn2.href = `https://wa.me/52${agencia.telefono.replace(/\D/g, '')}`; }
    }
    if (agencia.email) contactHTML += `<div class="contact-item"><i class="fas fa-envelope"></i><div><strong>Email</strong><br><a href="mailto:${agencia.email}">${agencia.email}</a></div></div>`;
    if (agencia.paginaWeb) {
        let webUrl = agencia.paginaWeb.startsWith('http') ? agencia.paginaWeb : 'https://' + agencia.paginaWeb;
        let disp = agencia.paginaWeb.replace(/^https?:\/\//, '').replace(/\/$/, '');
        contactHTML += `<div class="contact-item"><i class="fas fa-globe"></i><div><strong>${lang==='en'?'Website':'Página Web'}</strong><br><a href="${webUrl}" target="_blank" rel="noopener">${disp}</a></div></div>`;
    }
    if (agencia.horariosAtencion) contactHTML += `<div class="contact-item"><i class="fas fa-clock"></i><div><strong>${lang==='en'?'Hours':'Horarios de Atención'}</strong><br>${agencia.horariosAtencion}</div></div>`;
    if (agencia.direccion) contactHTML += `<div class="contact-item"><i class="fas fa-map-marker-alt"></i><div><strong>${lang==='en'?'Address':'Dirección'}</strong><br>${agencia.direccion}</div></div>`;
    if (!contactHTML) contactHTML = `<p style="color:var(--gray-400);font-size:0.9rem;">${lang==='en'?'No contact info.':'Sin información de contacto.'}</p>`;
    contactContainer.innerHTML = contactHTML;

    // --- REDES SOCIALES ---
    const socialContainer = document.getElementById('social-links-container');
    let socialHTML = '';
    if (agencia.redesSociales) {
        if (agencia.redesSociales.facebook) socialHTML += `<a href="${agencia.redesSociales.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a>`;
        if (agencia.redesSociales.instagram) socialHTML += `<a href="${agencia.redesSociales.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
        if (agencia.redesSociales.youtube) socialHTML += `<a href="${agencia.redesSociales.youtube}" target="_blank" title="YouTube"><i class="fab fa-youtube"></i></a>`;
        if (agencia.redesSociales.tiktok) socialHTML += `<a href="${agencia.redesSociales.tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
    }
    socialContainer.innerHTML = socialHTML;
}

// ===== LIGHTBOX =====
function openLightbox(index, gallery = galleryImages) {
    currentLightboxGallery = gallery;
    if (!currentLightboxGallery || !currentLightboxGallery.length) return;
    lightboxIndex = index;
    document.getElementById('lightbox-img').src = currentLightboxGallery[lightboxIndex].url;
    document.getElementById('lightbox-overlay').classList.add('open');
}

function closeLightbox() {
    document.getElementById('lightbox-overlay').classList.remove('open');
}

function closeLightboxOutside(e) {
    if (e.target.id === 'lightbox-overlay') closeLightbox();
}

function lightboxMove(dir) {
    if (!currentLightboxGallery || !currentLightboxGallery.length) return;
    lightboxIndex = (lightboxIndex + dir + currentLightboxGallery.length) % currentLightboxGallery.length;
    document.getElementById('lightbox-img').src = currentLightboxGallery[lightboxIndex].url;
}

// ===== SHARE =====
function copyAgenciaLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('share-copy');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-link"></i>'; }, 1800);
    });
}

// ===== TOURS =====
async function loadTours(id) {
    try {
        const res = await fetch(`/api/agencias/${id}/tours`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
            const lang = localStorage.getItem('appLang') || 'es';
            const section = document.getElementById('agency-tours-section');
            const grid = document.getElementById('agency-tours-grid');
            if (!section || !grid) return;
            section.style.display = 'block';
            grid.innerHTML = data.data.map(tour => {
                const tourName = typeof tour.nombre === 'object' ? (tour.nombre[lang] || tour.nombre.es || '') : (tour.nombre || '');
                const imgUrl = tour.imagenPrincipal?.url || '/images/PueblosMágicos.svg.png';
                const precio = tour.precio?.amount ? `$${tour.precio.amount} MXN` : '';
                const dur = tour.duracion?.horas ? `${tour.duracion.horas}h` : '';
                return `
                <a href="/experiencia.html?id=${tour._id}" class="tour-mini-card">
                    <img class="tour-mini-img" src="${imgUrl}" alt="${tourName}" loading="lazy" onerror="this.src='/images/PueblosMágicos.svg.png'">
                    <div class="tour-mini-body">
                        <div class="tour-mini-name">${tourName}</div>
                        <div class="tour-mini-meta">
                            ${dur ? `<i class="fas fa-clock"></i> ${dur}` : ''}
                            ${tour.dificultad ? `<span>· ${tour.dificultad}</span>` : ''}
                        </div>
                        ${precio ? `<div class="tour-mini-price">${precio}</div>` : ''}
                    </div>
                </a>`;
            }).join('');
        }
    } catch (e) { console.warn('Tours no disponibles:', e.message); }
}

// ===== CALENDARIO =====
async function loadCalendario(id) {
    try {
        const response = await fetch(`/api/agencias/${id}/calendario`);
        const data = await response.json();
        const calList = document.getElementById('agency-calendar-list');
        const section = document.getElementById('agency-calendar-section');

        if (data.success && data.data && data.data.length > 0) {
            section.style.display = 'block';
            let html = '';
            const lang = localStorage.getItem('appLang') || 'es';
            const mesesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const mesesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const meses = lang === 'en' ? mesesEn : mesesEs;

            data.data.forEach(item => {
                // Parse date (item.date is YYYY-MM-DD)
                const [y, m, d] = item.date.split('-');
                const dayNum = parseInt(d, 10);
                const monthName = meses[parseInt(m, 10) - 1];

                const toursHtml = item.tours.map(t => {
                    let priceText = 'Consultar';
                    if (t.precio && typeof t.precio.amount === 'number' && t.precio.amount > 0) {
                        priceText = `$${t.precio.amount}`;
                    }
                    return `
                        <div class="calendar-tour-item">
                            <a href="/experiencia.html?id=${t.id}">${t.nombre}</a>
                            <span class="calendar-price">${priceText}</span>
                        </div>
                    `;
                }).join('');

                html += `
                    <div class="calendar-item">
                        <div class="calendar-date">
                            <div style="font-size:0.8rem; color:var(--gray-500); text-transform:uppercase;">${monthName}</div>
                            <div style="font-size:1.4rem; line-height:1;">${dayNum}</div>
                        </div>
                        <div class="calendar-tours">
                            ${toursHtml}
                        </div>
                    </div>
                `;
            });

            calList.innerHTML = html;
        } else {
            section.style.display = 'none';
        }

    } catch (error) {
        console.error('Error al cargar calendario:', error);
        document.getElementById('agency-calendar-section').style.display = 'none';
    }
}

// ===== REVIEWS =====
async function loadReviews(id) {
    try {
        const res = await fetch(`/api/agencias/${id}/resenas`);
        const data = await res.json();
        if (!data.success) return;

        // Rating summary
        if (data.numeroResenas > 0) {
            const summaryEl = document.getElementById('reviews-summary');
            if (summaryEl) {
                document.getElementById('reviews-avg').textContent = data.calificacionPromedio.toFixed(1);
                document.getElementById('reviews-stars-header').innerHTML = buildStarsHTML(data.calificacionPromedio);
                document.getElementById('reviews-count-text').textContent = `${data.numeroResenas} reseña${data.numeroResenas !== 1 ? 's' : ''}`;
                summaryEl.style.display = 'flex';
            }
        }

        // Review list
        const listEl = document.getElementById('reviews-list');
        const travelerGallerySection = document.getElementById('traveler-gallery-section');
        const travelerGalleryEl = document.getElementById('traveler-gallery');
        
        if (listEl) {
            if (data.resenas && data.resenas.length > 0) {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                let userId = null;
                if (token) {
                    try { userId = JSON.parse(atob(token.split('.')[1])).id; } catch(e) {}
                }
                
                reviewGalleryImages = [];
                let globalPhotoIndex = 0;
                
                listEl.innerHTML = data.resenas.map(r => {
                    let fotosHtml = '';
                    if (r.fotos && r.fotos.length > 0) {
                        fotosHtml = '<div class="review-gallery" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;">';
                        r.fotos.forEach(foto => {
                            reviewGalleryImages.push(foto);
                            fotosHtml += `<div onclick="openLightbox(${globalPhotoIndex}, reviewGalleryImages)" style="cursor:pointer;" class="gallery-item-hover"><img src="${foto.url}" alt="Foto reseña" style="width:80px; height:80px; object-fit:cover; border-radius:8px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"></div>`;
                            globalPhotoIndex++;
                        });
                        fotosHtml += '</div>';
                    }
                    return `
                        <div class="review-card">
                            <div class="review-header">
                                <div>
                                    <span class="review-author">${r.nombreUsuario}</span>
                                    <div class="rating-stars" style="font-size:0.9rem; margin-top:2px;">${buildStarsHTML(r.calificacion)}</div>
                                </div>
                                <div style="display:flex;align-items:center;gap:0.75rem;">
                                    <span class="review-date">${new Date(r.fecha).toLocaleDateString('es-MX', {year:'numeric',month:'short',day:'numeric'})}</span>
                                    ${userId && (r.usuario === userId || r.usuario?._id === userId) ? `<button class="delete-review-btn" onclick="deleteReview('${r._id}')"><i class="fas fa-trash"></i></button>` : ''}
                                </div>
                            </div>
                            <p class="review-comment">${r.comentario}</p>
                            ${fotosHtml}
                        </div>
                    `;
                }).join('');
                
                if (travelerGallerySection && travelerGalleryEl) {
                    if (reviewGalleryImages.length > 0) {
                        travelerGallerySection.style.display = 'block';
                        travelerGalleryEl.innerHTML = reviewGalleryImages.map((img, i) => `
                            <div class="gallery-item" onclick="openLightbox(${i}, reviewGalleryImages)" style="border-radius: 8px; aspect-ratio: 1; overflow: hidden; cursor: pointer; transition: transform 0.2s;">
                                <img src="${img.url}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.parentElement.style.display='none'">
                            </div>
                        `).join('');
                    } else {
                        travelerGallerySection.style.display = 'none';
                    }
                }
            } else {
                listEl.innerHTML = '<p style="color:var(--gray-400); font-size:0.9rem;">Sin reseñas aún. ¡Sé el primero!</p>';
                if (travelerGallerySection) travelerGallerySection.style.display = 'none';
            }
        }

        // Show form or login prompt
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) {
            document.getElementById('review-form-area').style.display = 'block';
            document.getElementById('review-login-prompt').style.display = 'none';
        } else {
            document.getElementById('review-login-prompt').style.display = 'block';
            document.getElementById('review-form-area').style.display = 'none';
        }

    } catch (e) { console.warn('Reseñas no disponibles:', e.message); }
}

async function submitReview() {
    if (selectedStars === 0) { alert('Por favor califica con estrellas antes de enviar.'); return; }
    const comentario = document.getElementById('review-comment').value.trim();
    if (!comentario) { alert('El comentario no puede estar vacío.'); return; }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) { alert('Debes iniciar sesión.'); return; }

    const formData = new FormData();
    formData.append('calificacion', selectedStars);
    formData.append('comentario', comentario);

    const fotosInput = document.getElementById('review-fotos');
    if (fotosInput && fotosInput.files.length > 0) {
        for (let i = 0; i < fotosInput.files.length; i++) {
            formData.append('fotos', fotosInput.files[i]);
        }
    }

    try {
        const res = await fetch(`/api/agencias/${currentAgenciaId}/resenas`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('review-comment').value = '';
            if (fotosInput) fotosInput.value = '';
            selectedStars = 0;
            highlightStars(0);
            document.getElementById('review-form-area').style.display = 'none';
            loadReviews(currentAgenciaId);
        } else {
            alert(data.message || 'Error al enviar reseña.');
        }
    } catch (e) { alert('Error de conexión.'); }
}

async function deleteReview(resenaId) {
    if (!confirm('¿Eliminar esta reseña?')) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    try {
        const res = await fetch(`/api/agencias/${currentAgenciaId}/resenas/${resenaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) loadReviews(currentAgenciaId);
        else alert(data.message);
    } catch (e) { alert('Error al eliminar.'); }
}

// ===== FAVORITOS =====
async function checkFavoriteStatus() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token || !currentAgenciaId) return;

    try {
        const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data && data.data.agenciasFavoritas) {
            const isFav = data.data.agenciasFavoritas.includes(currentAgenciaId);
            const btn = document.getElementById('btn-fav-agencia');
            if (btn) {
                btn.style.display = 'inline-block';
                if (isFav) {
                    btn.innerHTML = '<i class="fas fa-heart"></i> Guardado';
                    btn.classList.add('active-fav');
                } else {
                    btn.innerHTML = '<i class="far fa-heart"></i> Guardar';
                    btn.classList.remove('active-fav');
                }
            }
        }
    } catch (e) { console.error('Error verificando favoritos', e); }
}

async function toggleFavoritoAgencia() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
        // Guardar la URL actual antes de redirigir
        localStorage.setItem('redirectUrl', window.location.href);
        alert('Debes iniciar sesión para guardar agencias.');
        window.location.href = '/login.html';
        return;
    }

    try {
        const res = await fetch('/api/user/favorito-agencia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ agenciaId: currentAgenciaId })
        });
        
        const data = await res.json();
        if (data.success) {
            const btn = document.getElementById('btn-fav-agencia');
            if (data.isFavorite) {
                btn.innerHTML = '<i class="fas fa-heart"></i> Guardado';
                btn.classList.add('active-fav');
            } else {
                btn.innerHTML = '<i class="far fa-heart"></i> Guardar';
                btn.classList.remove('active-fav');
            }
        } else {
            alert(data.message || 'Error al guardar.');
        }
    } catch (e) {
        alert('Error de conexión.');
    }
}

// ===== CONTACTO =====
async function enviarContactoForm(e) {
    e.preventDefault();
    if (!currentAgenciaId) return;

    const nombre = document.getElementById('contacto-nombre').value.trim();
    const email = document.getElementById('contacto-email').value.trim();
    const telefono = document.getElementById('contacto-telefono').value.trim();
    const mensaje = document.getElementById('contacto-mensaje').value.trim();
    const msgEl = document.getElementById('msg-contacto-estado');
    const btnSubmit = document.getElementById('btn-submit-contacto');

    if (!nombre || !email || !mensaje) {
        msgEl.textContent = 'Por favor, llena los campos requeridos.';
        msgEl.style.color = 'var(--error)';
        msgEl.style.display = 'block';
        return;
    }

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        msgEl.style.display = 'none';

        // Add typical headers. No auth required for public contact form
        const res = await fetch(`/api/agencias/${currentAgenciaId}/contacto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, telefono, mensaje })
        });
        
        const data = await res.json();
        
        msgEl.style.display = 'block';
        if (data.success) {
            msgEl.textContent = '¡Mensaje enviado correctamente!';
            msgEl.style.color = '#15803d'; // green
            msgEl.style.background = '#dcfce7';
            document.getElementById('form-contacto-agencia').reset();
            
            // Hide success message after 5 seconds
            setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
        } else {
            msgEl.textContent = data.message || 'Error al enviar mensaje.';
            msgEl.style.color = '#b91c1c'; // red
            msgEl.style.background = '#fee2e2';
        }
    } catch (err) {
        msgEl.textContent = 'Error de conexión. Intenta de nuevo.';
        msgEl.style.color = '#b91c1c';
        msgEl.style.background = '#fee2e2';
        msgEl.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Enviar Mensaje';
    }
}

// ===== HELPERS =====
function buildStarsHTML(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<i class="fa${i <= Math.round(rating) ? 's' : 'r'} fa-star"></i>`;
    }
    return html;
}

function highlightStars(count) {
    document.querySelectorAll('#star-picker .fa-star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= count);
    });
}

function showError() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('agency-content').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
}
