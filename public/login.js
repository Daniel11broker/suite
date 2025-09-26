import { translations } from './translations.js';
// Importa desde los dos nuevos archivos de chat separados
import { initializeSupportChat } from './support-chat-widget.js';
import { initializeAiChat } from './ai-chat-widget.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa los iconos de la página
    feather.replace();

    // --- LÓGICA DE INTERNACIONALIZACIÓN (I18N) ---
    const languageSelector = document.getElementById('language-selector');

    const setLanguage = (lang) => {
        // Traducir elementos principales de la página
        document.querySelectorAll('[data-translate], [data-i18n]').forEach(el => {
            const key = el.getAttribute('data-translate') || el.getAttribute('data-i18n');
            const translation = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations[lang]);
            if (translation) el.textContent = translation;
        });

        // Traducir placeholders
        document.querySelectorAll('[data-translate-placeholder], [data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-translate-placeholder') || el.getAttribute('data-i18n-placeholder');
            const translation = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations[lang]);
            if (translation) el.setAttribute('placeholder', translation);
        });
        
        // Traducir opciones del select en el chat
        const salesOption = document.querySelector('[data-i18n="support_chat.department_sales"]');
        if (salesOption) salesOption.textContent = translations[lang].support_chat.department_sales;
        
        const supportOption = document.querySelector('[data-i18n="support_chat.department_support"]');
        if (supportOption) supportOption.textContent = translations[lang].support_chat.department_support;

        document.documentElement.lang = lang;
        localStorage.setItem('lang', lang);
        if (languageSelector) {
            languageSelector.value = lang;
        }
        feather.replace();
    };

    languageSelector.addEventListener('change', (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        // Dispara un evento para que los módulos de chat sepan que el idioma cambió
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: newLang } }));
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
            // Se conecta con el backend en la ruta /authLogin
            const response = await fetch(`/authLogin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ message: 'Error de autenticación' }));
                throw new Error(errorResult.message);
            }

            const result = await response.json();

            if (result.user) {
                const user = result.user;
                
                // Guarda la información del usuario en el navegador
                localStorage.setItem('loggedInUser', JSON.stringify({ 
                    username: user.username, 
                    role: user.role, 
                    id: user.id,
                    adminId: user.adminId || null
                }));
                
                // Redirige al usuario según su rol
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
            console.error('Error de conexión o autenticación:', error);
            loginError.textContent = translations[currentLang].wrongCredentialsError || 'No se pudo conectar al servidor.';
        }
    });

    // --- INICIALIZACIÓN DE WIDGETS ---
    // Llama a cada función de inicialización por separado, pasándoles las traducciones y el idioma.
    initializeSupportChat(translations, savedLanguage);
    initializeAiChat(translations, savedLanguage);
});