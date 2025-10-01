// src/nominaHandler.js

async function getPayrollSettings(env) {
    const settings = await env.SUITE_CONFIG.get('payroll_settings', 'json');
    return settings || {};
}

async function updatePayrollSettings(request, env) {
    try {
        const settings = await request.json();
        await env.SUITE_CONFIG.put('payroll_settings', JSON.stringify(settings));
        return new Response('Configuración de nómina actualizada', { status: 200 });
    } catch (e) {
        return new Response('Error al procesar la solicitud', { status: 400 });
    }
}

async function handleD1Request(request, env, table) {
    const { method } = request;
    const { pathname } = new URL(request.url);
    const id = pathname.split('/').pop();
    const tableName = table === 'novelties' ? 'payroll_novelties' : 'payroll_history';

    try {
        switch (method) {
            case 'GET': {
                const { results } = await env.suite_empresarial.prepare(`SELECT * FROM ${tableName}`).all();
                if (tableName === 'payroll_history') {
                    const history = results.map(h => ({ ...h, records: JSON.parse(h.records || '[]') }));
                    return Response.json(history);
                }
                return Response.json(results);
            }
            case 'POST': {
                const body = await request.json();
                if (tableName === 'payroll_history') {
                    const recordsJson = JSON.stringify(body.records || []);
                    const { success } = await env.suite_empresarial.prepare('INSERT INTO payroll_history (period, records) VALUES (?, ?)')
                        .bind(body.period, recordsJson).run();
                    if (success) return new Response('Historial guardado', { status: 201 });
                } else if (tableName === 'payroll_novelties') {
                    const { period, employeeId, type, addsToIBC, concept, value } = body;
                    const { success } = await env.suite_empresarial.prepare('INSERT INTO payroll_novelties (period, employeeId, type, addsToIBC, concept, value) VALUES (?, ?, ?, ?, ?, ?)')
                        .bind(period, employeeId, type, addsToIBC, concept, value).run();
                    if (success) return new Response('Novedad creada', { status: 201 });
                }
                return new Response(`Error al guardar en ${tableName}`, { status: 500 });
            }
            case 'PUT': {
                if (tableName === 'payroll_novelties') {
                    const body = await request.json();
                    const { period, employeeId, type, addsToIBC, concept, value } = body;
                    const { success } = await env.suite_empresarial.prepare('UPDATE payroll_novelties SET period=?, employeeId=?, type=?, addsToIBC=?, concept=?, value=? WHERE id=?')
                        .bind(period, employeeId, type, addsToIBC, concept, value, id).run();
                    if (success) return new Response('Novedad actualizada');
                }
                return new Response('Método no permitido para esta tabla', { status: 405 });
            }
            case 'DELETE': {
                if (tableName === 'payroll_novelties') {
                    const { success } = await env.suite_empresarial.prepare('DELETE FROM payroll_novelties WHERE id = ?').bind(id).run();
                    if (success) return new Response(null, { status: 204 });
                }
                return new Response('Método no permitido para esta tabla', { status: 405 });
            }
        }
    } catch (e) {
        console.error(`Error en D1 para tabla ${tableName}:`, e);
        return new Response('Error interno del servidor', { status: 500 });
    }
}

// --- MANEJADOR PRINCIPAL DE NÓMINA ---
export async function handleNominaRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/nomina/initial-data' && request.method === 'GET') {
        try {
            const settingsPromise = getPayrollSettings(env);
            const noveltiesPromise = env.suite_empresarial.prepare('SELECT * FROM payroll_novelties').all();
            const historyPromise = env.suite_empresarial.prepare('SELECT * FROM payroll_history').all();
            // AÑADIDO: Obtenemos también los empleados de la tabla de RRHH
            const employeesPromise = env.suite_empresarial.prepare('SELECT * FROM employees').all();

            const [settings, { results: novelties }, { results: historyRaw }, { results: employeesRaw }] = await Promise.all([
                settingsPromise,
                noveltiesPromise,
                historyPromise,
                employeesPromise // AÑADIDO
            ]);
            
            const payrollHistory = historyRaw.map(h => ({ ...h, records: JSON.parse(h.records || '[]') }));
            // AÑADIDO: Deserializamos los campos JSON de cada empleado
            const employees = employeesRaw.map(emp => ({
                ...emp,
                documents: JSON.parse(emp.documents || '[]'),
                leaves: JSON.parse(emp.leaves || '[]')
            }));

            // AÑADIDO: Incluimos los empleados en la respuesta
            return Response.json({
                settings,
                novelties: novelties || [],
                payrollHistory: payrollHistory || [],
                employees: employees || [] 
            });

        } catch (e) {
            console.error("Error en el agregador de datos de nómina:", e);
            return new Response('Error al recolectar los datos iniciales', { status: 500 });
        }
    }

    if (pathname.startsWith('/api/nomina/settings')) {
        if (request.method === 'POST') return updatePayrollSettings(request, env);
    }
    if (pathname.startsWith('/api/nomina/history')) {
        if (request.method === 'POST') return handleD1Request(request, env, 'history');
    }
    if (pathname.startsWith('/api/nomina/novelties')) {
        return handleD1Request(request, env, 'novelties');
    }

    return new Response('Ruta no encontrada en el manejador de Nómina', { status: 404 });
}