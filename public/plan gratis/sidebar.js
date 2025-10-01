// sidebar.js

// Importamos la función de inicialización del nuevo componente de sesión
import { initUserSession } from './user-session.js';

document.addEventListener('DOMContentLoaded', async () => {
    // La carga del sidebar y la sesión ahora ocurren en paralelo
    await Promise.all([
        loadSidebar(),
        initUserSession() // Llamamos a la función importada
    ]);

    // Reemplazamos los iconos una vez que todo el contenido dinámico ha sido cargado
    feather.replace();
});

// --- LÓGICA DEL SIDEBAR (existente, sin cambios) ---
const ALL_MODULES = [
    { id: 'inicio', name: 'Inicio', icon: 'home', href: './inicio.html' },
    { id: 'auditorias', name: 'Auditorías', icon: 'check-square', href: './auditorias.html' },
    { id: 'callcenter', name: 'Call Center', icon: 'phone', href: './call-center.html' },
    { id: 'cobranza', name: 'Cobranza', icon: 'trending-up', href: './cobranza.html' },
    { id: 'compras', name: 'Compras', icon: 'shopping-cart', href: './compras.html' },
    { id: 'crm', name: 'CRM', icon: 'target', href: './crm.html' },
    { id: 'facturacion', name: 'Facturación', icon: 'file-text', href: './facturacion.html' },
    { id: 'inventarios', name: 'Inventarios', icon: 'archive', href: './inventarios.html' },
    { id: 'nomina', name: 'Nómina', icon: 'dollar-sign', href: './nomina.html' },
    { id: 'pos', name: 'Punto de Venta', icon: 'shopping-bag', href: './pos.html' },
    { id: 'rrhh', name: 'RRHH', icon: 'users', href: './recursoshumanos.html' },
    { id: 'reportes', name: 'Reportes', icon: 'pie-chart', href: './resportes.html' },
    { id: 'sgsst', name: 'SG-SST', icon: 'shield', href: './sg-sst.html' },
    { id: 'tesoreria', name: 'Tesorería', icon: 'activity', href: './tesoreria.html' },
    { id: 'ventas', name: 'Ventas', icon: 'trending-up', href: './ventas.html' }
];

let sidebarConfig = {};

const saveSidebarConfig = () => {
    localStorage.setItem('sidebar_config_v1', JSON.stringify(sidebarConfig));
};

const loadSidebarConfig = () => {
    const savedConfig = JSON.parse(localStorage.getItem('sidebar_config_v1')) || {};
    const newConfig = {};
    ALL_MODULES.forEach(module => {
        if (savedConfig[module.id] !== undefined) {
            newConfig[module.id] = savedConfig[module.id];
        } else {
            newConfig[module.id] = { isVisible: true };
        }
    });
    sidebarConfig = newConfig;
    saveSidebarConfig();
};

const renderSidebarLinks = () => {
    const navContainer = document.getElementById('sidebar-nav-container');
    if (!navContainer) return;

    const currentPage = window.location.pathname.split('/').pop();
    const navLinksHtml = ALL_MODULES
        .filter(module => sidebarConfig[module.id] && sidebarConfig[module.id].isVisible)
        .map(module => {
            const isActive = module.href.includes(currentPage);
            const activeClasses = 'text-blue-600 bg-blue-50 dark:bg-gray-700 dark:text-blue-300 font-semibold';
            const defaultClasses = 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
            return `<a href="${module.href}" class="flex items-center h-12 px-6 ${isActive ? activeClasses : defaultClasses}" title="${module.name}"><i data-feather="${module.icon}" class="h-6 w-6 flex-shrink-0"></i><span class="sidebar-text">${module.name}</span></a>`;
        }).join('');
    
    navContainer.innerHTML = `<div class="flex flex-col py-4 space-y-1">${navLinksHtml}</div>`;
};

const openSidebarConfigModal = () => {
    const formModal = { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form') };
    if (!formModal.el) {
        console.error('El elemento del modal principal no se encontró.');
        return;
    }
    formModal.title.textContent = 'Personalizar Barra Lateral';
    const headerActionsHTML = `
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Elige los módulos que deseas ver en el menú lateral.</p>
        <div class="flex items-center space-x-2 mb-4">
            <button type="button" id="select-all-btn" class="text-sm bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Seleccionar Todo</button>
            <button type="button" id="deselect-all-btn" class="text-sm bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Quitar Todo</button>
        </div>
    `;
    const moduleTogglesHTML = ALL_MODULES.map(module => `
        <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <span class="flex items-center">
                <i data-feather="${module.icon}" class="inline-block mr-3 h-5 w-5"></i>
                ${module.name}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" data-module-id="${module.id}" class="sr-only peer module-toggle-checkbox" ${sidebarConfig[module.id]?.isVisible ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
        </div>
    `).join('');
    formModal.form.innerHTML = `
        ${headerActionsHTML}
        <div class="space-y-1">${moduleTogglesHTML}</div>
        <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-600">
            <button type="button" id="cancel-btn" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-lg mr-2">Cancelar</button>
            <button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg">Guardar Cambios</button>
        </div>`;
    feather.replace();

    document.getElementById('select-all-btn').onclick = () => {
        formModal.form.querySelectorAll('.module-toggle-checkbox').forEach(checkbox => checkbox.checked = true);
    };
    document.getElementById('deselect-all-btn').onclick = () => {
        formModal.form.querySelectorAll('.module-toggle-checkbox').forEach(checkbox => checkbox.checked = false);
    };

    formModal.form.onsubmit = (e) => {
        e.preventDefault();
        formModal.form.querySelectorAll('.module-toggle-checkbox').forEach(checkbox => {
            const moduleId = checkbox.dataset.moduleId;
            if (sidebarConfig[moduleId]) {
                sidebarConfig[moduleId].isVisible = checkbox.checked;
            }
        });
        saveSidebarConfig();
        renderSidebarLinks();
        feather.replace();
        formModal.el.classList.add('hidden');
    };

    formModal.form.querySelector('#cancel-btn').onclick = () => formModal.el.classList.add('hidden');
    formModal.el.classList.remove('hidden');
};

const initializeSidebarInteraction = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (window.innerWidth >= 768 && sidebar) {
        sidebar.addEventListener('mouseenter', () => sidebar.classList.add('expanded'));
        sidebar.addEventListener('mouseleave', () => sidebar.classList.remove('expanded'));
    }
    if (mobileMenuButton && sidebar) {
        mobileMenuButton.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('expanded'); });
    }
    document.addEventListener('click', (e) => {
        if (sidebar && window.innerWidth < 768 && sidebar.classList.contains('expanded') && !sidebar.contains(e.target)) {
            sidebar.classList.remove('expanded');
        }
    });
    document.getElementById('configure-sidebar-btn').onclick = openSidebarConfigModal;
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        const iconName = theme === 'dark' ? 'sun' : 'moon';
        themeToggle.innerHTML = `<i data-feather="${iconName}" class="w-6 h-6"></i>`;
        feather.replace();
    };
    applyTheme(localStorage.getItem('theme') || 'light');
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
};

const loadSidebar = async () => {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (!sidebarPlaceholder) return;
    try {
        const response = await fetch('sidebar.html');
        const sidebarHtml = await response.text();
        sidebarPlaceholder.innerHTML = sidebarHtml;
        
        loadSidebarConfig();
        renderSidebarLinks();
        initializeSidebarInteraction();
    } catch (error) {
        console.error('Error al cargar el sidebar:', error);
        sidebarPlaceholder.innerHTML = '<p class="p-4 text-red-500">Error al cargar la navegación.</p>';
    }
};