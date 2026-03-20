// map.js
// Lógica para el mapa interactivo de RestauranteWeb usando Mapbox

// Configura aquí tu token de Mapbox
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN'; // Configura aquí tu token de Mapbox

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el mapa
    const map = new mapboxgl.Map({
        container: 'public-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-99.4752, 21.2185], // Jalpan de Serra
        zoom: 13,
        pitch: 45
    });

    // Añadir controles de navegación
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showAccuracyCircle: false
    });
    map.addControl(geolocateControl, 'top-right');

    const API_BASE = window.location.origin + '/api';
    let markers = [];
    let allRestaurants = [];
    let allAgencias = [];
    let allHospedajes = [];
    let currentLocation = null; // Guardar ubicación actual del usuario

    // Evento de geolocalización para actualizar distancias
    geolocateControl.on('geolocate', (e) => {
        currentLocation = {
            lng: e.coords.longitude,
            lat: e.coords.latitude
        };
        // Re-renderizar para actualizar distancias manteniendo el filtro actual
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        if (activeFilterBtn) {
            activeFilterBtn.click(); // Forzar re-render con el filtro actual
        } else {
            renderMapAndList(getAllItems());
        }
    });

    // Calcular distancia Haversine (en km)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Cargar restaurantes
    async function cargarRestaurantes() {
        try {
            const res = await fetch(`${API_BASE}/restaurants?limite=300&compact=true`);
            const json = await res.json();
            if (json.success) {
                allRestaurants = json.data.restaurantes.map(r => ({ ...r, _itemType: 'restaurant' }));
            }
        } catch (error) {
            console.error("Error cargando restaurantes:", error);
        }
    }

    // Cargar agencias
    async function cargarAgencias() {
        try {
            const res = await fetch(`${API_BASE}/agencias`);
            const json = await res.json();
            if (json.success && json.data) {
                allAgencias = (Array.isArray(json.data) ? json.data : []).map(a => ({ ...a, _itemType: 'agencia' }));
            }
        } catch (error) {
            console.error("Error cargando agencias:", error);
        }
    }

    // Cargar hospedajes (hoteles, cabañas, airbnbs)
    async function cargarHospedajes() {
        try {
            const res = await fetch(`${API_BASE}/hospedajes`);
            const json = await res.json();
            if (json.success && json.data) {
                allHospedajes = json.data.map(h => ({ ...h, _itemType: 'hospedaje' }));
            }
        } catch (error) {
            console.error("Error cargando hospedajes:", error);
        }
    }

    // Determinar color, ícono y label según el tipo de item
    function getItemStyle(item) {
        const isAgencia = item._itemType === 'agencia';
        const isHospedaje = item._itemType === 'hospedaje';

        if (isAgencia) {
            return { color: '#0d9488', icon: 'fa-building', label: 'Agencia', tipoLower: 'agencia' };
        }

        if (isHospedaje) {
            switch (item._tipoHospedaje) {
                case 'hotel':
                    return { color: '#3b82f6', icon: 'fa-hotel', label: 'Hotel', tipoLower: 'hotel' };
                case 'cabana':
                    return { color: '#22c55e', icon: 'fa-campground', label: 'Cabaña', tipoLower: 'cabana' };
                case 'airbnb':
                    return { color: '#f43f5e', icon: 'fa-home', label: 'Airbnb', tipoLower: 'airbnb' };
                default:
                    return { color: '#3b82f6', icon: 'fa-bed', label: 'Hospedaje', tipoLower: 'hospedaje' };
            }
        }

        // Restaurante
        const tipoLower = item.tipo ? item.tipo.toLowerCase() : 'otro';
        switch(tipoLower) {
            case 'restaurante': return { color: '#f59e0b', icon: 'fa-utensils', label: item.tipo, tipoLower };
            case 'cafeteria': return { color: '#06b6d4', icon: 'fa-coffee', label: item.tipo, tipoLower };
            case 'bar': return { color: '#8b5cf6', icon: 'fa-glass-martini-alt', label: item.tipo, tipoLower };
            case 'comida-rapida': return { color: '#ef4444', icon: 'fa-hamburger', label: item.tipo, tipoLower };
            case 'panaderia': return { color: '#d97706', icon: 'fa-bread-slice', label: item.tipo, tipoLower };
            case 'obrador-artesanal': return { color: '#a16207', icon: 'fa-mortar-pestle', label: item.tipo, tipoLower };
            default: return { color: '#6b7280', icon: 'fa-store', label: item.tipo || 'Otro', tipoLower };
        }
    }

    // Obtener coordenadas según el tipo de item
    function getCoords(item) {
        if (item._itemType === 'agencia') {
            return { lat: item.coordenadas?.lat, lng: item.coordenadas?.lng };
        }
        if (item._itemType === 'hospedaje') {
            const lat = item.ubicacion?.coordenadas?.lat || item.ubicacion?.lat;
            const lng = item.ubicacion?.coordenadas?.lng || item.ubicacion?.lng;
            return { lat, lng };
        }
        // Restaurante
        return { lat: item.direccion?.coordenadas?.lat, lng: item.direccion?.coordenadas?.lng };
    }

    // Obtener dirección de texto según el tipo
    function getAddress(item) {
        if (item._itemType === 'agencia') return item.direccion || '';
        if (item._itemType === 'hospedaje') return item.ubicacion?.direccion || item.ubicacion?.ciudad || '';
        return item.direccion?.calle || '';
    }

    // Obtener rating según el tipo
    function getRating(item) {
        if (item._itemType === 'agencia') {
            return { score: item.calificacionPromedio || 0, count: item.numeroResenas || 0 };
        }
        if (item._itemType === 'hospedaje') {
            return { score: item.calificacion?.promedio || 0, count: item.calificacion?.totalReviews || 0 };
        }
        return { score: item.googleRating || 0, count: item.googleTotalReviews || 0 };
    }

    // Obtener URL de detalle según el tipo
    function getDetailUrl(item) {
        if (item._itemType === 'agencia') return `/agencia.html?id=${item._id}`;
        if (item._itemType === 'hospedaje') return null; // No hay página de detalle aún
        return `/restaurante.html?id=${item.id || item._id}`;
    }

    // Obtener imagen según el tipo
    function getImage(item) {
        const fallback = '/images/PueblosMágicos.svg.png';
        if (item._itemType === 'agencia') return item.logo?.url || fallback;
        if (item._itemType === 'hospedaje') {
            return item.imagenes && item.imagenes.length > 0 ? item.imagenes[0].url : fallback;
        }
        return item.imagenes && item.imagenes.length > 0 ? item.imagenes[0].url : fallback;
    }

    // Cargar todo y renderizar
    async function cargarTodo() {
        try {
            await Promise.all([cargarRestaurantes(), cargarAgencias(), cargarHospedajes()]);
            renderMapAndList(getAllItems(), true);
        } catch (error) {
            console.error("Error cargando datos:", error);
            document.getElementById('sidebar-list').innerHTML = '<p class="text-error">Error al cargar la lista.</p>';
        }
    }

    function getAllItems() {
        return [...allRestaurants, ...allAgencias, ...allHospedajes];
    }

    // Dibujar marcadores y la lista
    function renderMapAndList(items, fitBoundsEnabled = false) {
        // Limpiar marcadores antiguos
        markers.forEach(m => m.remove());
        markers = [];
        const sidebarList = document.getElementById('sidebar-list');
        sidebarList.innerHTML = '';

        if (items.length === 0) {
            sidebarList.innerHTML = '<p style="color: var(--gray-500); font-size: 0.9rem;">No se encontraron resultados para esta categoría.</p>';
            return;
        }

        const boundsCoords = [];
        const fallbackImg = '/images/PueblosMágicos.svg.png';

        // Mapear items con su distancia si hay ubicación
        let processedItems = items.map(item => {
            const coords = getCoords(item);
            let distance = Infinity;
            if (currentLocation && coords.lat && coords.lng) {
                distance = calculateDistance(currentLocation.lat, currentLocation.lng, coords.lat, coords.lng);
            }
            return { ...item, coords, distance };
        });

        // Ordenar por distancia (del más cercano al más lejano)
        if (currentLocation) {
            processedItems.sort((a, b) => a.distance - b.distance);
        }

        processedItems.forEach(item => {
            const { lat, lng } = item.coords;
            if (!lat || !lng) return;

            const style = getItemStyle(item);
            const rating = getRating(item);
            const address = getAddress(item);
            const imgUrl = getImage(item);
            const detailUrl = getDetailUrl(item);

            let distanceText = '';
            if (item.distance !== Infinity) {
                if (item.distance < 1) {
                    distanceText = `<span style="color:var(--primary); font-weight:600; font-size: 0.75rem;"><i class="fas fa-location-arrow"></i> a ${Math.round(item.distance * 1000)}m de ti</span>`;
                } else {
                    distanceText = `<span style="color:var(--primary); font-weight:600; font-size: 0.75rem;"><i class="fas fa-location-arrow"></i> a ${item.distance.toFixed(1)}km de ti</span>`;
                }
            }

            // Crear popup HTML
            let ratingHtml = '';
            if (rating.score > 0) {
                ratingHtml = `
                    <div style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.5rem;">
                        <span style="color:#f59e0b; font-size:0.85rem;">${'★'.repeat(Math.round(rating.score))}${'☆'.repeat(5 - Math.round(rating.score))}</span>
                        <span style="font-size:0.8rem; color:#6b7280; font-weight:600;">${rating.score.toFixed(1)}</span>
                        ${rating.count ? `<span style="font-size:0.75rem; color:#9ca3af;">(${rating.count})</span>` : ''}
                    </div>
                `;
            }

            const detailBtnHtml = detailUrl
                ? `<a href="${detailUrl}" class="popup-btn" style="background-color: ${style.color}; border-color: ${style.color};">Ver Detalles</a>`
                : '';

            const popupHTML = `
                <div class="popup-header">
                    <img src="${imgUrl}" alt="${item.nombre}" onerror="this.onerror=null;this.src='${fallbackImg}';"
                         style="${item._itemType === 'agencia' ? 'object-fit: contain; background: white; padding: 1rem;' : ''}">
                    <span class="popup-badge" style="background-color: ${style.color};">${style.label}</span>
                </div>
                <div class="popup-body">
                    <h3 class="popup-title">${item.nombre}</h3>
                    ${ratingHtml}
                    ${address ? `
                        <div class="popup-address">
                            <i class="fas fa-map-marker-alt" style="color: ${style.color};"></i>
                            <span>${address}</span>
                        </div>
                    ` : ''}
                    ${detailBtnHtml}
                </div>
            `;

            const popup = new mapboxgl.Popup({ offset: 25, closeButton: true })
                .setHTML(popupHTML);

            // Crear pin de marcador
            const el = document.createElement('div');
            el.className = 'marker-wrapper';

            const pin = document.createElement('div');
            pin.className = 'custom-marker';
            pin.style.backgroundColor = style.color;
            pin.style.width = '30px';
            pin.style.height = '30px';
            pin.style.borderRadius = '50% 50% 50% 0';
            pin.style.transform = 'rotate(-45deg)';
            pin.style.display = 'flex';
            pin.style.alignItems = 'center';
            pin.style.justifyContent = 'center';
            pin.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
            pin.style.cursor = 'pointer';
            pin.style.border = '2px solid white';
            
            const i = document.createElement('i');
            i.className = `fas ${style.icon}`;
            i.style.color = 'white';
            i.style.transform = 'rotate(45deg)';
            i.style.fontSize = '12px';
            
            pin.appendChild(i);
            el.appendChild(pin);

            // Track click (solo restaurantes)
            const trackClick = () => {
                if (item._itemType === 'restaurant') {
                    const restId = item.id || item._id;
                    fetch(`${API_BASE}/restaurants/${restId}/click-map`, { method: 'POST' })
                        .catch(err => console.error('Error registrando clic en mapa:', err));
                }
            };

            el.addEventListener('click', trackClick);
            const marker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map);
            
            markers.push(marker);
            boundsCoords.push([lng, lat]);

            // Lista del sidebar
            const ratingText = rating.score > 0 ? ` · <span style="color:#f59e0b;">★</span> ${rating.score.toFixed(1)}` : '';

            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.innerHTML = `
                <div class="list-item-icon ${style.tipoLower}" style="background-color: ${style.color};">
                    <i class="fas ${style.icon}"></i>
                </div>
                <div class="list-item-content">
                    <div class="list-item-title">${item.nombre}</div>
                    <div class="list-item-address">
                        ${address}${ratingText}
                        ${distanceText ? `<br>${distanceText}` : ''}
                    </div>
                </div>
            `;
            
            listItem.addEventListener('click', () => {
                trackClick();
                map.flyTo({
                    center: [lng, lat],
                    zoom: 16,
                    essential: true
                });
                const popUps = document.getElementsByClassName('mapboxgl-popup');
                if (popUps[0]) popUps[0].remove();
                marker.togglePopup();
            });

            sidebarList.appendChild(listItem);
        });

        // Ajustar bounds
        if (fitBoundsEnabled && boundsCoords.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            boundsCoords.forEach(c => bounds.extend(c));
            const isMobile = window.innerWidth <= 768;
            map.fitBounds(bounds, {
                padding: {
                    top: 50, 
                    bottom: isMobile ? 300 : 50, 
                    left: isMobile ? 50 : 350, 
                    right: 50
                }, 
                maxZoom: 15
            });
        }
    }

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const category = e.target.dataset.filter;
            if (category === 'all') {
                renderMapAndList(getAllItems());
            } else if (category === 'agencia') {
                renderMapAndList(allAgencias);
            } else if (category === 'hotel') {
                renderMapAndList(allHospedajes.filter(h => h._tipoHospedaje === 'hotel'));
            } else if (category === 'cabana') {
                renderMapAndList(allHospedajes.filter(h => h._tipoHospedaje === 'cabana'));
            } else if (category === 'airbnb') {
                renderMapAndList(allHospedajes.filter(h => h._tipoHospedaje === 'airbnb'));
            } else {
                const filtered = allRestaurants.filter(r => r.tipo && r.tipo.toLowerCase() === category.toLowerCase());
                renderMapAndList(filtered);
            }
        });
    });

    // Iniciar
    map.on('load', () => {
        cargarTodo();
    });
});
