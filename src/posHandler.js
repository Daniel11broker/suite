// src/posHandler.js

/**
 * POST /api/pos/checkout -> Procesa una venta del POS
 * Esta función es una "transacción": actualiza varias tablas a la vez.
 */
export async function handlePosCheckout(request, env) {
    const sale = await request.json(); // Espera un objeto con { cart, total, clientId, paymentMethod }

    try {
        const statements = [];

        // 1. Actualizar el stock de cada producto en el inventario
        sale.cart.forEach(item => {
            statements.push(
                env.suite_empresarial.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?')
                .bind(item.quantity, item.id)
            );
        });

        // 2. Crear un registro de la factura de venta
        statements.push(
            env.suite_empresarial.prepare('INSERT INTO invoices (number, clientId, clientName, issueDate, total, status, items) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(`POS-${Date.now()}`, sale.clientId, sale.clientName, new Date().toISOString().slice(0, 10), sale.total, 'Pagado', JSON.stringify(sale.cart))
        );

        // 3. Registrar el ingreso en Tesorería (en la "Caja General" o la cuenta seleccionada)
        statements.push(
            env.suite_empresarial.prepare('INSERT INTO manual_transactions (accountId, date, type, description, amount) VALUES (?, ?, ?, ?, ?)')
            .bind(sale.paymentMethod, new Date().toISOString().slice(0, 10), 'inflow', `Venta POS #${`POS-${Date.now()}`}`, sale.total)
        );
        
        // Ejecutar todas las operaciones en una sola transacción
        await env.suite_empresarial.batch(statements);

        return new Response('Venta procesada con éxito', { status: 201 });

    } catch (error) {
        console.error("Error en el checkout del POS:", error);
        return new Response('Error al procesar la venta', { status: 500 });
    }
}