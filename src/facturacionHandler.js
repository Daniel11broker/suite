// src/facturacionHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

const tableMap = {
    invoices: 'invoices',
    creditNotes: 'credit_notes',
    debitNotes: 'debit_notes',
    chargeAccounts: 'charge_accounts'
};

// --- MANEJADOR PRINCIPAL DE FACTURACIÓN ---
export async function handleFacturacionRequest(request, env) {
    const { pathname } = new URL(request.url);
    const { method } = request;

    // RUTA AGREGADORA
    if (pathname === '/api/facturacion/initial-data') {
        try {
            const [
                { results: invoices }, { results: creditNotes }, { results: debitNotes }, { results: chargeAccounts }, { results: clients }
            ] = await Promise.all([
                env.suite_empresarial.prepare('SELECT * FROM invoices').all(),
                env.suite_empresarial.prepare('SELECT * FROM credit_notes').all(),
                env.suite_empresarial.prepare('SELECT * FROM debit_notes').all(),
                env.suite_empresarial.prepare('SELECT * FROM charge_accounts').all(),
                env.suite_empresarial.prepare('SELECT * FROM clients').all()
            ]);
            return handleJsonResponse({ invoices, creditNotes, debitNotes, chargeAccounts, clients });
        } catch (e) {
            console.error("Error en agregador de Facturación:", e);
            return handleError("Error al recolectar datos iniciales");
        }
    }

    // RUTAS CRUD
    const entityMatch = pathname.match(/^\/api\/facturacion\/(invoices|creditNotes|debitNotes|chargeAccounts)/);
    if (entityMatch) {
        const entity = entityMatch[1];
        const tableName = tableMap[entity];
        const id = pathname.split('/')[4];

        if (!tableName) return handleError('Tipo de documento no válido', 400);

        try {
            switch(method) {
                case 'POST': {
                    const doc = await request.json();
                    const stmt = `INSERT INTO ${tableName} (number, clientId, clientName, issueDate, total, status, subtotal, iva, retefuente, ica, issuedBy, receivedBy, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
                    const params = [doc.number, doc.clientId, doc.clientName, doc.issueDate, doc.total, doc.status, doc.subtotal, doc.iva, doc.retefuente, doc.ica, doc.issuedBy, doc.receivedBy, doc.notes];
                    const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                    if(success) return new Response('Documento creado', {status: 201});
                    return handleError('Error al crear documento');
                }
                case 'PUT': {
                    if(!id) return handleError('Se requiere ID');
                    const doc = await request.json();
                    const stmt = `UPDATE ${tableName} SET number=?, clientId=?, clientName=?, issueDate=?, total=?, status=?, subtotal=?, iva=?, retefuente=?, ica=?, issuedBy=?, receivedBy=?, notes=? WHERE id=?`;
                    const params = [doc.number, doc.clientId, doc.clientName, doc.issueDate, doc.total, doc.status, doc.subtotal, doc.iva, doc.retefuente, doc.ica, doc.issuedBy, doc.receivedBy, doc.notes, id];
                    const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                    if(success) return new Response('Documento actualizado');
                    return handleError('Error al actualizar');
                }
                case 'DELETE': {
                    if(!id) return handleError('Se requiere ID');
                    const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id=?`).bind(id).run();
                    if(success) return new Response(null, {status: 204});
                    return handleError('Error al eliminar');
                }
            }
        } catch(e) {
            console.error(`Error en D1 para ${tableName}:`, e);
            return handleError('Error interno del servidor');
        }
    }
    
    return handleError('Ruta no encontrada en Facturación', 404);
}