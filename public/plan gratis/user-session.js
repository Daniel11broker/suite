// user-session.js

export async function initUserSession() {
    // 1. Cargar e inyectar el HTML del componente
    try {
        const response = await fetch('user-session.html');
        if (!response.ok) throw new Error('No se pudo cargar user-session.html');
        const html = await response.text();
        const placeholder = document.getElementById('user-session-placeholder');
        if (placeholder) {
            placeholder.innerHTML = html;
        } else {
            console.error('El contenedor #user-session-placeholder no fue encontrado.');
            return;
        }
    } catch (error) {
        console.error('Error al cargar el componente de sesión:', error);
        return;
    }

    // 2. Obtener los contenedores de las vistas
    const guestView = document.getElementById('user-guest-view');
    const loggedInView = document.getElementById('user-logged-in-view');

    // 3. Revisar si el usuario ha iniciado sesión
    const loggedInUserJSON = localStorage.getItem('loggedInUser');

    if (loggedInUserJSON) {
        // --- LÓGICA SI EL USUARIO HA INICIADO SESIÓN ---
        
        guestView.classList.add('hidden');
        loggedInView.classList.remove('hidden');

        const loggedInUser = JSON.parse(loggedInUserJSON);
        const { username, role } = loggedInUser;

        // ===== NUEVA LÓGICA PARA MOSTRAR EL ENLACE DEL PANEL =====
        if (role === 'superadmin') {
            const superadminLink = document.getElementById('superadmin-panel-link');
            if (superadminLink) {
                superadminLink.classList.remove('hidden');
            }
        }
        // =======================================================

        document.getElementById('user-name-display').textContent = username;
        document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
        document.getElementById('dropdown-user-name').textContent = username;
        document.getElementById('dropdown-user-role').textContent = role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'No definido';

        const menuButton = document.getElementById('user-menu-button');
        const menuPanel = document.getElementById('user-menu-panel');
        const logoutButton = document.getElementById('logout-button');

        menuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            menuPanel.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            if (!menuPanel.classList.contains('hidden')) {
                menuPanel.classList.add('hidden');
            }
        });

        // Lógica para cerrar sesión
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            window.location.href = './login.html'; // Redirige a la página de login
        });

    } else {
        // --- LÓGICA SI EL USUARIO NO HA INICIADO SESIÓN ---
        
        guestView.classList.remove('hidden');
        loggedInView.classList.add('hidden');
    }

    feather.replace();
}