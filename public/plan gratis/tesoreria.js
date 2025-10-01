document.addEventListener('DOMContentLoaded', () => {
    // --- DOM & State ---
    const dom = {
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
        formModal: { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form'), closeBtn: document.getElementById('close-modal-btn') },
    };
    let tesoreriaData = {};
    let cashflowChartInstance = null;
    let currentModule = 'dashboard';
    const defaultData = { accounts: [], manualTransactions: [] };

    // --- Data Management ---
    const saveData = () => localStorage.setItem('tesoreria_data_v1', JSON.stringify(tesoreriaData));
    const loadData = () => tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || JSON.parse(JSON.stringify(defaultData));

    // --- Utilities ---
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : (type === 'info' ? 'bg-blue-500' : 'bg-red-500');
        toast.className = `toast ${bgColor} text-white py-3 px-5 rounded-lg shadow-lg flex items-center gap-3`;
        toast.innerHTML = `<i data-feather="check-circle" class="h-5 w-5"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        feather.replace();
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3000);
    };
    const toggleModal = (modal, show) => modal.classList.toggle('hidden', !show);
    
    // --- Core Business Logic ---
    const getProjectedFlows = () => {
        const today = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(today.getDate() + 30);
        let flows = [];

        const debtorsData = JSON.parse(localStorage.getItem('debtors')) || [];
        debtorsData.filter(d => d.status !== 'Pagado' && new Date(d.dueDate) <= futureLimit && new Date(d.dueDate) >= today)
            .forEach(d => flows.push({ date: d.dueDate, amount: d.balance, type: 'inflow', description: `Cobro Factura ${d.invoiceNumber}` }));

        const comprasData = JSON.parse(localStorage.getItem('compras_data_v1')) || { bills: [] };
        comprasData.bills.filter(b => b.status !== 'Pagada' && new Date(b.dueDate) <= futureLimit && new Date(b.dueDate) >= today)
            .forEach(b => flows.push({ date: b.dueDate, amount: -b.balance, type: 'outflow', description: `Pago Factura Prov. ${b.invoiceNumber}` }));
        
        tesoreriaData.manualTransactions.filter(t => new Date(t.date) <= futureLimit && new Date(t.date) >= today)
            .forEach(t => flows.push({ date: t.date, amount: t.type === 'inflow' ? parseFloat(t.amount) : -parseFloat(t.amount), type: t.type, description: t.description }));
        
        flows.sort((a, b) => new Date(a.date) - new Date(b.date));
        return flows;
    };
    
    const recalculateAllBalances = () => {
        let cashAccount = tesoreriaData.accounts.find(acc => acc.name === 'Caja General');
        if (!cashAccount) {
            const newAccountId = Date.now();
            cashAccount = { id: newAccountId, name: 'Caja General', bank: 'N/A', type: 'Efectivo', initialBalance: 0, currentBalance: 0 };
            tesoreriaData.accounts.push(cashAccount);
        }

        tesoreriaData.accounts.forEach(acc => {
            let balance = parseFloat(acc.initialBalance) || 0;
            tesoreriaData.manualTransactions.filter(t => String(t.accountId) === String(acc.id))
                .forEach(t => balance += (t.type === 'inflow' ? parseFloat(t.amount) : -parseFloat(t.amount)));
            acc.currentBalance = balance;
        });
        saveData();
    };

    // --- Rendering Functions ---
    const renderDashboardSection = () => {
        const projectedFlows = getProjectedFlows();
        const totalCash = tesoreriaData.accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        const netFlow = projectedFlows.reduce((sum, flow) => sum + flow.amount, 0);
        const todayStr = new Date().toISOString().slice(0, 10);
        
        const debtorsData = JSON.parse(localStorage.getItem('debtors')) || [];
        debtorsData.forEach(d => {
            const totalPaid = (d.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const totalRetenciones = (d.retencionFuente || 0) + (d.retencionICA || 0);
            d.balance = (d.totalWithIVA || 0) - totalPaid - totalRetenciones;
        });
        const overdueReceivables = debtorsData.filter(d => d.status !== 'Pagado' && d.dueDate < todayStr).reduce((sum, d) => sum + (d.balance || 0), 0);
        const comprasData = JSON.parse(localStorage.getItem('compras_data_v1')) || { bills: [] };
        const overduePayables = comprasData.bills.filter(b => b.status !== 'Pagada' && b.dueDate < todayStr).reduce((sum, b) => sum + b.balance, 0);
        document.getElementById('dashboard-section').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Efectivo Total Actual</h3><p class="text-3xl font-bold text-green-600 mt-1">${formatCurrency(totalCash)}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Flujo Neto Proyectado (30d)</h3><p class="text-3xl font-bold ${netFlow >= 0 ? 'text-blue-600' : 'text-red-600'} mt-1">${formatCurrency(netFlow)}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Cuentas por Cobrar Vencidas</h3><p class="text-3xl font-bold text-yellow-600 mt-1">${formatCurrency(overdueReceivables)}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Cuentas por Pagar Vencidas</h3><p class="text-3xl font-bold text-red-600 mt-1">${formatCurrency(overduePayables)}</p></div>
            </div>`;
    };

    const renderCashflowChartAndTable = () => {
        const projectedFlows = getProjectedFlows();
        let runningBalance = tesoreriaData.accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
        const tbody = document.getElementById('cashflow-table-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td class="px-4 py-2 font-medium" colspan="4">Saldo Inicial</td><td class="px-4 py-2 text-right font-medium">${formatCurrency(runningBalance)}</td></tr>`;
        const chartData = { labels: [], balances: [] };
        const dailyFlows = {};
        projectedFlows.forEach(flow => { if (!dailyFlows[flow.date]) dailyFlows[flow.date] = 0; dailyFlows[flow.date] += flow.amount; });
        for (let i = 0; i < 30; i++) {
            const date = new Date(); date.setDate(date.getDate() + i); const dateStr = date.toISOString().slice(0, 10);
            if (dailyFlows[dateStr]) {
                projectedFlows.filter(f => f.date === dateStr).forEach(flow => {
                    const inflow = flow.amount > 0 ? formatCurrency(flow.amount) : '-'; const outflow = flow.amount < 0 ? formatCurrency(Math.abs(flow.amount)) : '-';
                    tbody.innerHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700"><td class="px-4 py-2 whitespace-nowrap">${flow.date}</td><td class="px-4 py-2 text-sm">${flow.description}</td><td class="px-4 py-2 text-right text-green-600">${inflow}</td><td class="px-4 py-2 text-right text-red-600">${outflow}</td><td class="px-4 py-2 text-right"></td></tr>`;
                });
                runningBalance += dailyFlows[dateStr];
                tbody.innerHTML += `<tr class="bg-gray-100 dark:bg-gray-600 font-medium"><td class="px-4 py-2" colspan="4">Total Día ${dateStr}</td><td class="px-4 py-2 text-right">${formatCurrency(runningBalance)}</td></tr>`;
            }
            chartData.labels.push(dateStr.slice(5)); chartData.balances.push(runningBalance);
        }
        if (cashflowChartInstance) cashflowChartInstance.destroy();
        const chartCtx = document.getElementById('cashflow-chart')?.getContext('2d');
        if (!chartCtx) return;
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';
        cashflowChartInstance = new Chart(chartCtx, { type: 'line', data: { labels: chartData.labels, datasets: [{ label: 'Saldo Proyectado', data: chartData.balances, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', tension: 0.1, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { labels: { color: textColor } } } } });
    };

    const renderCashflowSection = () => {
        const section = document.getElementById('cashflow-section');
        if (!section) return;
        section.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div class="flex flex-wrap justify-between items-center mb-4 gap-4"><h2 class="text-2xl font-bold">Proyección de Flujo de Caja (30 días)</h2><button id="export-csv-btn" class="bg-green-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-green-700"><i data-feather="download" class="h-5 w-5 mr-2"></i>Exportar a CSV</button></div>
                <div class="h-80 mb-6"><canvas id="cashflow-chart"></canvas></div>
                <div class="overflow-x-auto"><table class="w-full table-auto"><thead class="bg-gray-50 dark:bg-gray-700"><tr><th class="px-4 py-2 text-left text-xs font-medium uppercase">Fecha</th><th class="px-4 py-2 text-left text-xs font-medium uppercase">Descripción</th><th class="px-4 py-2 text-right text-xs font-medium uppercase">Ingresos</th><th class="px-4 py-2 text-right text-xs font-medium uppercase">Egresos</th><th class="px-4 py-2 text-right text-xs font-medium uppercase">Saldo Acumulado</th></tr></thead><tbody id="cashflow-table-body" class="divide-y divide-gray-200 dark:divide-gray-700"></tbody></table></div>
            </div>`;
        renderCashflowChartAndTable();
    };

    const moduleConfig = {
        accounts: { title: 'Cuentas Bancarias', headers: ['Nombre', 'Banco', 'Tipo', 'Saldo Actual', 'Acciones'] },
        transactions: { title: 'Movimientos Manuales', headers: ['Fecha', 'Cuenta', 'Tipo', 'Descripción', 'Monto', 'Acciones'] }
    };

    const renderTableSection = (moduleKey, dataToRender = null) => {
        const config = moduleConfig[moduleKey];
        if (!config) return;
        const data = dataToRender ?? (moduleKey === 'accounts' ? tesoreriaData.accounts : tesoreriaData.manualTransactions);
        const section = document.getElementById(`${moduleKey}-section`);
        if (!section) return;
        
        let tableRows = data.map(item => {
            if (moduleKey === 'accounts') {
                return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700"><td class="px-4 py-3">${item.name}</td><td class="px-4 py-3">${item.bank}</td><td class="px-4 py-3">${item.type}</td><td class="px-4 py-3 font-medium text-right">${formatCurrency(item.currentBalance)}</td><td class="px-4 py-3 text-right"><button class="edit-btn p-1 text-blue-500 hover:text-blue-700" data-id="${item.id}" title="Editar"><i data-feather="edit-2" class="h-4 w-4"></i></button><button class="delete-btn p-1 text-red-500 hover:text-red-700" data-id="${item.id}" title="Eliminar"><i data-feather="trash-2" class="h-4 w-4"></i></button></td></tr>`;
            } else { // transactions
                const accountName = tesoreriaData.accounts.find(a => a.id == item.accountId)?.name || 'N/A';
                const amountClass = item.type === 'inflow' ? 'text-green-600' : 'text-red-600';
                return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700"><td class="px-4 py-3">${item.date}</td><td class="px-4 py-3">${accountName}</td><td class="px-4 py-3">${item.type === 'inflow' ? 'Ingreso' : 'Egreso'}</td><td class="px-4 py-3">${item.description}</td><td class="px-4 py-3 font-medium text-right ${amountClass}">${formatCurrency(item.amount)}</td><td class="px-4 py-3 text-right"><button class="edit-btn p-1 text-blue-500 hover:text-blue-700" data-id="${item.id}" title="Editar"><i data-feather="edit-2" class="h-4 w-4"></i></button><button class="delete-btn p-1 text-red-500 hover:text-red-700" data-id="${item.id}" title="Eliminar"><i data-feather="trash-2" class="h-4 w-4"></i></button></td></tr>`;
            }
        }).join('');

        section.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div class="flex flex-wrap justify-between items-center mb-4 gap-4"><h2 class="text-2xl font-bold">${config.title}</h2><div class="flex items-center gap-4"><input type="search" id="search-input" data-module="${moduleKey}" placeholder="Buscar..." class="border rounded-md p-2 w-full sm:w-64 dark:bg-gray-700"><button id="add-btn" class="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 flex-shrink-0"><i data-feather="plus" class="h-5 w-5 mr-2"></i>Agregar</button></div></div>
                <div class="overflow-x-auto"><table class="w-full table-auto"><thead><tr class="bg-gray-50 dark:bg-gray-700">${config.headers.map(h => `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">${h}</th>`).join('')}</tr></thead><tbody class="divide-y divide-gray-200 dark:divide-gray-700">${tableRows}</tbody></table></div>
            </div>`;
    };
    
    const renderAccountsSection = () => renderTableSection('accounts');
    const renderTransactionsSection = () => renderTableSection('transactions');

    const renderModule = (moduleKey) => {
        currentModule = moduleKey;
        dom.mainContent.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
        const section = document.getElementById(`${moduleKey}-section`);
        if (section) section.classList.remove('hidden');

        switch(moduleKey) {
            case 'dashboard': renderDashboardSection(); break;
            case 'cashflow': renderCashflowSection(); break;
            case 'accounts': renderAccountsSection(); break;
            case 'transactions': renderTransactionsSection(); break;
        }
        feather.replace();
    };

    const render = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        renderModule(activeTab ? activeTab.dataset.target.replace('-section', '') : 'dashboard');
    };

    const getAccountOptions = (selectedId) => tesoreriaData.accounts.map(a => `<option value="${a.id}" ${a.id == selectedId ? 'selected' : ''}>${a.name}</option>`).join('');
    const formTemplates = {
        accounts: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="space-y-4"><div><label class="block text-sm font-medium mb-1">Nombre de la Cuenta</label><input type="text" name="name" class="w-full border rounded-md p-2 dark:bg-gray-700" value="${data.name || ''}" required></div><div><label class="block text-sm font-medium mb-1">Banco</label><input type="text" name="bank" class="w-full border rounded-md p-2 dark:bg-gray-700" value="${data.bank || ''}"></div><div><label class="block text-sm font-medium mb-1">Tipo de Cuenta</label><select name="type" class="w-full border rounded-md p-2 dark:bg-gray-700"><option ${data.type === 'Corriente' ? 'selected' : ''}>Corriente</option><option ${data.type === 'Ahorros' ? 'selected' : ''}>Ahorros</option><option ${data.type === 'Efectivo' ? 'selected' : ''}>Efectivo</option></select></div><div><label class="block text-sm font-medium mb-1">Saldo Inicial</label><input type="number" step="0.01" name="initialBalance" class="w-full border rounded-md p-2 dark:bg-gray-700" value="${data.initialBalance || 0}" required ${data.id ? 'disabled' : ''}><small class="text-xs text-gray-500 dark:text-gray-400">${data.id ? 'El saldo inicial no se puede editar.' : ''}</small></div></div><div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="cancel-btn bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Guardar</button></div>`,
        transactions: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="space-y-4"><div><label class="block text-sm font-medium mb-1">Fecha</label><input type="date" name="date" class="w-full border rounded-md p-2 dark:bg-gray-700" value="${data.date || new Date().toISOString().slice(0,10)}" required></div><div><label class="block text-sm font-medium mb-1">Cuenta</label><select name="accountId" class="w-full border rounded-md p-2 dark:bg-gray-700" required>${getAccountOptions(data.accountId)}</select></div><div><label class="block text-sm font-medium mb-1">Tipo de Movimiento</label><select name="type" class="w-full border rounded-md p-2 dark:bg-gray-700"><option value="outflow" ${data.type === 'outflow' ? 'selected' : ''}>Egreso</option><option value="inflow" ${data.type === 'inflow' ? 'selected' : ''}>Ingreso</option></select></div><div><label class="block text-sm font-medium mb-1">Descripción</label><input type="text" name="description" class="w-full border rounded-md p-2 dark:bg-gray-700" value="${data.description || ''}" required></div><div><label class="block text-sm font-medium mb-1">Monto</label><input type="number" step="0.01" name="amount" class="w-full border rounded-md p-2 dark:bg-gray-700" value="${data.amount || 0}" required></div></div><div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="cancel-btn bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Guardar</button></div>`
    };

    const openFormModal = (moduleKey, id = null) => {
        const isEdit = id !== null;
        const dataArray = moduleKey === 'accounts' ? tesoreriaData.accounts : tesoreriaData.manualTransactions;
        const data = isEdit ? dataArray.find(item => item.id == id) : {};
        dom.formModal.title.textContent = `${isEdit ? 'Editar' : 'Agregar'} ${moduleConfig[moduleKey].title.slice(0, -1)}`;
        dom.formModal.form.innerHTML = formTemplates[moduleKey](data);
        
        dom.formModal.form.onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const dataArray = currentModule === 'accounts' ? tesoreriaData.accounts : tesoreriaData.manualTransactions;
            if (data.amount) data.amount = parseFloat(data.amount);

            const editingId = data.id; // Get id from form data
            if (editingId) {
                const index = dataArray.findIndex(item => item.id == editingId);
                if (index > -1) {
                    if (currentModule === 'accounts') data.initialBalance = dataArray[index].initialBalance;
                    dataArray[index] = { ...dataArray[index], ...data, id: Number(editingId) };
                }
            } else {
                data.id = Date.now();
                if (data.initialBalance) data.initialBalance = parseFloat(data.initialBalance);
                dataArray.push(data);
            }
            recalculateAllBalances();
            showToast('Registro guardado exitosamente.', 'success');
            toggleModal(dom.formModal.el, false);
            render();
        };

        toggleModal(dom.formModal.el, true);
    };

    // --- Event Listeners ---
    dom.mainContent.addEventListener('click', (e) => {
        const addBtn = e.target.closest('#add-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const exportBtn = e.target.closest('#export-csv-btn');
        if (addBtn) openFormModal(currentModule);
        if (editBtn) openFormModal(currentModule, editBtn.dataset.id);
        if (deleteBtn) {
            if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
                const dataArray = currentModule === 'accounts' ? tesoreriaData.accounts : tesoreriaData.manualTransactions;
                const index = dataArray.findIndex(item => item.id == deleteBtn.dataset.id);
                if (index > -1) { dataArray.splice(index, 1); recalculateAllBalances(); showToast('Registro eliminado.', 'error'); render(); }
            }
        }
        if (exportBtn) exportCashflowToCSV();
    });

    dom.mainContent.addEventListener('input', (e) => {  if (e.target.id === 'search-input') {
        const searchTerm = e.target.value.toLowerCase();
        const moduleKey = e.target.dataset.module;
        const dataArray = moduleKey === 'accounts' ? tesoreriaData.accounts : tesoreriaData.manualTransactions;
        const filteredData = dataArray.filter(item => {
            if (moduleKey === 'accounts') {
                return item.name.toLowerCase().includes(searchTerm) || item.bank.toLowerCase().includes(searchTerm);
            }
            if (moduleKey === 'transactions') {
                const accountName = tesoreriaData.accounts.find(a => a.id == item.accountId)?.name || '';
                return item.description.toLowerCase().includes(searchTerm) || accountName.toLowerCase().includes(searchTerm) || item.date.includes(searchTerm);
            }
            return false;
        });
        renderTableSection(moduleKey, filteredData);
        feather.replace();
    } });
    dom.formModal.el.addEventListener('click', (e) => { if (e.target.closest('.cancel-btn') || e.target.closest('#close-modal-btn') || e.target === dom.formModal.el) toggleModal(dom.formModal.el, false); });
    
    dom.tabsContainer.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn && !tabBtn.classList.contains('active')) {
            if(dom.tabsContainer.querySelector('.active')) {
                dom.tabsContainer.querySelector('.active').classList.remove('active');
            }
            tabBtn.classList.add('active');
            renderModule(tabBtn.dataset.target.replace('-section', ''));
        }
    });
    
    const exportCashflowToCSV = () => { const headers = ["Fecha", "Descripcion", "Ingresos", "Egresos", "Saldo Acumulado"];
    let csvRows = [headers.join(",")];
    const projectedFlows = getProjectedFlows();
    let runningBalance = tesoreriaData.accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const escapeCsvCell = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
    let tempBalance = runningBalance;
    projectedFlows.forEach(flow => {
        const inflow = flow.amount > 0 ? flow.amount : 0;
        const outflow = flow.amount < 0 ? Math.abs(flow.amount) : 0;
        tempBalance += flow.amount;
        const row = [flow.date, escapeCsvCell(flow.description), inflow, outflow, tempBalance];
        csvRows.push(row.join(","));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\r\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `flujo_de_caja_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exportación completada", "success");
}; 

    // --- Initialization ---
    const init = () => {
        loadData(); 
        recalculateAllBalances(); 
        render(); 
    };
    
    init();
});