// src/comprasHandler.js

function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts.length > 3 ? parts[3] : null;
}

// --- LÓGICA PARA PROVEEDORES ---
async function getSuppliers(request, env) {
  const { results } = await env.suite_empresarial.prepare('SELECT * FROM suppliers').all();
  return Response.json(results);
}

// --- LÓGICA PARA ÓRDENES DE COMPRA ---
async function getPurchaseOrders(request, env) {
  const { results } = await env.suite_empresarial.prepare('SELECT * FROM purchase_orders').all();
  return Response.json(results);
}

// --- LÓGICA PARA FACTURAS DE PROVEEDOR (BILLS) ---
async function getBills(request, env) {
  const { results } = await env.suite_empresarial.prepare('SELECT * FROM bills').all();
  return Response.json(results);
}

// --- MANEJADOR PRINCIPAL DE COMPRAS ---
export async function handleComprasRequest(request, env) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith('/api/suppliers')) {
    if (request.method === 'GET') return getSuppliers(request, env);
    // Aquí irían POST, PUT, DELETE para proveedores
  }

  if (pathname.startsWith('/api/purchase-orders')) {
    if (request.method === 'GET') return getPurchaseOrders(request, env);
    // Aquí irían POST, PUT, DELETE para órdenes de compra
  }

  if (pathname.startsWith('/api/bills')) {
    if (request.method === 'GET') return getBills(request, env);
    // Aquí irían POST, PUT, DELETE para facturas de proveedor
  }

  return new Response('Ruta no encontrada en Compras', { status: 404 });
}