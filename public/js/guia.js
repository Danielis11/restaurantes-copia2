document.addEventListener('DOMContentLoaded', () => {
    // 1. Extraer ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const guiaId = urlParams.get('id');
    const lang = localStorage.getItem('appLang') || 'es';

    if (!guiaId) {
        document.getElementById('profile-container').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <h2 style="color: var(--gray-700);"><i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Guía no encontrado</h2>
                <p style="color: var(--gray-500); margin-top: 1rem;">No se proporcionó un ID válido.</p>
                <a href="/experiencias.html" class="btn" style="background: var(--primary); color: white; display: inline-block; margin-top: 1rem;">Volver al Directorio</a>
            </div>
        `;
        return;
    }

    // 2. Cargar Perfil
    cargarPerfilGuia(guiaId, lang);
});

async function cargarPerfilGuia(id, lang) {
    try {
        const res = await fetch(`/api/guias/${id}`);
        const data = await res.json();
        
        if (!data.success) throw new Error("Guía no encontrado en el servidor");
        
        const guia = data.data;
        renderGuiaProfile(guia, lang);
        
        // Cargar tours impartidos
        cargarToursGuia(id, lang);

        // 3. Cargar las reseñas una vez que tenemos la ID
        $('#reviews-section').style.display = 'block';
        cargarResenas(id);
        setupReviewForm(id);

    } catch (error) {
        console.error("Error cargando guía:", error);
        document.getElementById('profile-container').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <h2 style="color: var(--gray-700);"><i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Ha ocurrido un error</h2>
                <p style="color: var(--gray-500); margin-top: 1rem;">No pudimos cargar la información del guía turístico. Es posible que el enlace sea incorrecto o el guía ya no esté activo.</p>
                <a href="/experiencias.html" class="btn" style="background: var(--primary); color: white; display: inline-block; margin-top: 1rem;">Volver al Directorio</a>
            </div>
        `;
    }
}

function renderGuiaProfile(guia, lang) {
    const container = document.getElementById('profile-container');
    
    // Fallback info
    const foto = guia.fotoPerfil && guia.fotoPerfil.url ? guia.fotoPerfil.url : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000';
    
    // Extraer Bio correcta basada en Multi-Lenguaje
    let bioText = "";
    if (guia.biografia) {
        if (typeof guia.biografia === 'object') {
            bioText = guia.biografia[lang] || guia.biografia.es || "El guía no ha proporcionado una biografía.";
        } else {
            bioText = guia.biografia;
        }
    } else {
        bioText = "El guía no ha proporcionado una biografía.";
    }

    // Generar tags HTML
    const especialidadesHtml = (guia.especialidades || []).map(esp => `<span class="tag"><i class="fas fa-hiking"></i> ${esp}</span>`).join('');
    const idiomasHtml = (guia.idiomas || []).map(idi => `<span class="tag"><i class="fas fa-language"></i> ${idi}</span>`).join('');
    
    // Años Experiencia
    const experienciaHtml = guia.aniosExperiencia > 0 ? `
        <div class="guide-badge" style="background:#e0f2fe; color:#0369a1; margin-bottom: 0.5rem;">
            <i class="fas fa-calendar-alt"></i> ${guia.aniosExperiencia} años de experiencia
        </div>
    ` : '';

    // Zonas de operacion
    const zonasHtml = (guia.zonasOperacion || []).length > 0 ? `
        <div class="widget" style="text-align: left; padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; color: var(--gray-800); margin-bottom: 0.5rem;"><i class="fas fa-map-marker-alt"></i> Zonas de Operación</h3>
            <p style="color:var(--gray-600); font-size:0.95rem;">${guia.zonasOperacion.join(', ')}</p>
        </div>
    ` : '';

    // Redes Sociales
    let redesHtml = '';
    if (guia.redesSociales) {
        if (guia.redesSociales.facebook) redesHtml += `<a href="${guia.redesSociales.facebook}" target="_blank" style="color:#1877F2; font-size:1.5rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-facebook"></i></a>`;
        if (guia.redesSociales.instagram) redesHtml += `<a href="${guia.redesSociales.instagram}" target="_blank" style="color:#E1306C; font-size:1.5rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-instagram"></i></a>`;
        if (guia.redesSociales.youtube) redesHtml += `<a href="${guia.redesSociales.youtube}" target="_blank" style="color:#FF0000; font-size:1.5rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-youtube"></i></a>`;
        if (guia.redesSociales.tiktok) redesHtml += `<a href="${guia.redesSociales.tiktok}" target="_blank" style="color:#000000; font-size:1.5rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-tiktok"></i></a>`;
    }
    const redesContenedor = redesHtml ? `
        <div style="display:flex; justify-content:center; gap:15px; margin-top:1rem; margin-bottom:1.5rem;">
            ${redesHtml}
        </div>
    ` : '';

    // Certificaciones
    let certificacionesHtml = '';
    if (guia.certificaciones && guia.certificaciones.length > 0) {
        certificacionesHtml = `
            <div style="margin-top: 3rem;">
                <h2 class="section-title"><i class="fas fa-certificate"></i> Certificaciones Profesionales</h2>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:1rem; margin-top:1.5rem;">
                    ${guia.certificaciones.map(cert => {
                        const isExpired = cert.vigencia ? (new Date(cert.vigencia) < new Date()) : false;
                        const vigenciaText = cert.vigencia ? `Válido hasta: ${new Date(cert.vigencia).getFullYear()}` : '';
                        return `
                        <div style="background:var(--gray-50); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--gray-200); position:relative;">
                            <i class="fas fa-award" style="position:absolute; top:1.5rem; right:1.5rem; font-size:2rem; color:var(--gray-300); opacity:0.5;"></i>
                            <h4 style="color:var(--gray-900); font-size:1.1rem; margin-bottom:0.25rem; padding-right:2.5rem;">${cert.nombre}</h4>
                            <p style="color:var(--primary); font-size:0.9rem; font-weight:600; margin-bottom:0.5rem;">${cert.institucion}</p>
                            <p style="color:var(--gray-500); font-size:0.85rem;"><i class="far fa-calendar-check"></i> Obtenido: ${cert.fechaObtencion ? new Date(cert.fechaObtencion).getFullYear() : 'N/A'}</p>
                            ${vigenciaText ? `<p style="color: ${isExpired ? 'var(--error)' : 'var(--success)'}; font-size:0.85rem; margin-top:0.25rem;"><i class="fas fa-clock"></i> ${vigenciaText}</p>` : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Galería
    let galeriaHtml = '';
    if (guia.galeria && guia.galeria.length > 0) {
        galeriaHtml = `
            <div style="margin-top: 3rem;">
                <h2 class="section-title"><i class="fas fa-camera-retro"></i> Galería en Acción</h2>
                <div style="display:flex; overflow-x:auto; gap:1rem; margin-top:1.5rem; padding-bottom:1rem; scroll-snap-type: x mandatory; scrollbar-width: thin;">
                    ${guia.galeria.map(img => `
                        <div style="flex: 0 0 auto; width: 250px; aspect-ratio: 4/3; border-radius: var(--radius-md); overflow:hidden; box-shadow:var(--shadow-sm); scroll-snap-align: start; cursor:pointer;" onclick="abrirModalGaleria('${img.url}')">
                            <img src="${img.url}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Construir HTML Final
    container.innerHTML = `
        <!-- SIDEBAR DE CONTRATACIÓN Y PERFIL RPIDIO -->
        <aside class="sidebar">
            <div class="widget">
                <img src="${foto}" alt="${guia.nombreCompleto}" class="guide-photo" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000'">
                <h1 class="guide-name">${guia.nombreCompleto}</h1>
                <div class="guide-badge">
                    <i class="fas fa-check-circle"></i> Guía Certificado
                </div>
                ${experienciaHtml}
                
                ${redesContenedor}

                ${guia.credencialSECTUR ? `<p style="color: var(--gray-500); font-size: 0.9rem; margin-bottom: 1.5rem;"><i class="fas fa-id-card"></i> <strong>SECTUR:</strong> ${guia.credencialSECTUR}</p>` : ''}
                
                <!-- Opciones de Contacto -->
                ${guia.telefono ? `
                    <a href="https://wa.me/52${guia.telefono.replace(/\D/g, '')}" target="_blank" class="contact-btn btn-whatsapp">
                        <i class="fab fa-whatsapp"></i> Contactar por WhatsApp
                    </a>
                ` : ''}

                ${guia.email ? `
                    <a href="mailto:${guia.email}" target="_blank" class="contact-btn btn-email">
                        <i class="fas fa-envelope"></i> Enviar Correo
                    </a>
                ` : ''}
            </div>

            <!-- Widget Especialidades -->
            ${guia.especialidades && guia.especialidades.length > 0 ? `
                <div class="widget" style="text-align: left; padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; color: var(--gray-800); margin-bottom: 0.5rem;"><i class="fas fa-compass"></i> Especialidades</h3>
                    <div class="tags-container" style="justify-content: flex-start;">
                        ${especialidadesHtml}
                    </div>
                </div>
            ` : ''}

            ${zonasHtml}
            
            <!-- Widget Idiomas -->
            ${guia.idiomas && guia.idiomas.length > 0 ? `
                <div class="widget" style="text-align: left; padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; color: var(--gray-800); margin-bottom: 0.5rem;"><i class="fas fa-globe"></i> Idiomas</h3>
                    <div class="tags-container" style="justify-content: flex-start;">
                        ${idiomasHtml}
                    </div>
                </div>
            ` : ''}
        </aside>

        <!-- CONTENIDO PRINCIPAL (BIO) -->
        <main class="main-content">
            <h2 class="section-title"><i class="fas fa-user"></i> Sobre Mí</h2>
            <p class="bio-text">${bioText.replace(/\n/g, '<br>')}</p>
            
            ${certificacionesHtml}
            
            ${galeriaHtml}

            <div style="margin-top: 3rem;">
                <h2 class="section-title"><i class="fas fa-route"></i> Experiencias que Imparto</h2>
                <div id="tours-impartidos-container"></div>
            </div>
        </main>
    `;
    
    // Actualizar `title` HTML
    document.title = `${guia.nombreCompleto} - Guía Certificado Jalpan`;
    
    // For trigger translation to catch un-translated base text
    if (typeof applyTranslations === 'function') {
        applyTranslations(lang);
    }
}

async function cargarToursGuia(guiaId, lang) {
    const container = document.getElementById('tours-impartidos-container');
    if (!container) return;
    
    container.innerHTML = '<p class="loading" style="text-align:center;">Buscando expediciones...</p>';
    try {
        const res = await fetch(`/api/tours`);
        const data = await res.json();
        if (data.success && data.data) {
            // Filtrar tours donde guiasAsignados incluye este guiaId
            const tours = data.data.filter(t => 
                t.guiasAsignados && t.guiasAsignados.some(g => (g._id || g).toString() === guiaId)
            );
            
            if (tours.length > 0) {
                let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:1.5rem; margin-top:1.5rem;">';
                tours.forEach(tour => {
                    const img = tour.imagenes && tour.imagenes.length > 0 ? tour.imagenes[0].url : 'https://images.unsplash.com/photo-1502621111491-9c8eb01ba90e?q=80&w=600';
                    const name = typeof tour.nombre === 'object' ? (tour.nombre[lang] || tour.nombre.es) : tour.nombre;
                    const desc = typeof tour.descripcionCorta === 'object' ? (tour.descripcionCorta[lang] || tour.descripcionCorta.es) : tour.descripcionCorta;
                    
                    html += `
                        <a href="/experiencia.html?id=${tour._id}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; background:white; border-radius:var(--radius-lg); overflow:hidden; border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)'">
                            <div style="height: 160px; overflow:hidden;">
                                <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                            <div style="padding:1.25rem; flex:1; display:flex; flex-direction:column;">
                                <span style="font-size:0.75rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem;"><i class="fas fa-route"></i> ${tour.categoria || 'Aventura'}</span>
                                <h4 style="font-size:1.15rem; color:var(--gray-900); margin-bottom:0.5rem; line-height:1.3;">${name}</h4>
                                <p style="font-size:0.9rem; color:var(--gray-600); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:1rem;">${desc}</p>
                                <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--gray-100); padding-top:1rem;">
                                    <span style="font-weight:700; color:var(--gray-900);"><i class="fas fa-tags" style="color:#10b981;"></i> $${tour.precio?.amount || 0} MXN</span>
                                    <span style="font-size:0.85rem; color:var(--gray-500);"><i class="fas fa-clock"></i> ${tour.duracion?.horas || 1} hrs</span>
                                </div>
                            </div>
                        </a>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            } else {
                container.innerHTML = '<p style="color:var(--gray-500); font-style:italic;">Este guía aún no tiene experiencias asignadas públicamente.</p>';
            }
        }
    } catch (err) {
        container.innerHTML = '<p style="color:var(--error);">Error cargando experiencias.</p>';
    }
}

// ==========================================
// SECCIÓN DE RESEÑAS
// Funciona bajo la API `/api/resenas` de Node.js
// ==========================================
const $ = (id) => document.querySelector(id);

async function cargarResenas(itemId) {
    const container = $('#reviews-container');
    container.innerHTML = '<p class="loading" style="text-align:center;">Cargando opiniones...</p>';
    
    try {
        // Obtenemos reseñas directamente del endpoint del guía
        const res = await fetch(`/api/guias/${itemId}/reviews`);
        const data = await res.json();
        
        if(data.success && data.data.length > 0) {
            container.innerHTML = data.data.map(r => renderReviewCard(r)).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: var(--gray-100); border-radius: var(--radius-md);">
                    <i class="fas fa-comment-slash" style="font-size: 2rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <p style="color: var(--gray-500);">Aún no hay opiniones. ¡Sé el primero en contar tu experiencia!</p>
                </div>
            `;
        }
    } catch(err) {
        console.error("Error al cargar reseñas", err);
        container.innerHTML = '<p class="error text-error text-center">Error al cargar reseñas.</p>';
    }
}

function renderReviewCard(review) {
    const stars = '★'.repeat(review.calificacion) + '☆'.repeat(5 - review.calificacion);
    const userName = review.usuario?.nombre || 'Usuario Jalpan';
    const date = new Date(review.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
        <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 1rem; border: 1px solid var(--gray-200);">
            <div style="display: flex; justify-content: space-between; align-items:flex-start; margin-bottom: 0.5rem;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius:50%; background: var(--primary-light); color: var(--primary-dark); display:flex; align-items:center; justify-content:center; font-weight:700;">
                        ${userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 style="font-size: 1rem; color: var(--gray-900); margin:0;">${userName}</h4>
                        <span style="font-size: 0.8rem; color: var(--gray-500);">${date}</span>
                    </div>
                </div>
                <div style="color: #f59e0b; font-size: 1.1rem; letter-spacing: 2px;">
                    ${stars}
                </div>
            </div>
            <p style="color: var(--gray-700); font-size: 0.95rem; margin-top: 0.5rem; line-height:1.6;">${review.comentario}</p>
        </div>
    `;
}

function setupReviewForm(itemId) {
    const token = localStorage.getItem('authToken');
    if(token) {
        $('#login-prompt').style.display = 'none';
        $('#review-form').style.display = 'block';
        
        // Estrellas interactividad
        const stars = document.querySelectorAll('.star-rating i');
        const ratingInput = $('#rating-value');
        
        stars.forEach(s => {
            s.addEventListener('click', (e) => {
                const val = e.target.dataset.rating;
                ratingInput.value = val;
                stars.forEach(st => {
                    st.style.color = st.dataset.rating <= val ? '#f59e0b' : '#cbd5e1';
                });
            });
        });

        // Submit form
        $('#review-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const calificacion = ratingInput.value;
            const comentario = $('#review-comment').value;

            if(calificacion == 0) {
                alert('Por favor selecciona una calificación de estrellas.');
                return;
            }

            try {
                const button = e.target.querySelector('button');
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

                const res = await fetch(`/api/guias/${itemId}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ rating: calificacion, comentario })
                });

                const data = await res.json();
                if(data.success) {
                    alert('¡Gracias! Reseña publicada con éxito.');
                    $('#review-comment').value = '';
                    ratingInput.value = 0;
                    stars.forEach(st => st.style.color = '#cbd5e1');
                    cargarResenas(itemId); // Recargar
                } else {
                    alert(data.message || 'Error al publicar la reseña');
                }
            } catch(err) {
                console.error(err);
                alert('Error de conexión.');
            } finally {
                const button = e.target.querySelector('button');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Reseña';
            }
        });
    }
}

// ==========================================
// SECCIÓN DE GALERÍA MODAL (LIGHTBOX)
// ==========================================
function abrirModalGaleria(url) {
    let modal = document.getElementById('galeria-modal-vista');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'galeria-modal-vista';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.3s; padding:1rem;';
        modal.innerHTML = `
            <button onclick="cerrarModalGaleria()" style="position:absolute; top:20px; right:30px; background:var(--gray-800); border:none; color:white; font-size:1.5rem; width:40px; height:40px; border-radius:50%; display:flex; justify-content:center; align-items:center; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='var(--primary)'" onmouseout="this.style.background='var(--gray-800)'"><i class="fas fa-times"></i></button>
            <img id="galeria-img-vista" src="" style="max-width:100%; max-height:90vh; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); transform:scale(0.9); transition:transform 0.3s; object-fit:contain;">
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModalGaleria();
        });
    }
    
    document.getElementById('galeria-img-vista').src = url;
    modal.style.display = 'flex';
    // Trigger reflow for animation
    void modal.offsetWidth;
    modal.style.opacity = '1';
    document.getElementById('galeria-img-vista').style.transform = 'scale(1)';
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
}

function cerrarModalGaleria() {
    const modal = document.getElementById('galeria-modal-vista');
    if (modal) {
        modal.style.opacity = '0';
        document.getElementById('galeria-img-vista').style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar scroll
        }, 300);
    }
}
window.abrirModalGaleria = abrirModalGaleria;
window.cerrarModalGaleria = cerrarModalGaleria;
