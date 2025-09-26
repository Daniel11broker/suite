// src/tesoreriaHandler.js

// --- LÓGICA PARA CUENTAS BANCARIAS ---
async function getAccounts(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM accounts').all();
    return Response.json(results);
}

async function createAccount(request, env) {
    const account = await request.json();
    const ps = env.suite_empresarial.prepare('INSERT INTO accounts (name, bank, type, initialBalance, currentBalance) VALUES (?, ?, ?, ?, ?)');
    const { success } = await ps.bind(account.name, account.bank, account.type, account.initialBalance, account.initialBalance).run();
    if (success) return new Response('Cuenta creada', { status: 201 });
    return new Response('Error al crear cuenta', { status: 500 });
}

// --- LÓGICA PARA MOVIMIENTOS MANUALES ---
async function getTransactions(request, env) {
    const { results } = await env.suite_empresarial.prepare('SELECT * FROM manual_transactions').all();
    return Response.json(results);
}

// --- MANEJADOR PRINCIPAL DE TESORERÍA ---
export async function handleTesoreriaRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/accounts')) {
        if (request.method === 'GET') return getAccounts(request, env);
        if (request.method === 'POST') return createAccount(request, env);
    }
    
    if (pathname.startsWith('/api/transactions')) {
        if (request.method === 'GET') return getTransactions(request, env);
        // ... Lógica para POST, PUT, DELETE
    }

    return new Response('Ruta no encontrada en Tesorería', { status: 404 });
}