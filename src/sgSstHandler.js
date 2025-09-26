// src/sgSstHandler.js

/**
 * Función genérica para obtener registros de cualquier tabla de SG-SST.
 */
async function getSstRecords(request, env, tableName) {
    const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName}`).all();
    return Response.json(results);
}

/**
 * Función genérica para eliminar un registro de cualquier tabla de SG-SST.
 */
async function deleteSstRecord(request, env, tableName) {
    const { pathname } = new URL(request.url);
    const parts = pathname.split('/');
    const id = parts[parts.length - 1];

    if (!id) return new Response('ID no especificado', { status: 400 });

    const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();
    if (success) return new Response('Registro eliminado');
    return new Response('Error al eliminar', { status: 500 });
}

// --- MANEJADOR PRINCIPAL DE SG-SST ---
export async function handleSstRequest(request, env) {
    const { pathname } = new URL(request.url);
    let tableName;

    // Determina la tabla basado en la ruta de la API
    if (pathname.startsWith('/api/sst/risks')) tableName = 'risks';
    else if (pathname.startsWith('/api/sst/incidents')) tableName = 'incidents';
    else if (pathname.startsWith('/api/sst/action-plans')) tableName = 'action_plans';
    else if (pathname.startsWith('/api/sst/trainings')) tableName = 'trainings';
    else if (pathname.startsWith('/api/sst/medical-exams')) tableName = 'medical_exams';
    else if (pathname.startsWith('/api/sst/inspections')) tableName = 'inspections';
    else if (pathname.startsWith('/api/sst/annual-plan')) tableName = 'annual_plan';
    else return new Response('Ruta de SG-SST no encontrada', { status: 404 });

    switch (request.method) {
        case 'GET':
            return getSstRecords(request, env, tableName);
        case 'DELETE':
            return deleteSstRecord(request, env, tableName);
        // Aquí se añadiría la lógica para POST (crear) y PUT (actualizar) para cada tabla.
        // Por ejemplo, para crear un nuevo riesgo:
        case 'POST':
            if (tableName === 'risks') {
                const risk = await request.json();
                const ps = env.suite_empresarial.prepare(
                    'INSERT INTO risks (process, task, classification, riskLevel, riskInterpretation, controls) VALUES (?, ?, ?, ?, ?, ?)'
                );
                const { success } = await ps.bind(risk.process, risk.task, risk.classification, risk.riskLevel, risk.riskInterpretation, risk.controls).run();
                if (success) return new Response('Riesgo creado', { status: 201 });
                return new Response('Error al crear riesgo', { status: 500 });
            }
            break;
    }

    return new Response(`Método ${request.method} no implementado para ${tableName}`, { status: 405 });
}