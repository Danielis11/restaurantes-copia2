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

        // Renderizar galerÃ­a de viajeros con las fotos de todas las reseÃ±as
        renderUserGallery(reviews);

        if (reviews.length === 0) {
            if (summaryEl) summaryEl.innerHTML = '<p style="color: var(--gray-500); padding: 1rem 0;">AÃºn no hay reseÃ±as. Â¡SÃ© el primero en opinar!</p>';
            container.innerHTML = '';
            return;
        }

        // Resumen de calificaciones
        const totalReviews = reviews.length;
        const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews;
        
        // Calcular distribuciÃ³n de estrellas
        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) {
                ratingCounts[Math.floor(r.rating)]++;
            }
        });

        if (summaryEl) {
            summaryEl.innerHTML = `
                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 3rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--gray-200);">
                    <div style="display: flex; flex-direction: column; align-items: center; min-width: 140px;">
                        <div style="font-size: 4rem; font-weight: 400; color: var(--gray-900); line-height: 1; font-family: 'Google Sans', Roboto, Arial, sans-serif;">${avgRating.toFixed(1)}</div>
                        <div style="display: flex; gap: 2px; margin: 0.5rem 0 0.25rem 0;">
                            ${Array(5).fill(0).map((_, i) => `<i class="fas fa-star" style="color: ${i < avgRating ? '#fbbc04' : '#e0e0e0'}; font-size: 1.125rem;"></i>`).join('')}
                        </div>
                        <p style="color: var(--gray-600); font-size: 0.85rem; margin: 0;">${totalReviews} opinion${totalReviews !== 1 ? 'es' : ''}</p>
                    </div>
                    
                    <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 0.4rem; padding-right: 1rem;">
                        ${[5, 4, 3, 2, 1].map(stars => {
                            const count = ratingCounts[stars];
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return `
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <span style="font-size: 0.85rem; font-weight: 500; color: var(--gray-700); width: 12px; text-align: right;">${stars}</span>
                                <div style="flex: 1; height: 10px; background: #f1f3f4; border-radius: 5px; overflow: hidden;">
                                    <div style="height: 100%; background: #fbbc04; border-radius: 5px; width: ${percentage}%;"></div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Renderizar cada reseÃ±a
        container.innerHTML = reviews.map(r => {
            const fecha = new Date(r.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
            const userName = r.userId?.nombre || 'AnÃ³nimo';
            const userInitial = userName.charAt(0).toUpperCase();

            // Fotos de la reseÃ±a (multi-photo)
            let fotosHtml = '';
            if (r.fotos && r.fotos.length > 0) {
                fotosHtml = `
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                        ${r.fotos.map(f => `
                            <img src="${f.url}" alt="Foto de ${userName}"
                                style="width:64px; height:64px; object-fit:cover; border-radius:0.4rem; cursor:pointer; transition: opacity 0.2s;"
                                onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"
                                onclick="openPhotoLightbox('${f.url}')">
                        `).join('')}
                    </div>
                `;
            } else if (r.imagenUrl) {
                // Compatibilidad con reseÃ±as antiguas (campo imagenUrl Ãºnico)
                fotosHtml = `
                    <div style="margin-top:0.75rem;">
                        <img src="${r.imagenUrl}" alt="Foto de ${userName}"
                            style="width:64px; height:64px; border-radius:0.4rem; cursor:pointer; object-fit:cover; transition: opacity 0.2s;"
                            onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"
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
                        <button onclick="toggleReplyForm('${r._id}')" class="btn" style="background: transparent; border: none; color: var(--primary); padding: 0.25rem 0.5rem; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.375rem; margin-left: 0.5rem;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-reply" style="transform: translateY(-1px);"></i>
                            <span>Responder</span>
                        </button>
                    `;
                }
            } catch(e) {}

            return `
                <div class="review-card" style="position: relative;">
                    ${r.destacada ? '<span style="position: absolute; top: -10px; right: 1.5rem; background: #f59e0b; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2); z-index: 10;"><i class="fas fa-star" style="font-size: 10px; margin-right: 4px;"></i> Destacada</span>' : ''}
                    
                    <div style="display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.125rem; flex-shrink: 0;">
                            ${userInitial}
                        </div>
                        <div style="flex-grow: 1;">
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--gray-900);">${userName}</h4>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                                <div style="display: flex; gap: 2px;">
                                    ${Array(5).fill(0).map((_, i) => `<i class="fas fa-star" style="color: ${i < r.rating ? '#f59e0b' : '#e5e7eb'}; font-size: 0.75rem;"></i>`).join('')}
                                </div>
                                <span style="font-size: 0.75rem; color: var(--gray-500);">${fecha}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="flex-grow: 1; display: flex; flex-direction: column;">
                        <p style="color: var(--gray-700); font-size: 0.9rem; margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${r.comentario}</p>
                        
                        ${fotosHtml}
                        
                        ${r.respuestaAdmin ? `
                        <div style="margin-top: 1rem; padding: 0.75rem; background: var(--gray-50); border-radius: 0.5rem; border: 1px solid var(--gray-100);">
                            <div style="font-weight: 600; color: var(--gray-900); font-size: 0.8rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.4rem;">
                                <i class="fas fa-reply" style="color: var(--primary);"></i> Propietario
                            </div>
                            <p style="color: var(--gray-700); font-size: 0.85rem; line-height: 1.4; margin: 0;">${r.respuestaAdmin}</p>
                        </div>
                        ` : ''}
                        
                        <!-- Reply form -->
                        <div id="reply-form-${r._id}" style="display: none; margin-top: 1rem; padding: 1rem; background: #f0f4ff; border-radius: 0.75rem; border: 1px solid #dbeafe;">
                            <textarea id="reply-text-${r._id}" placeholder="Escribe tu respuesta..." maxlength="500" style="width: 100%; min-height: 80px; border: 1px solid var(--gray-200); border-radius: 0.5rem; padding: 0.75rem; font-family: inherit; font-size: 0.9rem; resize: vertical; outline: none;"></textarea>
                            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
                                <button onclick="toggleReplyForm('${r._id}')" style="background: transparent; border: 1px solid var(--gray-200); border-radius: 0.5rem; padding: 0.4rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.85rem; color: var(--gray-600);">Cancelar</button>
                                <button onclick="submitReply('${r._id}')" style="background: var(--primary); color: white; border: none; border-radius: 0.5rem; padding: 0.4rem 1rem; cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 600;">Publicar</button>
                            </div>
                        </div>
                    </div>
                        
                    <div style="margin-top: 1rem; display: flex; align-items: center; padding-top: 0.75rem; border-top: 1px solid var(--gray-100);">
                        <button onclick="likeReview('${r._id}', this)" class="btn" style="background: transparent; border: none; color: ${isLiked ? '#3b82f6' : 'var(--gray-500)'}; padding: 0.25rem 0.5rem; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.375rem;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='${isLiked ? '#3b82f6' : 'var(--gray-500)'}'">
                            <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up" style="font-size: 1rem;"></i>
                            <span>Ãštil (<span id="like-count-${r._id}">${r.likes || 0}</span>)</span>
                        </button>
                        ${replyBtnHtml}
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error fetching reviews:', e);
        container.innerHTML = '<p style="color: var(--error); text-align: center;">Error al cargar reseÃ±as.</p>';
    }
}

// BotÃ³n Escribir OpiniÃ³n Global Handler
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
    document.getElementById('auth-modal-title').textContent = isLogin ? 'Iniciar SesiÃ³n' : 'Registrarse';
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
        showToast('Error de conexiÃ³n', 'error');
    }
}

// InteracciÃ³n de Modales de ReseÃ±a (ahora form en lÃ­nea)
function openReviewModal() {
    // Resetear form de reseÃ±a
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

// Sistema de calificaciÃ³n de estrellas
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

// Envio final de reseÃ±a (multi-foto)
async function submitReview(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Debes iniciar sesiÃ³n primero', 'error');
        return;
    }

    const rId = new URLSearchParams(window.location.search).get('id');
    const rating = document.getElementById('review-rating-value').value;
    const comentario = document.getElementById('review-comment').value;

    if (!rating) {
        showToast('Por favor, selecciona una calificaciÃ³n (estrellas)', 'warning');
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
            showToast('Â¡ReseÃ±a enviada! AparecerÃ¡ cuando sea aprobada por un moderador.', 'success');
            closeReviewModal();
            window._reviewPhotosFiles = [];
            loadNativeReviews();
        } else {
            showToast(data.message || 'Error al enviar la reseÃ±a', 'error');
        }
    } catch (error) {
        showToast('Error de conexiÃ³n', 'error');
    }
}

// Dar "Me gusta" a una reseÃ±a
window.likeReview = async function(reviewId, btnElement) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Debes iniciar sesiÃ³n para ayudar a otros usuarios y dar me gusta.', 'warning');
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
            showToast(data.message || 'Error al procesar la acciÃ³n', 'error');
        }
    } catch (e) {
        showToast('Error de conexiÃ³n al dar me gusta', 'error');
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
        showToast('Debes iniciar sesiÃ³n como administrador.', 'error');
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
            showToast('âœ… Respuesta publicada exitosamente', 'success');
            // Recargar las reseÃ±as para mostrar la respuesta
            const rId = new URLSearchParams(window.location.search).get('id');
            loadNativeReviews(rId);
        } else {
            showToast(data.message || 'Error al publicar la respuesta', 'error');
        }
    } catch (e) {
        showToast('Error de conexiÃ³n', 'error');
    }
};

// ===== GALERÃA DE VIAJEROS =====
function renderUserGallery(reviews) {
    const galleryCard = document.getElementById('card-user-gallery');
    const grid = document.getElementById('user-gallery-grid');
    const countEl = document.getElementById('gallery-user-count');
    if (!galleryCard || !grid) return;

    // Collect all photos from all reviews
    const allPhotos = [];
    reviews.forEach(r => {
        const userName = r.userId?.nombre || 'AnÃ³nimo';
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

// ===== LIGHTBOX DEL MENÃš =====
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
