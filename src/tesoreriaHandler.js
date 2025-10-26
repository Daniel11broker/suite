/**
 * tesoreriaHandler.js
 * * Contiene toda la lógica del backend para el módulo de Tesorería.
 * Interactúa con las tablas `accounts` y `manual_transactions`.
 */

// --- LÓGICA PARA CUENTAS BANCARIAS (ACCOUNTS) ---

async function getAccounts(env) {
    const { results } = await env.suite_empresarial.prepare("SELECT * FROM accounts").all();
    return Response.json(results || []);
}

async function createAccount(request, env) {
    const account = await request.json();
    // El esquema de `accounts` no tiene `initialBalance` ni `type`.
    // Esos datos se derivan o pertenecen a `manual_transactions`.
    const ps = env.suite_empresarial.prepare(
        "INSERT INTO accounts (name, industry, phone, email) VALUES (?, ?, ?, ?)"
    );
    const { success } = await ps.bind(account.name, account.industry, account.phone, account.email).run();

    if (success) return new Response('Cuenta creada', { status: 201 });
    return new Response('Error al crear la cuenta', { status: 500 });
}

async function updateAccount(request, env, id) {
    const account = await request.json();
    const ps = env.suite_empresarial.prepare(
        "UPDATE accounts SET name = ?, industry = ?, phone = ?, email = ? WHERE id = ?"
    );
    const { success } = await ps.bind(account.name, account.industry, account.phone, account.email, id).run();
    
    if (success) return new Response('Cuenta actualizada', { status: 200 });
    return new Response('Error al actualizar la cuenta', { status: 500 });
}

async function deleteAccount(env, id) {
    // Primero, borra las transacciones asociadas para evitar problemas de clave foránea.
    await env.suite_empresarial.prepare("DELETE FROM manual_transactions WHERE accountId = ?").bind(id).run();
    
    // Luego, borra la cuenta.
    const ps = env.suite_empresarial.prepare("DELETE FROM accounts WHERE id = ?");
    const { success } = await ps.bind(id).run();

    if (success) return new Response('Cuenta eliminada', { status: 204 }); // 204 No Content
    return new Response('Error al eliminar la cuenta', { status: 500 });
}


// --- LÓGICA PARA MOVIMIENTOS MANUALES (MANUAL_TRANSACTIONS) ---

async function getTransactions(env) {
    const { results } = await env.suite_empresarial.prepare("SELECT * FROM manual_transactions").all();
    return Response.json(results || []);
}

async function createTransaction(request, env) {
    const transaction = await request.json();
    const ps = env.suite_empresarial.prepare(
        "INSERT INTO manual_transactions (accountId, date, type, description, amount) VALUES (?, ?, ?, ?, ?)"
    );
    const { success } = await ps.bind(transaction.accountId, transaction.date, transaction.type, transaction.description, transaction.amount).run();

    if (success) return new Response('Movimiento creado', { status: 201 });
    return new Response('Error al crear el movimiento', { status: 500 });
}

async function updateTransaction(request, env, id) {
    const transaction = await request.json();
    const ps = env.suite_empresarial.prepare(
        "UPDATE manual_transactions SET accountId = ?, date = ?, type = ?, description = ?, amount = ? WHERE id = ?"
    );
    const { success } = await ps.bind(transaction.accountId, transaction.date, transaction.type, transaction.description, transaction.amount, id).run();

    if (success) return new Response('Movimiento actualizado', { status: 200 });
    return new Response('Error al actualizar el movimiento', { status: 500 });
}

async function deleteTransaction(env, id) {
    const ps = env.suite_empresarial.prepare("DELETE FROM manual_transactions WHERE id = ?");
    const { success } = await ps.bind(id).run();

    if (success) return new Response('Movimiento eliminado', { status: 204 }); // 204 No Content
    return new Response('Error al eliminar el movimiento', { status: 500 });
}


// --- MANEJADOR PRINCIPAL DE TESORERÍA (ROUTER) ---
export async function handleTesoreriaRequest(request, env) {
    const { pathname } = new URL(request.url);
    const urlParts = pathname.split('/'); // -> ['', 'api', 'accounts', '123']

    // Rutas para Cuentas
    if (urlParts[2] === 'accounts') {
        const id = urlParts[3]; // El ID estaría en la 4ta posición
        if (request.method === 'GET' && !id) return getAccounts(env);
        if (request.method === 'POST' && !id) return createAccount(request, env);
        if (request.method === 'PUT' && id) return updateAccount(request, env, id);
        if (request.method === 'DELETE' && id) return deleteAccount(env, id);
    }
    
    // Rutas para Movimientos
    if (urlParts[2] === 'transactions') {
        const id = urlParts[3];
        if (request.method === 'GET' && !id) return getTransactions(env);
        if (request.method === 'POST' && !id) return createTransaction(request, env);
        if (request.method === 'PUT' && id) return updateTransaction(request, env, id);
        if (request.method === 'DELETE' && id) return deleteTransaction(env, id);
    }

    return new Response('Ruta de API de Tesorería no encontrada', { status: 404 });
}