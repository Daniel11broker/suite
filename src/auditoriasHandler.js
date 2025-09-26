// src/auditoriasHandler.js

async function getAudits(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM audits').all();
    return Response.json(results);
}

async function getFindings(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM findings').all();
    return Response.json(results);
}

// --- MANEJADOR PRINCIPAL DE AUDITORÍAS ---
export async function handleAuditoriasRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/audits')) {
        if (request.method === 'GET') return getAudits(request, env);
        // ... Lógica para POST, PUT, DELETE
    }

    if (pathname.startsWith('/api/findings')) {
        if (request.method === 'GET') return getFindings(request, env);
        // ... Lógica para POST, PUT, DELETE
    }

    return new Response('Ruta no encontrada en Auditorías', { status: 404 });
}