document.addEventListener('DOMContentLoaded', () => {
    // Reemplazar todos los iconos de Feather
    feather.replace();

    // --- LÓGICA DEL MENÚ LATERAL (SIDEBAR) ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    
    // Función para expandir el menú
    const expandSidebar = () => {
        if (!sidebar.classList.contains('expanded')) {
            sidebar.classList.add('expanded');
        }
    };
    
    // Función para contraer el menú
    const collapseSidebar = () => {
        if (sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
        }
    };

    // Comportamiento en escritorio (con el mouse)
    if (window.innerWidth >= 768) {
        sidebar.addEventListener('mouseenter', expandSidebar);
        sidebar.addEventListener('mouseleave', collapseSidebar);
    }

    // Comportamiento en móvil (con clic en el botón)
    mobileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el clic se propague al documento
        sidebar.classList.toggle('expanded');
    });

    // Cerrar menú móvil al hacer clic fuera de él
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && sidebar.classList.contains('expanded')) {
            if (!sidebar.contains(e.target) && e.target !== mobileMenuButton) {
                collapseSidebar();
            }
        }
    });


    // --- LÓGICA DEL CAMBIO DE TEMA (CLARO/OSCURO) ---
    const themeToggle = document.getElementById('theme-toggle');

    // Función para aplicar el tema
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    };

    // Aplicar tema al cargar la página
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Evento de clic para cambiar el tema
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
});