// src/facturacionHandler.js

function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts.length > 3 ? parts[3] : null;
}

/**
 * Función genérica para obtener documentos (facturas, notas, etc.)
 * GET /api/invoices | /api/creditNotes | etc.
 * GET /api/invoices/:id | /api/creditNotes/:id | etc.
 */
async function getDocuments(request, env, tableName) {
    const { pathname } = new URL(request.url);
    const id = getIdFromPath(pathname);

    if (id) {
        const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(id).all();
        return Response.json(results[0] || null);
    } else {
        const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName}`).all();
        return Response.json(results);
    }
}

/**
 * POST /api/invoices -> Crea una nueva factura.
 * (Se puede crear una función similar para cada tipo de documento)
 */
async function createInvoice(request, env) {
    const invoice = await request.json();
    // Los items se guardan como un string JSON en la base de datos
    const itemsJson = JSON.stringify(invoice.items || []);

    const ps = env.suite_empresarial.prepare(
        'INSERT INTO invoices (number, clientId, clientName, issueDate, total, status, subtotal, iva, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const { success } = await ps.bind(
        invoice.number, invoice.clientId, invoice.clientName, invoice.issueDate,
        invoice.total, invoice.status, invoice.subtotal, invoice.iva, itemsJson
    ).run();

    if (success) {
        return new Response('Factura creada con éxito', { status: 201 });
    }
    return new Response('Error al crear la factura', { status: 500 });
}


// --- MANEJADOR PRINCIPAL DE FACTURACIÓN ---
export async function handleFacturacionRequest(request, env) {
    const { pathname } = new URL(request.url);
    let tableName;

    if (pathname.startsWith('/api/invoices')) tableName = 'invoices';
    else if (pathname.startsWith('/api/charge-accounts')) tableName = 'charge_accounts';
    else if (pathname.startsWith('/api/credit-notes')) tableName = 'credit_notes';
    else if (pathname.startsWith('/api/debit-notes')) tableName = 'debit_notes';
    else return new Response('Ruta de facturación no encontrada', { status: 404 });

    switch (request.method) {
        case 'GET':
            return getDocuments(request, env, tableName);
        case 'POST':
            // La lógica de creación puede variar por documento, aquí solo se muestra la de facturas
            if (tableName === 'invoices') return createInvoice(request, env);
            // ... agregar lógica para otros tipos de documentos
            break;
        // Aquí irían los casos para PUT y DELETE
    }

    return new Response(`Método ${request.method} no implementado para ${tableName}`, { status: 405 });
}