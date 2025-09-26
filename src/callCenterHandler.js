// src/callCenterHandler.js

function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts.length > 3 ? parts[3] : null;
}

// --- LÓGICA PARA AGENTES, CONTACTOS, LLAMADAS Y TAREAS ---

async function handleGenericGet(request, env, tableName) {
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

async function handleGenericDelete(request, env, tableName) {
    const { pathname } = new URL(request.url);
    const id = getIdFromPath(pathname);
    if (!id) return new Response('ID no especificado', { status: 400 });
    const { success } = await env.suite_empresarial.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();
    if (success) return new Response('Registro eliminado');
    return new Response('Error al eliminar', { status: 500 });
}


// --- MANEJADOR PRINCIPAL DEL CALL CENTER ---
export async function handleCallCenterRequest(request, env) {
  const { pathname } = new URL(request.url);
  const method = request.method;

  let tableName;
  if (pathname.startsWith('/api/agents')) tableName = 'agents';
  else if (pathname.startsWith('/api/contacts')) tableName = 'contacts'; // Podría ser una tabla compartida
  else if (pathname.startsWith('/api/calls')) tableName = 'calls';
  else if (pathname.startsWith('/api/tasks')) tableName = 'tasks';
  else return new Response('Ruta no encontrada en Call Center', { status: 404 });

  switch (method) {
    case 'GET':
      return handleGenericGet(request, env, tableName);
    // Aquí se añadirían los casos para POST, PUT, etc. para cada tabla.
    // Ejemplo para crear un agente:
    case 'POST':
       if (tableName === 'agents') {
           const agent = await request.json();
           const { success } = await env.suite_empresarial.prepare('INSERT INTO agents (name, email, extension, status) VALUES (?, ?, ?, ?)')
               .bind(agent.name, agent.email, agent.extension, agent.status).run();
           if (success) return new Response('Agente creado', { status: 201 });
           return new Response('Error al crear agente', { status: 500 });
       }
       break; // Añadir lógica para otras tablas si es necesario
    case 'DELETE':
        return handleGenericDelete(request, env, tableName);
    default:
      return new Response('Método no permitido', { status: 405 });
  }

  return new Response(`Método ${method} no implementado para ${tableName}`, { status: 405 });
}