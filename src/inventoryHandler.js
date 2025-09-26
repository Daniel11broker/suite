// src/inventoryHandler.js

/**
 * Extrae el ID de la URL, ej: /api/inventory/123 -> 123
 * @param {string} pathname - La ruta de la URL.
 * @returns {string|null} - El ID encontrado o null.
 */
function getIdFromPath(pathname) {
  const parts = pathname.split('/');
  return parts.length > 3 ? parts[3] : null;
}

/**
 * GET /api/inventory -> Obtiene todos los productos.
 * GET /api/inventory/:id -> Obtiene un producto por su ID.
 */
async function getProducts(request, env) {
  const { pathname } = new URL(request.url);
  const id = getIdFromPath(pathname);
  
  if (id) {
    const ps = env.suite_empresarial.prepare('SELECT * FROM products WHERE id = ?');
    const { results } = await ps.bind(id).all();
    return Response.json(results[0] || null);
  } else {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM products').all();
    return Response.json(results);
  }
}

/**
 * POST /api/inventory -> Crea un nuevo producto.
 */
async function createProduct(request, env) {
  const product = await request.json();
  const ps = env.suite_empresarial.prepare(
    'INSERT INTO products (name, sku, category, description, costPrice, salePrice, quantity, lowStockThreshold, reorderPoint, supplierId, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const { success } = await ps.bind(
    product.name, product.sku, product.category, product.description,
    product.costPrice, product.salePrice, product.quantity,
    product.lowStockThreshold, product.reorderPoint, product.supplierId, product.location
  ).run();

  if (success) {
    return new Response('Producto creado con éxito', { status: 201 });
  }
  return new Response('Error al crear el producto', { status: 500 });
}

/**
 * PUT /api/inventory/:id -> Actualiza un producto existente.
 */
async function updateProduct(request, env) {
  const { pathname } = new URL(request.url);
  const id = getIdFromPath(pathname);
  if (!id) return new Response('ID de producto no especificado', { status: 400 });

  const product = await request.json();
  const ps = env.suite_empresarial.prepare(
    'UPDATE products SET name = ?, sku = ?, category = ?, description = ?, costPrice = ?, salePrice = ?, quantity = ?, lowStockThreshold = ?, reorderPoint = ?, supplierId = ?, location = ? WHERE id = ?'
  );
  const { success } = await ps.bind(
    product.name, product.sku, product.category, product.description,
    product.costPrice, product.salePrice, product.quantity,
    product.lowStockThreshold, product.reorderPoint, product.supplierId, product.location, id
  ).run();
  
  if (success) {
    return new Response('Producto actualizado con éxito');
  }
  return new Response('Error al actualizar el producto', { status: 500 });
}

/**
 * DELETE /api/inventory/:id -> Elimina un producto.
 */
async function deleteProduct(request, env) {
  const { pathname } = new URL(request.url);
  const id = getIdFromPath(pathname);
  if (!id) return new Response('ID de producto no especificado', { status: 400 });

  const { success } = await env.suite_empresarial.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  if (success) {
    return new Response('Producto eliminado');
  }
  return new Response('Error al eliminar el producto', { status: 500 });
}


// --- MANEJADOR PRINCIPAL DE INVENTARIO ---
export async function handleInventoryRequest(request, env) {
  switch (request.method) {
    case 'GET':
      return getProducts(request, env);
    case 'POST':
      return createProduct(request, env);
    case 'PUT':
      return updateProduct(request, env);
    case 'DELETE':
      return deleteProduct(request, env);
    default:
      return new Response('Método no permitido', { status: 405 });
  }
}