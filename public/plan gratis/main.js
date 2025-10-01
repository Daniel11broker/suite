import { initializeSupportChat } from './support-chat-widget.js';
import { initializeAiChat } from './ai-chat-widget.js';

// --- Función para cargar componentes HTML ---
async function loadComponent(elementId, url) {
    const element = document.getElementById(elementId);
    if (!element) return; // No hacer nada si el placeholder no existe

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
        const html = await response.text();
        element.innerHTML = html;
    } catch (error) {
        console.error(`Error al cargar el componente desde ${url}:`, error);
        element.innerHTML = `<p class="text-red-500">Error al cargar componente.</p>`;
    }
}


// --- Lógica principal que se ejecuta cuando la página carga ---
document.addEventListener('DOMContentLoaded', async () => {
    // Carga el componente de los chats en su placeholder
    // Usamos 'await' para asegurar que el HTML existe ANTES de inicializar los scripts
    await loadComponent('chat-widgets-placeholder', 'chat-widgets.html');

    // Ahora que el HTML está en la página, podemos inicializar los scripts de los chats
    const translations = { /* ... tu objeto de traducciones ... */ };
    const initialLang = 'es';

    initializeSupportChat(translations, initialLang);
    initializeAiChat(translations, initialLang);
    
    // Aquí puedes llamar a otras funciones de inicialización si las tienes
});