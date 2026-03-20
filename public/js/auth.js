// ===== GESTIÓN DE AUTENTICACIÓN =====

class AuthManager {
    constructor() {
        this.initializeAuth();
    }

    initializeAuth() {
        // Verificar si ya está autenticado al cargar la página
        this.checkAuthStatus();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Verificar token periódicamente
        this.startTokenCheck();
    }

    setupEventListeners() {
        // Formulario de login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Formulario de registro
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Toggle de contraseña
        const passwordToggle = document.getElementById('password-toggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', this.togglePassword);
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Forgot password
        const forgotPassword = document.getElementById('forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', this.handleForgotPassword.bind(this));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            password: formData.get('password'),
            rememberMe: formData.get('rememberMe') === 'on'
        };

        // Validar formulario
        const validation = this.validateLoginForm(data);
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Mostrar loading
        this.setLoadingState(true);
        this.clearFormErrors();

        try {
            const response = await ApiClient.post('/auth/login', {
                email: data.email,
                password: data.password
            });

            if (response.success) {
                // Guardar token
                Storage.setAuthToken(response.data.token);
                
                // Guardar datos del usuario
                Storage.set('currentUser', response.data.admin);
                
                // Mostrar mensaje de éxito
                NotificationManager.success('¡Bienvenido! Redirigiendo al panel...');
                
                // Redirigir al panel admin
                setTimeout(() => {
                    window.location.href = '/admin.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Error en login:', error);
            NotificationManager.error(error.message || 'Error al iniciar sesión');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = {
            nombre: formData.get('nombre'),
            apellido: formData.get('apellido'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Validar formulario
        const validation = this.validateRegisterForm(data);
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Mostrar loading
        this.setLoadingState(true);
        this.clearFormErrors();

        try {
            const response = await ApiClient.post('/auth/register', {
                nombre: data.nombre,
                apellido: data.apellido,
                email: data.email,
                telefono: data.telefono,
                password: data.password
            });

            if (response.success) {
                // Guardar token
                Storage.setAuthToken(response.data.token);
                
                // Guardar datos del usuario
                Storage.set('currentUser', response.data.admin);
                
                // Mostrar mensaje de éxito
                NotificationManager.success('¡Cuenta creada exitosamente! Redirigiendo...');
                
                // Redirigir al panel admin
                setTimeout(() => {
                    window.location.href = '/admin.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Error en registro:', error);
            NotificationManager.error(error.message || 'Error al crear la cuenta');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleLogout() {
        try {
            // Llamar al endpoint de logout (opcional)
            await ApiClient.post('/auth/logout');
        } catch (error) {
            console.warn('Error en logout del servidor:', error);
        } finally {
            // Limpiar datos locales siempre
            this.clearAuthData();
            
            // Mostrar mensaje
            NotificationManager.info('Sesión cerrada correctamente');
            
            // Redirigir al login
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        }
    }

    handleForgotPassword(e) {
        e.preventDefault();
        
        const email = prompt('Ingresa tu email para recuperar la contraseña:');
        if (email && Validator.isEmail(email)) {
            NotificationManager.info('Función de recuperación en desarrollo. Contacta al administrador.');
        } else if (email) {
            NotificationManager.error('Email inválido');
        }
    }

    validateLoginForm(data) {
        return Validator.validateForm(data, {
            email: [
                { type: 'required', message: 'El email es obligatorio' },
                { type: 'email', message: 'Email inválido' }
            ],
            password: [
                { type: 'required', message: 'La contraseña es obligatoria' },
                { type: 'minLength', value: 6, message: 'Mínimo 6 caracteres' }
            ]
        });
    }

    validateRegisterForm(data) {
        const validation = Validator.validateForm(data, {
            nombre: [
                { type: 'required', message: 'El nombre es obligatorio' },
                { type: 'minLength', value: 2, message: 'Mínimo 2 caracteres' }
            ],
            apellido: [
                { type: 'required', message: 'El apellido es obligatorio' },
                { type: 'minLength', value: 2, message: 'Mínimo 2 caracteres' }
            ],
            email: [
                { type: 'required', message: 'El email es obligatorio' },
                { type: 'email', message: 'Email inválido' }
            ],
            telefono: [
                { type: 'required', message: 'El teléfono es obligatorio' },
                { type: 'phone', message: 'Teléfono inválido' }
            ],
            password: [
                { type: 'required', message: 'La contraseña es obligatoria' },
                { type: 'minLength', value: 6, message: 'Mínimo 6 caracteres' }
            ]
        });

        // Validación adicional para confirmación de contraseña
        if (data.password !== data.confirmPassword) {
            validation.errors.confirmPassword = 'Las contraseñas no coinciden';
            validation.isValid = false;
        }

        return validation;
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
        const inputs = document.querySelectorAll('.form-input.error');
        inputs.forEach(input => input.classList.remove('error'));

        // Ocultar mensajes de error
        const errors = document.querySelectorAll('.form-error.show');
        errors.forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
    }

    setLoadingState(loading) {
        const submitBtn = document.querySelector('button[type="submit"]');
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

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('.password-toggle i');
        
        if (passwordInput && toggleIcon) {
            const isPassword = passwordInput.type === 'password';
            
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        }
    }

    async checkAuthStatus() {
        const token = Storage.getAuthToken();
        const currentPath = window.location.pathname;

        // Rutas que requieren autenticación
        const protectedRoutes = ['/admin.html', '/admin'];
        
        // Rutas que NO deben ser accesibles si ya está autenticado
        const authRoutes = ['/login.html', '/register.html'];

        if (token) {
            try {
                // Verificar si el token es válido
                const response = await ApiClient.get('/auth/verify-token');
                
                if (response.success) {
                    // Token válido
                    Storage.set('currentUser', response.data.admin);
                    
                    // Si está en página de auth, redirigir al admin
                    if (authRoutes.includes(currentPath)) {
                        window.location.href = '/admin.html';
                        return;
                    }
                } else {
                    throw new Error('Token inválido');
                }
            } catch (error) {
                console.warn('Token inválido:', error);
                this.clearAuthData();
                
                // Si está en ruta protegida, redirigir al login
                if (protectedRoutes.includes(currentPath)) {
                    window.location.href = '/login.html';
                    return;
                }
            }
        } else {
            // No hay token
            if (protectedRoutes.includes(currentPath)) {
                window.location.href = '/login.html';
                return;
            }
        }
    }

    startTokenCheck() {
        // Verificar token cada 5 minutos
        setInterval(() => {
            this.checkAuthStatus();
        }, 5 * 60 * 1000);
    }

    clearAuthData() {
        Storage.removeAuthToken();
        Storage.remove('currentUser');
    }

    // Métodos utilitarios públicos
    isAuthenticated() {
        return !!Storage.getAuthToken();
    }

    getCurrentUser() {
        return Storage.get('currentUser');
    }

    getAuthHeaders() {
        const token = Storage.getAuthToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// ===== FUNCIONES UTILITARIAS PARA FORMULARIOS =====

// Autocompletar formulario con datos guardados (para desarrollo)
function fillDemoData() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput && passwordInput) {
        emailInput.value = 'admin@ejemplo.com';
        passwordInput.value = 'password123';
        
        NotificationManager.info('Datos de prueba completados');
    }
}

// Formatear inputs en tiempo real
function setupInputFormatting() {
    // Formatear teléfono
    const phoneInput = document.getElementById('telefono');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length >= 10) {
                value = value.substring(0, 10);
                const formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                e.target.value = formatted;
            }
        });
    }

    // Capitalizar nombres
    const nameInputs = document.querySelectorAll('#nombre, #apellido');
    nameInputs.forEach(input => {
        input.addEventListener('blur', function(e) {
            e.target.value = Formatter.title(e.target.value);
        });
    });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gestión de autenticación
    window.authManager = new AuthManager();
    
    // Configurar formateo de inputs
    setupInputFormatting();
    
    // Agregar botón de datos demo en desarrollo
    if (window.location.hostname === 'localhost') {
        const demoButton = document.createElement('button');
        demoButton.textContent = '🔧 Llenar datos demo';
        demoButton.className = 'btn btn-outline';
        demoButton.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-size: 0.8rem;';
        demoButton.onclick = fillDemoData;
        
        document.body.appendChild(demoButton);
    }
});

// ===== EXPORTAR PARA USO GLOBAL =====
window.AuthManager = AuthManager;
