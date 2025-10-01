// src/rrhhHandler.js

async function handleJsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleError(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), { status });
}

// --- MANEJADOR PRINCIPAL DE RECURSOS HUMANOS ---
export async function handleRrhhRequest(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    // Esperamos rutas como /api/rrhh/employees o /api/rrhh/employees/123
    const parts = pathname.split('/');
    const id = parts.length === 5 ? parts[4] : null;

    try {
        switch (method) {
            case 'GET': {
                if (id) {
                    const { results } = await env.suite_empresarial.prepare('SELECT * FROM employees WHERE id = ?').bind(id).all();
                    const employee = results[0];
                    if (employee) {
                        // Deserializar los campos JSON
                        employee.documents = JSON.parse(employee.documents || '[]');
                        employee.leaves = JSON.parse(employee.leaves || '[]');
                        return handleJsonResponse(employee);
                    }
                    return handleError('Empleado no encontrado', 404);
                } else {
                    const { results } = await env.suite_empresarial.prepare('SELECT * FROM employees').all();
                    // Deserializar para toda la lista
                    const employees = results.map(emp => ({
                        ...emp,
                        documents: JSON.parse(emp.documents || '[]'),
                        leaves: JSON.parse(emp.leaves || '[]')
                    }));
                    return handleJsonResponse(employees);
                }
            }

            case 'POST': { // Crear nuevo empleado
                const body = await request.json();
                const { name, idNumber, position, department, baseSalary, contractType, contractStart, status } = body;
                
                // Los documentos y ausencias inician como arrays vacíos
                const documentsJson = JSON.stringify([]);
                const leavesJson = JSON.stringify([]);

                const stmt = 'INSERT INTO employees (name, idNumber, position, department, baseSalary, contractType, contractStart, status, documents, leaves) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                const { success } = await env.suite_empresarial.prepare(stmt).bind(
                    name, idNumber, position, department, baseSalary, contractType, contractStart, status, documentsJson, leavesJson
                ).run();

                if (success) return new Response('Empleado creado', { status: 201 });
                return handleError('No se pudo crear el empleado', 500);
            }

            case 'PUT': { // Actualizar empleado (incluyendo documentos/ausencias)
                if (!id) return handleError('Se requiere ID de empleado para actualizar', 400);
                const body = await request.json();
                
                // Serializar los arrays de documentos y ausencias
                const documentsJson = JSON.stringify(body.documents || []);
                const leavesJson = JSON.stringify(body.leaves || []);

                const stmt = `UPDATE employees SET 
                    name = ?, idNumber = ?, position = ?, department = ?, 
                    baseSalary = ?, contractType = ?, contractStart = ?, 
                    status = ?, documents = ?, leaves = ? 
                    WHERE id = ?`;
                
                const { success } = await env.suite_empresarial.prepare(stmt).bind(
                    body.name, body.idNumber, body.position, body.department,
                    body.baseSalary, body.contractType, body.contractStart,
                    body.status, documentsJson, leavesJson, id
                ).run();

                if (success) return new Response('Empleado actualizado', { status: 200 });
                return handleError('No se pudo actualizar el empleado', 500);
            }

            case 'DELETE': {
                if (!id) return handleError('Se requiere ID de empleado para eliminar', 400);
                const { success } = await env.suite_empresarial.prepare('DELETE FROM employees WHERE id = ?').bind(id).run();
                if (success) return new Response(null, { status: 204 });
                return handleError('No se pudo eliminar el empleado', 500);
            }

            default:
                return handleError('Método no permitido', 405);
        }

    } catch (e) {
        console.error("Error en el manejador de RRHH:", e);
        return handleError('Error interno del servidor', 500);
    }
}