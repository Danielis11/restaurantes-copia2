// map.js
// Lógica para el mapa interactivo de RestauranteWeb usando Mapbox

// Configura aquí tu token de Mapbox

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/config/mapbox');
        const data = await res.json();
        if (data.success && data.token) mapboxgl.accessToken = data.token;
        else return;
    } catch(err) { return; }

    // Inicializar el mapa
    const map = new mapboxgl.Map({
        container: 'public-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-99.4752, 21.2185], // Jalpan de Serra
        zoom: 13,
        pitch: window.innerWidth <= 768 ? 0 : 45 // en celular plano: más fácil de mover con un dedo
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
        // Ordenar la lista por cercanía
        estado.cerca = true;
        btnCerca.classList.remove('buscando');
        btnCerca.classList.add('activo');
        if (entradas.length) aplicar(false);
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
        let score = 0, count = 0;
        
        if (item._itemType === 'agencia') {
            score = item.calificacionPromedio || 0;
            count = item.numeroResenas || 0;
        } else if (item._itemType === 'hospedaje') {
            score = item.calificacion?.promedio || 0;
            count = item.calificacion?.totalReviews || 0;
        } else {
            score = item.googleRating || 0;
            count = item.googleTotalReviews || 0;
        }

        return { score, count };
    }

    // Obtener URL de detalle según el tipo
    function getDetailUrl(item) {
        if (item._itemType === 'agencia') return `/agencia.html?id=${item._id}`;
        if (item._itemType === 'hospedaje') return `/hospedaje/hospedaje-detalle.html?tipo=${item._tipoHospedaje || 'hotel'}&id=${item._id}`;
        return `/restaurante.html?id=${item.id || item._id}`;
    }

    // Obtener imagen según el tipo
    function getImage(item) {
        const fallback = '/images/PueblosMágicos.svg.png';
        if (item._itemType === 'agencia') return item.logo?.url || fallback;
        if (item._itemType === 'hospedaje') {
            return item.imagenes && item.imagenes.length > 0 ? item.imagenes[0].url : fallback;
        }
        // Restaurantes: compact API devuelve 'imagenPrincipal', full API devuelve 'imagenes'
        if (item.imagenPrincipal) return item.imagenPrincipal.url || fallback;
        if (item.imagenes && item.imagenes.length > 0) return item.imagenes[0].url || fallback;
        return fallback;
    }

    // Cargar todo y renderizar
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const TXT = {
        es: { lugares: n => `${n} ${n === 1 ? 'lugar' : 'lugares'} en el mapa`, cerca: 'Cerca de ti', todos: 'Todos los lugares', nuevo: 'Nuevo', detalles: 'Ver detalles', llegar: 'Cómo llegar', vacio: 'No encontramos lugares con esa búsqueda.', limpiar: 'Quitar filtros', buscar: 'Buscar un lugar', error: 'No pudimos cargar los lugares.', sinUbic: 'Activa tu ubicación para ver lo más cercano.',
              tipos: { restaurante: 'Restaurante', cafeteria: 'Cafetería', bar: 'Bar', 'comida-rapida': 'Comida rápida', panaderia: 'Panadería', 'obrador-artesanal': 'Obrador', agencia: 'Agencia', hotel: 'Hotel', cabana: 'Cabaña', airbnb: 'Airbnb' } },
        en: { lugares: n => `${n} ${n === 1 ? 'place' : 'places'} on the map`, cerca: 'Near you', todos: 'All places', nuevo: 'New', detalles: 'View details', llegar: 'Directions', vacio: 'No places match your search.', limpiar: 'Clear filters', buscar: 'Search a place', error: 'We could not load the places.', sinUbic: 'Turn on your location to see what is nearby.',
              tipos: { restaurante: 'Restaurant', cafeteria: 'Café', bar: 'Bar', 'comida-rapida': 'Fast food', panaderia: 'Bakery', 'obrador-artesanal': 'Artisan', agencia: 'Agency', hotel: 'Hotel', cabana: 'Cabin', airbnb: 'Airbnb' } },
        fr: { lugares: n => `${n} ${n === 1 ? 'lieu' : 'lieux'} sur la carte`, cerca: 'Près de vous', todos: 'Tous les lieux', nuevo: 'Nouveau', detalles: 'Voir les détails', llegar: 'Itinéraire', vacio: 'Aucun lieu ne correspond.', limpiar: 'Effacer les filtres', buscar: 'Chercher un lieu', error: 'Impossible de charger les lieux.', sinUbic: 'Activez votre position pour voir les lieux proches.',
              tipos: { restaurante: 'Restaurant', cafeteria: 'Café', bar: 'Bar', 'comida-rapida': 'Restauration rapide', panaderia: 'Boulangerie', 'obrador-artesanal': 'Artisan', agencia: 'Agence', hotel: 'Hôtel', cabana: 'Cabane', airbnb: 'Airbnb' } }
    };
    const t = () => TXT[(document.documentElement.lang || 'es').slice(0, 2)] || TXT.es;
    const sinAcentos = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const esMovil = () => window.innerWidth <= 768;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const panel = document.getElementById('map-panel');
    const lista = document.getElementById('sidebar-list');
    const inputQ = document.getElementById('mp-q');
    const btnLimpiar = document.getElementById('mp-limpiar');
    const btnCerca = document.getElementById('mp-cerca');
    const btnVolver = document.getElementById('mp-volver');
    const totalEl = document.getElementById('mp-total');
    const ficha = document.getElementById('mp-ficha');

    const estado = { cat: 'all', q: '', cerca: false };
    let entradas = [];          // { item, style, lng, lat, cat, texto, marker, el, li }
    let seleccion = null;       // entrada abierta
    let popupActual = null;
    let vistaPrevia = null;     // vista antes de hacer zoom
    let cambiando = false;      // se cambia de un lugar a otro sin volver

    function categoria(item) {
        if (item._itemType === 'agencia') return 'agencia';
        if (item._itemType === 'hospedaje') return item._tipoHospedaje || 'hotel';
        return (item.tipo || 'otro').toLowerCase();
    }

    function urlComoLlegar(e) {
        return `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`;
    }

    // Altura de la barra de navegación inferior (solo celular)
    // (se guarda en el contenedor para que la usen tanto la lista como la ficha)
    const envoltura = panel.parentElement;
    let altoNav = 0;
    function ajustarNav() {
        const nav = document.getElementById('nav-menu');
        const fija = nav && getComputedStyle(nav).position === 'fixed' && nav.getBoundingClientRect().top > innerHeight / 2;
        altoNav = fija ? nav.offsetHeight : 0;
        envoltura.style.setProperty('--mp-nav', altoNav + 'px');
    }

    function vistaActual() {
        return { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    }

    // Desplazamiento para que el lugar quede visible junto al panel y con espacio para la ficha
    function desfase() {
        if (esMovil()) {
            // El lugar queda centrado en el espacio libre que hay arriba de la ficha
            const caja = map.getContainer().getBoundingClientRect();
            const techo = Math.max(caja.top, 0) + 50; // debajo del botón «Ver todo el mapa»
            const piso = innerHeight - altoNav - (ficha.offsetHeight || 130) - 20;
            return [0, Math.round((techo + piso) / 2 - (caja.top + caja.height / 2))];
        }
        return [Math.round((panel.offsetWidth + 16) / 2), 110];
    }

    function popupHTML(e) {
        const { item, style } = e;
        const rating = getRating(item);
        const address = getAddress(item);
        const detailUrl = getDetailUrl(item);
        const img = getImage(item);
        const esLogo = item._itemType === 'agencia' || img === '/images/PueblosMágicos.svg.png';
        const tipo = t().tipos[e.cat] || style.label || '';
        return `
            <div class="popup-header">
                <img src="${esc(img)}" alt="" onerror="this.onerror=null;this.src='/images/PueblosMágicos.svg.png';this.style.objectFit='contain';this.style.padding='1.2rem';"
                     style="${esLogo ? 'object-fit:contain;background:#fff;padding:1.2rem;' : ''}">
                <span class="popup-badge" style="background:${style.color}">${esc(tipo)}</span>
            </div>
            <div class="popup-body">
                <h3 class="popup-title">${esc(item.nombre)}</h3>
                ${rating.score > 0
                    ? `<div class="popup-rating"><i class="fas fa-star"></i><b>${rating.score.toFixed(1)}</b>${rating.count ? `<span>(${rating.count})</span>` : ''}</div>`
                    : `<div class="popup-rating"><span style="color:#059669;font-weight:600">${t().nuevo}</span></div>`}
                ${address ? `<div class="popup-address"><i class="fas fa-map-marker-alt" style="color:${style.color}"></i><span>${esc(address)}</span></div>` : ''}
                <div class="popup-acciones">
                    ${detailUrl ? `<a href="${esc(detailUrl)}" class="popup-btn" style="background:${style.color}">${t().detalles} <i class="fas fa-arrow-right"></i></a>` : ''}
                    <a href="${urlComoLlegar(e)}" target="_blank" rel="noopener" class="popup-btn sec" title="${t().llegar}" aria-label="${t().llegar}"><i class="fas fa-directions"></i></a>
                </div>
            </div>`;
    }

    function registrarClic(e) {
        if (e.item._itemType === 'restaurant') {
            const restId = e.item.id || e.item._id;
            fetch(`${API_BASE}/restaurants/${restId}/click-map`, { method: 'POST' }).catch(() => {});
        }
    }

    function marcarActivo(e) {
        entradas.forEach(x => {
            x.el.classList.toggle('activo', x === e);
            if (x.li) x.li.classList.toggle('activo', x === e);
        });
    }

    // Ficha compacta para celular: va abajo, fuera del mapa, para que el mapa se pueda seguir moviendo
    function fichaHTML(e) {
        const { item, style } = e;
        const rating = getRating(item);
        const address = getAddress(item);
        const detailUrl = getDetailUrl(item);
        const img = getImage(item);
        const esLogo = item._itemType === 'agencia' || img === '/images/PueblosMágicos.svg.png';
        return `
            <div class="mp-ficha-foto"><img src="${esc(img)}" alt="" class="${esLogo ? 'logo' : ''}" onerror="this.onerror=null;this.src='/images/PueblosMágicos.svg.png';this.className='logo';"></div>
            <div class="mp-ficha-info">
                <span class="mp-ficha-tipo" style="color:${style.color}">${esc(t().tipos[e.cat] || style.label || '')}</span>
                <h3>${esc(item.nombre)}</h3>
                ${rating.score > 0
                    ? `<div class="popup-rating"><i class="fas fa-star"></i><b>${rating.score.toFixed(1)}</b>${rating.count ? `<span>(${rating.count})</span>` : ''}</div>`
                    : `<div class="popup-rating"><span style="color:#059669;font-weight:600">${t().nuevo}</span></div>`}
                ${address ? `<div class="mp-ficha-dir">${esc(address)}</div>` : ''}
                <div class="popup-acciones">
                    ${detailUrl ? `<a href="${esc(detailUrl)}" class="popup-btn" style="background:${style.color}">${t().detalles} <i class="fas fa-arrow-right"></i></a>` : ''}
                    <a href="${urlComoLlegar(e)}" target="_blank" rel="noopener" class="popup-btn sec" title="${t().llegar}" aria-label="${t().llegar}"><i class="fas fa-directions"></i></a>
                </div>
            </div>
            <button type="button" class="mp-ficha-cerrar" aria-label="Cerrar"><i class="fas fa-times"></i></button>`;
    }

    function cerrarFicha() {
        ficha.hidden = true;
        ficha.innerHTML = '';
        panel.classList.remove('oculto');
    }

    // Abrir un lugar: zoom suave hacia él y su ficha
    function seleccionar(e) {
        if (seleccion === e) return;
        registrarClic(e);
        if (!seleccion) vistaPrevia = vistaActual();
        if (popupActual) { cambiando = true; popupActual.remove(); cambiando = false; }
        seleccion = e;
        marcarActivo(e);
        const movil = esMovil();

        if (movil) {
            // En celular la ficha va abajo (no encima del mapa) y la lista se esconde
            panel.classList.remove('abierto', 'mini');
            panel.classList.add('oculto');
            ficha.innerHTML = fichaHTML(e);
            ficha.hidden = false;
            ficha.querySelector('.mp-ficha-cerrar').addEventListener('click', () => deseleccionar());
        }

        // En celular sin inclinación: el mapa plano se arrastra con un dedo sin sorpresas
        map.flyTo({ center: [e.lng, e.lat], zoom: Math.max(map.getZoom(), 16.5), pitch: movil ? 0 : 50, offset: desfase(), speed: 1.1, curve: 1.4, essential: true, duration: reduceMotion ? 0 : undefined });

        if (!movil) {
            popupActual = new mapboxgl.Popup({ anchor: 'bottom', offset: 26, closeButton: true, closeOnClick: true, maxWidth: 'none', focusAfterOpen: false })
                .setLngLat([e.lng, e.lat])
                .setHTML(popupHTML(e))
                .addTo(map);
            popupActual.on('close', () => {
                popupActual = null;
                if (cambiando) return;
                deseleccionar();
            });
            if (e.li) e.li.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
        btnVolver.classList.add('visible');
    }

    // Cerrar la ficha: regresar a la vista que se tenía antes (si el usuario no movió el mapa por su cuenta)
    function deseleccionar() {
        if (popupActual) { const p = popupActual; popupActual = null; cambiando = true; p.remove(); cambiando = false; }
        cerrarFicha();
        seleccion = null;
        marcarActivo(null);
        btnVolver.classList.remove('visible');
        panel.classList.remove('mini');
        if (vistaPrevia) {
            map.flyTo({ ...vistaPrevia, speed: 1.2, curve: 1.4, essential: true, duration: reduceMotion ? 0 : undefined });
            vistaPrevia = null;
        }
    }
    btnVolver.addEventListener('click', () => {
        const habiaVista = !!vistaPrevia;
        deseleccionar();
        if (!habiaVista) encuadrar(entradas.filter(x => x.enMapa));
    });

    // Si el usuario mueve el mapa con un lugar abierto, no lo regresamos de golpe al cerrar
    map.on('dragstart', () => { if (seleccion) vistaPrevia = null; });

    // En celular, tocar el mapa fuera de un pin cierra la ficha
    map.on('click', ev => {
        if (!seleccion || !esMovil()) return;
        const destino = ev.originalEvent && ev.originalEvent.target;
        if (destino && destino.closest && destino.closest('.marker-wrapper')) return;
        deseleccionar();
    });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && seleccion) deseleccionar(); });

    // Crear los pines una sola vez
    function construir() {
        entradas = getAllItems().map(item => {
            const c = getCoords(item);
            const lat = Number(c.lat), lng = Number(c.lng);
            if (!lat || !lng) return null;
            const style = getItemStyle(item);
            const e = { item, style, lat, lng, cat: categoria(item), texto: sinAcentos(item.nombre + ' ' + getAddress(item)) };

            const el = document.createElement('div');
            el.className = 'marker-wrapper';
            el.innerHTML = `<div class="custom-marker" style="background:${style.color}"><i class="fas ${style.icon}"></i></div>`;
            el.setAttribute('role', 'button');
            el.setAttribute('aria-label', item.nombre || '');
            el.addEventListener('click', ev => { ev.stopPropagation(); seleccionar(e); });
            el.addEventListener('mouseenter', () => e.li && e.li.classList.add('resaltado'));
            el.addEventListener('mouseleave', () => e.li && e.li.classList.remove('resaltado'));
            e.el = el;
            e.marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]);
            return e;
        }).filter(Boolean);
    }

    function itemLista(e, i) {
        const { item, style } = e;
        const rating = getRating(item);
        const img = getImage(item);
        const esLogo = item._itemType === 'agencia' || img === '/images/PueblosMágicos.svg.png';
        const detailUrl = getDetailUrl(item);
        let dist = '';
        if (e.distance !== undefined && e.distance !== Infinity) {
            dist = e.distance < 1 ? `${Math.round(e.distance * 1000)} m` : `${e.distance.toFixed(1)} km`;
        }
        const li = document.createElement('div');
        li.className = 'list-item' + (seleccion === e ? ' activo' : '');
        li.style.setProperty('--c', style.color);
        li.style.setProperty('--i', Math.min(i, 12));
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.innerHTML = `
            <div class="mp-foto"><i class="fas ${style.icon}"></i>${esLogo ? '' : `<img alt="" loading="lazy" decoding="async" src="${esc(img)}">`}</div>
            <div class="list-item-content">
                <div class="list-item-title">${esc(item.nombre)}</div>
                <div class="mp-meta">
                    <span class="mp-tipo">${esc(t().tipos[e.cat] || style.label || '')}</span>
                    ${rating.score > 0 ? `<span class="mp-est"><i class="fas fa-star"></i> ${rating.score.toFixed(1)}</span>` : `<span class="mp-nuevo">${t().nuevo}</span>`}
                </div>
                ${getAddress(item) ? `<div class="list-item-address">${esc(getAddress(item))}</div>` : ''}
            </div>
            ${dist ? `<span class="mp-dist">${dist}</span>` : ''}
            ${detailUrl ? `<a class="mp-ir" href="${esc(detailUrl)}" title="${t().detalles}" aria-label="${t().detalles}: ${esc(item.nombre)}"><i class="fas fa-chevron-right"></i></a>` : ''}`;
        const im = li.querySelector('img');
        if (im) {
            im.onload = () => im.classList.add('ok');
            im.onerror = () => im.remove();
        }
        const ir = li.querySelector('.mp-ir');
        if (ir) ir.addEventListener('click', ev => ev.stopPropagation());
        li.addEventListener('click', () => seleccionar(e));
        li.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seleccionar(e); } });
        li.addEventListener('mouseenter', () => e.el.classList.add('resaltado'));
        li.addEventListener('mouseleave', () => e.el.classList.remove('resaltado'));
        e.li = li;
        return li;
    }

    function coincideBusqueda(e) {
        if (!estado.q) return true;
        return estado.q.split(/\s+/).every(p => e.texto.includes(p));
    }

    function aplicar(ajustar = false) {
        const porBusqueda = entradas.filter(coincideBusqueda);
        const visibles = estado.cat === 'all' ? porBusqueda : porBusqueda.filter(e => e.cat === estado.cat);

        // Conteos por categoría (según la búsqueda) y ocultar las vacías
        document.querySelectorAll('#map-filters .filter-btn').forEach(b => {
            const f = b.dataset.filter;
            const n = f === 'all' ? porBusqueda.length : porBusqueda.filter(e => e.cat === f).length;
            b.querySelector('b').textContent = n;
            b.classList.toggle('vacio', f !== 'all' && n === 0 && f !== estado.cat);
        });

        // Pines: mostrar solo los visibles
        const set = new Set(visibles);
        entradas.forEach(e => {
            if (set.has(e)) { if (!e.enMapa) { e.marker.addTo(map); e.enMapa = true; } }
            else if (e.enMapa) { e.marker.remove(); e.enMapa = false; }
        });
        if (seleccion && !set.has(seleccion)) deseleccionar();

        // Distancias
        visibles.forEach(e => {
            e.distance = currentLocation ? calculateDistance(currentLocation.lat, currentLocation.lng, e.lat, e.lng) : Infinity;
        });
        const orden = estado.cerca && currentLocation ? [...visibles].sort((a, b) => a.distance - b.distance) : visibles;

        totalEl.textContent = t().lugares(visibles.length);
        lista.innerHTML = '';
        entradas.forEach(e => { e.li = null; });
        if (!orden.length) {
            lista.innerHTML = `<div class="mp-vacio"><i class="fas fa-map-marker-alt"></i>${t().vacio}<br><button type="button" id="mp-reset">${t().limpiar}</button></div>`;
            document.getElementById('mp-reset').addEventListener('click', limpiarTodo);
            return;
        }
        const titulo = document.createElement('div');
        titulo.className = 'mp-seccion';
        titulo.textContent = estado.cerca && currentLocation ? t().cerca : t().todos;
        lista.appendChild(titulo);
        const frag = document.createDocumentFragment();
        orden.forEach((e, i) => frag.appendChild(itemLista(e, i)));
        lista.appendChild(frag);

        if (ajustar) encuadrar(visibles);
    }

    function encuadrar(lista) {
        if (!lista.length) return;
        const bounds = new mapboxgl.LngLatBounds();
        lista.forEach(e => bounds.extend([e.lng, e.lat]));
        const movil = esMovil();
        const abajo = movil ? panel.getBoundingClientRect().height + altoNav + 30 : 50;
        map.fitBounds(bounds, { padding: { top: 60, bottom: abajo, left: movil ? 40 : panel.offsetWidth + 50, right: 60 }, maxZoom: 15, duration: reduceMotion ? 0 : 900 });
    }

    function limpiarTodo() {
        estado.q = ''; inputQ.value = ''; btnLimpiar.hidden = true;
        estado.cat = 'all';
        document.querySelectorAll('#map-filters .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
        aplicar(true);
    }

    async function cargarTodo() {
        try {
            await Promise.all([cargarRestaurantes(), cargarAgencias(), cargarHospedajes()]);
            construir();
            aplicar(true);
        } catch (error) {
            console.error("Error cargando datos:", error);
            lista.innerHTML = `<div class="mp-vacio"><i class="fas fa-exclamation-circle"></i>${t().error}</div>`;
        }
    }

    function getAllItems() {
        return [...allRestaurants, ...allAgencias, ...allHospedajes];
    }

    // Categorías
    document.querySelectorAll('#map-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#map-filters .filter-btn').forEach(b => b.classList.toggle('active', b === btn));
            estado.cat = btn.dataset.filter;
            btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
            if (seleccion) deseleccionar();
            aplicar(true);
        });
    });

    // Búsqueda
    let tBusca;
    inputQ.addEventListener('input', () => {
        btnLimpiar.hidden = !inputQ.value;
        clearTimeout(tBusca);
        tBusca = setTimeout(() => { estado.q = sinAcentos(inputQ.value.trim()); aplicar(false); }, 150);
    });
    inputQ.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') {
            ev.preventDefault();
            const primero = entradas.find(e => e.li);
            if (primero) seleccionar(primero);
        }
    });
    inputQ.addEventListener('focus', () => { if (esMovil()) { panel.classList.remove('mini'); panel.classList.add('abierto'); } });
    btnLimpiar.addEventListener('click', () => { inputQ.value = ''; btnLimpiar.hidden = true; estado.q = ''; aplicar(false); inputQ.focus(); });

    // Cerca de mí
    btnCerca.addEventListener('click', () => {
        if (estado.cerca && currentLocation) {
            estado.cerca = false; btnCerca.classList.remove('activo'); aplicar(false); return;
        }
        estado.cerca = true;
        btnCerca.classList.add('buscando');
        if (!geolocateControl.trigger()) btnCerca.classList.remove('buscando');
    });
    geolocateControl.on('error', () => {
        estado.cerca = false;
        btnCerca.classList.remove('buscando', 'activo');
        btnCerca.title = t().sinUbic;
    });

    // Hoja inferior en celular
    document.getElementById('mp-asa').addEventListener('click', () => {
        const abierto = panel.classList.contains('abierto');
        panel.classList.remove('mini');
        panel.classList.toggle('abierto', !abierto);
        document.getElementById('mp-asa').setAttribute('aria-expanded', String(!abierto));
    });

    document.addEventListener('languageChanged', () => {
        inputQ.placeholder = t().buscar;
        if (entradas.length) aplicar(false);
    });
    inputQ.placeholder = t().buscar;

    ajustarNav();
    window.addEventListener('resize', ajustarNav);

    // Iniciar: los lugares se piden de inmediato, sin esperar a que se dibuje todo el mapa
    cargarTodo();
});
