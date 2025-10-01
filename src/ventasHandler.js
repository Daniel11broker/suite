// src/ventasHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

// Función genérica para manejar CRUD en D1
async function handleD1Crud(request, env, tableName) {
    const { method } = request;
    const { pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    try {
        switch (method) {
            case 'GET': {
                const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName}`).all();
                return handleJsonResponse(results.map(item => ({...item, items: JSON.parse(item.items || '[]') })));
            }
            case 'POST': {
                const body = await request.json();
                const itemsJson = JSON.stringify(body.items || []);
                const { success } = await env.suite_empresarial.prepare(`INSERT INTO ${tableName} (number, clientId, date, total, status, items) VALUES (?, ?, ?, ?, ?, ?)`)
                    .bind(body.number, body.clientId, body.date, body.total, body.status, itemsJson).run();
                if (success) return new Response('Registro creado', { status: 201 });
                return handleError(`Error al crear en ${tableName}`);
            }
            case 'PUT': {
                const body = await request.json();
                const itemsJson = JSON.stringify(body.items || []);
                const { success } = await env.suite_empresarial.prepare(`UPDATE ${tableName} SET number=?, clientId=?, date=?, total=?, status=?, items=? WHERE id=?`)
                    .bind(body.number, body.clientId, body.date, body.total, body.status, itemsJson, id).run();
                if (success) return new Response('Registro actualizado');
                return handleError(`Error al actualizar en ${tableName}`);
            }
            case 'DELETE': {
                const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id=?`).bind(id).run();
                if (success) return new Response(null, { status: 204 });
                return handleError(`Error al eliminar de ${tableName}`);
            }
        }
    } catch(e) {
        console.error(`Error en D1 para ${tableName}:`, e);
        return handleError('Error interno del servidor');
    }
}

// --- MANEJADOR PRINCIPAL DE VENTAS ---
export async function handleVentasRequest(request, env) {
    const { pathname } = new URL(request.url);

    // Ruta agregadora para la carga inicial
    if (pathname === '/api/ventas/initial-data' && request.method === 'GET') {
        try {
            const quotesPromise = env.suite_empresarial.prepare('SELECT * FROM quotes').all();
            const ordersPromise = env.suite_empresarial.prepare('SELECT * FROM sales_orders').all();
            // Asumimos que las tablas 'clients' e 'inventory' existen de otros módulos
            const clientsPromise = env.suite_empresarial.prepare('SELECT id, name FROM clients').all(); 
            const inventoryPromise = env.suite_empresarial.prepare('SELECT id, name, price, stock FROM inventory').all();

            const [
                { results: quotesRaw }, 
                { results: ordersRaw },
                { results: clients },
                { results: inventory }
            ] = await Promise.all([quotesPromise, ordersPromise, clientsPromise, inventoryPromise]);

            const quotes = quotesRaw.map(q => ({ ...q, items: JSON.parse(q.items || '[]') }));
            const orders = ordersRaw.map(o => ({ ...o, items: JSON.parse(o.items || '[]') }));

            return handleJsonResponse({ quotes, orders, clients, inventory });
        } catch (e) {
            console.error('Error en el agregador de Ventas:', e);
            return handleError('Error al recolectar datos iniciales');
        }
    }

    // Rutas CRUD para Cotizaciones
    if (pathname.startsWith('/api/ventas/quotes')) {
        return handleD1Crud(request, env, 'quotes');
    }

    // Rutas CRUD para Pedidos
    if (pathname.startsWith('/api/ventas/orders')) {
        return handleD1Crud(request, env, 'sales_orders');
    }

    return handleError('Ruta no encontrada en Ventas', 404);
}