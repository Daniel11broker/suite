// src/nominaHandler.js

// --- LÓGICA PARA CONFIGURACIÓN DE NÓMINA (usando KV) ---
async function getPayrollSettings(env) {
    const settings = await env.SUITE_CONFIG.get('payroll_settings', 'json');
    if (settings) {
        return Response.json(settings);
    }
    // Devolver configuración por defecto si no existe
    return Response.json({ salarioMinimo: 1300000, auxTransporte: 162000, /* ...otros valores */ });
}

async function updatePayrollSettings(request, env) {
    const settings = await request.json();
    await env.SUITE_CONFIG.put('payroll_settings', JSON.stringify(settings));
    return new Response('Configuración de nómina actualizada');
}

// --- LÓGICA PARA HISTORIAL Y NOVEDADES (usando D1) ---
async function getPayrollHistory(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM payroll_history').all();
    // Los 'records' se guardan como texto JSON, hay que parsearlos al enviar.
    const history = results.map(h => ({ ...h, records: JSON.parse(h.records) }));
    return Response.json(history);
}

async function savePayrollHistory(request, env) {
    const payrollRun = await request.json();
    const recordsJson = JSON.stringify(payrollRun.records); // Serializar los registros
    const ps = env.suite_empresarial.prepare('INSERT INTO payroll_history (period, records) VALUES (?, ?)');
    const { success } = await ps.bind(payrollRun.period, recordsJson).run();
    if (success) return new Response('Historial de nómina guardado', { status: 201 });
    return new Response('Error al guardar el historial', { status: 500 });
}


// --- MANEJADOR PRINCIPAL DE NÓMINA ---
export async function handleNominaRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/payroll/settings')) {
        if (request.method === 'GET') return getPayrollSettings(env);
        if (request.method === 'POST') return updatePayrollSettings(request, env);
    }

    if (pathname.startsWith('/api/payroll/history')) {
        if (request.method === 'GET') return getPayrollHistory(request, env);
        if (request.method === 'POST') return savePayrollHistory(request, env);
    }
    
    // Aquí irían las rutas para las novedades (novelties)

    return new Response('Ruta no encontrada en Nómina', { status: 404 });
}