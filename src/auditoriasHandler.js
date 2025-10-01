// src/auditoriasHandler.js

/**
 * Función genérica para manejar errores y devolver una respuesta JSON.
 */
function handleError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Parsea el cuerpo de la solicitud como JSON.
 */
async function parseJsonBody(request) {
    try {
        return await request.json();
    } catch (e) {
        return null;
    }
}

/**
 * Define la configuración de cada tabla (módulo).
 * Esto ayuda a validar los campos antes de las consultas a la base de datos.
 */
const moduleConfig = {
    audits: {
        table: 'audits',
        columns: ['name', 'scope', 'objectives', 'criteria', 'type', 'auditorLead', 'startDate', 'endDate', 'status']
    },
    findings: {
        table: 'findings',
        columns: ['auditId', 'type', 'description', 'evidence', 'rootCause', 'status']
    },
    actionPlans: {
        table: 'action_plans', // Es común usar snake_case para nombres de tablas
        columns: ['findingId', 'plan', 'responsible', 'dueDate', 'status']
    }
};

/**
 * Manejador genérico para las solicitudes API CRUD.
 */
async function handleApiRequest(request, env, module, id) {
    const config = moduleConfig[module];
    if (!config) {
        return handleError('Módulo no válido.', 400);
    }
    const { table, columns } = config;

    switch (request.method) {
        case 'GET': {
            if (id) {
                const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).all();
                return Response.json(results[0] || null);
            } else {
                const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${table}`).all();
                return Response.json(results);
            }
        }
        case 'POST': {
            const body = await parseJsonBody(request);
            if (!body) return handleError('Cuerpo de la solicitud inválido.', 400);

            const filteredColumns = columns.filter(col => body[col] !== undefined);
            const placeholders = filteredColumns.map(() => '?').join(',');
            const values = filteredColumns.map(col => body[col]);

            const stmt = `INSERT INTO ${table} (${filteredColumns.join(',')}) VALUES (${placeholders}) RETURNING *`;
            const { results } = await env.suite_empresarial.prepare(stmt).bind(...values).all();
            return Response.json(results[0], { status: 201 });
        }
        case 'PUT': {
            if (!id) return handleError('Se requiere un ID para actualizar.', 400);
            const body = await parseJsonBody(request);
            if (!body) return handleError('Cuerpo de la solicitud inválido.', 400);
            
            const filteredColumns = columns.filter(col => body[col] !== undefined);
            const setClauses = filteredColumns.map(col => `${col} = ?`).join(', ');
            const values = filteredColumns.map(col => body[col]);

            const stmt = `UPDATE ${table} SET ${setClauses} WHERE id = ? RETURNING *`;
            const { results } = await env.suite_empresarial.prepare(stmt).bind(...values, id).all();
            return Response.json(results[0]);
        }
        case 'DELETE': {
            if (!id) return handleError('Se requiere un ID para eliminar.', 400);
            await env.suite_empresarial.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
            return new Response(null, { status: 204 }); // No Content
        }
        default:
            return handleError('Método no permitido.', 405);
    }
}

// --- MANEJADOR PRINCIPAL ---
export async function handleAuditoriasRequest(request, env) {
    const { pathname } = new URL(request.url);

    // Endpoint para simular la verificación de sesión de usuario
    // En una aplicación real, esto verificaría un token JWT o una cookie.
    if (pathname === '/api/user/status') {
        // Devolvemos datos de usuario para que el componente los muestre.
        // Cambia esto por tu lógica real de autenticación.
        const mockUser = {
            loggedIn: true,
            username: 'A. Jiménez',
            role: 'Auditor'
        };
        return Response.json(mockUser);
        // Para simular un usuario no logueado, devuelve:
        // return Response.json({ loggedIn: false });
    }
    
    // Expresión regular para capturar el módulo y un posible ID numérico
    const match = pathname.match(/^\/api\/(audits|findings|actionPlans)\/?(\d+)?$/);

    if (match) {
        const [, module, id] = match;
        return handleApiRequest(request, env, module, id);
    }

    return new Response('Ruta no encontrada en la API de Auditorías', { status: 404 });
}