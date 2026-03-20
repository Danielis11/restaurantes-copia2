// ===== GESTIÓN DEL PANEL DE ADMINISTRACIÓN =====

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.restaurants = [];
        this.charts = {};
        this.initializePanel();
    }

    async initializePanel() {
        // Verificar autenticación
        await this.checkAuthentication();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Cargar datos iniciales
        await this.loadInitialData();
        
        // Configurar navegación
        this.setupNavigation();
        
        // Mostrar sección inicial
        this.showSection('dashboard');
    }

    async checkAuthentication() {
        const token = Storage.getAuthToken();
        
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const response = await ApiClient.get('/auth/profile');
            if (response.success) {
                this.currentUser = response.data.admin;
                this.updateUserInterface();
            } else {
                throw new Error('Usuario no válido');
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            Storage.removeAuthToken();
            window.location.href = '/login.html';
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Actualizar información del usuario en el header
        const userName = document.getElementById('user-name');
        const userRole = document.getElementById('user-role');
        const userAvatar = document.getElementById('user-avatar');

        if (userName) {
            userName.textContent = `${this.currentUser.nombre} ${this.currentUser.apellido}`;
        }

        if (userRole) {
            userRole.textContent = this.currentUser.rol;
        }

        if (userAvatar) {
            const initials = (this.currentUser.nombre?.[0] || '') + (this.currentUser.apellido?.[0] || '');
            userAvatar.textContent = initials.toUpperCase();
        }

        // Actualizar perfil
        this.updateProfileSection();
    }

    setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Toggle sidebar móvil
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }

        // Navegación del sidebar
        const menuLinks = document.querySelectorAll('.menu-link[data-section]');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Formulario de restaurante
        const restaurantForm = document.getElementById('restaurant-form');
        if (restaurantForm) {
            restaurantForm.addEventListener('submit', this.handleRestaurantSubmit.bind(this));
        }

        // Formulario de perfil
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileSubmit.bind(this));
        }

        // Formulario de contraseña
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordSubmit.bind(this));
        }

        // Refresh dashboard
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.loadDashboardData.bind(this));
        }

        // Filtros
        const filterBtn = document.getElementById('filter-restaurants');
        if (filterBtn) {
            filterBtn.addEventListener('click', this.toggleFilters);
        }

        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', this.applyFilters.bind(this));
        }

        // Modal de edición
        const editModalClose = document.getElementById('edit-modal-close');
        if (editModalClose) {
            editModalClose.addEventListener('click', this.closeEditModal);
        }

        // Formatear teléfono en tiempo real
        this.setupPhoneFormatting();
    }

    setupNavigation() {
        // Manejar navegación por hash
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash) {
                this.showSection(hash);
            }
        });

        // Cargar sección inicial desde hash
        const initialHash = window.location.hash.slice(1);
        if (initialHash) {
            this.showSection(initialHash);
        }
    }

    showSection(sectionName) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => section.classList.remove('active'));

        // Mostrar sección solicitada
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Actualizar navegación activa
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => item.classList.remove('active'));

        const activeMenuItem = document.querySelector(`[data-section="${sectionName}"]`)?.closest('.menu-item');
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }

        // Actualizar hash
        window.location.hash = sectionName;

        // Cargar datos específicos de la sección
        this.loadSectionData(sectionName);

        // Cerrar sidebar en móvil
        this.closeSidebar();
    }

    async loadInitialData() {
        await Promise.all([
            this.loadDashboardData(),
            this.loadRestaurants()
        ]);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'restaurants':
                await this.loadRestaurants();
                break;
            case 'profile':
                this.updateProfileSection();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await ApiClient.get('/admin/dashboard');
            if (response.success) {
                this.updateDashboardStats(response.data);
                this.updateChart(response.data);
                this.updateRecentActivity(response.data);
            }
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            NotificationManager.error('Error cargando estadísticas del dashboard');
        }
    }

    updateDashboardStats(data) {
        const stats = data.resumen || {};
        
        // Actualizar estadísticas con animación
        this.animateNumber('total-establishments', stats.totalRestaurantes || 0);
        this.animateNumber('active-establishments', stats.restaurantesActivos || 0);
        this.animateNumber('inactive-establishments', stats.restaurantesInactivos || 0);

        // Actualizar último agregado
        const lastAddedEl = document.getElementById('last-added');
        if (lastAddedEl && data.restaurantesRecientes && data.restaurantesRecientes.length > 0) {
            const lastRestaurant = data.restaurantesRecientes[0];
            const daysSince = this.daysSince(lastRestaurant.fechaCreacion);
            lastAddedEl.textContent = daysSince === 0 ? 'Hoy' : `Hace ${daysSince} días`;
        }
    }

    updateChart(data) {
        const ctx = document.getElementById('type-chart');
        if (!ctx) return;

        const chartData = data.porTipo || {};
        
        // Destruir gráfico existente
        if (this.charts.typeChart) {
            this.charts.typeChart.destroy();
        }

        this.charts.typeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Restaurantes', 'Bares', 'Cafeterías'],
                datasets: [{
                    data: [
                        chartData.restaurantes || 0,
                        chartData.bares || 0,
                        chartData.cafeterias || 0
                    ],
                    backgroundColor: [
                        '#f59e0b',
                        '#8b5cf6',
                        '#06b6d4'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    updateRecentActivity(data) {
        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;

        const restaurants = data.restaurantesRecientes || [];
        
        if (restaurants.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon primary">
                        <i class="fas fa-info"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">No hay actividad reciente</div>
                        <div class="activity-time">Agrega tu primer restaurante</div>
                    </div>
                </div>
            `;
            return;
        }

        activityList.innerHTML = restaurants.slice(0, 5).map(restaurant => `
            <div class="activity-item">
                <div class="activity-icon success">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        Nuevo ${restaurant.tipo}: ${restaurant.nombre}
                    </div>
                    <div class="activity-time">
                        ${this.formatDate(restaurant.fechaCreacion)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadRestaurants() {
        const loadingEl = document.getElementById('restaurants-loading');
        const gridEl = document.getElementById('restaurants-grid');
        const emptyEl = document.getElementById('restaurants-empty');

        // Mostrar loading
        if (loadingEl) loadingEl.style.display = 'block';
        if (gridEl) gridEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';

        try {
            const response = await ApiClient.get('/admin/restaurants');
            if (response.success) {
                this.restaurants = response.data.restaurantes || [];
                this.displayRestaurants(this.restaurants);
            }
        } catch (error) {
            console.error('Error cargando restaurantes:', error);
            NotificationManager.error('Error cargando tus restaurantes');
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    displayRestaurants(restaurants) {
        const gridEl = document.getElementById('restaurants-grid');
        const emptyEl = document.getElementById('restaurants-empty');

        if (!gridEl) return;

        if (restaurants.length === 0) {
            gridEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        gridEl.style.display = 'grid';

        gridEl.innerHTML = restaurants.map(restaurant => this.createRestaurantCard(restaurant)).join('');

        // Agregar event listeners a las tarjetas
        this.setupRestaurantCards();
    }

    createRestaurantCard(restaurant) {
        const typeIcon = this.getTypeIcon(restaurant.tipo);
        const statusClass = restaurant.activo ? 'active' : 'inactive';
        const statusText = restaurant.activo ? 'Activo' : 'Inactivo';
        const statusIcon = restaurant.activo ? 'check-circle' : 'pause-circle';

        return `
            <div class="admin-restaurant-card" data-id="${restaurant._id}">
                <div class="admin-card-header">
                    <div class="admin-card-title">
                        <div class="admin-card-name">${restaurant.nombre}</div>
                        <div class="admin-card-status ${statusClass}">
                            <i class="fas fa-${statusIcon}"></i>
                            ${statusText}
                        </div>
                    </div>
                    <div class="admin-card-type">
                        <i class="${typeIcon}"></i>
                        ${this.capitalizeFirst(restaurant.tipo)}
                    </div>
                </div>
                
                <div class="admin-card-body">
                    <div class="admin-card-description">
                        ${restaurant.descripcion}
                    </div>
                    
                    <div class="admin-card-info">
                        <div class="admin-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${restaurant.direccion?.ciudad || 'Ciudad no especificada'}</span>
                        </div>
                        <div class="admin-info-item">
                            <i class="fas fa-phone"></i>
                            <span>${this.formatPhone(restaurant.telefono)}</span>
                        </div>
                        <div class="admin-info-item">
                            <i class="fas fa-calendar-plus"></i>
                            <span>Creado ${this.formatDate(restaurant.fechaCreacion)}</span>
                        </div>
                    </div>
                    
                    <div class="admin-card-actions">
                        <button class="btn btn-sm btn-outline edit-restaurant" data-id="${restaurant._id}">
                            <i class="fas fa-edit"></i>
                            Editar
                        </button>
                        <button class="btn btn-sm ${restaurant.activo ? 'btn-outline' : 'btn-success'} toggle-status" 
                                data-id="${restaurant._id}" data-active="${restaurant.activo}">
                            <i class="fas fa-${restaurant.activo ? 'pause' : 'play'}"></i>
                            ${restaurant.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button class="btn btn-sm btn-danger delete-restaurant" data-id="${restaurant._id}">
                            <i class="fas fa-trash"></i>
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupRestaurantCards() {
        // Botones de editar
        document.querySelectorAll('.edit-restaurant').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.edit-restaurant').dataset.id;
                this.editRestaurant(id);
            });
        });

        // Botones de toggle status
        document.querySelectorAll('.toggle-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.target.closest('.toggle-status');
                const id = button.dataset.id;
                const isActive = button.dataset.active === 'true';
                this.toggleRestaurantStatus(id, !isActive);
            });
        });

        // Botones de eliminar
        document.querySelectorAll('.delete-restaurant').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.delete-restaurant').dataset.id;
                this.deleteRestaurant(id);
            });
        });
    }

    async handleRestaurantSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        
        // Construir objeto de datos
        const data = {
            nombre: formData.get('nombre'),
            tipo: formData.get('tipo'),
            descripcion: formData.get('descripcion'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            direccion: {
                calle: formData.get('direccion.calle'),
                ciudad: formData.get('direccion.ciudad'),
                codigoPostal: formData.get('direccion.codigoPostal')
            }
        };

        // Validar datos
        const validation = this.validateRestaurantData(data);
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Mostrar loading
        this.setRestaurantFormLoading(true);
        this.clearFormErrors();

        try {
            const response = await ApiClient.post('/admin/restaurants', data);
            
            if (response.success) {
                NotificationManager.success('¡Restaurante creado exitosamente!');
                form.reset();
                this.showSection('restaurants');
                await this.loadRestaurants();
            }
        } catch (error) {
            console.error('Error creando restaurante:', error);
            NotificationManager.error(error.message || 'Error al crear el restaurante');
        } finally {
            this.setRestaurantFormLoading(false);
        }
    }

    async editRestaurant(id) {
        const restaurant = this.restaurants.find(r => r._id === id);
        if (!restaurant) return;

        // Aquí implementarías la lógica del modal de edición
        // Por simplicidad, redirigimos a la sección de agregar con datos precargados
        this.showSection('add-restaurant');
        this.fillRestaurantForm(restaurant);
        
        NotificationManager.info('Modo edición - Función en desarrollo completo');
    }

    async toggleRestaurantStatus(id, newStatus) {
        try {
            const response = await ApiClient.patch(`/admin/restaurants/${id}/toggle-status`);
            
            if (response.success) {
                NotificationManager.success(
                    `Restaurante ${newStatus ? 'activado' : 'desactivado'} correctamente`
                );
                await this.loadRestaurants();
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            NotificationManager.error('Error al cambiar el estado del restaurante');
        }
    }

    async deleteRestaurant(id) {
        const restaurant = this.restaurants.find(r => r._id === id);
        if (!restaurant) return;

        const confirmed = confirm(
            `¿Estás seguro de que quieres eliminar "${restaurant.nombre}"?\n\nEsta acción no se puede deshacer.`
        );

        if (!confirmed) return;

        try {
            const response = await ApiClient.delete(`/admin/restaurants/${id}`);
            
            if (response.success) {
                NotificationManager.success('Restaurante eliminado correctamente');
                await this.loadRestaurants();
                await this.loadDashboardData(); // Actualizar estadísticas
            }
        } catch (error) {
            console.error('Error eliminando restaurante:', error);
            NotificationManager.error('Error al eliminar el restaurante');
        }
    }

    async handleProfileSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        
        const data = {
            nombre: formData.get('nombre'),
            apellido: formData.get('apellido'),
            telefono: formData.get('telefono')
        };

        try {
            const response = await ApiClient.put('/auth/profile', data);
            
            if (response.success) {
                NotificationManager.success('Perfil actualizado correctamente');
                this.currentUser = { ...this.currentUser, ...data };
                this.updateUserInterface();
            }
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            NotificationManager.error('Error al actualizar el perfil');
        }
    }

    async handlePasswordSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        
        const data = {
            passwordActual: formData.get('passwordActual'),
            passwordNueva: formData.get('passwordNueva'),
            confirmarPassword: formData.get('confirmarPassword')
        };

        // Validar que las contraseñas coincidan
        if (data.passwordNueva !== data.confirmarPassword) {
            NotificationManager.error('Las contraseñas nuevas no coinciden');
            return;
        }

        if (data.passwordNueva.length < 6) {
            NotificationManager.error('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            const response = await ApiClient.put('/auth/change-password', {
                passwordActual: data.passwordActual,
                passwordNueva: data.passwordNueva
            });
            
            if (response.success) {
                NotificationManager.success('Contraseña cambiada correctamente');
                form.reset();
            }
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            NotificationManager.error(error.message || 'Error al cambiar la contraseña');
        }
    }

    updateProfileSection() {
        if (!this.currentUser) return;

        // Actualizar información del perfil
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileRole = document.getElementById('profile-role');
        const profileAvatar = document.getElementById('profile-avatar');

        if (profileName) {
            profileName.textContent = `${this.currentUser.nombre} ${this.currentUser.apellido}`;
        }
        if (profileEmail) {
            profileEmail.textContent = this.currentUser.email;
        }
        if (profileRole) {
            profileRole.textContent = this.capitalizeFirst(this.currentUser.rol);
        }
        if (profileAvatar) {
            const initials = (this.currentUser.nombre?.[0] || '') + (this.currentUser.apellido?.[0] || '');
            profileAvatar.textContent = initials.toUpperCase();
        }

        // Llenar formulario de perfil
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.querySelector('#profile-first-name').value = this.currentUser.nombre || '';
            profileForm.querySelector('#profile-last-name').value = this.currentUser.apellido || '';
            profileForm.querySelector('#profile-email-input').value = this.currentUser.email || '';
            profileForm.querySelector('#profile-phone').value = this.currentUser.telefono || '';
        }
    }

    fillRestaurantForm(restaurant) {
        const form = document.getElementById('restaurant-form');
        if (!form || !restaurant) return;

        form.querySelector('#restaurant-name').value = restaurant.nombre || '';
        form.querySelector('#restaurant-type').value = restaurant.tipo || '';
        form.querySelector('#restaurant-description').value = restaurant.descripcion || '';
        form.querySelector('#restaurant-email').value = restaurant.email || '';
        form.querySelector('#restaurant-phone').value = restaurant.telefono || '';
        form.querySelector('#restaurant-street').value = restaurant.direccion?.calle || '';
        form.querySelector('#restaurant-city').value = restaurant.direccion?.ciudad || '';
        form.querySelector('#restaurant-postal').value = restaurant.direccion?.codigoPostal || '';
    }

    validateRestaurantData(data) {
        const errors = {};

        if (!data.nombre || data.nombre.trim().length < 2) {
            errors['restaurant-name'] = 'El nombre debe tener al menos 2 caracteres';
        }

        if (!data.tipo) {
            errors['restaurant-type'] = 'Selecciona un tipo de establecimiento';
        }

        if (!data.descripcion || data.descripcion.trim().length < 10) {
            errors['restaurant-description'] = 'La descripción debe tener al menos 10 caracteres';
        }

        if (!data.email || !Validator.isEmail(data.email)) {
            errors['restaurant-email'] = 'Email inválido';
        }

        if (!data.telefono || !Validator.isPhone(data.telefono)) {
            errors['restaurant-phone'] = 'Teléfono inválido';
        }

        if (!data.direccion.calle || data.direccion.calle.trim().length < 5) {
            errors['restaurant-street'] = 'La dirección debe tener al menos 5 caracteres';
        }

        if (!data.direccion.ciudad || data.direccion.ciudad.trim().length < 2) {
            errors['restaurant-city'] = 'La ciudad es obligatoria';
        }

        if (!data.direccion.codigoPostal || data.direccion.codigoPostal.trim().length < 4) {
            errors['restaurant-postal'] = 'Código postal inválido';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    showFormErrors(errors) {
        // Limpiar errores previos
        this.clearFormErrors();

        // Mostrar nuevos errores
        for (const [field, message] of Object.entries(errors)) {
            const input = document.getElementById(field);
            const errorElement = document.getElementById(`${field}-error`);
            
            if (input) {
                input.classList.add('error');
            }
            
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.classList.add('show');
            }
        }
    }

    clearFormErrors() {
        // Remover clases de error de inputs
        const inputs = document.querySelectorAll('.form-input.error, .form-textarea.error, .form-select.error');
        inputs.forEach(input => input.classList.remove('error'));

        // Ocultar mensajes de error
        const errors = document.querySelectorAll('.form-error.show');
        errors.forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
    }

    setRestaurantFormLoading(loading) {
        const submitBtn = document.getElementById('save-restaurant-btn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnSpinner = submitBtn?.querySelector('.btn-spinner');

        if (submitBtn) {
            submitBtn.disabled = loading;
            
            if (btnText && btnSpinner) {
                if (loading) {
                    btnText.style.display = 'none';
                    btnSpinner.style.display = 'block';
                } else {
                    btnText.style.display = 'block';
                    btnSpinner.style.display = 'none';
                }
            }
        }
    }

    toggleFilters() {
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) {
            const isVisible = filtersPanel.style.display !== 'none';
            filtersPanel.style.display = isVisible ? 'none' : 'block';
        }
    }

    applyFilters() {
        const typeFilter = document.getElementById('filter-type').value;
        const statusFilter = document.getElementById('filter-status').value;

        let filteredRestaurants = [...this.restaurants];

        if (typeFilter) {
            filteredRestaurants = filteredRestaurants.filter(r => r.tipo === typeFilter);
        }

        if (statusFilter !== '') {
            const isActive = statusFilter === 'true';
            filteredRestaurants = filteredRestaurants.filter(r => r.activo === isActive);
        }

        this.displayRestaurants(filteredRestaurants);
        
        NotificationManager.info(`Mostrando ${filteredRestaurants.length} restaurante(s)`);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        if (sidebar && window.innerWidth <= 1024) {
            sidebar.classList.remove('active');
        }
    }

    closeEditModal() {
        const modal = document.getElementById('edit-restaurant-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    setupPhoneFormatting() {
        const phoneInputs = document.querySelectorAll('input[type="tel"], #restaurant-phone, #profile-phone');
        phoneInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length >= 10) {
                    value = value.substring(0, 10);
                    const formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                    e.target.value = formatted;
                }
            });
        });
    }

    async handleLogout() {
        const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
        if (!confirmed) return;

        try {
            await ApiClient.post('/auth/logout');
        } catch (error) {
            console.warn('Error en logout del servidor:', error);
        } finally {
            Storage.removeAuthToken();
            Storage.remove('currentUser');
            NotificationManager.info('Sesión cerrada correctamente');
            
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        }
    }

    // ===== MÉTODOS UTILITARIOS =====
    animateNumber(elementId, target) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const start = 0;
        const duration = 1000;
        const startTime = performance.now();
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * easeOutQuart);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = target;
            }
        }
        
        requestAnimationFrame(updateNumber);
    }

    getTypeIcon(tipo) {
        const icons = {
            restaurante: 'fas fa-utensils',
            bar: 'fas fa-cocktail',
            cafeteria: 'fas fa-coffee'
        };
        return icons[tipo] || 'fas fa-store';
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'hoy';
        if (diffDays === 1) return 'ayer';
        if (diffDays < 7) return `hace ${diffDays} días`;
        if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
        return date.toLocaleDateString('es-ES');
    }

    daysSince(dateString) {
        if (!dateString) return 0;
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
}

// ===== FUNCIONES GLOBALES =====
function showSection(sectionName) {
    if (window.adminPanel) {
        window.adminPanel.showSection(sectionName);
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que estamos en la página de admin
    if (window.location.pathname.includes('admin') || window.location.pathname === '/admin.html') {
        window.adminPanel = new AdminPanel();
    }
});

// ===== EXPORTAR PARA USO GLOBAL =====
window.AdminPanel = AdminPanel;
window.showSection = showSection;
