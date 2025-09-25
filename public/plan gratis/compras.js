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

    // --- 1. CONFIG & SELECTORS ---
    const dom = {
        themeToggle: document.getElementById('theme-toggle'),
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
        formModal: { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form'), closeBtn: document.getElementById('close-modal-btn') },
    };
    
    let comprasData = {};
    let inventoryData = [];
    let currentModule = 'dashboard';
    let editingId = null;
    let supplierChartInstance = null;
    const defaultData = { suppliers: [], purchaseOrders: [], bills: [] };
    
    // --- 2. DATA HANDLING ---
    const saveData = () => localStorage.setItem('compras_data_v1', JSON.stringify(comprasData));
    const loadData = () => {
        comprasData = JSON.parse(localStorage.getItem('compras_data_v1')) || JSON.parse(JSON.stringify(defaultData));
        inventoryData = JSON.parse(localStorage.getItem('inventory')) || [];
    };
    
    // --- 3. UTILITIES ---
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        toast.className = `toast ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg`;
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3000);
    };
    const toggleModal = (show) => dom.formModal.el.classList.toggle('hidden', !show);
    const getSupplierName = (id) => (comprasData.suppliers.find(s => s.id == id) || {name: 'N/A'}).name;

    // --- 4. UI RENDERING ---
    const render = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        if (activeTab) renderModule(activeTab.dataset.target.replace('-section', ''));
        feather.replace();
    };

    const renderModule = (moduleKey) => {
        currentModule = moduleKey;
        dom.mainContent.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
        const section = document.getElementById(`${moduleKey}-section`) || document.getElementById('table-section');
        
        if (moduleKey === 'dashboard') renderDashboard();
        else renderTable(moduleKey);
        
        section.classList.remove('hidden');
    };

    const renderDashboard = () => {
        const totalDebt = comprasData.bills.filter(b => b.status !== 'Pagada').reduce((sum, bill) => sum + (bill.balance || 0), 0);
        const overdueBills = comprasData.bills.filter(b => b.status !== 'Pagada' && new Date(b.dueDate) < new Date()).length;
        const pendingPOs = comprasData.purchaseOrders.filter(p => p.status === 'Pendiente').length;
        document.getElementById('dash-total-debt').textContent = formatCurrency(totalDebt);
        document.getElementById('dash-overdue-bills').textContent = overdueBills;
        document.getElementById('dash-pending-pos').textContent = pendingPOs;
        document.getElementById('dash-supplier-count').textContent = comprasData.suppliers.length;
        renderSupplierSpendingChart();
    };

    const renderSupplierSpendingChart = () => {
        const spending = {};
        comprasData.bills.forEach(bill => {
            const name = getSupplierName(bill.supplierId);
            spending[name] = (spending[name] || 0) + bill.total;
        });
        const sortedSuppliers = Object.entries(spending).sort(([,a], [,b]) => b - a).slice(0, 5);
        
        const ctx = document.getElementById('supplier-spending-chart').getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';

        if(supplierChartInstance) supplierChartInstance.destroy();
        supplierChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedSuppliers.map(s => s[0]),
                datasets: [{
                    label: 'Gasto Total',
                    data: sortedSuppliers.map(s => s[1]),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: textColor, callback: value => formatCurrency(value) }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { display: false } } }, plugins: { legend: { display: false } } }
        });
    };
    
    const moduleConfig = {
        suppliers: { title: 'Proveedores', headers: ['Nombre', 'NIT', 'Contacto', 'Email/Teléfono', 'Acciones'] },
        purchaseOrders: { title: 'Órdenes de Compra', headers: ['OC #', 'Proveedor', 'Fecha', 'Total', 'Estado', 'Acciones'] },
        bills: { title: 'Facturas de Proveedor', headers: ['Factura #', 'Proveedor', 'Fecha Venc.', 'Total', 'Saldo', 'Estado', 'Acciones'] }
    };

    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const tableSection = document.getElementById('table-section');
        tableSection.querySelector('#table-title').textContent = config.title;
        tableSection.querySelector('#add-item-btn').onclick = () => openFormModal(moduleKey);

        const tableHead = tableSection.querySelector('#table-head');
        const tableBody = tableSection.querySelector('#table-body');
        tableHead.innerHTML = `<tr>${config.headers.map(h => `<th class="px-4 py-3 text-left font-semibold uppercase text-xs">${h}</th>`).join('')}</tr>`;
        
        const data = comprasData[moduleKey].slice().reverse();
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableSection.querySelector('#no-data-message').innerHTML = `<p class="text-gray-500 dark:text-gray-400">No hay ${config.title.toLowerCase()} registrados.</p>`;
            tableSection.querySelector('#no-data-message').classList.remove('hidden');
        } else {
            tableSection.querySelector('#no-data-message').classList.add('hidden');
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 dark:hover:bg-gray-700/50";
            let cells = '';
            
            switch(moduleKey) {
                case 'suppliers':
                    cells = `<td class="px-4 py-3">${item.name}</td><td class="px-4 py-3">${item.nit}</td><td class="px-4 py-3">${item.contactName}</td><td class="px-4 py-3">${item.email}<br>${item.phone}</td>`;
                    break;
                case 'purchaseOrders':
                    const totalPO = (item.items || []).reduce((sum, i) => sum + ((i.quantity || 0) * (i.price || 0)), 0);
                    const statusColorPO = item.status === 'Recibido' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                    cells = `<td class="px-4 py-3">${item.id}</td><td class="px-4 py-3">${getSupplierName(item.supplierId)}</td><td class="px-4 py-3">${item.date}</td><td class="px-4 py-3">${formatCurrency(totalPO)}</td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColorPO}">${item.status}</span></td>`;
                    break;
                case 'bills':
                    const isOverdue = item.status !== 'Pagada' && new Date(item.dueDate) < new Date();
                    const statusColorBill = item.status === 'Pagada' ? 'bg-green-100 text-green-800' : isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                    const statusText = isOverdue ? 'Vencida' : item.status;
                    cells = `<td class="px-4 py-3">${item.invoiceNumber}</td><td class="px-4 py-3">${getSupplierName(item.supplierId)}</td><td class="px-4 py-3">${item.dueDate}</td><td class="px-4 py-3">${formatCurrency(item.total)}</td><td class="px-4 py-3 font-bold">${formatCurrency(item.balance)}</td><td class="px-4 py-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColorBill}">${statusText}</span></td>`;
                    break;
            }

            let actions = '<div class="flex items-center justify-center gap-1">';
            if (moduleKey === 'purchaseOrders' && item.status === 'Pendiente') {
                actions += `<button onclick="window.markAsReceived(${item.id})" class="action-btn text-green-600" title="Marcar como Recibido"><i data-feather="check-square" class="h-5 w-5"></i></button>`;
            }
            if (moduleKey === 'bills' && item.status !== 'Pagada') {
                actions += `<button onclick="window.registerPayment(${item.id})" class="action-btn text-green-600" title="Registrar Pago"><i data-feather="dollar-sign" class="h-5 w-5"></i></button>`;
            }
            actions += `<button onclick="window.handleEdit('${moduleKey}', ${item.id})" class="action-btn text-blue-600" title="Editar"><i data-feather="edit-2" class="h-5 w-5"></i></button>
                        <button onclick="window.handleDelete('${moduleKey}', ${item.id})" class="action-btn text-red-600" title="Eliminar"><i data-feather="trash-2" class="h-5 w-5"></i></button>`;
            actions += '</div>';
            
            tr.innerHTML = `${cells}<td class="px-4 py-3 text-center">${actions}</td>`;
            tableBody.appendChild(tr);
        });
        feather.replace();
    };
    
    const getSupplierOptions = (selectedId) => comprasData.suppliers.map(s => `<option value="${s.id}" ${s.id == selectedId ? 'selected' : ''}>${s.name}</option>`).join('');
    const getProductOptions = () => inventoryData.map(p => `<option value="${p.id}" data-price="${p.costPrice || 0}">${p.name} (SKU: ${p.sku})</option>`).join('');

    const formTemplates = {
        suppliers: (data = {}) => `<input type="hidden" name="id" value="${data.id||''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label>Nombre Proveedor</label><input type="text" name="name" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.name||''}" required></div><div><label>NIT/Cédula</label><input type="text" name="nit" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.nit||''}"></div><div><label>Nombre Contacto</label><input type="text" name="contactName" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.contactName||''}"></div><div><label>Teléfono</label><input type="tel" name="phone" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.phone||''}"></div><div class="md:col-span-2"><label>Email</label><input type="email" name="email" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.email||''}"></div></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Guardar</button></div>`,
        purchaseOrders: (data = {}) => `<input type="hidden" name="id" value="${data.id||''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><label>Proveedor</label><select name="supplierId" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" required>${getSupplierOptions(data.supplierId)}</select></div><div><label>Fecha</label><input type="date" name="date" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.date || new Date().toISOString().slice(0,10)}" required></div></div><h4 class="font-bold mt-6 mb-2">Items</h4><div id="po-items-container" class="space-y-2"></div><button type="button" id="add-po-item-btn" class="mt-2 text-sm text-blue-600 hover:underline flex items-center"><i data-feather="plus" class="mr-1 h-4 w-4"></i>Agregar</button><div class="text-right font-bold text-xl mt-4">Total: <span id="po-total"></span></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Guardar</button></div>`,
        bills: (data = {}) => `<input type="hidden" name="id" value="${data.id||''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label>Proveedor</label><select name="supplierId" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" required>${getSupplierOptions(data.supplierId)}</select></div><div><label>N° de Factura</label><input type="text" name="invoiceNumber" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.invoiceNumber||''}" required></div><div><label>Fecha Factura</label><input type="date" name="date" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.date || new Date().toISOString().slice(0,10)}" required></div><div><label>Fecha Vencimiento</label><input type="date" name="dueDate" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.dueDate||''}" required></div><div class="md:col-span-2"><label>Total Factura</label><input type="number" step="0.01" name="total" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.total||''}" required></div></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Guardar</button></div>`
    };

    const openFormModal = (moduleKey, id = null) => {
        editingId = id;
        const data = id ? comprasData[moduleKey].find(i => i.id == id) : {};
        dom.formModal.title.textContent = `${id ? 'Editar' : 'Agregar'} ${moduleConfig[moduleKey].title.slice(0, -1)}`;
        dom.formModal.form.innerHTML = formTemplates[moduleKey](data);
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(false);
        if (moduleKey === 'purchaseOrders') setupPOForm(data.items || []);
        toggleModal(true);
        feather.replace();
    };

    const setupPOForm = (items) => {
        const container = document.getElementById('po-items-container');
        const addBtn = document.getElementById('add-po-item-btn');
        const addItemRow = (item = {}) => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-2 items-center';
            row.innerHTML = `<select name="productId" class="col-span-6 border rounded p-2 dark:bg-gray-700 item-product"><option value="">Seleccionar producto...</option>${getProductOptions()}</select><input type="number" name="quantity" placeholder="Cant." class="col-span-2 border rounded p-2 dark:bg-gray-700 item-quantity" value="${item.quantity||1}"><input type="number" name="price" placeholder="Precio" class="col-span-3 border rounded p-2 dark:bg-gray-700 item-price" value="${item.price||0}"><button type="button" class="col-span-1 text-red-500 remove-item-btn"><i data-feather="trash-2"></i></button>`;
            if (item.productId) row.querySelector('[name="productId"]').value = item.productId;
            container.appendChild(row);
            feather.replace();
        };
        const calculateTotal = () => {
            let total = 0;
            container.querySelectorAll('.grid').forEach(row => {
                const qty = parseFloat(row.querySelector('.item-quantity').value) || 0;
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                total += qty * price;
            });
            document.getElementById('po-total').textContent = formatCurrency(total);
        };
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-product')) {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const price = selectedOption.dataset.price || 0;
                e.target.closest('.grid').querySelector('.item-price').value = price;
            }
            calculateTotal();
        });
        container.addEventListener('input', calculateTotal);
        container.addEventListener('click', e => { if (e.target.closest('.remove-item-btn')) { e.target.closest('.grid').remove(); calculateTotal(); } });
        addBtn.onclick = () => addItemRow();
        (items.length > 0 ? items : [{}]).forEach(addItemRow);
        calculateTotal();
    };
    
    dom.formModal.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(dom.formModal.form);
        const data = Object.fromEntries(formData.entries());

        if (currentModule === 'purchaseOrders') {
            data.items = Array.from(dom.formModal.form.querySelectorAll('#po-items-container .grid')).map(row => ({
                productId: row.querySelector('[name="productId"]').value,
                quantity: row.querySelector('[name="quantity"]').value,
                price: row.querySelector('[name="price"]').value,
            }));
        }
        if (currentModule === 'bills') {
            data.total = parseFloat(data.total);
        }

        if (editingId) {
            const index = comprasData[currentModule].findIndex(i => i.id == editingId);
            const existingItem = comprasData[currentModule][index];
            comprasData[currentModule][index] = { ...existingItem, ...data, id: editingId };
        } else {
            data.id = Date.now();
            if (currentModule === 'bills') {
                data.balance = data.total;
                data.status = 'Pendiente';
            }
             if (currentModule === 'purchaseOrders') {
                data.status = 'Pendiente';
            }
            comprasData[currentModule].push(data);
        }
        saveData(); render(); toggleModal(false);
    });

    window.handleEdit = (module, id) => openFormModal(module, id);
    window.handleDelete = (module, id) => {
        if (confirm('¿Seguro que deseas eliminar este registro?')) {
            comprasData[module] = comprasData[module].filter(i => i.id != id);
            saveData(); render();
        }
    };
    window.markAsReceived = (id) => {
        const poIndex = comprasData.purchaseOrders.findIndex(p => p.id == id);
        if (poIndex > -1) {
            comprasData.purchaseOrders[poIndex].status = 'Recibido';
            
            // **NUEVA LÓGICA DE INTEGRACIÓN**
            const receivedData = {
                purchaseOrderId: id,
                items: comprasData.purchaseOrders[poIndex].items
            };
            localStorage.setItem('inventoryUpdateFromPO', JSON.stringify(receivedData));
            
            saveData();
            render();
            showToast('Orden marcada como recibida. El inventario se actualizará.');
        }
    };
    window.registerPayment = (billId) => {
        const bill = comprasData.bills.find(b => b.id == billId);
        if (!bill) return;
        const payment = parseFloat(prompt(`Registrar pago para Factura #${bill.invoiceNumber}\nSaldo actual: ${formatCurrency(bill.balance)}\n\nIngrese el monto del pago:`, bill.balance));
        
        if (!isNaN(payment) && payment > 0) {
            bill.balance -= payment;
            if(bill.balance <= 0.01) {
                bill.balance = 0;
                bill.status = 'Pagada';
            }

            // Integración con Tesorería
            const tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [], manualTransactions: [] };
            if(tesoreriaData.accounts.length > 0) {
                const primaryAccount = tesoreriaData.accounts[0].id;
                const newTransaction = {
                    id: Date.now(),
                    date: new Date().toISOString().slice(0,10),
                    accountId: primaryAccount,
                    type: 'outflow',
                    description: `Pago Factura Proveedor #${bill.invoiceNumber}`,
                    amount: payment
                };
                tesoreriaData.manualTransactions.push(newTransaction);
                localStorage.setItem('tesoreria_data_v1', JSON.stringify(tesoreriaData));
                showToast(`Egreso de ${formatCurrency(payment)} registrado en Tesorería.`, 'info');
            } else {
                showToast('Pago registrado, pero no se encontró cuenta en Tesorería para el egreso.', 'error');
            }

            saveData();
            render();
            showToast('Pago registrado con éxito.');
        }
    };

    const init = () => {
        const applyTheme = (theme) => {
            document.documentElement.classList.toggle('dark', theme === 'dark');
        };
        applyTheme(localStorage.getItem('theme') || 'light');
        dom.themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            if (currentModule === 'dashboard') renderDashboard();
        });

        dom.tabsContainer.addEventListener('click', e => {
            const button = e.target.closest('.tab-btn');
            if (button) {
                dom.tabsContainer.querySelector('.tab-btn.active').classList.remove('active');
                button.classList.add('active');
                render();
            }
        });
        
        dom.formModal.closeBtn.onclick = () => toggleModal(false);
        
        loadData();
        render();
    };
    
    init();
});