/**
 * auth-navbar.js
 * Script compartido para mostrar el perfil del turista en el navbar
 * cuando tiene sesión activa, reemplazando el botón "Iniciar Sesión".
 */
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const token = localStorage.getItem('hospAuthToken');
        const userData = localStorage.getItem('hospUserData');

        if (!token || !userData) return;

        let user;
        try {
            user = JSON.parse(userData);
        } catch {
            return;
        }

        // Buscar el contenedor de auth-buttons
        const authContainer = document.querySelector('.auth-buttons');
        if (!authContainer) return;

        const nombre = user.nombre || user.email || 'Usuario';
        const inicial = nombre.charAt(0).toUpperCase();
        const isSuperAdmin = user.email === 'direcciondeturismojalpan@gmail.com' || user.isSuperAdmin;
        const isAdmin = user.role === 'admin';
        const isTurista = !user.role || user.role === 'user';

        // Reemplazar el botón de login con el perfil
        authContainer.innerHTML = `
            <div class="user-profile-dropdown">
                <button class="user-profile-btn" id="userProfileBtn">
                    <span class="user-avatar">${inicial}</span>
                    <span class="user-name">${nombre}</span>
                    <i class="fas fa-chevron-down user-chevron"></i>
                </button>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <div class="user-dropdown-header">
                        <div class="user-avatar-lg">${inicial}</div>
                        <div class="user-dropdown-info">
                            <span class="user-dropdown-name">${nombre}</span>
                            <span class="user-dropdown-role">${isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrador' : 'Turista'}</span>
                        </div>
                    </div>
                    <div class="user-dropdown-divider"></div>
                    <a href="${isSuperAdmin ? '/hospedaje/admin/super-admin-dashboard.html' : isTurista ? '/hospedaje/panel-turista.html' : '/hospedaje/admin/dashboard.html'}" class="user-dropdown-item">
                        <i class="fas fa-th-large"></i>
                        Mi Panel
                    </a>
                    ${isTurista ? `
                    <a href="/hospedaje/panel-turista.html#favoritos" class="user-dropdown-item">
                        <i class="fas fa-heart"></i>
                        Mis Favoritos
                    </a>
                    <a href="/hospedaje/panel-turista.html#opiniones" class="user-dropdown-item">
                        <i class="fas fa-star"></i>
                        Mis Opiniones
                    </a>
                    ` : ''}
                    <div class="user-dropdown-divider"></div>
                    <button class="user-dropdown-item user-dropdown-logout" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        `;

        // Toggle dropdown
        const profileBtn = document.getElementById('userProfileBtn');
        const dropdownMenu = document.getElementById('userDropdownMenu');

        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
            profileBtn.classList.toggle('active');
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.user-profile-dropdown')) {
                dropdownMenu.classList.remove('show');
                profileBtn.classList.remove('active');
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', function () {
            localStorage.removeItem('hospAuthToken');
            localStorage.removeItem('hospUserData');
            localStorage.removeItem('hospCurrentUser');
            window.location.href = '/';
        });
    });
})();
