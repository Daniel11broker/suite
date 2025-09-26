// src/crmHandler.js

function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts.length > 3 ? parts[3] : null;
}

// --- LÓGICA PARA CUENTAS (ACCOUNTS) ---
async function getAccounts(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM accounts').all();
    return Response.json(results);
}

// --- LÓGICA PARA PROSPECTOS (LEADS) ---
async function getLeads(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM leads').all();
    return Response.json(results);
}

async function createLead(request, env) {
    const lead = await request.json();
    const ps = env.suite_empresarial.prepare('INSERT INTO leads (name, company, email, phone, source, status) VALUES (?, ?, ?, ?, ?, ?)');
    const { success } = await ps.bind(lead.name, lead.company, lead.email, lead.phone, lead.source, 'Nuevo').run();
    if (success) return new Response('Prospecto creado', { status: 201 });
    return new Response('Error al crear prospecto', { status: 500 });
}

// --- LÓGICA PARA OPORTUNIDADES ---
async function getOpportunities(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM opportunities').all();
    return Response.json(results);
}

// --- MANEJADOR PRINCIPAL DE CRM ---
export async function handleCrmRequest(request, env) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith('/api/accounts')) {
    if (request.method === 'GET') return getAccounts(request, env);
    // Lógica para POST, PUT, DELETE de Cuentas
  }
  
  if (pathname.startsWith('/api/leads')) {
    if (request.method === 'GET') return getLeads(request, env);
    if (request.method === 'POST') return createLead(request, env);
    // Lógica para PUT, DELETE de Prospectos
  }

  if (pathname.startsWith('/api/opportunities')) {
    if (request.method === 'GET') return getOpportunities(request, env);
    // Lógica para POST, PUT, DELETE de Oportunidades
  }

  return new Response('Ruta no encontrada en CRM', { status: 404 });
}