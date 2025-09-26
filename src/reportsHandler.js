// src/reportsHandler.js

export async function handleReportsRequest(request, env) {
    try {
        // 1. Obtener datos de todas las fuentes relevantes
        const [
            invoicesRes, billsRes, payrollRes, inventoryRes, 
            employeesRes, accountsRes, debtorsRes, opportunitiesRes
        ] = await Promise.all([
            env.suite_empresarial.prepare("SELECT total, status, issueDate FROM invoices").all(),
            env.suite_empresarial.prepare("SELECT total, status, date FROM bills").all(),
            env.suite_empresarial.prepare("SELECT records FROM payroll_history").all(),
            env.suite_empresarial.prepare("SELECT costPrice, quantity FROM products").all(),
            env.suite_empresarial.prepare("SELECT status FROM employees").all(),
            env.suite_empresarial.prepare("SELECT currentBalance FROM accounts").all(),
            env.suite_empresarial.prepare("SELECT balance FROM debtors").all(),
            env.suite_empresarial.prepare("SELECT value, stage FROM opportunities").all()
        ]);

        const invoices = invoicesRes.results;
        const bills = billsRes.results;
        const payrollHistory = payrollRes.results.map(p => JSON.parse(p.records)); // Deserializar
        const inventory = inventoryRes.results;
        const employees = employeesRes.results;
        const accounts = accountsRes.results;
        const debtors = debtorsRes.results;
        const opportunities = opportunitiesRes.results;

        // 2. Calcular Métricas (Lógica similar a tu reports.js)
        const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const supplierExpenses = bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
        const payrollExpenses = payrollHistory.flat().reduce((sum, rec) => sum + (rec.totalCompanyCost || 0), 0);
        const netProfit = totalRevenue - (supplierExpenses + payrollExpenses);

        const totalCash = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const pipelineValue = opportunities.filter(o => !o.stage.startsWith('Cerrada')).reduce((sum, o) => sum + (o.value || 0), 0);
        const accountsReceivable = debtors.reduce((sum, d) => sum + (d.balance || 0), 0);
        const accountsPayable = bills.filter(b => b.status !== 'Pagada').reduce((sum, b) => sum + (b.total || 0), 0); // Asumiendo que hay 'balance'
        const inventoryValue = inventory.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantity || 0)), 0);
        const employeeCount = employees.filter(e => e.status === 'Activo').length;

        // 3. Devolver el objeto de métricas
        const metrics = {
            netProfit,
            totalCash,
            pipelineValue,
            accountsReceivable,
            accountsPayable,
            inventoryValue,
            employeeCount,
            payrollCost: payrollExpenses
        };

        return Response.json(metrics);

    } catch (error) {
        console.error("Error al generar el reporte:", error);
        return new Response('Error interno del servidor al generar el reporte', { status: 500 });
    }
}