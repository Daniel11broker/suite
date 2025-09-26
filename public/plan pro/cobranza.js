document.addEventListener('DOMContentLoaded', () => {
    // --- Sidebar and Mobile Menu Logic ---
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

    // --- Cobranza Module Logic ---
    const IVA_RATE = 0.19;
    const ROWS_PER_PAGE = 10;
    const RETEFUENTE_RATE = 0.04;
    const RETEICA_RATE = 0.015;
    const dashboard = {
        totalRecaudado: document.getElementById('total-recaudado'), totalDeuda: document.getElementById('total-deuda'),
        saldoPendiente: document.getElementById('saldo-pendiente'), pendingCount: document.getElementById('pending-count'),
        overdueCount: document.getElementById('overdue-count'), paidCount: document.getElementById('paid-count'),
    };
    const tableBody = document.getElementById('debtors-table-body');
    const tableHeader = document.getElementById('table-header');
    const noDataMessage = document.getElementById('no-data-message');
    const addDebtorBtn = document.getElementById('add-debtor-btn');
    const addFirstDebtorBtn = document.getElementById('add-first-debtor-btn');
    const searchInput = document.getElementById('search-input');
    const filterButtonsContainer = document.getElementById('filter-buttons');
    const monthFilter = document.getElementById('month-filter');
    const themeToggle = document.getElementById('theme-toggle');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const paginationControls = document.getElementById('pagination-controls');
    const debtorModal = {
        el: document.getElementById('debtor-modal'), form: document.getElementById('debtor-form'),
        title: document.getElementById('modal-title'), closeBtn: document.getElementById('close-debtor-modal-btn'),
        cancelBtn: document.getElementById('cancel-debtor-btn'), subtotalInput: document.getElementById('subtotal'),
        totalWithIVAInput: document.getElementById('totalWithIVA'), documentTypeSelect: document.getElementById('documentType'),
        invoiceNumberLabel: document.getElementById('invoiceNumberLabel'), 
        aplicaRetefuenteCheckbox: document.getElementById('aplicaRetefuente'),
        aplicaReteICACheckbox: document.getElementById('aplicaReteICA'),
        retefuenteContainer: document.getElementById('retefuente-container'),
        reteicaContainer: document.getElementById('reteica-container'),
        retefuenteRateInput: document.getElementById('retefuenteRate'),
        reteicaRateInput: document.getElementById('reteicaRate'),
        retencionFuenteInput: document.getElementById('retencionFuente'),
        retencionICAInput: document.getElementById('retencionICA'),
        clientIdSelect: document.getElementById('clientId'),
        newClientContainer: document.getElementById('new-client-container'),
        newClientNameInput: document.getElementById('newClientName'),
    };
    const paymentModal = {
        el: document.getElementById('payment-modal'), form: document.getElementById('payment-form'),
        title: document.getElementById('payment-modal-title'), history: document.getElementById('payment-history'),
        debtorIdInput: document.getElementById('payment-debtor-id'), amountInput: document.getElementById('payment-amount'),
        dateInput: document.getElementById('payment-date'), closeBtn: document.getElementById('close-payment-modal-btn'),
    };
    const confirmModal = {
        el: document.getElementById('confirm-modal'), title: document.getElementById('confirm-title'),
        message: document.getElementById('confirm-message'), buttons: document.getElementById('confirm-buttons'),
    };
    const reminderModal = {
        el: document.getElementById('reminder-modal'),
        messageTextarea: document.getElementById('reminder-message'),
        copyBtn: document.getElementById('copy-reminder-btn'),
        closeBtn: document.getElementById('close-reminder-modal-btn'),
    };
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');
    const downloadButtons = {
        json: document.getElementById('download-json-btn'), csv: document.getElementById('download-csv-btn'),
        pdf: document.getElementById('download-pdf-btn'),
        template: document.getElementById('download-template-btn'),
    };
    let debtors = []; let clients = []; let editingDebtorId = null; let currentFilter = { status: 'Todos', month: 'Todos' };
    let history = []; let historyIndex = -1; let currentPage = 1; let sortColumn = 'dueDate'; let sortDirection = 'asc';
    let debtChartInstance = null; let statusChartInstance = null;
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container'); const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-blue-500' : 'bg-red-500';
        const icon = type === 'success' ? 'check-circle' : type === 'info' ? 'info' : 'alert-circle';
        const toastElement = document.createElement('div'); toastElement.id = toastId; toastElement.className = `toast ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg flex items-center`;
        toastElement.innerHTML = `<i data-feather="${icon}" class="h-5 w-5 text-white mr-2"></i><span>${message}</span>`;
        toastContainer.appendChild(toastElement); feather.replace();
        setTimeout(() => toastElement.classList.add('show'), 10);
        setTimeout(() => { toastElement.classList.remove('show'); setTimeout(() => toastElement.remove(), 500); }, 3000);
    };
    const saveClients = () => { localStorage.setItem('clients', JSON.stringify(clients)); };
    const loadClients = () => { clients = JSON.parse(localStorage.getItem('clients')) || []; };
    const pushStateToHistory = (currentState) => { history = history.slice(0, historyIndex + 1); history.push(JSON.parse(JSON.stringify(currentState))); historyIndex++; updateUndoRedoButtons(); };
    const saveState = (renderAll = true, fromHistory = false) => { if (!fromHistory) pushStateToHistory({ debtors, clients }); localStorage.setItem('debtors', JSON.stringify(debtors)); saveClients(); if (renderAll) render(); };
    const undo = () => { if (historyIndex > 0) { historyIndex--; const state = JSON.parse(JSON.stringify(history[historyIndex])); debtors = state.debtors; clients = state.clients; saveState(true, true); } };
    const redo = () => { if (historyIndex < history.length - 1) { historyIndex++; const state = JSON.parse(JSON.stringify(history[historyIndex])); debtors = state.debtors; clients = state.clients; saveState(true, true); } };
    const updateUndoRedoButtons = () => { undoBtn.disabled = historyIndex <= 0; redoBtn.disabled = historyIndex >= history.length - 1; };
    const updateOverdueStatus = () => {
        const today = new Date(); today.setHours(0, 0, 0, 0); let changed = false;
        debtors.forEach(debtor => { if (debtor.status === 'Pendiente' && new Date(debtor.dueDate) < today) { debtor.status = 'Atrasado'; changed = true; } });
        if (changed) saveState(false);
    };
    const render = () => { updateDashboard(); populateMonthFilter(); renderTable(); renderCharts(); updateUndoRedoButtons(); feather.replace(); };
    const updateDashboard = () => {
        let totalRecaudado = 0, totalDeuda = 0; const counts = { Pendiente: 0, Atrasado: 0, Pagado: 0 };
        debtors.forEach(d => { totalRecaudado += (d.payments || []).reduce((sum, p) => sum + p.amount, 0); totalDeuda += (d.totalWithIVA || 0); if (counts.hasOwnProperty(d.status)) counts[d.status]++; });
        const saldoPendiente = totalDeuda - totalRecaudado;
        dashboard.totalRecaudado.textContent = formatCurrency(totalRecaudado); dashboard.totalDeuda.textContent = formatCurrency(totalDeuda);
        dashboard.saldoPendiente.textContent = formatCurrency(saldoPendiente > 0 ? saldoPendiente : 0);
        dashboard.pendingCount.textContent = counts.Pendiente; dashboard.overdueCount.textContent = counts.Atrasado; dashboard.paidCount.textContent = counts.Pagado;
    };
    const populateMonthFilter = () => {
        const months = new Set(debtors.map(d => d.dueDate ? d.dueDate.substring(0, 7) : null).filter(Boolean));
        const sortedMonths = Array.from(months).sort().reverse(); const selectedValue = monthFilter.value;
        monthFilter.innerHTML = '<option value="Todos">Todos los Meses</option>';
        sortedMonths.forEach(monthKey => { const [year, month] = monthKey.split('-'); const date = new Date(year, month - 1, 2); const optionText = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date); const option = new Option(optionText.charAt(0).toUpperCase() + optionText.slice(1), monthKey); monthFilter.add(option); });
        monthFilter.value = sortedMonths.includes(selectedValue) ? selectedValue : 'Todos';
    };
    const renderTable = () => {
        tableBody.innerHTML = ''; const clientMap = new Map(clients.map(c => [c.id, c.name])); const searchTerm = searchInput.value.toLowerCase();
        const filteredDebtors = debtors.filter(d => { const clientName = clientMap.get(d.clientId) || ''; return (currentFilter.status === 'Todos' || d.status === currentFilter.status) && (currentFilter.month === 'Todos' || (d.dueDate && d.dueDate.startsWith(currentFilter.month))) && (clientName.toLowerCase().includes(searchTerm) || (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(searchTerm))) });
        const hasVisibleData = filteredDebtors.length > 0; const hasAnyData = debtors.length > 0;
        noDataMessage.classList.toggle('hidden', hasAnyData); document.querySelector('.overflow-x-auto').classList.toggle('hidden', !hasVisibleData && hasAnyData);
        paginationControls.classList.toggle('hidden', !hasVisibleData); if (!hasAnyData) { document.querySelector('.overflow-x-auto').classList.add('hidden'); paginationControls.classList.add('hidden'); }
        filteredDebtors.forEach(d => { const totalPaid = (d.payments || []).reduce((sum, p) => sum + p.amount, 0); d.balance = (d.totalWithIVA || 0) - totalPaid - (d.retencionFuente || 0) - (d.retencionICA || 0); d.name = clientMap.get(d.clientId) || 'Cliente no encontrado'; });
        filteredDebtors.sort((a, b) => { const valA = a[sortColumn], valB = b[sortColumn]; let comparison = (valA > valB) ? 1 : (valA < valB) ? -1 : 0; return sortDirection === 'desc' ? -comparison : comparison; });
        updateSortHeaders();
        const totalPages = Math.ceil(filteredDebtors.length / ROWS_PER_PAGE); if (currentPage > totalPages) currentPage = totalPages || 1;
        const paginatedDebtors = filteredDebtors.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
        paginatedDebtors.forEach(debtor => {
            const tr = document.createElement('tr'); const totalPaid = (debtor.payments || []).reduce((sum, p) => sum + p.amount, 0); const totalRetenciones = (debtor.retencionFuente || 0) + (debtor.retencionICA || 0); const balance = debtor.balance;
            const today = new Date(); today.setHours(0,0,0,0); const dayDiff = Math.ceil((new Date(debtor.dueDate) - today) / (1000 * 3600 * 24));
            let rowClass = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            if (dayDiff < 0 && debtor.status !== 'Pagado') rowClass += ' bg-red-50 dark:bg-red-900/20'; else if (dayDiff >= 0 && dayDiff <= 7 && debtor.status !== 'Pagado') rowClass += ' bg-yellow-50 dark:bg-yellow-900/20';
            tr.className = rowClass;
            const statusColors = { 'Pagado': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', 'Atrasado': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'Pendiente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
            tr.innerHTML = `<td class="px-4 py-3"><div class="font-medium text-gray-900 dark:text-white">${debtor.name}</div><div class="text-sm text-gray-500 dark:text-gray-400">${debtor.documentType}: ${debtor.invoiceNumber}</div></td><td class="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">${formatCurrency(debtor.totalWithIVA || 0)}</td><td class="px-4 py-3 text-green-700 dark:text-green-400">${formatCurrency(totalPaid)}</td><td class="px-4 py-3 text-blue-700 dark:text-blue-400">${formatCurrency(totalRetenciones)}</td><td class="px-4 py-3 font-bold ${balance > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">${formatCurrency(balance)}</td><td class="px-4 py-3 text-gray-600 dark:text-gray-400">${debtor.dueDate}</td><td class="px-4 py-3"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[debtor.status] || ''}">${debtor.status}</span></td><td class="px-4 py-3 text-center text-sm font-medium"><button onclick="window.openReminderModal(${debtor.id})" class="text-cyan-600 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-300 mr-2" title="Generar Recordatorio"><i data-feather="message-circle"></i></button><button onclick="window.handleDuplicate(${debtor.id})" class="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 mr-2" title="Duplicar Registro"><i data-feather="copy"></i></button><button onclick="window.openPaymentModal(${debtor.id})" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-2" title="Ver/Agregar Pagos"><i data-feather="dollar-sign"></i></button><button onclick="window.handleEdit(${debtor.id})" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2" title="Editar Deudor"><i data-feather="edit-2"></i></button><button onclick="window.handleDelete(${debtor.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Eliminar"><i data-feather="trash-2"></i></button></td>`;
            tableBody.appendChild(tr);
        });
        renderPagination(totalPages, filteredDebtors.length);
        feather.replace();
    };
    const updateSortHeaders = () => {
        tableHeader.querySelectorAll('.sortable').forEach(th => {
            const icon = th.querySelector('.sort-icon');
            if (th.dataset.sort === sortColumn) { th.classList.add('sorted'); icon.innerHTML = sortDirection === 'asc' ? '<i data-feather="arrow-up" class="h-4 w-4"></i>' : '<i data-feather="arrow-down" class="h-4 w-4"></i>'; } else { th.classList.remove('sorted'); icon.innerHTML = ''; }
        });
        feather.replace();
    };
    const renderPagination = (totalPages, totalItems) => {
        paginationControls.innerHTML = ''; if (totalPages <= 1) return; const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1; const endItem = Math.min(currentPage * ROWS_PER_PAGE, totalItems);
        paginationControls.innerHTML = `<div class="text-sm text-gray-600 dark:text-gray-400">Mostrando ${startItem}-${endItem} de ${totalItems}</div><div class="flex items-center gap-1"><button id="prev-page-btn" class="pagination-btn"><i data-feather="chevron-left"></i></button><span id="page-numbers" class="flex items-center gap-1"></span><button id="next-page-btn" class="pagination-btn"><i data-feather="chevron-right"></i></button></div>`;
        const prevBtn = document.getElementById('prev-page-btn'), nextBtn = document.getElementById('next-page-btn');
        prevBtn.disabled = currentPage === 1; nextBtn.disabled = currentPage === totalPages;
        prevBtn.onclick = () => { currentPage--; renderTable(); }; nextBtn.onclick = () => { currentPage++; renderTable(); };
        const pageNumbersContainer = document.getElementById('page-numbers');
        for (let i = 1; i <= totalPages; i++) { const pageButton = document.createElement('button'); pageButton.textContent = i; pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`; pageButton.onclick = () => { currentPage = i; renderTable(); }; pageNumbersContainer.appendChild(pageButton); }
        feather.replace();
    };
    const renderCharts = () => {
        const isDarkMode = document.documentElement.classList.contains('dark'); const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'; const textColor = isDarkMode ? '#e5e7eb' : '#374151';
        const monthlyData = {};
        debtors.forEach(d => { const month = d.dueDate.substring(0, 7); if (!monthlyData[month]) monthlyData[month] = { debt: 0, paid: 0 }; monthlyData[month].debt += d.totalWithIVA; (d.payments || []).forEach(p => { const paymentMonth = p.date.substring(0, 7); if (!monthlyData[paymentMonth]) monthlyData[paymentMonth] = { debt: 0, paid: 0 }; monthlyData[paymentMonth].paid += p.amount; }); });
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(m => new Date(m + '-02').toLocaleString('es-CO', { month: 'short', year: 'numeric' })); const debtData = sortedMonths.map(m => monthlyData[m].debt); const paidData = sortedMonths.map(m => monthlyData[m].paid);
        const barCtx = document.getElementById('debtByMonthChart').getContext('2d'); if (debtChartInstance) debtChartInstance.destroy(); debtChartInstance = new Chart(barCtx, { type: 'bar', data: { labels, datasets: [ { label: 'Deuda Total', data: debtData, backgroundColor: 'rgba(239, 68, 68, 0.6)' }, { label: 'Total Recaudado', data: paidData, backgroundColor: 'rgba(34, 197, 94, 0.6)' } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { labels: { color: textColor } } } } });
        const statusCounts = { 'Pagado': 0, 'Pendiente': 0, 'Atrasado': 0 }; debtors.forEach(d => { statusCounts[d.status]++; });
        const pieCtx = document.getElementById('statusPieChart').getContext('2d'); if (statusChartInstance) statusChartInstance.destroy(); statusChartInstance = new Chart(pieCtx, { type: 'pie', data: { labels: ['Pagado', 'Pendiente', 'Atrasado'], datasets: [{ data: [statusCounts.Pagado, statusCounts.Pendiente, statusCounts.Atrasado], backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(239, 68, 68, 0.7)'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor } } } } });
    };
    const toggleModal = (modalEl, show) => modalEl.classList.toggle('hidden', !show);
    const showNotification = (title, message) => { confirmModal.title.textContent = title; confirmModal.message.textContent = message; confirmModal.buttons.innerHTML = '<button id="confirm-ok-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">Entendido</button>'; toggleModal(confirmModal.el, true); document.getElementById('confirm-ok-btn').onclick = () => toggleModal(confirmModal.el, false); };
    const showConfirmation = (title, message, callback) => { confirmModal.title.textContent = title; confirmModal.message.textContent = message; confirmModal.buttons.innerHTML = `<button id="confirm-cancel-btn" class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button><button id="confirm-action-btn" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">Confirmar</button>`; toggleModal(confirmModal.el, true); document.getElementById('confirm-cancel-btn').onclick = () => toggleModal(confirmModal.el, false); document.getElementById('confirm-action-btn').onclick = () => { callback(); toggleModal(confirmModal.el, false); }; };
    const populateForm = (data) => {
        debtorModal.form.reset(); populateClientSelect(data.clientId);
        Object.keys(data).forEach(key => { const input = debtorModal.form.elements[key]; if (input && !['retefuenteRate', 'reteicaRate'].includes(key)) { if (input.type === 'checkbox') input.checked = data[key]; else input.value = data[key]; } });
        debtorModal.retefuenteRateInput.value = data.retefuenteRate ? (data.retefuenteRate * 100) : (RETEFUENTE_RATE * 100);
        debtorModal.reteicaRateInput.value = data.reteicaRate ? (data.reteicaRate * 100) : (RETEICA_RATE * 100);
        updateRetencionesUI();
    };
    const populateClientSelect = (selectedClientId) => {
        const select = debtorModal.clientIdSelect; select.innerHTML = '';
        clients.sort((a, b) => a.name.localeCompare(b.name)).forEach(client => { const option = new Option(client.name, client.id); select.add(option); });
        select.add(new Option('-- Agregar Nuevo Cliente --', 'new'));
        if (selectedClientId) select.value = selectedClientId; else select.selectedIndex = -1;
        debtorModal.newClientContainer.classList.add('hidden'); debtorModal.newClientNameInput.required = false;
    };
    const openAddDebtorModal = () => { editingDebtorId = null; debtorModal.title.textContent = 'Agregar Deudor'; populateForm({}); toggleModal(debtorModal.el, true); };
    window.handleEdit = (id) => { const debtor = debtors.find(d => d.id === id); if (debtor) { editingDebtorId = id; debtorModal.title.textContent = 'Editar Deudor'; populateForm(debtor); toggleModal(debtorModal.el, true); } };
    window.handleDuplicate = (id) => { const debtor = debtors.find(d => d.id === id); if (debtor) { editingDebtorId = null; const duplicatedData = { ...debtor, id: null, invoiceNumber: '', dueDate: '', payments: [] }; debtorModal.title.textContent = 'Duplicar Registro'; populateForm(duplicatedData); toggleModal(debtorModal.el, true); } };
    window.openPaymentModal = (id) => {
        const debtor = debtors.find(d => d.id === id); if (!debtor) return;
        const clientName = (clients.find(c => c.id === debtor.clientId) || {}).name || 'N/A';
        paymentModal.title.textContent = `Pagos de: ${clientName}`; paymentModal.debtorIdInput.value = id;
        const tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [] };
        const accountSelect = document.getElementById('payment-account');
        accountSelect.innerHTML = '<option value="">No registrar en Tesorería</option>';
        if (tesoreriaData.accounts.length > 0) {
            tesoreriaData.accounts.forEach(acc => {
                accountSelect.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.bank})</option>`;
            });
        } else {
            accountSelect.innerHTML += '<option value="" disabled>No hay cuentas en Tesorería</option>';
        }
        paymentModal.history.innerHTML = (debtor.payments && debtor.payments.length > 0)
            ? `<ul class="space-y-2">${debtor.payments.map((p, index) => `<li class="flex justify-between items-center text-sm"><span>${formatCurrency(p.amount)} - ${p.date}</span><button onclick="window.handleDeletePayment(${id}, ${index})" class="text-red-500 hover:text-red-700 p-1 rounded-full"><i data-feather="trash-2" class="h-4 w-4"></i></button></li>`).join('')}</ul>`
            : '<p class="text-sm text-gray-500">No hay pagos registrados.</p>';
        feather.replace(); toggleModal(paymentModal.el, true);
    };
    window.openReminderModal = (id) => {
        const debtor = debtors.find(d => d.id === id); if (!debtor) return;
        const clientName = (clients.find(c => c.id === debtor.clientId) || {}).name || 'N/A';
        const totalPaid = (debtor.payments || []).reduce((sum, p) => sum + p.amount, 0); const totalRetenciones = (debtor.retencionFuente || 0) + (debtor.retencionICA || 0); const balance = (debtor.totalWithIVA || 0) - totalPaid - totalRetenciones;
        let message = '';
        if (debtor.status === 'Atrasado') message = `Hola ${clientName}, te escribimos para recordarte sobre tu ${debtor.documentType.toLowerCase()} N° ${debtor.invoiceNumber} por un saldo de ${formatCurrency(balance)}, la cual venció el ${debtor.dueDate}. Agradecemos que puedas realizar el pago a la brevedad posible. ¡Saludos cordiales!`;
        else if (debtor.status === 'Pendiente') message = `Hola ${clientName}, te enviamos un cordial recordatorio sobre tu ${debtor.documentType.toLowerCase()} N° ${debtor.invoiceNumber} por un valor de ${formatCurrency(balance)}. La fecha de vencimiento para el pago es el próximo ${debtor.dueDate}. ¡Gracias por tu atención! Saludos.`;
        else message = `Hola ${clientName}, este es un recordatorio informativo sobre tu ${debtor.documentType.toLowerCase()} N° ${debtor.invoiceNumber}. Nuestros registros indican que esta cuenta ya se encuentra saldada. ¡Muchas gracias por tu pago!`;
        reminderModal.messageTextarea.value = message; toggleModal(reminderModal.el, true);
    };
    debtorModal.form.addEventListener('submit', (e) => {
        e.preventDefault(); const formData = new FormData(debtorModal.form); const data = Object.fromEntries(formData.entries());
        let currentClientId = data.clientId;
        if (currentClientId === 'new') {
            const newName = debtorModal.newClientNameInput.value.trim();
            if (!newName) return showNotification('Error', 'El nombre del nuevo cliente no puede estar vacío.');
            if (clients.some(c => c.name.toLowerCase() === newName.toLowerCase())) return showNotification('Error', 'Ya existe un cliente con ese nombre.');
            const newClient = { id: Date.now(), name: newName }; clients.push(newClient); currentClientId = newClient.id;
        }
        ['subtotal', 'totalWithIVA', 'retencionFuente', 'retencionICA'].forEach(k => data[k] = parseFloat(data[k]) || 0);
        data.retefuenteRate = parseFloat(data.retefuenteRate) / 100 || 0; data.reteicaRate = parseFloat(data.reteicaRate) / 100 || 0;
        data.aplicaRetefuente = debtorModal.aplicaRetefuenteCheckbox.checked; data.aplicaReteICA = debtorModal.aplicaReteICACheckbox.checked;
        data.id = editingDebtorId || Date.now() + Math.random(); data.clientId = parseFloat(currentClientId);
        if (debtors.some(d => d.id !== data.id && d.clientId === data.clientId && d.invoiceNumber === data.invoiceNumber)) return showNotification('Error', 'Ya existe un registro para este cliente con el mismo número de documento.');
        const debtorToUpdate = editingDebtorId ? debtors.find(d => d.id === editingDebtorId) : null;
        const totalPaid = debtorToUpdate ? (debtorToUpdate.payments || []).reduce((sum, p) => sum + p.amount, 0) : 0;
        if (data.status === 'Pagado' && (data.totalWithIVA - totalPaid - data.retencionFuente - data.retencionICA) > 0.01) return showNotification('Acción no permitida', 'No se puede marcar como "Pagado" con saldo pendiente.');
        delete data.newClientName;
        if (editingDebtorId) { const index = debtors.findIndex(d => d.id === editingDebtorId); data.payments = debtors[index].payments || []; debtors[index] = data; showToast('Registro actualizado');
        } else { data.payments = []; debtors.push(data); showToast('Deudor agregado'); }
        editingDebtorId = null; saveState(); toggleModal(debtorModal.el, false);
    });
    paymentModal.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const debtor = debtors.find(d => d.id === parseFloat(paymentModal.debtorIdInput.value));
        const amount = parseFloat(paymentModal.amountInput.value);
        const date = paymentModal.dateInput.value;
        const accountId = document.getElementById('payment-account').value;
        if (debtor && amount > 0 && date) {
            if (!debtor.payments) debtor.payments = [];
            debtor.payments.push({ amount, date });
            if (accountId) {
                const tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [], manualTransactions: [] };
                tesoreriaData.manualTransactions.push({ id: Date.now(), date, accountId, type: 'inflow', description: `Recaudo ${debtor.documentType} ${debtor.invoiceNumber}`, amount });
                localStorage.setItem('tesoreria_data_v1', JSON.stringify(tesoreriaData));
                showToast('Ingreso registrado en Tesorería.', 'info');
            }
            saveState(); paymentModal.form.reset(); openPaymentModal(debtor.id); showToast('Pago agregado');
        }
    });
    window.handleDelete = (id) => showConfirmation("Confirmar Eliminación", "¿Estás seguro?", () => { debtors = debtors.filter(d => d.id !== id); saveState(); showToast('Registro eliminado', 'error'); });
    window.handleDeletePayment = (debtorId, paymentIndex) => showConfirmation("Eliminar Abono", "¿Estás seguro?", () => { const debtor = debtors.find(d => d.id === debtorId); if (debtor && debtor.payments) { debtor.payments.splice(paymentIndex, 1); saveState(); openPaymentModal(debtorId); showToast('Abono eliminado', 'error'); } });
    const updateRetencionesUI = () => {
        const subtotal = parseFloat(debtorModal.subtotalInput.value) || 0;
        const isRetefuenteChecked = debtorModal.aplicaRetefuenteCheckbox.checked; debtorModal.retefuenteContainer.classList.toggle('hidden', !isRetefuenteChecked);
        if (isRetefuenteChecked) { const rate = parseFloat(debtorModal.retefuenteRateInput.value) / 100 || 0; debtorModal.retencionFuenteInput.value = (subtotal * rate).toFixed(2); } else { debtorModal.retencionFuenteInput.value = 0; }
        const isReteICAChecked = debtorModal.aplicaReteICACheckbox.checked; debtorModal.reteicaContainer.classList.toggle('hidden', !isReteICAChecked);
        if (isReteICAChecked) { const rate = parseFloat(debtorModal.reteicaRateInput.value) / 100 || 0; debtorModal.retencionICAInput.value = (subtotal * rate).toFixed(2); } else { debtorModal.retencionICAInput.value = 0; }
    };
    const createDownloadLink = (blob, fileName) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); };
    const handleDownloadJson = () => { if(debtors.length === 0) return showNotification('Información', 'No hay datos para exportar.'); createDownloadLink(new Blob([JSON.stringify({debtors, clients}, null, 2)], { type: 'application/json' }), `backup_cobranza_${new Date().toISOString().slice(0, 10)}.json`); };
    const handleDownloadCsv = () => { if(debtors.length === 0) return showNotification('Información', 'No hay datos para exportar.'); const clientMap = new Map(clients.map(c => [c.id, c.name])); const headers = ["ID", "Cliente", "Tipo Documento", "N° Documento", "Subtotal", "Total c/IVA", "Total Pagado", "Retefuente", "ReteICA", "Saldo", "Fecha Vencimiento", "Estado", "Notas"]; const csvRows = debtors.map(d => { const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0); const balance = (d.totalWithIVA || 0) - totalPaid - (d.retencionFuente || 0) - (d.retencionICA || 0); return [d.id, `"${clientMap.get(d.clientId) || 'N/A'}"`, d.documentType, d.invoiceNumber, d.subtotal, d.totalWithIVA, totalPaid, d.retencionFuente || 0, d.retencionICA || 0, balance, d.dueDate, d.status, `"${(d.notes || '').replace(/"/g, '""')}"`].join(','); }); createDownloadLink(new Blob([[headers.join(','), ...csvRows].join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `reporte_cobranza_${new Date().toISOString().slice(0, 10)}.csv`); };
    const handleDownloadPdf = () => { if(debtors.length === 0) return showNotification('Información', 'No hay datos para exportar.'); const { jsPDF } = window.jspdf; const doc = new jsPDF(); const clientMap = new Map(clients.map(c => [c.id, c.name])); doc.setFontSize(18); doc.text("Reporte de Cobranza", 14, 22); doc.setFontSize(11); doc.setTextColor(100); doc.text(`Generado el: ${new Date().toLocaleDateString('es-CO', {dateStyle: 'full'})}`, 14, 30); const totalDeuda = debtors.reduce((s, d) => s + (d.totalWithIVA || 0), 0); const totalRecaudado = debtors.reduce((s, d) => s + (d.payments || []).reduce((sp, p) => sp + p.amount, 0), 0); doc.text(`Resumen:\n- Total Deuda: ${formatCurrency(totalDeuda)}\n- Total Recaudado: ${formatCurrency(totalRecaudado)}\n- Saldo Pendiente: ${formatCurrency(totalDeuda - totalRecaudado)}`, 14, 45); const tableColumn = ["Cliente / Documento", "Deuda", "Pagado", "Retenciones", "Saldo", "Vencimiento", "Estado"]; const tableRows = debtors.map(d => { const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0); const totalRetenciones = (d.retencionFuente || 0) + (d.retencionICA || 0); const balance = (d.totalWithIVA || 0) - totalPaid - totalRetenciones; return [`${clientMap.get(d.clientId) || 'N/A'}\n${d.invoiceNumber}`, formatCurrency(d.totalWithIVA), formatCurrency(totalPaid), formatCurrency(totalRetenciones), formatCurrency(balance), d.dueDate, d.status]; }); doc.autoTable({ head: [tableColumn], body: tableRows, startY: 80, headStyles: { fillColor: [22, 160, 133] }}); doc.save(`reporte_cobranza_${new Date().toISOString().slice(0, 10)}.pdf`); };
    const handleFileSelect = (e) => { const file = e.target.files[0]; if (!file) return; const process = (importedData) => showConfirmation("Importar Datos", `Esto reemplazará todos los datos actuales. ¿Continuar?`, () => { debtors = importedData.debtors || []; clients = importedData.clients || []; migrateData(true); saveState(); showToast(`Datos importados desde ${file.name.split('.').pop().toUpperCase()}`); }); if (file.type === 'application/json') { const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target.result); if (data.debtors) process(data); else if(Array.isArray(data)) process({debtors: data, clients: []}); else throw new Error();} catch { showNotification("Error", "El JSON no es válido."); } }; reader.readAsText(file); } else if (file.name.endsWith('.csv')) { Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => { try { const data = processCsvData(res.data, res.meta.fields); if (data.debtors.length > 0) process(data); } catch(err) { showNotification("Error", `No se pudo procesar el CSV. ${err.message}`); } }}); } else { showNotification("Error", "Formato no soportado."); } e.target.value = ''; };
    const processCsvData = (data, fields) => {
        const findHeader = (possibleNames, fieldList) => { for (const name of possibleNames) { const found = fieldList.find(f => f.trim().toLowerCase() === name.toLowerCase()); if(found) return found; } return null; };
        const parseCurrency = (value) => { if (typeof value !== 'string') return 0; return parseFloat(value.replace(/\$|\s|\./g, '').replace(',', '.')) || 0; };
        const parseDate = (value) => { if (typeof value !== 'string' || !value.includes('/')) { return new Date().toISOString().slice(0, 10); } const parts = value.split('/'); if (parts.length !== 3) { return new Date().toISOString().slice(0, 10); } const [day, month, year] = parts.map(p => p.trim().padStart(2, '0')); if (year.length === 4) { return `${year}-${month}-${day}`; } return new Date().toISOString().slice(0, 10); };
        const headers = {
            clientName: findHeader(['empresa'], fields), fv: findHeader(['fv'], fields), cc: findHeader(['cc'], fields),
            total: findHeader(['total'], fields), subtotal: findHeader(['subtotal'], fields),
            dueDate: findHeader(['fecha de factura'], fields), status: findHeader(['estado'], fields),
            notes: findHeader(['observaciones'], fields), paymentAmount: findHeader(['valor pagado'], fields),
            paymentDate: findHeader(['fecha de pago'], fields),
        };
        if (!headers.clientName || (!headers.fv && !headers.cc) || !headers.total || !headers.dueDate) { throw new Error("CSV debe tener columnas: EMPRESA, FV o CC, TOTAL, y FECHA DE FACTURA."); }
        const tempClients = [], tempDebtors = [], clientNameToIdMap = new Map();
        data.forEach(row => {
            const clientName = row[headers.clientName]; if (!clientName || clientName.trim() === '') return;
            let clientId;
            if (clientNameToIdMap.has(clientName)) { clientId = clientNameToIdMap.get(clientName); } else { clientId = Date.now() + Math.random(); clientNameToIdMap.set(clientName, clientId); tempClients.push({ id: clientId, name: clientName }); }
            const invoiceNumber = row[headers.fv] || row[headers.cc] || 'N/A';
            const documentType = row[headers.fv] ? 'Factura Electrónica' : 'Cuenta de Cobro';
            const totalWithIVA = parseCurrency(row[headers.total]); const subtotal = headers.subtotal ? parseCurrency(row[headers.subtotal]) : totalWithIVA / (1 + IVA_RATE);
            const newDebtor = { id: Date.now() + Math.random(), clientId, documentType, invoiceNumber, subtotal, totalWithIVA, dueDate: parseDate(row[headers.dueDate]), status: (row[headers.status] || 'Pendiente').trim().toUpperCase() === 'CANCELADO' ? 'Pagado' : 'Pendiente', notes: row[headers.notes] || '', payments: [], aplicaRetefuente: false, aplicaReteICA: false, retencionFuente: 0, retencionICA: 0, };
            const paymentAmount = headers.paymentAmount ? parseCurrency(row[headers.paymentAmount]) : 0;
            if (paymentAmount > 0 && headers.paymentDate && row[headers.paymentDate]) { newDebtor.payments.push({ amount: paymentAmount, date: parseDate(row[headers.paymentDate]) }); }
            if (newDebtor.status === 'Pagado' && newDebtor.payments.length === 0 && totalWithIVA > 0) { newDebtor.payments.push({ amount: totalWithIVA, date: newDebtor.dueDate }); }
            tempDebtors.push(newDebtor);
        });
        return { debtors: tempDebtors, clients: tempClients };
    };
    const migrateData = (force = false) => {
        if (debtors.length > 0 && debtors[0].hasOwnProperty('name') && !debtors[0].hasOwnProperty('clientId')) {
            console.log("Migrando datos..."); const clientNameToIdMap = new Map(); const newClients = [];
            debtors.forEach(debtor => { if (!clientNameToIdMap.has(debtor.name)) { const newId = Date.now() + Math.random(); clientNameToIdMap.set(debtor.name, newId); newClients.push({ id: newId, name: debtor.name }); } debtor.clientId = clientNameToIdMap.get(debtor.name); delete debtor.name; });
            clients = newClients; saveClients(); saveState(false); showToast("Datos actualizados al nuevo formato de clientes.");
        } else if (force) {
            const clientNameToIdMap = new Map(clients.map(c => [c.name, c.id])); const newClients = [];
            debtors.forEach(debtor => { if (debtor.name && !debtor.clientId) { if (!clientNameToIdMap.has(debtor.name)) { const newId = Date.now() + Math.random(); clientNameToIdMap.set(debtor.name, newId); newClients.push({ id: newId, name: debtor.name }); } debtor.clientId = clientNameToIdMap.get(debtor.name); delete debtor.name; } });
            clients = [...clients, ...newClients];
        }
    };
    const applyTheme = (theme) => { 
        document.documentElement.classList.toggle('dark', theme === 'dark'); 
        if(debtChartInstance) renderCharts(); 
    };
    themeToggle.addEventListener('click', () => { 
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'; 
        localStorage.setItem('theme', newTheme); 
        applyTheme(newTheme); 
    });
    addDebtorBtn.addEventListener('click', openAddDebtorModal); addFirstDebtorBtn.addEventListener('click', openAddDebtorModal);
    undoBtn.addEventListener('click', undo); redoBtn.addEventListener('click', redo);
    document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'z' && !undoBtn.disabled) { e.preventDefault(); undo(); } if (e.ctrlKey && e.key === 'y' && !redoBtn.disabled) { e.preventDefault(); redo(); } });
    searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    filterButtonsContainer.addEventListener('click', (e) => { if (e.target.classList.contains('filter-btn')) { document.querySelector('.filter-btn.active').classList.remove('active'); e.target.classList.add('active'); currentFilter.status = e.target.dataset.status; currentPage = 1; renderTable(); } });
    monthFilter.addEventListener('change', (e) => { currentPage = 1; currentFilter.month = e.target.value; renderTable(); });
    tableHeader.addEventListener('click', (e) => { const header = e.target.closest('.sortable'); if (header) { const newSort = header.dataset.sort; sortDirection = (sortColumn === newSort && sortDirection === 'asc') ? 'desc' : 'asc'; sortColumn = newSort; renderTable(); } });
    debtorModal.closeBtn.onclick = () => toggleModal(debtorModal.el, false); debtorModal.cancelBtn.onclick = () => toggleModal(debtorModal.el, false);
    paymentModal.closeBtn.onclick = () => toggleModal(paymentModal.el, false);
    debtorModal.subtotalInput.addEventListener('input', () => { const subtotal = parseFloat(debtorModal.subtotalInput.value) || 0; debtorModal.totalWithIVAInput.value = (subtotal * (1 + IVA_RATE)).toFixed(2); updateRetencionesUI(); });
    debtorModal.aplicaRetefuenteCheckbox.onchange = updateRetencionesUI; debtorModal.retefuenteRateInput.addEventListener('input', updateRetencionesUI);
    debtorModal.aplicaReteICACheckbox.onchange = updateRetencionesUI; debtorModal.reteicaRateInput.addEventListener('input', updateRetencionesUI);
    debtorModal.documentTypeSelect.onchange = (e) => { debtorModal.invoiceNumberLabel.textContent = e.target.value === 'Cuenta de Cobro' ? 'Número Cuenta' : 'Número Factura'; };
    debtorModal.clientIdSelect.addEventListener('change', (e) => { const isNew = e.target.value === 'new'; debtorModal.newClientContainer.classList.toggle('hidden', !isNew); debtorModal.newClientNameInput.required = isNew; });
    downloadButtons.json.onclick = handleDownloadJson; downloadButtons.csv.onclick = handleDownloadCsv; downloadButtons.pdf.onclick = handleDownloadPdf;
    downloadButtons.template.addEventListener('click', () => { const headers = "EMPRESA,FV,CC,FECHA DE FACTURA,TOTAL,ESTADO,OBSERVACIONES"; const example1 = `"Cliente de Ejemplo S.A.S.",FV-101,,25/08/2025,"$ 1.500.000",Pendiente,"Servicio de consultoría mes de Agosto"`; const example2 = `"Otro Cliente Ltda.",,CC-005,20/08/2025,"$ 850.000",Pagado,"Venta de producto X"`; const csvContent = [headers, example1, example2].join('\r\n'); createDownloadLink(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), 'plantilla_importacion.csv'); });
    importBtn.onclick = () => importFileInput.click(); importFileInput.onchange = handleFileSelect;
    reminderModal.closeBtn.onclick = () => toggleModal(reminderModal.el, false);
    reminderModal.copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(reminderModal.messageTextarea.value).then(() => { showToast('¡Mensaje copiado!'); toggleModal(reminderModal.el, false); }).catch(err => showNotification('Error', 'No se pudo copiar el texto.')); });
    
    // --- Initial Load ---
    loadClients(); 
    debtors = JSON.parse(localStorage.getItem('debtors')) || [];
    migrateData(); 
    updateOverdueStatus(); 
    pushStateToHistory({ debtors, clients }); 
    render(); 
    applyTheme(localStorage.getItem('theme') || 'light');
});