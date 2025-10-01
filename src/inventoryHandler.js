// src/inventoryHandler.js (Corregido para ser compatible)

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

// --- MANEJADOR PRINCIPAL DE INVENTARIO ---
export async function handleInventoryRequest(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    if (pathname === '/api/inventory/initial-data' && method === 'GET') {
        try {
            const inventoryPromise = env.suite_empresarial.prepare('SELECT * FROM inventory').all();
            const movementsPromise = env.suite_empresarial.prepare('SELECT * FROM inventory_movements').all();
            const suppliersPromise = env.suite_empresarial.prepare('SELECT * FROM suppliers').all();
            
            const [{ results: inventory }, { results: movements }, { results: suppliers }] = await Promise.all([
                inventoryPromise, movementsPromise, suppliersPromise
            ]);

            return handleJsonResponse({ inventory, movements, suppliers });
        } catch (e) {
            console.error("Error en el agregador de Inventario:", e);
            return handleError('Error al recolectar datos iniciales');
        }
    }

    if (pathname.startsWith('/api/inventory/products')) {
        const id = pathname.split('/')[4];
        switch (method) {
            case 'GET': {
                const { results } = await env.suite_empresarial.prepare('SELECT * FROM inventory').all();
                return handleJsonResponse(results);
            }
            case 'POST': {
                const p = await request.json();
                const { success } = await env.suite_empresarial.prepare(
                    'INSERT INTO inventory (name, sku, category, description, costPrice, price, stock, lowStockThreshold, reorderPoint, supplierId, location, batch, expiryDate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
                ).bind(p.name, p.sku, p.category, p.description, p.costPrice, p.price, p.stock, p.lowStockThreshold, p.reorderPoint, p.supplierId, p.location, p.batch, p.expiryDate).run();
                if (success) return new Response('Producto creado', { status: 201 });
                return handleError('Error al crear producto');
            }
            case 'PUT': {
                if (!id) return handleError('Se requiere ID', 400);
                const p = await request.json();
                const { success } = await env.suite_empresarial.prepare(
                    'UPDATE inventory SET name=?, sku=?, category=?, description=?, costPrice=?, price=?, stock=?, lowStockThreshold=?, reorderPoint=?, supplierId=?, location=?, batch=?, expiryDate=? WHERE id=?'
                ).bind(p.name, p.sku, p.category, p.description, p.costPrice, p.price, p.stock, p.lowStockThreshold, p.reorderPoint, p.supplierId, p.location, p.batch, p.expiryDate, id).run();
                if (success) return new Response('Producto actualizado');
                return handleError('Error al actualizar producto');
            }
            case 'DELETE': {
                if (!id) return handleError('Se requiere ID', 400);
                const { success } = await env.suite_empresarial.prepare('DELETE FROM inventory WHERE id=?').bind(id).run();
                if (success) return new Response(null, { status: 204 });
                return handleError('Error al eliminar producto');
            }
        }
    }

    if (pathname.startsWith('/api/inventory/movements')) {
        if (method === 'POST') {
            const m = await request.json();
            const { success } = await env.suite_empresarial.prepare(
                'INSERT INTO inventory_movements (productId, date, type, quantityChange, newQuantity, reason) VALUES (?,?,?,?,?,?)'
            ).bind(m.productId, m.date, m.type, m.quantityChange, m.newQuantity, m.reason).run();
            if (success) return new Response('Movimiento registrado', { status: 201 });
            return handleError('Error al registrar movimiento');
        }
    }

    return handleError('Ruta no encontrada en Inventario', 404);
}