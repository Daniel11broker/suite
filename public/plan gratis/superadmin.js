// Archivo: todo/superadmin.js
// ELIMINADO: No necesitamos importar 'db.js' porque ahora usaremos la API.
// import { db } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    feather.replace();

    // --- LÓGICA DEL MENÚ, TEMA Y AUTENTICACIÓN (sin cambios) ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (window.innerWidth >= 768) {
        sidebar.addEventListener('mouseenter', () => sidebar.classList.add('expanded'));
        sidebar.addEventListener('mouseleave', () => sidebar.classList.remove('expanded'));
    }
    mobileMenuButton.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('expanded'); });
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && sidebar.classList.contains('expanded') && !sidebar.contains(e.target)) {
            sidebar.classList.remove('expanded');
        }
    });

    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');
    applyTheme(localStorage.getItem('theme') || 'light');
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        window.location.href = './login.html';
    });

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser || loggedInUser.role !== 'superadmin') {
        window.location.href = './login.html';
        return;
    }

    // --- NUEVO: URL base de la API ---
    const API_URL = '/api';

    // --- ESTADO DE LA APLICACIÓN Y PAGINACIÓN (sin cambios) ---
    let currentPage = 1;
    const rowsPerPage = 10;

    // --- SELECTORES GLOBALES (sin cambios) ---
    const dom = {
        kpi: {
            total: document.getElementById('kpi-total-admins'),
            active: document.getElementById('kpi-active-admins'),
            inactive: document.getElementById('kpi-inactive-admins')
        },
        searchInput: document.getElementById('search-input'),
        addAdminBtn: document.getElementById('add-admin-btn'),
        tableBody: document.getElementById('admin-table-body'),
        paginationControls: document.getElementById('pagination-controls'),
        modal: {
            el: document.getElementById('form-modal'),
            title: document.getElementById('modal-title'),
            form: document.getElementById('admin-form'),
            closeBtn: document.getElementById('close-modal-btn'),
            idInput: document.getElementById('admin-id'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            roleInput: document.getElementById('role'),
            statusInput: document.getElementById('status'),
            userLimitContainer: document.getElementById('user-limit-container'),
            userLimitInput: document.getElementById('userLimit'),
            saveBtn: document.getElementById('save-btn'),
            cancelBtn: document.getElementById('cancel-edit-btn')
        },
        confirmModal: {
            el: document.getElementById('confirm-modal'),
            title: document.getElementById('confirm-title'),
            message: document.getElementById('confirm-message'),
            buttons: document.getElementById('confirm-buttons')
        },
        toastContainer: document.getElementById('toast-container')
    };

    // --- FUNCIONES DE LA APLICACIÓN (con cambios) ---

    // (showToast y showConfirmation se quedan igual)
    const showToast = (message, type = 'success') => {
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        const icon = type === 'success' ? 'check-circle' : 'alert-triangle';
        const toast = document.createElement('div');
        toast.className = `toast ${bgColor} text-white py-3 px-5 rounded-lg shadow-lg flex items-center gap-3`;
        toast.innerHTML = `<i data-feather="${icon}" class="h-5 w-5"></i><span>${message}</span>`;
        dom.toastContainer.appendChild(toast);
        feather.replace();
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3000);
    };
    
    const showConfirmation = (title, message, onConfirm) => {
        dom.confirmModal.title.textContent = title;
        dom.confirmModal.message.textContent = message;
        dom.confirmModal.buttons.innerHTML = `<button id="confirm-cancel" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg">Cancelar</button><button id="confirm-ok" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">Confirmar</button>`;
        dom.confirmModal.el.classList.remove('hidden');
        document.getElementById('confirm-ok').onclick = () => { onConfirm(); dom.confirmModal.el.classList.add('hidden'); };
        document.getElementById('confirm-cancel').onclick = () => dom.confirmModal.el.classList.add('hidden');
    };
    
    // (hashPassword se queda igual)
    const hashPassword = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };
    
    // (renderPagination se queda igual)
    const renderPagination = (totalItems) => {
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        dom.paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        let paginationHTML = `
            <span class="text-sm text-gray-700 dark:text-gray-400">
                Página <span class="font-semibold">${currentPage}</span> de <span class="font-semibold">${totalPages}</span>
            </span>
            <div class="inline-flex mt-2 xs:mt-0">
                <button id="prev-page" class="flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-gray-800 rounded-l hover:bg-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                    Anterior
                </button>
                <button id="next-page" class="flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-gray-800 border-0 border-l border-gray-700 rounded-r hover:bg-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                    Siguiente
                </button>
            </div>`;
        dom.paginationControls.innerHTML = paginationHTML;

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        });
    };

    // MODIFICADO: Ahora obtiene datos de la API
    const renderPage = async () => {
        // En lugar de db.admins.toArray(), hacemos un fetch a nuestro endpoint
        const response = await fetch(`${API_URL}/admins`);
        const allAdmins = await response.json();

        // El resto de la función es idéntica
        dom.kpi.total.textContent = allAdmins.length;
        dom.kpi.active.textContent = allAdmins.filter(a => a.status === 'Activo').length;
        dom.kpi.inactive.textContent = allAdmins.filter(a => a.status === 'Inactivo').length;

        const searchTerm = dom.searchInput.value.toLowerCase();
        let filteredAdmins = allAdmins;
        if (searchTerm) {
            filteredAdmins = allAdmins.filter(admin => admin.username.toLowerCase().includes(searchTerm));
        }

        const paginatedAdmins = filteredAdmins.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        dom.tableBody.innerHTML = '';
        paginatedAdmins.forEach(admin => {
            const statusColors = {
                'Activo': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
                'Inactivo': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
            };
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
            row.innerHTML = `
                <td class="px-6 py-4 font-medium">${admin.username}</td>
                <td class="px-6 py-4">${admin.role}</td>
                <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[admin.status] || ''}">${admin.status}</span></td>
                <td class="px-6 py-4 text-right flex justify-end gap-1">
                    <button class="edit-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" data-id="${admin.id}" title="Editar"><i data-feather="edit" class="h-4 w-4 text-blue-600"></i></button>
                    <button class="delete-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" data-id="${admin.id}" title="Eliminar"><i data-feather="trash-2" class="h-4 w-4 text-red-600"></i></button>
                </td>`;
            dom.tableBody.appendChild(row);
        });
        feather.replace();
        renderPagination(filteredAdmins.length);
    };

    // (toggleUserLimitField y openFormModal se quedan igual)
    const toggleUserLimitField = (role) => {
        if (role === 'superadmin') {
            dom.modal.userLimitContainer.classList.add('hidden');
        } else {
            dom.modal.userLimitContainer.classList.remove('hidden');
        }
    };
    
    const openFormModal = (admin = null) => {
        dom.modal.form.reset();
        if (admin) {
            dom.modal.title.textContent = 'Editar Administrador';
            dom.modal.idInput.value = admin.id;
            dom.modal.usernameInput.value = admin.username;
            dom.modal.roleInput.value = admin.role;
            dom.modal.statusInput.value = admin.status;
            dom.modal.userLimitInput.value = admin.userLimit || 5;
            dom.modal.passwordInput.removeAttribute('required');
            dom.modal.saveBtn.textContent = 'Guardar Cambios';
            dom.modal.cancelBtn.classList.remove('hidden');
            toggleUserLimitField(admin.role);
        } else {
            dom.modal.title.textContent = 'Crear Administrador';
            dom.modal.idInput.value = '';
            dom.modal.passwordInput.setAttribute('required', 'required');
            dom.modal.saveBtn.textContent = 'Crear';
            dom.modal.cancelBtn.classList.add('hidden');
            toggleUserLimitField('admin');
        }
        dom.modal.el.classList.remove('hidden');
    };

    // --- MANEJO DE EVENTOS (con cambios) ---

    dom.searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderPage();
    });
    dom.addAdminBtn.addEventListener('click', () => openFormModal());
    dom.modal.closeBtn.addEventListener('click', () => dom.modal.el.classList.add('hidden'));
    dom.modal.cancelBtn.addEventListener('click', () => dom.modal.el.classList.add('hidden'));
    dom.modal.roleInput.addEventListener('change', (e) => toggleUserLimitField(e.target.value));
    
    dom.tableBody.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.edit-btn');
        if (editButton) {
            // MODIFICADO: Obtiene el admin desde la API
            const response = await fetch(`${API_URL}/admins/${parseInt(editButton.dataset.id)}`);
            const admin = await response.json();
            openFormModal(admin);
        }

        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const adminId = parseInt(deleteButton.dataset.id);
            showConfirmation('Confirmar Eliminación', `¿Estás seguro de eliminar este administrador?`, async () => {
                // MODIFICADO: Envía la petición DELETE a la API
                await fetch(`${API_URL}/admins/${adminId}`, { method: 'DELETE' });
                showToast(`Administrador eliminado.`, 'success');
                await renderPage();
            });
        }
    });

    // MODIFICADO: El formulario ahora envía los datos a la API
    dom.modal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = dom.modal.idInput.value;
        const username = dom.modal.usernameInput.value.trim();
        const password = dom.modal.passwordInput.value;
        const role = dom.modal.roleInput.value;
        const status = dom.modal.statusInput.value;
        let userLimit;
        if (role === 'superadmin') {
            userLimit = null;
        } else {
            userLimit = parseInt(dom.modal.userLimitInput.value);
            if (isNaN(userLimit) || userLimit < 1) {
                showToast('El límite de usuarios debe ser un número mayor a 0.', 'error');
                return;
            }
        }

        const data = { username, role, status, userLimit };
        if (password) {
            data.passwordHash = await hashPassword(password);
        }

        const url = id ? `${API_URL}/admins/${id}` : `${API_URL}/admins`;
        const method = id ? 'PUT' : 'POST';

        // Usamos fetch para enviar los datos al backend
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast(id ? `'${username}' actualizado.` : `'${username}' creado con éxito.`, 'success');
            dom.modal.el.classList.add('hidden');
            await renderPage();
        } else {
            const errorData = await response.json();
            showToast(`Error: ${errorData.error}`, 'error');
        }
    });

    // --- INICIALIZACIÓN ---
    // ELIMINADO: Ya no necesitamos abrir la base de datos local
    // await db.open();
    await renderPage();
});