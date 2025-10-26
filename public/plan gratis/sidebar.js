// sidebar.js

import { initUserSession } from './user-session.js';

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadSidebar(),
        initUserSession()
    ]);
    feather.replace();
});

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
        newConfig[module.id] = { isVisible: savedConfig[module.id]?.isVisible ?? true };
    });
    sidebarConfig = newConfig;
    saveSidebarConfig();
};

const renderSidebarLinks = () => {
    const navContainer = document.getElementById('sidebar-nav-container');
    if (!navContainer) return;
    const currentPage = window.location.pathname.split('/').pop();
    const navLinksHtml = ALL_MODULES
        .filter(module => sidebarConfig[module.id]?.isVisible)
        .map(module => {
            const isActive = module.href.includes(currentPage);
            // Clases para el tema claro
            const activeClasses = 'text-blue-600 bg-blue-50 font-semibold';
            const defaultClasses = 'text-gray-500 hover:bg-gray-100';
            return `<a href="${module.href}" class="flex items-center h-12 px-6 ${isActive ? activeClasses : defaultClasses}" title="${module.name}"><i data-feather="${module.icon}" class="h-6 w-6 flex-shrink-0"></i><span class="sidebar-text">${module.name}</span></a>`;
        }).join('');
    navContainer.innerHTML = `<div class="flex flex-col py-4 space-y-1">${navLinksHtml}</div>`;
};

// Se ha eliminado el botón del tema
const renderSidebarFooter = () => {
    const footerContainer = document.getElementById('sidebar-footer-container');
    if (!footerContainer) return;
    footerContainer.innerHTML = `
        <button id="configure-sidebar-btn" class="flex items-center w-full h-12 px-6 text-gray-500 hover:bg-gray-100" title="Configurar Módulos">
            <i data-feather="settings" class="h-6 w-6 flex-shrink-0"></i>
            <span class="sidebar-text">Ajustes</span>
        </button>
    `;
};

const openSidebarConfigModal = () => {
    const modalElements = {
        el: document.getElementById('sidebar-config-modal'),
        title: document.getElementById('sidebar-config-title'),
        form: document.getElementById('sidebar-config-form'),
        closeBtn: document.getElementById('sidebar-config-close-btn')
    };
    if (!modalElements.el || !modalElements.title || !modalElements.form || !modalElements.closeBtn) {
        console.error('La estructura HTML del modal de configuración del sidebar no se encontró o está incompleta.');
        return;
    }
    modalElements.title.textContent = 'Personalizar Barra Lateral';
    const headerActionsHTML = `...`; // Tu código aquí
    const moduleTogglesHTML = ALL_MODULES.map(module => `...`).join(''); // Tu código aquí
    modalElements.form.innerHTML = `...`; // Tu código aquí
    feather.replace();

    // Lógica del modal (sin cambios)
    const closeModal = () => modalElements.el.classList.add('hidden');
    modalElements.form.onsubmit = (e) => {
        e.preventDefault();
        // ... Lógica para guardar ...
        closeModal();
    };
    modalElements.closeBtn.onclick = closeModal;
    modalElements.el.classList.remove('hidden');
};

const initializeSidebarInteraction = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth >= 768) {
        sidebar.addEventListener('mouseenter', () => sidebar.classList.add('expanded'));
        sidebar.addEventListener('mouseleave', () => sidebar.classList.remove('expanded'));
    }
    document.addEventListener('click', (event) => {
        const target = event.target;
        const mobileMenuButton = target.closest('#mobile-menu-button');
        if (mobileMenuButton) {
            event.stopPropagation();
            sidebar.classList.toggle('expanded');
            return;
        }
        if (window.innerWidth < 768 && sidebar.classList.contains('expanded') && !sidebar.contains(target)) {
            sidebar.classList.remove('expanded');
        }
    });
    // Se ha eliminado el listener para el botón del tema
    sidebar.addEventListener('click', (event) => {
        const target = event.target;
        if (target.closest('#configure-sidebar-btn')) {
            openSidebarConfigModal();
        }
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
        renderSidebarFooter();
        initializeSidebarInteraction();
    } catch (error) {
        console.error('Error al cargar el sidebar:', error);
        sidebarPlaceholder.innerHTML = '<p class="p-4 text-red-500">Error al cargar la navegación.</p>';
    }
};