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
    
    const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');
    const themeToggle = document.getElementById('theme-toggle');
    applyTheme(localStorage.getItem('theme') || 'light');
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        renderPage();
    });

    // --- CONFIGURACIÓN Y SELECTORES ---
    const dom = {
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
        formModal: { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form'), closeBtn: document.getElementById('close-modal-btn') },
        toastContainer: document.getElementById('toast-container')
    };

    let ventasData = {};
    let clientsData = [];
    let inventoryData = [];
    let currentModule = 'dashboard';
    let editingId = null;

    const defaultData = {
        quotes: [],
        orders: []
    };

    // --- LÓGICA DE DATOS ---
    const saveData = () => localStorage.setItem('ventas_data_v1', JSON.stringify(ventasData));
    const loadData = () => {
        ventasData = JSON.parse(localStorage.getItem('ventas_data_v1')) || JSON.parse(JSON.stringify(defaultData));
        clientsData = JSON.parse(localStorage.getItem('clients')) || [];
        inventoryData = JSON.parse(localStorage.getItem('inventory')) || [];
    };

    // --- UTILIDADES ---
    const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
    const showToast = (message, type = 'success') => {
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        const icon = type === 'success' ? 'check-circle' : 'alert-triangle';
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg flex items-center gap-2`;
        toastElement.innerHTML = `<i data-feather="${icon}" class="h-5 w-5"></i><span>${message}</span>`;
        dom.toastContainer.appendChild(toastElement);
        feather.replace();
        setTimeout(() => toastElement.classList.add('show'), 10);
        setTimeout(() => {
            toastElement.classList.remove('show');
            setTimeout(() => toastElement.remove(), 500);
        }, 3000);
    };
    const toggleModal = (modalEl, show) => modalEl.classList.toggle('hidden', !show);
    const getClientOptions = (selectedId = null) => {
        return clientsData.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
    };
    const getClientName = (id) => (clientsData.find(c => c.id == id) || { name: 'N/A' }).name;
    const getProductOptions = (selectedId = null) => {
        return inventoryData.map(p => `<option value="${p.id}" data-price="${p.salePrice}" ${p.id == selectedId ? 'selected' : ''}>${p.name} (Stock: ${p.quantity})</option>`).join('');
    };

    // --- RENDERIZADO DE UI ---
    const renderPage = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        const targetId = activeTab ? activeTab.dataset.target : 'dashboard-section';
        currentModule = targetId.replace('-section', '');
        dom.mainContent.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

        const section = document.getElementById('table-section');
        
        if (currentModule === 'dashboard') {
            document.getElementById('dashboard-section').classList.remove('hidden');
            section.classList.add('hidden');
            renderDashboard();
        } else {
            document.getElementById('dashboard-section').classList.add('hidden');
            section.classList.remove('hidden');
            renderTable(currentModule);
        }
        feather.replace();
    };

    const renderDashboard = () => {
        const section = document.getElementById('dashboard-section');
        const quotesValue = ventasData.quotes.reduce((sum, q) => sum + (q.total || 0), 0);
        const ordersValue = ventasData.orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const conversionRate = quotesValue > 0 ? (ordersValue / quotesValue) * 100 : 0;

        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Dashboard de Ventas</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Valor Total Cotizado</h3><p class="text-3xl font-bold text-blue-600 mt-1">${formatCurrency(quotesValue)}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Ventas Cerradas (Pedidos)</h3><p class="text-3xl font-bold text-green-600 mt-1">${formatCurrency(ordersValue)}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Tasa de Conversión</h3><p class="text-3xl font-bold text-teal-600 mt-1">${conversionRate.toFixed(1)}%</p></div>
            </div>`;
    };

    const moduleConfig = {
        quotes: { title: 'Cotizaciones', headers: ['#', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones'] },
        orders: { title: 'Pedidos de Venta', headers: ['#', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acciones'] }
    };

    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const section = document.getElementById('table-section');
        section.innerHTML = `
             <div class="flex justify-between items-center mb-4"><h2 class="text-2xl font-bold">${config.title}</h2><button id="add-item-btn" class="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center"><i data-feather="plus" class="mr-2"></i>Agregar</button></div>
             <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto"><table class="w-full">
                    <thead class="bg-gray-200 dark:bg-gray-700"><tr>${config.headers.map(h => `<th class="p-4 text-left font-semibold">${h}</th>`).join('')}</tr></thead>
                    <tbody id="table-body" class="divide-y dark:divide-gray-600"></tbody>
                </table></div>
             </div>`;
        
        document.getElementById('add-item-btn').onclick = () => openFormModal(moduleKey);

        const tableBody = document.getElementById('table-body');
        const data = ventasData[moduleKey];
        tableBody.innerHTML = data.map(item => {
            const statusColors = {'Borrador': 'bg-gray-200 text-gray-800', 'Enviada': 'bg-blue-200 text-blue-800', 'Aceptada': 'bg-green-200 text-green-800', 'Rechazada': 'bg-red-200 text-red-800', 'Completado': 'bg-green-200 text-green-800', 'Facturado': 'bg-purple-200 text-purple-800'};
            const statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status]}">${item.status}</span>`;
            const cells = `<td class="p-4">${item.number}</td><td class="p-4">${getClientName(item.clientId)}</td><td class="p-4">${item.date}</td><td class="p-4 font-semibold">${formatCurrency(item.total)}</td><td class="p-4">${statusBadge}</td>`;
            let actions = `<button onclick="window.handleEdit('${moduleKey}', ${item.id})" class="text-blue-600 mr-2"><i data-feather="edit-2"></i></button>`;
            if(moduleKey === 'quotes' && item.status === 'Aceptada') {
                actions += `<button onclick="window.convertToOrder(${item.id})" class="text-green-600 mr-2" title="Convertir a Pedido"><i data-feather="check-circle"></i></button>`;
            }
            return `<tr>${cells}<td class="p-4 text-right">${actions}</td></tr>`;
        }).join('');
    };

    // --- FORMULARIOS ---
    const formTemplates = {
        quotes: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                <div class="grid md:grid-cols-3 gap-4">
                    <div><label># Cotización</label><input name="number" class="input" value="${data.number || `COT-${Date.now()}`}"></div>
                    <div><label>Cliente</label><select name="clientId" class="input">${getClientOptions(data.clientId)}</select></div>
                    <div><label>Fecha</label><input type="date" name="date" class="input" value="${data.date || new Date().toISOString().slice(0,10)}"></div>
                </div>
                <div id="item-list" class="space-y-2 border-t pt-4">
                    <div class="grid grid-cols-12 gap-2 text-sm font-bold"><div class="col-span-5">Producto</div><div class="col-span-2">Cantidad</div><div class="col-span-2">Precio Unit.</div><div class="col-span-2 text-right">Subtotal</div></div>
                </div>
                <button type="button" id="add-item-btn" class="text-sm bg-gray-200 dark:bg-gray-600 py-1 px-3 rounded-md hover:bg-gray-300">+ Añadir Producto</button>
                <div class="text-right font-bold text-xl border-t pt-4">Total: <span id="total-display">$0</span></div>
                <div><label>Estado</label><select name="status" class="input"><option ${data.status === 'Borrador' ? 'selected' : ''}>Borrador</option><option ${data.status === 'Enviada' ? 'selected' : ''}>Enviada</option><option ${data.status === 'Aceptada' ? 'selected' : ''}>Aceptada</option><option ${data.status === 'Rechazada' ? 'selected' : ''}>Rechazada</option></select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t"><button type="button" id="cancel-btn" class="btn-secondary mr-2">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>`,
        orders: (data = {}) => `...` // Placeholder for orders form, similar to quotes
    };

    const openFormModal = (moduleKey, id = null) => {
        editingId = id;
        const data = id ? ventasData[moduleKey].find(i => i.id == id) : {};
        dom.formModal.title.textContent = `${id ? 'Editar' : 'Nueva'} ${moduleConfig[moduleKey].title.slice(0,-1)}`;
        const formHtml = formTemplates[moduleKey](data)
             .replace(/<label>/g, '<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">')
             .replace(/class="input"/g, 'class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"')
             .replace(/class="btn-primary"/g, 'class="bg-blue-600 text-white py-2 px-4 rounded-lg"')
             .replace(/class="btn-secondary"/g, 'class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-lg"');
        dom.formModal.form.innerHTML = formHtml;
        
        setupItemHandlers(data.items);
        
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(dom.formModal.el, false);
        toggleModal(dom.formModal.el, true);
        feather.replace();
    };

    const setupItemHandlers = (items = []) => {
        document.getElementById('add-item-btn').onclick = () => addItemRow();
        const itemList = document.getElementById('item-list');
        itemList.addEventListener('change', e => {
            if(e.target.name === 'productId') {
                const price = e.target.options[e.target.selectedIndex].dataset.price || 0;
                e.target.closest('.item-row').querySelector('[name="unitPrice"]').value = price;
            }
            calculateTotal();
        });
        itemList.addEventListener('input', calculateTotal);
        itemList.addEventListener('click', e => {
            if (e.target.closest('.remove-item-btn')) {
                e.target.closest('.item-row').remove();
                calculateTotal();
            }
        });
        if (items.length > 0) items.forEach(addItemRow);
        else addItemRow();
    };

    const addItemRow = (item = {}) => {
        const div = document.createElement('div');
        div.className = "grid grid-cols-12 gap-2 items-center item-row";
        div.innerHTML = `
            <select name="productId" class="input col-span-5"><option value="">Seleccionar...</option>${getProductOptions(item.productId)}</select>
            <input type="number" name="quantity" value="${item.quantity || 1}" class="input text-center" min="1">
            <input type="number" name="unitPrice" value="${item.unitPrice || 0}" class="input text-right" min="0">
            <div class="text-right font-semibold col-span-2" name="itemTotal">$0</div>
            <button type="button" class="text-red-500 hover:text-red-700 remove-item-btn col-span-1"><i data-feather="trash-2" class="h-4 w-4"></i></button>`;
        document.getElementById('item-list').appendChild(div);
        feather.replace();
        calculateTotal();
    };
    
    const calculateTotal = () => {
        let total = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            const qty = parseFloat(row.querySelector('[name="quantity"]').value) || 0;
            const price = parseFloat(row.querySelector('[name="unitPrice"]').value) || 0;
            const itemTotal = qty * price;
            row.querySelector('[name="itemTotal"]').textContent = formatCurrency(itemTotal);
            total += itemTotal;
        });
        document.getElementById('total-display').textContent = formatCurrency(total);
    };
    
    dom.formModal.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.items = Array.from(document.querySelectorAll('.item-row')).map(row => ({
            productId: row.querySelector('[name="productId"]').value,
            quantity: parseFloat(row.querySelector('[name="quantity"]').value),
            unitPrice: parseFloat(row.querySelector('[name="unitPrice"]').value)
        }));
        data.total = data.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
        data.clientId = parseInt(data.clientId);
        
        if (editingId) {
            const index = ventasData[currentModule].findIndex(i => i.id == editingId);
            ventasData[currentModule][index] = { ...ventasData[currentModule][index], ...data, id: Number(editingId) };
        } else {
            data.id = Date.now();
            ventasData[currentModule].push(data);
        }
        saveData();
        renderPage();
        toggleModal(dom.formModal.el, false);
    });

    window.handleEdit = (module, id) => openFormModal(module, id);
    window.convertToOrder = (quoteId) => {
        const quote = ventasData.quotes.find(q => q.id == quoteId);
        if (!quote) return;
        
        const existingOrder = ventasData.orders.find(o => o.quoteId === quoteId);
        if (existingOrder) {
            showToast('Ya existe un pedido para esta cotización.', 'error');
            return;
        }

        const newOrder = { ...quote, id: Date.now(), quoteId: quote.id, number: `PED-${quote.number.replace('COT-','')}`, status: 'Completado' };
        ventasData.orders.push(newOrder);
        saveData();
        renderPage();
        showToast('Cotización convertida a Pedido de Venta.');
    };

    dom.tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button) return;
        dom.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentModule = button.dataset.target.replace('-section', '');
        renderPage();
    });

    dom.formModal.closeBtn.onclick = () => toggleModal(dom.formModal.el, false);
    
    // --- INICIALIZACIÓN ---
    loadData();
    renderPage();
});