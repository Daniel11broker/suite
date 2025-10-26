// src/comprasHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

// --- MANEJADOR PRINCIPAL DE COMPRAS ---
export async function handleComprasRequest(request, env) {
    const { pathname } = new URL(request.url);
    const { method } = request;

    // RUTA AGREGADORA
    if (pathname === '/api/compras/initial-data') {
        try {
            const suppliersPromise = env.suite_empresarial.prepare('SELECT * FROM suppliers').all();
            const poPromise = env.suite_empresarial.prepare('SELECT * FROM purchase_orders').all();
            const billsPromise = env.suite_empresarial.prepare('SELECT * FROM bills').all();
            const inventoryPromise = env.suite_empresarial.prepare('SELECT id, name, costPrice FROM inventory').all();
            
            const [
                { results: suppliers }, { results: purchaseOrdersRaw }, { results: bills }, { results: inventory }
            ] = await Promise.all([suppliersPromise, poPromise, billsPromise, inventoryPromise]);

            const purchaseOrders = purchaseOrdersRaw.map(po => ({...po, items: JSON.parse(po.items || '[]')}));

            return handleJsonResponse({ suppliers, purchaseOrders, bills, inventory });
        } catch(e) {
            console.error("Error en agregador de Compras:", e);
            return handleError("Error al recolectar datos iniciales");
        }
    }

    // --- RUTAS CRUD ESPECÍFICAS ---
    const entityMatch = pathname.match(/^\/api\/compras\/(suppliers|purchaseOrders|bills)/);
    if (entityMatch) {
        const entity = entityMatch[1];
        const id = pathname.split('/')[4];
        let tableName = entity;
        if(entity === 'purchaseOrders') tableName = 'purchase_orders';
        
        switch(method) {
            case 'POST': {
                const body = await request.json();
                let stmt, params;
                if(entity === 'suppliers') {
                    stmt = 'INSERT INTO suppliers (name, nit, contactName, phone, email) VALUES (?,?,?,?,?)';
                    params = [body.name, body.nit, body.contactName, body.phone, body.email];
                } else if(entity === 'purchaseOrders') {
                    stmt = 'INSERT INTO purchase_orders (supplierId, date, status, items) VALUES (?,?,?,?)';
                    params = [body.supplierId, body.date, 'Pendiente', JSON.stringify(body.items || [])];
                } else if(entity === 'bills') {
                    stmt = 'INSERT INTO bills (supplierId, invoiceNumber, date, dueDate, total, balance, status) VALUES (?,?,?,?,?,?,?)';
                    params = [body.supplierId, body.invoiceNumber, body.date, body.dueDate, body.total, body.total, 'Pendiente'];
                }
                const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                if(success) return new Response('Creado', {status: 201});
                return handleError('Error al crear');
            }
            case 'PUT': {
                if(!id) return handleError('Se requiere ID');
                const body = await request.json();
                let stmt, params;
                 if(entity === 'suppliers') {
                    stmt = 'UPDATE suppliers SET name=?, nit=?, contactName=?, phone=?, email=? WHERE id=?';
                    params = [body.name, body.nit, body.contactName, body.phone, body.email, id];
                } // ... Agregar lógica PUT para otras entidades si es necesario
                const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                if(success) return new Response('Actualizado');
                return handleError('Error al actualizar');
            }
            case 'DELETE': {
                if(!id) return handleError('Se requiere ID');
                const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id=?`).bind(id).run();
                if(success) return new Response(null, {status: 204});
                return handleError('Error al eliminar');
            }
        }
    }
    
    // --- RUTAS DE ACCIONES ESPECIALES ---
    const actionMatch = pathname.match(/^\/api\/compras\/purchaseOrders\/(\d+)\/receive/);
    if (actionMatch && method === 'POST') {
        const poId = actionMatch[1];
        // En una app real, esto debería ser una transacción D1.
        // Por simplicidad, ejecutamos las queries secuencialmente.
        try {
            // 1. Obtener la PO
            const { results: [po] } = await env.suite_empresarial.prepare('SELECT * FROM purchase_orders WHERE id=?').bind(poId).all();
            if (!po || po.status === 'Recibido') return handleError('Orden no encontrada o ya recibida', 404);
            const items = JSON.parse(po.items || '[]');

            // 2. Actualizar stock y crear movimientos
            for(const item of items) {
                await env.suite_empresarial.prepare('UPDATE inventory SET stock = stock + ? WHERE id = ?').bind(item.quantity, item.productId).run();
                const { results: [product] } = await env.suite_empresarial.prepare('SELECT stock FROM inventory WHERE id = ?').bind(item.productId).all();
                await env.suite_empresarial.prepare('INSERT INTO inventory_movements (productId, date, type, quantityChange, newQuantity, reason) VALUES (?,?,?,?,?,?)')
                    .bind(item.productId, new Date().toISOString().slice(0,10), 'Entrada por Compra', `+${item.quantity}`, product.stock, `OC #${po.id}`).run();
            }

            // 3. Actualizar estado de la PO
            await env.suite_empresarial.prepare("UPDATE purchase_orders SET status='Recibido' WHERE id=?").bind(poId).run();

            return new Response('Orden recibida y stock actualizado');
        } catch(e) {
            console.error("Error al recibir PO:", e);
            return handleError('Error procesando la recepción de la orden');
        }
    }

    return handleError('Ruta no encontrada en Compras', 404);
}