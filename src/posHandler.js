// src/posHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

// --- MANEJADOR PRINCIPAL DEL PUNTO DE VENTA ---
export async function handlePosRequest(request, env) {
    const { pathname } = new URL(request.url);
    const { method } = request;

    // RUTA AGREGADORA PARA CARGA INICIAL
    if (pathname === '/api/pos/initial-data' && method === 'GET') {
        try {
            const [
                { results: inventory },
                { results: clients },
                { results: accounts }
            ] = await Promise.all([
                env.suite_empresarial.prepare('SELECT * FROM inventory WHERE stock > 0').all(),
                env.suite_empresarial.prepare('SELECT * FROM clients').all(),
                env.suite_empresarial.prepare('SELECT * FROM pos_accounts').all()
            ]);

            return handleJsonResponse({ inventory, clients, accounts });
        } catch (e) {
            console.error("Error en agregador de POS:", e);
            return handleError("Error al recolectar datos iniciales. Asegúrate de que las tablas 'inventory', 'clients' y 'pos_accounts' existen.");
        }
    }

    // RUTA PARA PROCESAR EL PAGO (CHECKOUT)
    if (pathname === '/api/pos/checkout' && method === 'POST') {
        const sale = await request.json();

        try {
            const statements = [];
            const saleDate = new Date().toISOString().slice(0, 10);
            const saleNumber = `POS-${Date.now()}`;

            // 1. Actualizar stock y registrar movimiento para cada item
            for (const item of sale.cart) {
                statements.push(
                    env.suite_empresarial.prepare('UPDATE inventory SET stock = stock - ? WHERE id = ?')
                    .bind(item.quantity, item.id)
                );
                const newStock = (item.stock || 0) - item.quantity;
                statements.push(
                    env.suite_empresarial.prepare('INSERT INTO inventory_movements (productId, date, type, quantityChange, newQuantity, reason) VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(item.id, saleDate, 'Venta', `-${item.quantity}`, newStock, `Venta POS #${saleNumber}`)
                );
            }

            // 2. Crear factura de venta
            statements.push(
                env.suite_empresarial.prepare('INSERT INTO invoices (number, clientId, clientName, issueDate, total, status, subtotal, iva, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(saleNumber, sale.clientId, sale.clientName, saleDate, sale.total, 'Pagado', sale.subtotal, sale.iva, JSON.stringify(sale.cart))
            );

            // 3. Registrar ingreso en Tesorería
            statements.push(
                env.suite_empresarial.prepare('INSERT INTO pos_transactions (accountId, date, type, description, amount) VALUES (?, ?, ?, ?, ?)')
                .bind(sale.paymentMethod, saleDate, 'inflow', `Venta POS #${saleNumber}`, sale.total)
            );
            
            await env.suite_empresarial.batch(statements);

            return new Response('Venta procesada con éxito', { status: 201 });

        } catch (error) {
            console.error("Error en el checkout del POS:", error);
            return handleError('Error al procesar la venta');
        }
    }

    return handleError('Ruta no encontrada en POS', 404);
}