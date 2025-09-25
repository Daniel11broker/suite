document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica del menú lateral y tema ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (window.innerWidth >= 768) {
        sidebar.addEventListener('mouseenter', () => sidebar.classList.add('expanded'));
        sidebar.addEventListener('mouseleave', () => sidebar.classList.remove('expanded'));
    }
    mobileMenuButton.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('expanded'); });
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && sidebar.classList.contains('expanded') && !sidebar.contains(e.target)) {
            sidebar.classList.remove('expanded');
        }
    });

    // --- Selectores DOM y Estado Global ---
    const dom = {
        themeToggle: document.getElementById('theme-toggle'),
        periodFilter: document.getElementById('period-filter'),
        kpi: {
            netProfit: document.getElementById('kpi-net-profit'),
            totalCash: document.getElementById('kpi-total-cash'),
            pipelineValue: document.getElementById('kpi-pipeline-value'),
            accountsReceivable: document.getElementById('kpi-accounts-receivable'),
            accountsPayable: document.getElementById('kpi-accounts-payable'),
            inventoryValue: document.getElementById('kpi-inventory-value'),
            employeeCount: document.getElementById('kpi-employee-count'),
            payrollCost: document.getElementById('kpi-payroll-cost'),
        },
        charts: {
            monthlyPnl: document.getElementById('monthly-pnl-chart')?.getContext('2d'),
            assetsLiabilities: document.getElementById('assets-liabilities-chart')?.getContext('2d'),
            revenuePayroll: document.getElementById('revenue-payroll-chart')?.getContext('2d'),
        },
        tables: {
            topClientsContainer: document.getElementById('top-clients-table-container'),
        },
        summary: {
            financialHealth: document.getElementById('financial-health-summary'),
        }
    };
    
    let allData = {};
    let charts = {};

    // --- Carga de Datos ---
    const loadAllData = () => {
        allData = {
            invoices: (JSON.parse(localStorage.getItem('documentos_data_v3')) || { invoices: [] }).invoices,
            bills: (JSON.parse(localStorage.getItem('compras_data_v1')) || { bills: [] }).bills,
            payrollHistory: (JSON.parse(localStorage.getItem('nomina_data_v2')) || { payrollHistory: [] }).payrollHistory,
            inventory: JSON.parse(localStorage.getItem('inventory')) || [],
            employees: (JSON.parse(localStorage.getItem('sgsst_data_v5')) || { employees: [] }).employees,
            accounts: (JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [] }).accounts,
            manualTransactions: (JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { manualTransactions: [] }).manualTransactions,
            debtors: JSON.parse(localStorage.getItem('debtors')) || [],
            opportunities: (JSON.parse(localStorage.getItem('crm_data_v1')) || { opportunities: [] }).opportunities,
        };
    };

    // --- Utilidades ---
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    const getDateRange = () => {
        const filter = dom.periodFilter.value;
        const today = new Date();
        let startDate;
        switch (filter) {
            case 'last_3_months': startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1); break;
            case 'this_year': startDate = new Date(today.getFullYear(), 0, 1); break;
            default: startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        return { startDate, endDate: new Date() };
    };

    // --- Lógica de Métricas y Renderizado ---
    const calculateMetrics = () => {
        const { startDate, endDate } = getDateRange();
        
        const filteredInvoices = (allData.invoices || []).filter(inv => {
            const issueDate = new Date(inv.issueDate);
            return inv.status !== 'Borrador' && issueDate >= startDate && issueDate <= endDate;
        });
        let totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

        const filteredBills = (allData.bills || []).filter(bill => { const billDate = new Date(bill.date); return billDate >= startDate && billDate <= endDate; });
        let supplierExpenses = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
        
        const filteredPayrolls = (allData.payrollHistory || []).filter(p => { const periodDate = new Date(p.period + '-02'); return periodDate >= startDate && periodDate <= endDate; });
        const payrollExpenses = filteredPayrolls.reduce((sum, p) => sum + p.records.reduce((s, r) => s + r.totalCompanyCost, 0), 0);
        
        (allData.manualTransactions || []).forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= startDate && tDate <= endDate) {
                if (t.type === 'inflow') totalRevenue += parseFloat(t.amount);
                else supplierExpenses += parseFloat(t.amount);
            }
        });

        const totalExpenses = supplierExpenses + payrollExpenses;
        const netProfit = totalRevenue - totalExpenses;

        const totalCash = (allData.accounts || []).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const pipelineValue = (allData.opportunities || []).filter(o => !o.stage.startsWith('Cerrada')).reduce((sum, o) => sum + (o.value || 0), 0);
        const accountsReceivable = (allData.debtors || []).reduce((sum, d) => sum + (d.balance || 0), 0);
        const accountsPayable = (allData.bills || []).filter(b => b.status !== 'Pagada').reduce((sum, b) => sum + (b.balance || 0), 0);
        const inventoryValue = (allData.inventory || []).reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantity || 0)), 0);
        const employeeCount = (allData.employees || []).filter(e => e.status === 'Activo').length;
        
        // CORRECCIÓN: Se usa la clave 'payrollCost' para que coincida con el KPI
        return { netProfit, totalCash, pipelineValue, accountsReceivable, accountsPayable, inventoryValue, employeeCount, payrollCost: payrollExpenses, filteredInvoices };
    };

    const renderDashboard = () => {
        const metrics = calculateMetrics();
        Object.keys(dom.kpi).forEach(key => {
            if (dom.kpi[key]) {
                 dom.kpi[key].textContent = metrics[key] !== undefined ? (['employeeCount'].includes(key) ? metrics[key] : formatCurrency(metrics[key])) : 'N/A';
            }
        });
        dom.kpi.netProfit.className = `text-4xl font-bold mt-2 ${metrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`;
        
        renderFinancialHealthSummary(metrics);
        renderPnlChart();
        renderAssetsLiabilitiesChart(metrics);
        renderClientAnalysisTable(metrics.filteredInvoices);
        renderRevenuePayrollChart();
    };

    const renderFinancialHealthSummary = (metrics) => {
        let summaryHTML = `<h3 class="text-lg font-semibold mb-4">Resumen de Salud Financiera</h3><ul class="space-y-3">`;
        
        if (metrics.netProfit > 0) {
            summaryHTML += `<li class="flex items-start"><i data-feather="trending-up" class="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1"></i><div><span class="font-semibold">Rentabilidad Positiva:</span> Su empresa generó una utilidad neta de ${formatCurrency(metrics.netProfit)} en el período.</div></li>`;
        } else {
             summaryHTML += `<li class="flex items-start"><i data-feather="trending-down" class="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-1"></i><div><span class="font-semibold">Alerta de Rentabilidad:</span> Su empresa está operando con una pérdida de ${formatCurrency(metrics.netProfit)} en el período. Es crucial revisar los gastos.</div></li>`;
        }

        if (metrics.totalCash > metrics.accountsPayable) {
             summaryHTML += `<li class="flex items-start"><i data-feather="shield-check" class="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1"></i><div><span class="font-semibold">Buena Liquidez:</span> El efectivo disponible (${formatCurrency(metrics.totalCash)}) es suficiente para cubrir las deudas a corto plazo con proveedores (${formatCurrency(metrics.accountsPayable)}).</div></li>`;
        } else {
            summaryHTML += `<li class="flex items-start"><i data-feather="alert-triangle" class="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-1"></i><div><span class="font-semibold">Riesgo de Liquidez:</span> Sus cuentas por pagar (${formatCurrency(metrics.accountsPayable)}) superan el efectivo disponible. Se recomienda gestionar la cobranza activamente.</div></li>`;
        }

        if (metrics.accountsReceivable > 0) {
             summaryHTML += `<li class="flex items-start"><i data-feather="dollar-sign" class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-1"></i><div><span class="font-semibold">Cartera Activa:</span> Tiene un total de ${formatCurrency(metrics.accountsReceivable)} pendientes por cobrar. ¡Una buena gestión de esta cartera es clave para el flujo de caja!</div></li>`;
        }
        
        summaryHTML += `</ul>`;
        dom.summary.financialHealth.innerHTML = summaryHTML;
        feather.replace();
    };
    
    const renderPnlChart = () => {
        const { startDate } = getDateRange();
        const months = [], monthlyRevenue = {}, monthlyExpenses = {};
        let d = new Date(startDate);
        d.setDate(1);

        while (d <= new Date()) {
            const monthKey = d.toISOString().slice(0, 7);
            months.push(monthKey);
            monthlyRevenue[monthKey] = 0; 
            monthlyExpenses[monthKey] = 0;
            d.setMonth(d.getMonth() + 1);
        }
        (allData.invoices || []).forEach(inv => { const k = inv.issueDate.slice(0, 7); if(monthlyRevenue[k] !== undefined) monthlyRevenue[k] += inv.total; });
        (allData.bills || []).forEach(bill => { const k = bill.date.slice(0, 7); if(monthlyExpenses[k] !== undefined) monthlyExpenses[k] += bill.total; });
        (allData.payrollHistory || []).forEach(p => { const k = p.period; if(monthlyExpenses[k] !== undefined) monthlyExpenses[k] += p.records.reduce((s, r) => s + r.totalCompanyCost, 0); });
        
        (allData.manualTransactions || []).forEach(t => {
            const k = t.date.slice(0, 7);
            if(t.type === 'inflow' && monthlyRevenue[k] !== undefined) monthlyRevenue[k] += parseFloat(t.amount);
            if(t.type === 'outflow' && monthlyExpenses[k] !== undefined) monthlyExpenses[k] += parseFloat(t.amount);
        });

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';
        
        if (charts.monthlyPnl) charts.monthlyPnl.destroy();
        charts.monthlyPnl = new Chart(dom.charts.monthlyPnl, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Ingresos', data: months.map(m => monthlyRevenue[m]), backgroundColor: 'rgba(34, 197, 94, 0.7)' },
                    { label: 'Gastos', data: months.map(m => monthlyExpenses[m]), backgroundColor: 'rgba(239, 68, 68, 0.7)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { 
                y: { ticks: { color: textColor }, grid: { color: gridColor } }, 
                x: { ticks: { color: textColor }, grid: { color: gridColor } }
            }, plugins: { legend: { labels: { color: textColor } } } }
        });
    };

    const renderAssetsLiabilitiesChart = (metrics) => {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#e5e7eb' : '#374151';

        if (charts.assetsLiabilities) charts.assetsLiabilities.destroy();
        charts.assetsLiabilities = new Chart(dom.charts.assetsLiabilities, {
            type: 'doughnut',
            data: {
                labels: ['Efectivo', 'Cuentas por Cobrar', 'Inventario', 'Cuentas por Pagar'],
                datasets: [{
                    label: 'Composición',
                    data: [metrics.totalCash, metrics.accountsReceivable, metrics.inventoryValue, metrics.accountsPayable],
                    backgroundColor: ['#10B981', '#FBBF24', '#6366F1', '#EF4444'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor } } } }
        });
    };

    const renderClientAnalysisTable = (invoicesInPeriod) => {
        const clientAnalysis = {};
        (invoicesInPeriod || []).forEach(inv => {
            if (!clientAnalysis[inv.clientName]) {
                clientAnalysis[inv.clientName] = {
                    totalFacturado: 0,
                    totalRecaudado: 0,
                    saldoActual: 0,
                    paymentDays: [],
                    clientId: inv.clientId
                };
            }
            clientAnalysis[inv.clientName].totalFacturado += inv.total;
        });

        (allData.debtors || []).forEach(debtor => {
            const client = (allData.employees || []).find(c => c.id === debtor.clientId);
            if(client && clientAnalysis[client.name]){
                clientAnalysis[client.name].saldoActual = debtor.balance;
                (debtor.payments || []).forEach(p => {
                    clientAnalysis[client.name].totalRecaudado += p.amount;
                    const invoice = (allData.invoices || []).find(inv => inv.number === debtor.invoiceNumber && inv.clientId === debtor.clientId);
                    if(invoice){
                        const issueDate = new Date(invoice.issueDate);
                        const paymentDate = new Date(p.date);
                        const diffTime = Math.abs(paymentDate - issueDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        clientAnalysis[client.name].paymentDays.push(diffDays);
                    }
                });
            }
        });

        const tableData = Object.entries(clientAnalysis).map(([name, data]) => {
            const avgDays = data.paymentDays.length > 0 ? (data.paymentDays.reduce((a, b) => a + b, 0) / data.paymentDays.length) : 0;
            return { ...data, name, pmp: Math.round(avgDays) };
        }).sort((a,b) => b.totalFacturado - a.totalFacturado).slice(0, 10);

        let tableHTML = `<table class="w-full table-auto">
            <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium uppercase">Cliente</th>
                    <th class="px-4 py-2 text-right text-xs font-medium uppercase">Total Facturado</th>
                    <th class="px-4 py-2 text-right text-xs font-medium uppercase">Total Recaudado</th>
                    <th class="px-4 py-2 text-right text-xs font-medium uppercase">Saldo Actual</th>
                    <th class="px-4 py-2 text-right text-xs font-medium uppercase">Días Prom. Pago</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">`;
        
        if(tableData.length === 0){
             tableHTML += `<tr><td colspan="5" class="text-center p-4 text-gray-500">No hay datos de clientes para el período seleccionado.</td></tr>`;
        } else {
            tableData.forEach(d => {
                tableHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="px-4 py-2 font-medium">${d.name}</td>
                    <td class="px-4 py-2 text-right">${formatCurrency(d.totalFacturado)}</td>
                    <td class="px-4 py-2 text-right text-green-600">${formatCurrency(d.totalRecaudado)}</td>
                    <td class="px-4 py-2 text-right text-red-600">${formatCurrency(d.saldoActual)}</td>
                    <td class="px-4 py-2 text-right font-semibold">${d.pmp} días</td>
                </tr>`;
            });
        }
        tableHTML += '</tbody></table>';
        dom.tables.topClientsContainer.innerHTML = tableHTML;
    };

    const renderRevenuePayrollChart = () => {
        const { startDate } = getDateRange();
        const months = [], monthlyRevenue = {}, monthlyPayroll = {};
        let d = new Date(startDate);
        d.setDate(1);

        while(d <= new Date()){
            const monthKey = d.toISOString().slice(0,7);
            months.push(monthKey);
            monthlyRevenue[monthKey] = 0;
            monthlyPayroll[monthKey] = 0;
            d.setMonth(d.getMonth() + 1);
        }

        (allData.invoices || []).forEach(inv => { const k = inv.issueDate.slice(0,7); if(monthlyRevenue[k] !== undefined) monthlyRevenue[k] += inv.total; });
        (allData.payrollHistory || []).forEach(p => { const k = p.period; if(monthlyPayroll[k] !== undefined) monthlyPayroll[k] += p.records.reduce((s, r) => s + r.totalCompanyCost, 0); });
        
        (allData.manualTransactions || []).forEach(t => {
            const k = t.date.slice(0, 7);
            if(t.type === 'inflow' && monthlyRevenue[k] !== undefined) monthlyRevenue[k] += parseFloat(t.amount);
        });

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';

        if (charts.revenuePayroll) charts.revenuePayroll.destroy();
        charts.revenuePayroll = new Chart(dom.charts.revenuePayroll, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Ingresos', data: months.map(m => monthlyRevenue[m]), borderColor: 'rgba(34, 197, 94, 1)', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, tension: 0.3 },
                    { label: 'Costo de Nómina', data: months.map(m => monthlyPayroll[m]), borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { ticks: { color: textColor }, grid: { color: gridColor } },
                    x: { ticks: { color: textColor }, grid: { color: gridColor } }
                },
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
    };

    const init = () => {
        const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');
        applyTheme(localStorage.getItem('theme') || 'light');
        dom.themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            renderDashboard();
        });
        dom.periodFilter.addEventListener('change', renderDashboard);
        loadAllData();
        renderDashboard();
    };
    
    init();
});