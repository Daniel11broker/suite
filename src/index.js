/**
 * src/index.js
 * EL ENRUTADOR PRINCIPAL DEL BACKEND
 * Este archivo recibe todas las peticiones y las dirige al manejador correcto.
 */

// --- Importaciones de todos los manejadores de la aplicación ---
import { handleAuth } from './authLogin.js';
import { handleKvRequest } from './kvHandler.js';
import { handleR2Request } from './r2Handler.js';
import { handleAiChatRequest } from './aiChatHandler.js';

// Importaciones para el sistema de chat privado
import { ChatLobby } from './chatLobby.js';
import { ChatSession } from './chatSession.js';
import { verifySupportUser } from './chatAuthHandler.js';

// Importaciones para los módulos del "Plan Pro"
import { handleInventoryRequest } from './inventoryHandler.js';
import { handleCobranzaRequest } from './cobranzaHandler.js';
import { handleReportsRequest } from './reportsHandler.js';
import { handleCallCenterRequest } from './callCenterHandler.js';
import { handleComprasRequest } from './comprasHandler.js';
import { handleCrmRequest } from './crmHandler.js';
import { handleFacturacionRequest } from './facturacionHandler.js';
import { handleNominaRequest } from './nominaHandler.js';
// ▼▼▼ CAMBIO 1: Corregir nombre de la función importada ▼▼▼
import { handlePosRequest } from './posHandler.js';
import { handleSstRequest } from './sgSstHandler.js';
import { handleVentasRequest } from './ventasHandler.js';
import { handleAuditoriasRequest } from './auditoriasHandler.js';
import { handleRrhhRequest } from './rrhhHandler.js'; 
import { handleTesoreriaRequest } from './tesoreriaHandler.js';


// Exportamos las clases de Durable Objects para que Wrangler las reconozca
export { ChatLobby, ChatSession };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // --- ENRUTADOR PRINCIPAL ---

    // 1. Rutas de Chat (requieren lógica especial)
    if (pathname === '/api/chat/lobby') {
        const lobbyId = env.CHAT_LOBBY.idFromName('main-lobby');
        return env.CHAT_LOBBY.get(lobbyId).fetch(request);
    }
    if (pathname === '/api/chat/request') {
        const { userName, department } = await request.json(); 
        
        if (department === 'Soporte') {
            const isAuthorized = await verifySupportUser(userName, env);
            if (!isAuthorized) {
                return new Response('Usuario no autorizado o inactivo para el chat de soporte.', { status: 403 });
            }
        }

        const sessionId = env.CHAT_SESSION.newUniqueId().toString();
        const lobbyId = env.CHAT_LOBBY.idFromName('main-lobby');
        const lobby = env.CHAT_LOBBY.get(lobbyId);
        await lobby.handleHttpRequest(new Request(url.origin + '/queue', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sessionId, userName, department, timestamp: new Date() })
        }));
        return Response.json({ sessionId });
    }
    if (pathname.startsWith('/api/chat/session/')) {
        const sessionId = pathname.split('/').pop();
        const session = env.CHAT_SESSION.get(env.CHAT_SESSION.idFromString(sessionId));
        return session.fetch(request);
    }
     if (pathname.startsWith('/api/chat/accept/')) {
        const sessionId = pathname.split('/').pop();
        const lobbyId = env.CHAT_LOBBY.idFromName('main-lobby');
        const lobby = env.CHAT_LOBBY.get(lobbyId);
        await lobby.handleHttpRequest(new Request(url.origin + '/dequeue', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sessionId })
        }));
        return new Response('Session accepted', { status: 200 });
    }

    // 2. Rutas de la API principal (organizadas por prefijo)
    if (pathname === '/authLogin') return handleAuth(request, env);
    if (pathname.startsWith('/api/ai-chat')) return handleAiChatRequest(request, env);
    
    // Rutas de Módulos
    if (pathname.startsWith('/api/pos/')) return handlePosRequest(request, env); // ▼▼▼ CAMBIO 2: Corregir la ruta del POS ▼▼▼
    if (pathname.startsWith('/api/accounts') || pathname.startsWith('/api/transactions')) return handleTesoreriaRequest(request, env);
    if (pathname.startsWith('/api/inventory')) return handleInventoryRequest(request, env);
    if (pathname.startsWith('/api/clients') || pathname.startsWith('/api/debtors')) return handleCobranzaRequest(request, env);
    if (pathname.startsWith('/api/reports')) return handleReportsRequest(request, env);
    if (pathname.startsWith('/api/call-center')) return handleCallCenterRequest(request, env);
    if (pathname.startsWith('/api/compras')) return handleComprasRequest(request, env);
    if (pathname.startsWith('/api/crm')) return handleCrmRequest(request, env);
    if (pathname.startsWith('/api/facturacion')) return handleFacturacionRequest(request, env);
    if (pathname.startsWith('/api/nomina')) return handleNominaRequest(request, env);
    if (pathname.startsWith('/api/sg-sst')) return handleSstRequest(request, env);
    if (pathname.startsWith('/api/ventas')) return handleVentasRequest(request, env);
    if (pathname.startsWith('/api/auditorias')) return handleAuditoriasRequest(request, env);
    if (pathname.startsWith('/api/rrhh')) return handleRrhhRequest(request, env);
    if (pathname.startsWith('/api/ai-chat')) return handleAiChatRequest (request, env);
    
    // 3. Rutas de bajo nivel (KV y R2)
    if (pathname.startsWith('/kv/')) return handleKvRequest(request, env);
    if (pathname.startsWith('/r2/')) return handleR2Request(request, env);

    // 4. Si ninguna ruta coincide, devuelve un error 404.
    return new Response(`La ruta '${pathname}' no fue encontrada en el servidor.`, { status: 404 });
  },
};