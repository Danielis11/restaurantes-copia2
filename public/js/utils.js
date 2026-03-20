// ===== UTILIDADES GLOBALES =====

// Configuración de la API
const API_BASE_URL = window.location.origin + '/api';

// ===== FUNCIONES DE API =====
class ApiClient {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Agregar token de autenticación si existe
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`Error en ${endpoint}:`, error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint);
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// ===== MANEJO DE NOTIFICACIONES =====
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        const notification = this.create(message, type);
        document.body.appendChild(notification);

        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-ocultar
        setTimeout(() => {
            this.hide(notification);
        }, duration);

        return notification;
    }

    static create(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icon}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Evento para cerrar
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.hide(notification));

        return notification;
    }

    static hide(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    static getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Métodos de conveniencia
    static success(message, duration) {
        return this.show(message, 'success', duration);
    }

    static error(message, duration) {
        return this.show(message, 'error', duration);
    }

    static warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    static info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// ===== VALIDACIONES =====
class Validator {
    static isEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static isPhone(phone) {
        const regex = /^[\+]?[1-9][\d]{0,15}$/;
        return regex.test(phone.replace(/\s/g, ''));
    }

    static isRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }

    static minLength(value, min) {
        return value && value.toString().length >= min;
    }

    static maxLength(value, max) {
        return value && value.toString().length <= max;
    }

    static isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static validateForm(formData, rules) {
        const errors = {};

        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = formData[field];
            
            for (const rule of fieldRules) {
                if (rule.type === 'required' && !this.isRequired(value)) {
                    errors[field] = rule.message || `${field} es obligatorio`;
                    break;
                }
                
                if (rule.type === 'email' && value && !this.isEmail(value)) {
                    errors[field] = rule.message || 'Email inválido';
                    break;
                }
                
                if (rule.type === 'phone' && value && !this.isPhone(value)) {
                    errors[field] = rule.message || 'Teléfono inválido';
                    break;
                }
                
                if (rule.type === 'minLength' && value && !this.minLength(value, rule.value)) {
                    errors[field] = rule.message || `Mínimo ${rule.value} caracteres`;
                    break;
                }
                
                if (rule.type === 'maxLength' && value && !this.maxLength(value, rule.value)) {
                    errors[field] = rule.message || `Máximo ${rule.value} caracteres`;
                    break;
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}

// ===== FORMATEO =====
class Formatter {
    static currency(amount, currency = 'MXN') {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static date(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };
        
        return new Intl.DateTimeFormat('es-ES', defaultOptions).format(new Date(date));
    }

    static time(date) {
        return new Intl.DateTimeFormat('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    static phone(phone) {
        if (!phone) return '';
        
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        
        return phone;
    }

    static truncate(text, length = 100) {
        if (!text || text.length <= length) return text;
        return text.substring(0, length).trim() + '...';
    }

    static capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    static title(text) {
        if (!text) return '';
        return text.split(' ')
            .map(word => this.capitalize(word))
            .join(' ');
    }
}

// ===== ALMACENAMIENTO LOCAL =====
class Storage {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error leyendo de localStorage:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removiendo de localStorage:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error limpiando localStorage:', error);
            return false;
        }
    }

    // Métodos específicos para la app
    static setAuthToken(token) {
        return this.set('authToken', token);
    }

    static getAuthToken() {
        return this.get('authToken');
    }

    static removeAuthToken() {
        return this.remove('authToken');
    }

    static setUserPreferences(preferences) {
        return this.set('userPreferences', preferences);
    }

    static getUserPreferences() {
        return this.get('userPreferences', {
            theme: 'light',
            language: 'es',
            itemsPerPage: 12
        });
    }
}

// ===== UTILIDADES DE URL =====
class UrlUtils {
    static getParams() {
        return new URLSearchParams(window.location.search);
    }

    static getParam(name, defaultValue = null) {
        return this.getParams().get(name) || defaultValue;
    }

    static setParam(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    }

    static removeParam(name) {
        const url = new URL(window.location);
        url.searchParams.delete(name);
        window.history.pushState({}, '', url);
    }

    static updateParams(params) {
        const url = new URL(window.location);
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        }
        
        window.history.pushState({}, '', url);
    }
}

// ===== UTILIDADES DE DOM =====
class DomUtils {
    static $(selector, context = document) {
        return context.querySelector(selector);
    }

    static $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    static createElement(tag, className, content) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.innerHTML = content;
        return element;
    }

    static show(element) {
        if (element) element.style.display = '';
    }

    static hide(element) {
        if (element) element.style.display = 'none';
    }

    static toggle(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? '' : 'none';
        }
    }

    static addClass(element, className) {
        if (element) element.classList.add(className);
    }

    static removeClass(element, className) {
        if (element) element.classList.remove(className);
    }

    static toggleClass(element, className) {
        if (element) element.classList.toggle(className);
    }

    static hasClass(element, className) {
        return element ? element.classList.contains(className) : false;
    }
}

// ===== UTILIDADES DE TIEMPO =====
class TimeUtils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== EXPORTAR PARA USO GLOBAL =====
window.ApiClient = ApiClient;
window.NotificationManager = NotificationManager;
window.Validator = Validator;
window.Formatter = Formatter;
window.Storage = Storage;
window.UrlUtils = UrlUtils;
window.DomUtils = DomUtils;
window.TimeUtils = TimeUtils;

// Alias comunes
window.$ = DomUtils.$;
window.$$ = DomUtils.$$;
window.notify = NotificationManager;

// ===== ESTILOS PARA NOTIFICACIONES =====
// Agregar estilos CSS para las notificaciones si no existen
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-left: 4px solid var(--primary);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification.hide {
            transform: translateX(100%);
        }
        
        .notification-success {
            border-left-color: var(--success);
        }
        
        .notification-error {
            border-left-color: var(--error);
        }
        
        .notification-warning {
            border-left-color: var(--warning);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            padding: 16px;
            gap: 12px;
        }
        
        .notification-content i {
            font-size: 18px;
            color: var(--primary);
        }
        
        .notification-success .notification-content i {
            color: var(--success);
        }
        
        .notification-error .notification-content i {
            color: var(--error);
        }
        
        .notification-warning .notification-content i {
            color: var(--warning);
        }
        
        .notification-message {
            flex: 1;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            color: var(--gray-400);
            transition: all 0.2s;
        }
        
        .notification-close:hover {
            background: var(--gray-100);
            color: var(--gray-600);
        }
    `;
    document.head.appendChild(style);
}
