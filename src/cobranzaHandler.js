// src/cobranzaHandler.js

function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts.length > 3 ? parts[3] : null;
}

// --- LÓGICA PARA CLIENTES ---

async function getClients(request, env) {
  const { pathname } = new URL(request.url);
  const id = getIdFromPath(pathname);
  if (id) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM clients WHERE id = ?').bind(id).all();
    return Response.json(results[0] || null);
  } else {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM clients').all();
    return Response.json(results);
  }
}

async function createClient(request, env) {
  const client = await request.json();
  const { success } = await env.suite_empresarial.prepare('INSERT INTO clients (name, idNumber) VALUES (?, ?)')
    .bind(client.name, client.idNumber).run();
  if (success) return new Response('Cliente creado', { status: 201 });
  return new Response('Error al crear cliente', { status: 500 });
}


// --- LÓGICA PARA DEUDORES (CUENTAS POR COBRAR) ---

async function getDebtors(request, env) {
  const { pathname } = new URL(request.url);
  const id = getIdFromPath(pathname);
  if (id) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM debtors WHERE id = ?').bind(id).all();
    return Response.json(results[0] || null);
  } else {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM debtors').all();
    return Response.json(results);
  }
}

async function createDebtor(request, env) {
    const debtor = await request.json();
    const ps = env.suite_empresarial.prepare(
        'INSERT INTO debtors (clientId, documentType, invoiceNumber, totalWithIVA, balance, dueDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const { success } = await ps.bind(debtor.clientId, debtor.documentType, debtor.invoiceNumber, debtor.totalWithIVA, debtor.balance, debtor.dueDate, debtor.status).run();
    if (success) return new Response('Deudor creado', { status: 201 });
    return new Response('Error al crear deudor', { status: 500 });
}

async function updateDebtor(request, env) {
    const { pathname } = new URL(request.url);
    const id = getIdFromPath(pathname);
    if (!id) return new Response('ID no especificado', { status: 400 });

    const debtor = await request.json();
    const ps = env.suite_empresarial.prepare(
        'UPDATE debtors SET clientId = ?, documentType = ?, invoiceNumber = ?, totalWithIVA = ?, balance = ?, dueDate = ?, status = ? WHERE id = ?'
    );
    const { success } = await ps.bind(debtor.clientId, debtor.documentType, debtor.invoiceNumber, debtor.totalWithIVA, debtor.balance, debtor.dueDate, debtor.status, id).run();
    if (success) return new Response('Deudor actualizado');
    return new Response('Error al actualizar', { status: 500 });
}

async function deleteDebtor(request, env) {
    const { pathname } = new URL(request.url);
    const id = getIdFromPath(pathname);
    if (!id) return new Response('ID no especificado', { status: 400 });
    const { success } = await env.suite_empresarial.prepare('DELETE FROM debtors WHERE id = ?').bind(id).run();
    if (success) return new Response('Deudor eliminado');
    return new Response('Error al eliminar', { status: 500 });
}

// --- MANEJADOR PRINCIPAL DE COBRANZA ---
export async function handleCobranzaRequest(request, env) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith('/api/clients')) {
      if (request.method === 'GET') return getClients(request, env);
      if (request.method === 'POST') return createClient(request, env);
  }

  if (pathname.startsWith('/api/debtors')) {
      if (request.method === 'GET') return getDebtors(request, env);
      if (request.method === 'POST') return createDebtor(request, env);
      if (request.method === 'PUT') return updateDebtor(request, env);
      if (request.method === 'DELETE') return deleteDebtor(request, env);
  }
  
  return new Response('Ruta no encontrada en Cobranza', { status: 404 });
}