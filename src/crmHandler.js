// src/crmHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

// --- MANEJADOR PRINCIPAL DE CRM ---
export async function handleCrmRequest(request, env) {
    const { pathname } = new URL(request.url);
    const { method } = request;

    // RUTA AGREGADORA PARA CARGA INICIAL
    if (pathname === '/api/crm/initial-data' && method === 'GET') {
        try {
            const [
                { results: leads },
                { results: opportunities },
                { results: accounts },
                { results: contacts }
            ] = await Promise.all([
                env.suite_empresarial.prepare('SELECT * FROM leads').all(),
                env.suite_empresarial.prepare('SELECT * FROM opportunities').all(),
                env.suite_empresarial.prepare('SELECT * FROM accounts').all(),
                env.suite_empresarial.prepare('SELECT * FROM crm_contacts').all()
            ]);
            return handleJsonResponse({ leads, opportunities, accounts, contacts });
        } catch (e) {
            console.error("Error en agregador de CRM:", e);
            return handleError("Error al recolectar datos iniciales");
        }
    }

    // --- RUTAS CRUD ESPECÍFICAS ---
    const entityMatch = pathname.match(/^\/api\/crm\/(leads|opportunities|accounts|contacts)/);
    if (entityMatch) {
        const entity = entityMatch[1];
        const id = pathname.split('/')[4];
        let tableName = entity === 'contacts' ? 'crm_contacts' : entity;
        
        try {
            switch (method) {
                case 'POST': {
                    const body = await request.json();
                    let stmt, params;
                    if (entity === 'leads') {
                        stmt = 'INSERT INTO leads (name, company, email, phone, source, status) VALUES (?,?,?,?,?,?)';
                        params = [body.name, body.company, body.email, body.phone, body.source, body.status || 'Nuevo'];
                    } else if (entity === 'opportunities') {
                        stmt = 'INSERT INTO opportunities (name, accountId, value, stage, closeDate) VALUES (?,?,?,?,?)';
                        params = [body.name, body.accountId, body.value, body.stage, body.closeDate];
                    } else if (entity === 'accounts') {
                        stmt = 'INSERT INTO accounts (name, industry, phone, email) VALUES (?,?,?,?)';
                        params = [body.name, body.industry, body.phone, body.email];
                    }
                    const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                    if (success) return new Response('Creado', { status: 201 });
                    return handleError('Error al crear');
                }
                case 'PUT': {
                    if (!id) return handleError('Se requiere ID');
                    const body = await request.json();
                    let stmt, params;
                    if (entity === 'leads') {
                        stmt = 'UPDATE leads SET name=?, company=?, email=?, phone=?, source=?, status=? WHERE id=?';
                        params = [body.name, body.company, body.email, body.phone, body.source, body.status, id];
                    } else if (entity === 'opportunities') {
                        stmt = 'UPDATE opportunities SET name=?, accountId=?, value=?, stage=?, closeDate=? WHERE id=?';
                        params = [body.name, body.accountId, body.value, body.stage, body.closeDate, id];
                    } else if (entity === 'accounts') {
                        stmt = 'UPDATE accounts SET name=?, industry=?, phone=?, email=? WHERE id=?';
                        params = [body.name, body.industry, body.phone, body.email, id];
                    }
                    const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                    if (success) return new Response('Actualizado');
                    return handleError('Error al actualizar');
                }
                case 'DELETE': {
                    if (!id) return handleError('Se requiere ID');
                    const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id=?`).bind(id).run();
                    if (success) return new Response(null, { status: 204 });
                    return handleError('Error al eliminar');
                }
            }
        } catch (e) {
            console.error(`Error en D1 para ${tableName}:`, e);
            return handleError('Error interno del servidor');
        }
    }

    return handleError('Ruta no encontrada en CRM', 404);
}