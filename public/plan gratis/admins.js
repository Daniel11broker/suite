// Archivo: todo/admins.js
// ELIMINADO: import { db } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    feather.replace();

    // --- LÓGICA DEL MENÚ, TEMA Y AUTENTICACIÓN (sin cambios) ---
    const sidebar = document.getElementById('sidebar');
    // ... (El resto de la lógica del menú y tema se mantiene igual que en el original)

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
    if (!loggedInUser || (loggedInUser.role !== 'admin')) {
        window.location.href = './login.html';
        return;
    }

    // --- NUEVO: URL de la API ---
    const API_URL = '/api';

    // --- FUNCIONES DE LA APLICACIÓN (Modificadas) ---
    const hashPassword = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };
    
    const showNotification = (message, type = 'info') => {
        // ... (La función showNotification se mantiene igual que en el original)
    };

    const renderPage = async () => {
        // Renderizar la tabla de usuarios desde la API
        const usersResponse = await fetch(`${API_URL}/appUsers/byAdmin/${loggedInUser.id}`);
        const users = await usersResponse.json();
        
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = users.map(user => {
            const statusColors = { /* ... (sin cambios) */ };
            return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-6 py-4 font-medium">${user.username}</td>
                <td class="px-6 py-4">${user.role}</td>
                <td class="px-6 py-4">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[user.status] || ''}">
                        ${user.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-right flex justify-end gap-1">
                    <button onclick="window.editUser(${user.id})" title="Editar" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><i data-feather="edit" class="h-4 w-4 text-blue-600"></i></button>
                    <button onclick="window.deleteUser(${user.id})" title="Eliminar" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><i data-feather="trash-2" class="h-4 w-4 text-red-600"></i></button>
                </td>
            </tr>
        `}).join('');
        
        // Renderizar el widget de límite de usuarios desde la API
        const adminResponse = await fetch(`${API_URL}/admins/${loggedInUser.id}`);
        const adminData = await adminResponse.json();
        const userLimit = adminData.userLimit || 5;
        const currentUserCount = users.length;
        document.getElementById('user-count-text').textContent = `${currentUserCount} / ${userLimit}`;
        
        feather.replace();
    };

    window.editUser = async (id) => {
        // Obtener datos del usuario desde la API en lugar de Dexie
        const response = await fetch(`${API_URL}/appUsers/${id}`);
        const user = await response.json();
        if (user) {
            document.getElementById('user-id').value = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('role').value = user.role;
            document.getElementById('status').value = user.status || 'Activo';
            document.getElementById('password').removeAttribute('required');
            document.getElementById('password').value = '';
            document.getElementById('save-btn').textContent = 'Guardar Cambios';
            document.getElementById('cancel-edit-btn').classList.remove('hidden');
        }
    };

    window.deleteUser = async (id) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            // Enviar petición DELETE a la API
            await fetch(`${API_URL}/appUsers/${id}`, { method: 'DELETE' });
            showNotification('Usuario eliminado correctamente.', 'success');
            await renderPage();
        }
    };
    
    const userForm = document.getElementById('user-form');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const status = document.getElementById('status').value;
        const adminId = loggedInUser.id;

        // VERIFICACIÓN DE LÍMITE DE USUARIOS (ahora con datos de la API)
        if (!id) {
            const adminResponse = await fetch(`${API_URL}/admins/${adminId}`);
            const adminData = await adminResponse.json();
            const userLimit = adminData.userLimit || 5;
            
            const usersResponse = await fetch(`${API_URL}/appUsers/byAdmin/${adminId}`);
            const currentUserCount = (await usersResponse.json()).length;
            
            if (currentUserCount >= userLimit) {
                showNotification(`Has alcanzado el límite de ${userLimit} usuarios.`, 'error');
                return;
            }
        }
        
        // El resto de la validación puede quedar igual, pero la creación/actualización cambia
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/appUsers/${id}` : `${API_URL}/appUsers`;
        
        const data = { username, role, status, adminId };
        if (password) {
            data.passwordHash = await hashPassword(password);
        }
        if (!id && !password) {
            showNotification('La contraseña es obligatoria para crear un nuevo usuario.', 'error');
            return;
        }

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            showNotification(id ? 'Usuario actualizado correctamente.' : 'Usuario creado con éxito.', 'success');
            userForm.reset();
            document.getElementById('user-id').value = '';
            saveBtn.textContent = 'Crear Usuario';
            cancelBtn.classList.add('hidden');
            await renderPage();
        } else {
            const errorData = await response.json();
            showNotification(`Error: ${errorData.error}`, 'error');
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        userForm.reset();
        document.getElementById('user-id').value = '';
        saveBtn.textContent = 'Crear Usuario';
        cancelBtn.classList.add('hidden');
    });
    
    // ELIMINADO: await db.open();
    await renderPage();
});