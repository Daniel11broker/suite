// src/ventasHandler.js

async function getDocuments(request, env, tableName) {
    const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName}`).all();
    return Response.json(results);
}

async function createQuote(request, env) {
    const quote = await request.json();
    const itemsJson = JSON.stringify(quote.items || []);
    const ps = env.suite_empresarial.prepare('INSERT INTO quotes (number, clientId, date, total, status, items) VALUES (?, ?, ?, ?, ?, ?)');
    const { success } = await ps.bind(quote.number, quote.clientId, quote.date, quote.total, quote.status, itemsJson).run();
    if (success) return new Response('Cotización creada', { status: 201 });
    return new Response('Error al crear cotización', { status: 500 });
}


// --- MANEJADOR PRINCIPAL DE VENTAS ---
export async function handleVentasRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/quotes')) {
        if (request.method === 'GET') return getDocuments(request, env, 'quotes');
        if (request.method === 'POST') return createQuote(request, env);
        // ... Lógica para PUT y DELETE
    }

    if (pathname.startsWith('/api/orders')) {
        if (request.method === 'GET') return getDocuments(request, env, 'orders');
        // ... Lógica para POST, PUT y DELETE
    }

    return new Response('Ruta no encontrada en Ventas', { status: 404 });
}