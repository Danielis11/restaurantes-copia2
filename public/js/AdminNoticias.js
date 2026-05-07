class AdminNoticias {
    constructor() {
        this.apiBase = '/api/noticias';
        this.token = localStorage.getItem('authToken');
        this.noticias = [];
        this.currentNoticia = null;
        
        // Elementos DOM
        this.tableBody = document.getElementById('noticias-table-body');
        this.modal = document.getElementById('noticia-modal');
        this.form = document.getElementById('noticia-form');
        this.modalTitle = document.getElementById('noticia-modal-title');
        
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Event listener para mostrar vista previa de la imagen
        const imagenInput = document.getElementById('noticia-imagen');
        if (imagenInput) {
            imagenInput.addEventListener('change', (e) => this.handleImagePreview(e));
        }
    }

    handleImagePreview(e) {
        const preview = document.getElementById('noticia-imagen-preview');
        const file = e.target.files[0];
        
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        } else if (!document.getElementById('noticia-id').value) {
            // Si no estamos editando y se quitó el archivo, ocultar la vista previa
            preview.style.display = 'none';
        }
    }

    async cargarNoticias() {
        try {
            document.getElementById('noticias-table-container').innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Cargando noticias...</p>
                </div>
            `;
            
            const response = await fetch(`${this.apiBase}/admin`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.noticias = data.data;
                this.renderTable();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error al cargar noticias:', error);
            if (window.showNotification) {
                window.showNotification('Error al cargar las noticias', 'error');
            }
        }
    }

    renderTable() {
        const container = document.getElementById('noticias-table-container');
        
        if (this.noticias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <p>No hay noticias registradas</p>
                    <button class="btn btn-primary mt-3" onclick="window.noticiasAdmin.openCreateModal()">
                        <i class="fas fa-plus"></i> Crear Primera Noticia
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Título (ES)</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.noticias.forEach(noticia => {
            const fecha = new Date(noticia.fecha).toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            
            html += `
                <tr>
                    <td>
                        <img src="${noticia.imagen?.url || '/images/placeholder.jpg'}" alt="Noticia" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                    </td>
                    <td><strong>${noticia.titulo.es}</strong></td>
                    <td>${fecha}</td>
                    <td>
                        <span class="badge ${noticia.activo ? 'badge-success' : 'badge-error'}">
                            ${noticia.activo ? 'Activa' : 'Inactiva'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" onclick="window.noticiasAdmin.openEditModal('${noticia._id}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.noticiasAdmin.deleteNoticia('${noticia._id}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    openCreateModal() {
        this.currentNoticia = null;
        this.form.reset();
        document.getElementById('noticia-id').value = '';
        this.modalTitle.innerHTML = '<i class="fas fa-plus"></i> Nueva Noticia';
        
        // Reset imagen file y preview
        const imgInput = document.getElementById('noticia-imagen');
        imgInput.value = '';
        imgInput.required = true;
        document.getElementById('noticia-imagen-preview').style.display = 'none';
        document.getElementById('noticia-imagen-help').style.display = 'none';

        // Fecha por defecto hoy
        document.getElementById('noticia-fecha').valueAsDate = new Date();
        document.getElementById('noticia-activo').checked = true;
        
        this.modal.classList.add('show');
    }

    openEditModal(id) {
        this.currentNoticia = this.noticias.find(n => n._id === id);
        if (!this.currentNoticia) return;

        this.modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Noticia';
        document.getElementById('noticia-id').value = this.currentNoticia._id;
        
        // Setup imagen
        const imgInput = document.getElementById('noticia-imagen');
        imgInput.value = ''; // limpiar input de archivo
        imgInput.required = false; // no requerido al editar
        const preview = document.getElementById('noticia-imagen-preview');
        const helpText = document.getElementById('noticia-imagen-help');
        
        if (this.currentNoticia.imagen && this.currentNoticia.imagen.url) {
            preview.src = this.currentNoticia.imagen.url;
            preview.style.display = 'block';
            helpText.style.display = 'block';
        } else {
            preview.style.display = 'none';
            helpText.style.display = 'block';
        }
        
        // Títulos
        document.getElementById('noticia-titulo-es').value = this.currentNoticia.titulo?.es || '';
        document.getElementById('noticia-titulo-en').value = this.currentNoticia.titulo?.en || '';
        document.getElementById('noticia-titulo-fr').value = this.currentNoticia.titulo?.fr || '';
        
        // Descripciones
        document.getElementById('noticia-descripcion-es').value = this.currentNoticia.descripcion?.es || '';
        document.getElementById('noticia-descripcion-en').value = this.currentNoticia.descripcion?.en || '';
        document.getElementById('noticia-descripcion-fr').value = this.currentNoticia.descripcion?.fr || '';
        
        // Fecha y Estado
        if (this.currentNoticia.fecha) {
            document.getElementById('noticia-fecha').value = this.currentNoticia.fecha.split('T')[0];
        }
        document.getElementById('noticia-activo').checked = this.currentNoticia.activo;

        this.modal.classList.add('show');
    }

    closeModal() {
        this.modal.classList.remove('show');
        this.form.reset();
        this.currentNoticia = null;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('noticia-id').value;
        const isEdit = !!id;
        
        const formData = new FormData();
        
        const fileInput = document.getElementById('noticia-imagen');
        if (fileInput.files.length > 0) {
            formData.append('imagen', fileInput.files[0]);
        }
        
        formData.append('titulo', JSON.stringify({
            es: document.getElementById('noticia-titulo-es').value,
            en: document.getElementById('noticia-titulo-en').value,
            fr: document.getElementById('noticia-titulo-fr').value
        }));

        formData.append('descripcion', JSON.stringify({
            es: document.getElementById('noticia-descripcion-es').value,
            en: document.getElementById('noticia-descripcion-en').value,
            fr: document.getElementById('noticia-descripcion-fr').value
        }));
        
        formData.append('fecha', document.getElementById('noticia-fecha').value);
        formData.append('activo', document.getElementById('noticia-activo').checked);

        try {
            const url = isEdit ? `${this.apiBase}/admin/${id}` : `${this.apiBase}/admin`;
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    // No incluir Content-Type porque FormData lo pone automáticamente
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                if (window.showNotification) {
                    window.showNotification(`Noticia ${isEdit ? 'actualizada' : 'creada'} exitosamente`, 'success');
                }
                this.closeModal();
                this.cargarNoticias();
            } else {
                throw new Error(result.message || 'Error al guardar la noticia');
            }
        } catch (error) {
            console.error('Error al guardar noticia:', error);
            if (window.showNotification) {
                window.showNotification(error.message, 'error');
            }
        }
    }

    async deleteNoticia(id) {
        const confirmar = confirm('¿Estás seguro de que deseas eliminar esta noticia/evento? Esta acción no se puede deshacer.');
        if (!confirmar) return;

        try {
            const response = await fetch(`${this.apiBase}/admin/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                if (window.showNotification) {
                    window.showNotification('Noticia eliminada exitosamente', 'success');
                }
                this.cargarNoticias();
            } else {
                throw new Error(data.message || 'Error al eliminar la noticia');
            }
        } catch (error) {
            console.error('Error al eliminar noticia:', error);
            if (window.showNotification) {
                window.showNotification(error.message, 'error');
            }
        }
    }
}

function initNoticiasAdmin() {
    if (!window.noticiasAdmin) {
        const modal = document.getElementById('noticia-modal');
        const form = document.getElementById('noticia-form');
        if (!modal || !form) return null;
        window.noticiasAdmin = new AdminNoticias();
    }

    const tabBtns = document.querySelectorAll('.tab-button');
    tabBtns.forEach(btn => {
        if (btn.dataset.noticiasBound === '1') return;
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'noticias' && window.noticiasAdmin) {
                window.noticiasAdmin.cargarNoticias();
            }
        });
        btn.dataset.noticiasBound = '1';
    });

    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'noticias' && window.noticiasAdmin) {
        window.noticiasAdmin.cargarNoticias();
    }

    return window.noticiasAdmin;
}

window.initNoticiasAdmin = initNoticiasAdmin;
window.openCreateNoticiaModal = function() {
    console.log('[Noticias] openCreateNoticiaModal llamado, noticiasAdmin=', window.noticiasAdmin);
    if (!window.noticiasAdmin) {
        window.noticiasAdmin = new AdminNoticias();
    }
    try {
        window.noticiasAdmin.currentNoticia = null;
        if (window.noticiasAdmin.form) window.noticiasAdmin.form.reset();
        var nid = document.getElementById('noticia-id');
        if (nid) nid.value = '';
        var mtitle = document.getElementById('noticia-modal-title');
        if (mtitle) mtitle.innerHTML = '<i class="fas fa-plus"></i> Nueva Noticia';
        var imgInput = document.getElementById('noticia-imagen');
        if (imgInput) { imgInput.value = ''; imgInput.required = true; }
        var prev = document.getElementById('noticia-imagen-preview');
        if (prev) prev.style.display = 'none';
        var help = document.getElementById('noticia-imagen-help');
        if (help) help.style.display = 'none';
        var fecha = document.getElementById('noticia-fecha');
        if (fecha) fecha.valueAsDate = new Date();
        var activo = document.getElementById('noticia-activo');
        if (activo) activo.checked = true;
        var modal = document.getElementById('noticia-modal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '9999';
            modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
        }
        console.log('[Noticias] modal style después de abrir:', modal ? modal.style.display : 'no encontrado');
    } catch (e) {
        console.error('Error al abrir modal de noticia:', e);
        var modal = document.getElementById('noticia-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '9999';
            modal.classList.add('show');
        }
    }
};

window.closeNoticiaModal = function() {
    if (window.noticiasAdmin) {
        window.noticiasAdmin.closeModal();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initNoticiasAdmin();
    });
} else {
    initNoticiasAdmin();
}
