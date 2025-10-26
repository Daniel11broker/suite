// src/sgSstHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function handleError(message, status = 500) {
    return handleJsonResponse({ error: message }, status);
}

const tableMap = {
    annualPlan: 'annual_plan',
    risks: 'risks',
    incidents: 'incidents',
    actionPlans: 'sst_action_plans',
    trainings: 'trainings',
    medicalExams: 'medical_exams',
    inspections: 'inspections'
};

// --- MANEJADOR PRINCIPAL DE SG-SST ---
export async function handleSstRequest(request, env) {
    const { pathname } = new URL(request.url);
    const { method } = request;

    if (pathname === '/api/sg-sst/initial-data') {
        try {
            const promises = Object.values(tableMap).map(table => env.suite_empresarial.prepare(`SELECT * FROM ${table}`).all());
            promises.push(env.suite_empresarial.prepare('SELECT * FROM employees').all());
            
            const results = await Promise.all(promises);
            const [annualPlan, risks, incidents, actionPlans, trainings, medicalExams, inspections, { results: employees }] = results.map(r => r.results);

            return handleJsonResponse({ annualPlan, risks, incidents, actionPlans, trainings, medicalExams, inspections, employees });
        } catch (e) {
            console.error("Error en agregador de SG-SST:", e.message);
            return handleError("Error al recolectar datos iniciales. Asegúrate de que todas las tablas SG-SST existen.");
        }
    }

    const entityMatch = pathname.match(/^\/api\/sg-sst\/(annualPlan|risks|incidents|actionPlans|trainings|medicalExams|inspections)/);
    if (entityMatch) {
        const entity = entityMatch[1];
        const tableName = tableMap[entity];
        const id = pathname.split('/')[4];
        if (!tableName) return handleError('Entidad no válida', 400);

        try {
            switch(method) {
                case 'POST':
                case 'PUT': {
                    const body = await request.json();
                    const keys = Object.keys(body).filter(k => k !== 'id');
                    let stmt, params;

                    if (method === 'POST') {
                        stmt = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`;
                        params = keys.map(k => body[k]);
                    } else { // PUT
                        if (!id) return handleError('Se requiere ID para actualizar');
                        stmt = `UPDATE ${tableName} SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`;
                        params = [...keys.map(k => body[k]), id];
                    }
                    const { success } = await env.suite_empresarial.prepare(stmt).bind(...params).run();
                    if(success) return new Response(method === 'POST' ? 'Creado' : 'Actualizado', {status: method === 'POST' ? 201: 200});
                    return handleError('Error en la operación');
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

    return handleError('Ruta no encontrada en SG-SST', 404);
}