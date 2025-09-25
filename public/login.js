// Se eliminó la importación de db.js
import { translations } from './translations.js';

document.addEventListener('DOMContentLoaded', async () => {
    feather.replace();

    // --- LÓGICA DE INTERNACIONALIZACIÓN (I18N) ---
    const languageSelector = document.getElementById('language-selector');

    const setLanguage = (lang) => {
        const elements = document.querySelectorAll('[data-translate]');
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');

        elements.forEach(el => {
            const key = el.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });

        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-translate-placeholder');
            if (translations[lang] && translations[lang][key]) {
                el.setAttribute('placeholder', translations[lang][key]);
            }
        });
        
        document.documentElement.lang = lang;
        localStorage.setItem('lang', lang);
        languageSelector.value = lang;
    };

    languageSelector.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    const savedLanguage = localStorage.getItem('lang') || 'es';
    setLanguage(savedLanguage);

    // --- LÓGICA PARA EL TEMA (CLARO/OSCURO) ---
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        feather.replace();
    };
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- LÓGICA DE AUTENTICACIÓN ---
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        loginError.textContent = '';
        
        const currentLang = localStorage.getItem('lang') || 'es';

        try {
            // Esta es la parte clave que se conecta con tu backend
            const response = await fetch(`./authLogin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();

            if (response.ok) {
                const user = result.user;
                
                localStorage.setItem('loggedInUser', JSON.stringify({ 
                    username: user.username, 
                    role: user.role, 
                    id: user.id,
                    adminId: user.adminId || null
                }));
                
                // Redirección según el rol del usuario
                if (user.role === 'superadmin') {
                    window.location.href = './superadmin.html';
                } else if (user.role === 'admin') {
                    window.location.href = './admins.html'; 
                } else {
                    window.location.href = './plan gratis/inicio.html';
                }
            } else {
                loginError.textContent = result.message || translations[currentLang].wrongCredentialsError;
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            loginError.textContent = 'No se pudo conectar al servidor. Inténtalo de nuevo más tarde.';
        }
    });
});