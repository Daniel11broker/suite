// src/callCenterHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

// --- LÓGICA PARA CONFIGURACIÓN (usando KV) ---
async function getSettings(env) {
    return await env.SUITE_CONFIG.get('call_center_settings', 'json') || {};
}

async function updateSettings(request, env) {
    try {
        const settings = await request.json();
        await env.SUITE_CONFIG.put('call_center_settings', JSON.stringify(settings));
        return new Response('Configuración actualizada', { status: 200 });
    } catch (e) {
        return handleError('Error al procesar la solicitud', 400);
    }
}

// --- LÓGICA PARA ENTIDADES (usando D1) ---
const tableMap = {
    agents: 'agents',
    contacts: 'call_center_contacts',
    calls: 'calls',
    tasks: 'tasks'
};

async function handleD1Crud(request, env, entity) {
    const { method } = request;
    const { pathname } = new URL(request.url);
    const id = pathname.split('/').pop();
    const tableName = tableMap[entity];

    if (!tableName) return handleError('Entidad no válida', 400);

    try {
        switch (method) {
            case 'GET': {
                const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName}`).all();
                return handleJsonResponse(results);
            }
            case 'POST': {
                const body = await request.json();
                let stmt, params;
                if (entity === 'agents') {
                    stmt = 'INSERT INTO agents (name, email, extension, status) VALUES (?, ?, ?, ?)';
                    params = [body.name, body.email, body.extension, body.status];
                } else if (entity === 'contacts') {
                    stmt = 'INSERT INTO call_center_contacts (name, company, phone, email) VALUES (?, ?, ?, ?)';
                    params = [body.name, body.company, body.phone, body.email];
                } else if (entity === 'calls') {
                    stmt = 'INSERT INTO calls (agentId, contactId, dateTime, type, direction, duration, resolution, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                    params = [body.agentId, body.contactId, body.dateTime, body.type, body.direction, body.duration, body.resolution, body.summary];
                } else if (entity === 'tasks') {
                    stmt = 'INSERT INTO tasks (sourceId, description, assignedTo, dueDate, status) VALUES (?, ?, ?, ?, ?)';
                    params = [body.sourceId, body.description, body.assignedTo, body.dueDate, body.status];
                }
                const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                if (success) return new Response('Registro creado', { status: 201 });
                return handleError(`Error al crear en ${tableName}`);
            }
            case 'PUT': {
                if (!id) return handleError('Se requiere ID', 400);
                const body = await request.json();
                let stmt, params;
                 if (entity === 'agents') {
                    stmt = 'UPDATE agents SET name=?, email=?, extension=?, status=? WHERE id=?';
                    params = [body.name, body.email, body.extension, body.status, id];
                } // ... añadir lógica PUT para otras entidades
                const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                if (success) return new Response('Registro actualizado');
                return handleError(`Error al actualizar en ${tableName}`);
            }
            case 'DELETE': {
                if (!id) return handleError('Se requiere ID', 400);
                const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id=?`).bind(id).run();
                if (success) return new Response(null, { status: 204 });
                return handleError(`Error al eliminar de ${tableName}`);
            }
        }
    } catch (e) {
        console.error(`Error en D1 para ${tableName}:`, e);
        return handleError('Error interno del servidor');
    }
}

// --- MANEJADOR PRINCIPAL ---
export async function handleCallCenterRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/call-center/initial-data') {
        try {
            const settingsPromise = getSettings(env);
            const agentsPromise = env.suite_empresarial.prepare('SELECT * FROM agents').all();
            const contactsPromise = env.suite_empresarial.prepare('SELECT * FROM call_center_contacts').all();
            const callsPromise = env.suite_empresarial.prepare('SELECT * FROM calls').all();
            const tasksPromise = env.suite_empresarial.prepare('SELECT * FROM tasks').all();
            
            const [settings, { results: agents }, { results: contacts }, { results: calls }, { results: tasks }] = await Promise.all([
                settingsPromise, agentsPromise, contactsPromise, callsPromise, tasksPromise
            ]);

            return handleJsonResponse({ settings, agents, contacts, calls, tasks });
        } catch(e) {
            console.error("Error en agregador de Call Center:", e);
            return handleError("Error al recolectar datos iniciales");
        }
    }

    if (pathname.startsWith('/api/call-center/settings')) {
        return updateSettings(request, env);
    }
    const entityMatch = pathname.match(/^\/api\/call-center\/(agents|contacts|calls|tasks)/);
    if (entityMatch) {
        const entity = entityMatch[1];
        return handleD1Crud(request, env, entity);
    }

    return handleError('Ruta no encontrada en Call Center', 404);
}