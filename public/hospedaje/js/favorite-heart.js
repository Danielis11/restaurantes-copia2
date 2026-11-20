/**
 * favorite-heart.js
 * Lógica para el botón de favoritos (corazón) en hospedaje-detalle.html
 * Sincroniza con la API del backend para guardar/quitar favoritos
 */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const token = localStorage.getItem('hospAuthToken') || localStorage.getItem('authToken');
        const favContainer = document.getElementById('favBtnContainer');
        const favCheckbox = document.getElementById('favCheckbox');

        if (!favContainer || !favCheckbox) return;

        // Solo mostrar si hay sesión activa
        if (!token) return;

        favContainer.style.display = 'block';

        const baseURL = window.location.hostname === 'localhost'
            ? '/api/hospedaje'
            : '/api/hospedaje';

        // Obtener parámetros del URL
        const params = new URLSearchParams(window.location.search);
        const hospedajeId = params.get('id');
        const tipo = params.get('tipo') || 'hotel';

        if (!hospedajeId) return;

        // Verificar si ya es favorito
        checkIfFavorite();

        async function checkIfFavorite() {
            try {
                const res = await fetch(`${baseURL}/user/favorites/check/${hospedajeId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (data.success && data.isFavorite) {
                    favCheckbox.checked = true;
                    favContainer.classList.add('is-fav');
                }
            } catch (err) {
                console.error('Error checking favorite:', err);
            }
        }

        // Manejar toggle
        favCheckbox.addEventListener('change', async function () {
            const isChecked = this.checked;
            const nombreHospedaje = document.getElementById('hospedajeName')?.textContent || '';

            // Mapear tipo
            let tipoHospedaje = tipo;
            if (tipo === 'hoteles' || tipo === 'hotel') tipoHospedaje = 'hotel';
            else if (tipo === 'cabanas' || tipo === 'cabana') tipoHospedaje = 'cabana';
            else if (tipo === 'airbnb' || tipo === 'airbnbs') tipoHospedaje = 'airbnb';

            try {
                if (isChecked) {
                    // Agregar a favoritos
                    const res = await fetch(`${baseURL}/user/favorites`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            hospedajeId,
                            tipoHospedaje,
                            nombreHospedaje
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        favContainer.classList.add('is-fav');
                        showFavToast('❤️ Agregado a favoritos');
                    } else {
                        // Revertir si falla
                        this.checked = false;
                    }
                } else {
                    // Quitar de favoritos
                    const res = await fetch(`${baseURL}/user/favorites/${hospedajeId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (data.success) {
                        favContainer.classList.remove('is-fav');
                        showFavToast('💔 Eliminado de favoritos');
                    } else {
                        // Revertir si falla
                        this.checked = true;
                    }
                }
            } catch (err) {
                console.error('Error toggling favorite:', err);
                // Revertir
                this.checked = !isChecked;
            }
        });

        // Pequeño toast de confirmación
        function showFavToast(message) {
            const existing = document.getElementById('favToast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = 'favToast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                font-size: 0.95rem;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                animation: fadeInUp 0.3s ease;
            `;
            document.body.appendChild(toast);

            // Agregar animación al stylesheet si no existe
            if (!document.getElementById('favToastStyle')) {
                const style = document.createElement('style');
                style.id = 'favToastStyle';
                style.textContent = `
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    @keyframes fadeOutDown {
                        from { opacity: 1; transform: translateX(-50%) translateY(0); }
                        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    }
                `;
                document.head.appendChild(style);
            }

            setTimeout(() => {
                toast.style.animation = 'fadeOutDown 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }
    });
})();
