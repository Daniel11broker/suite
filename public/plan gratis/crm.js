document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. CONFIG & GLOBALS ---
    const dom = {
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
        formModal: { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form'), closeBtn: document.getElementById('close-modal-btn') },
        dashboard: {
            newLeads: document.getElementById('dash-new-leads'),
            openOps: document.getElementById('dash-open-ops'),
            conversionRate: document.getElementById('dash-conversion-rate'),
            pipelineValue: document.getElementById('dash-pipeline-value'),
            pipelineChart: document.getElementById('pipeline-chart')?.getContext('2d')
        },
        toastContainer: document.getElementById('toast-container')
    };
    
    let crmData = {};
    let currentModule = 'dashboard';
    let editingId = null;
    let pipelineChartInstance = null;
    let isUserLoggedIn = false;
    const pipelineStages = ['Calificación', 'Propuesta Enviada', 'Negociación', 'Cerrada Ganada', 'Cerrada Perdida'];

    const defaultData = {
        accounts: [],
        contacts: [],
        leads: [],
        opportunities: []
    };
    
    // --- 2. DATA HANDLING ---
    const api = {
        async request(method, endpoint, body = null) {
            try {
                const options = { method, headers: { 'Content-Type': 'application/json' } };
                if (body) options.body = JSON.stringify(body);
                const response = await fetch(endpoint, options);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                    throw new Error(errorData.error || `Error: ${response.status}`);
                }
                if (response.status === 204) return null;
                return response.json();
            } catch (error) {
                showToast(error.message, 'error');
                throw error;
            }
        },
        get: (endpoint) => api.request('GET', endpoint),
        post: (endpoint, body) => api.request('POST', endpoint, body),
        put: (endpoint, body) => api.request('PUT', endpoint, body),
        delete: (endpoint) => api.request('DELETE', endpoint)
    };
    
    const checkLoginStatus = () => {
        isUserLoggedIn = !!localStorage.getItem('loggedInUser');
        console.log('Modo de operación CRM:', isUserLoggedIn ? 'Base de Datos (Online)' : 'LocalStorage (Offline)');
    };

    const saveLocalData = () => localStorage.setItem('crm_data_v1', JSON.stringify(crmData));
    
    const loadData = async () => {
        if (isUserLoggedIn) {
            try {
                const initialData = await api.get('/api/crm/initial-data');
                crmData = { ...JSON.parse(JSON.stringify(defaultData)), ...initialData };
            } catch(e) {
                crmData = JSON.parse(JSON.stringify(defaultData));
            }
        } else {
            const data = localStorage.getItem('crm_data_v1');
            crmData = data ? JSON.parse(data) : JSON.parse(JSON.stringify(defaultData));
        }
    };

    // --- 3. UTILITIES ---
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    const showToast = (message, type = 'success') => {
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-green-600' : type === 'info' ? 'bg-blue-600' : 'bg-red-600';
        const icon = type === 'success' ? 'check-circle' : 'info';
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast ${bgColor} text-white py-3 px-5 rounded-lg shadow-lg flex items-center gap-3`;
        toastElement.innerHTML = `<i data-feather="${icon}" class="h-5 w-5"></i><span>${message}</span>`;
        dom.toastContainer.appendChild(toastElement);
        feather.replace();
        setTimeout(() => toastElement.classList.add('show'), 10);
        setTimeout(() => { toastElement.classList.remove('show'); setTimeout(() => toastElement.remove(), 500); }, 4000);
    };
    const toggleModal = (modalEl, show) => {
        if (!modalEl) return;
        if (show) {
            modalEl.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        } else {
            modalEl.classList.add('opacity-0', 'scale-95');
            setTimeout(() => modalEl.classList.add('pointer-events-none'), 300);
        }
    };
    const getAccountName = (id) => (crmData.accounts.find(a => a.id == id) || {name: 'N/A'}).name;

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
        
        if (section) section.classList.remove('hidden');
    };

    const renderDashboard = () => {
        const openOpportunities = (crmData.opportunities || []).filter(o => !o.stage.startsWith('Cerrada'));
        dom.dashboard.newLeads.textContent = (crmData.leads || []).filter(l => l.status === 'Nuevo').length;
        dom.dashboard.openOps.textContent = openOpportunities.length;
        
        const wonOpportunities = (crmData.opportunities || []).filter(o => o.stage === 'Cerrada Ganada').length;
        const totalClosed = (crmData.opportunities || []).filter(o => o.stage.startsWith('Cerrada')).length;
        dom.dashboard.conversionRate.textContent = totalClosed > 0 ? `${Math.round((wonOpportunities / totalClosed) * 100)}%` : '0%';
        
        const pipelineValue = openOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);
        dom.dashboard.pipelineValue.textContent = formatCurrency(pipelineValue);

        const stageCounts = pipelineStages.map(stage => (crmData.opportunities || []).filter(o => o.stage === stage).length);
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';

        if (pipelineChartInstance) pipelineChartInstance.destroy();
        pipelineChartInstance = new Chart(dom.dashboard.pipelineChart, {
            type: 'bar',
            data: { 
                labels: pipelineStages, 
                datasets: [{ 
                    label: 'N° de Oportunidades', 
                    data: stageCounts, 
                    backgroundColor: 'rgba(37, 99, 235, 0.7)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } },
                    x: { ticks: { color: textColor }, grid: { color: gridColor } }
                }, 
                plugins: { legend: { display: false } } 
            }
        });
    };
    
    const moduleConfig = {
        leads: { title: 'Prospectos', headers: ['Nombre', 'Empresa', 'Email/Teléfono', 'Origen', 'Estado', 'Acciones'] },
        opportunities: { title: 'Oportunidades', headers: ['Nombre', 'Cuenta', 'Valor', 'Etapa', 'Fecha Cierre', 'Acciones'] },
        accounts: { title: 'Cuentas y Contactos', headers: ['Nombre Cuenta', 'Industria', 'Contactos', 'Acciones'] }
    };

    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const tableSection = document.getElementById('table-section');
        tableSection.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 class="text-2xl font-bold">${config.title}</h2>
                <button id="add-item-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 flex items-center transition-all"><i data-feather="plus" class="mr-2"></i>Agregar ${config.title.slice(0,-1)}</button>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto"><table class="w-full table-auto">
                    <thead class="bg-gray-50 dark:bg-gray-700"><tr>${config.headers.map(h => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${h}</th>`).join('')}</tr></thead>
                    <tbody id="table-body" class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"></tbody>
                </table></div>
                <div id="no-data-message" class="hidden text-center p-8"></div>
            </div>`;

        tableSection.querySelector('#add-item-btn').onclick = () => openFormModal(moduleKey);

        const tableBody = tableSection.querySelector('#table-body');
        const data = crmData[moduleKey] || [];
        
        if (data.length === 0) {
            tableSection.querySelector('#no-data-message').innerHTML = `<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Empieza por agregar un nuevo registro.</p>`;
            tableSection.querySelector('#no-data-message').classList.remove('hidden');
            return;
        }

        data.slice().reverse().forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors';
            
            const cellClass = "px-6 py-4 whitespace-nowrap";
            let cellsHTML = '';
            let actions = '';
            
            switch(moduleKey) {
                case 'leads':
                    cellsHTML = `
                        <td class="${cellClass}">${item.name}</td>
                        <td class="${cellClass}">${item.company}</td>
                        <td class="${cellClass}"><div>${item.email}</div><div class="text-xs text-gray-500">${item.phone}</div></td>
                        <td class="${cellClass}">${item.source}</td>
                        <td class="${cellClass}"><span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${item.status}</span></td>`;
                    if(item.status === 'Nuevo') actions += `<button onclick="window.convertToOpportunity(${item.id})" class="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100" title="Convertir a Oportunidad"><i data-feather="check-circle"></i></button>`;
                    break;
                case 'opportunities':
                    const stageColor = item.stage.startsWith('Cerrada Ganada') ? 'bg-green-100 text-green-800' : item.stage.startsWith('Cerrada Perdida') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                    cellsHTML = `
                        <td class="${cellClass}">${item.name}</td>
                        <td class="${cellClass}">${getAccountName(item.accountId)}</td>
                        <td class="${cellClass}">${formatCurrency(item.value)}</td>
                        <td class="${cellClass}"><span class="px-2 py-1 text-xs font-semibold rounded-full ${stageColor}">${item.stage}</span></td>
                        <td class="${cellClass}">${item.closeDate}</td>`;
                    if (item.stage === 'Cerrada Ganada') {
                        actions += `<button onclick="window.generateInvoiceFromOpportunity(${item.id})" class="text-teal-600 hover:text-teal-900 p-2 rounded-full hover:bg-teal-100" title="Generar Factura"><i data-feather="file-text"></i></button>`;
                    } else if (item.stage !== 'Cerrada Perdida') {
                        actions += `<button onclick="window.handleOpportunityWon(${item.id})" class="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100" title="Marcar como Ganada"><i data-feather="award"></i></button>`;
                    }
                    break;
                case 'accounts':
                    const contacts = (crmData.contacts || []).filter(c => c.accountId == item.id);
                    cellsHTML = `
                        <td class="${cellClass}">${item.name}</td>
                        <td class="${cellClass}">${item.industry}</td>
                        <td class="${cellClass}">${contacts.length} contacto(s)</td>`;
                    break;
            }
            
            actions += `<button onclick="window.handleEdit('${moduleKey}', ${item.id})" class="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-100" title="Editar"><i data-feather="edit-2"></i></button>
                        <button onclick="window.handleDelete('${moduleKey}', ${item.id})" class="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100" title="Eliminar"><i data-feather="trash-2"></i></button>`;
            
            const actionsHTML = `<td class="${cellClass} text-right text-sm font-medium"><div class="flex items-center justify-end gap-1">${actions}</div></td>`;
            
            tr.innerHTML = cellsHTML + actionsHTML;
            tableBody.appendChild(tr);
        });
        feather.replace();
    };

    // --- 5. FORMS & EVENT HANDLERS ---
    const getAccountOptions = (selectedId) => (crmData.accounts || []).map(a => `<option value="${a.id}" ${a.id == selectedId ? 'selected' : ''}>${a.name}</option>`).join('');
    
    const formTemplates = {
        leads: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Nombre Completo</label><input type="text" name="name" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.name || ''}" required></div>
                    <div><label class="block text-sm font-medium">Empresa</label><input type="text" name="company" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.company || ''}"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Email</label><input type="email" name="email" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.email || ''}"></div>
                    <div><label class="block text-sm font-medium">Teléfono</label><input type="tel" name="phone" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.phone || ''}"></div>
                </div>
                <div><label class="block text-sm font-medium">Origen del Prospecto</label><input type="text" name="source" placeholder="Ej: Referido, Página Web" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.source || ''}"></div>
                <input type="hidden" name="status" value="${data.status || 'Nuevo'}">
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Guardar Prospecto</button></div>`,
        opportunities: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                <div><label class="block text-sm font-medium">Nombre de la Oportunidad</label><input type="text" name="name" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.name || ''}" required></div>
                <div><label class="block text-sm font-medium">Cuenta Asociada</label><select name="accountId" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" required>${getAccountOptions(data.accountId)}</select></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Valor Estimado</label><input type="number" name="value" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.value || 0}" required></div>
                    <div><label class="block text-sm font-medium">Fecha de Cierre Estimada</label><input type="date" name="closeDate" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.closeDate || ''}"></div>
                </div>
                <div><label class="block text-sm font-medium">Etapa del Embudo</label><select name="stage" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" required>${pipelineStages.map(s => `<option value="${s}" ${s === data.stage ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Guardar Oportunidad</button></div>`,
        accounts: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Nombre de la Cuenta/Empresa</label><input type="text" name="name" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.name || ''}" required></div>
                    <div><label class="block text-sm font-medium">Industria</label><input type="text" name="industry" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.industry || ''}"></div>
                </div>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Teléfono Principal</label><input type="tel" name="phone" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.phone || ''}"></div>
                    <div><label class="block text-sm font-medium">Email Principal</label><input type="email" name="email" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${data.email || ''}"></div>
                 </div>
                 <h4 class="font-bold mt-6 mb-2 border-t dark:border-gray-700 pt-4">Contacto Principal</h4>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Nombre del Contacto</label><input type="text" name="contactName" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${(crmData.contacts.find(c=>c.accountId == data.id) || {}).name || ''}"></div>
                    <div><label class="block text-sm font-medium">Cargo</label><input type="text" name="contactRole" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700" value="${(crmData.contacts.find(c=>c.accountId == data.id) || {}).role || ''}"></div>
                 </div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Guardar Cuenta</button></div>`
    };

    const openFormModal = (moduleKey, id = null) => {
        editingId = id;
        const data = id ? (crmData[moduleKey] || []).find(i => i.id == id) : {};
        const titles = { leads: 'Prospecto', opportunities: 'Oportunidad', accounts: 'Cuenta' };
        dom.formModal.title.textContent = `${id ? 'Editar' : 'Agregar'} ${titles[moduleKey]}`;
        dom.formModal.form.innerHTML = formTemplates[moduleKey](data);
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(dom.formModal.el, false);
        toggleModal(dom.formModal.el, true);
        feather.replace();
    };
    
    dom.formModal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(dom.formModal.form);
        let data = Object.fromEntries(formData.entries());
        if (data.value) data.value = parseFloat(data.value);
        
        try {
            if (isUserLoggedIn) {
                const endpoint = `/api/crm/${currentModule}${editingId ? `/${editingId}` : ''}`;
                const method = editingId ? 'PUT' : 'POST';
                await api.request(method, endpoint, data);
            } else {
                const id = editingId ? Number(editingId) : Date.now();
                if (editingId) {
                    const index = crmData[currentModule].findIndex(i => i.id == editingId);
                    crmData[currentModule][index] = { ...crmData[currentModule][index], ...data, id: id };
                } else {
                    data.id = id;
                    crmData[currentModule].push(data);
                }
                saveLocalData();
            }
            toggleModal(dom.formModal.el, false);
            showToast('Guardado con éxito');
            await loadData();
            render();
        } catch(e) {}
    });

    // --- 6. WORKFLOW LOGIC ---
    window.convertToOpportunity = async (leadId) => {
        const lead = (crmData.leads || []).find(l => l.id == leadId);
        if (!lead) return;

        // La lógica para convertir es compleja y requiere múltiples pasos.
        // Se mantiene en el frontend para modo offline, pero debería ser una transacción en el backend para online.
        if (isUserLoggedIn) {
            // Placeholder para una futura ruta de API transaccional
            showToast('Conversión en modo online no implementada en el backend.', 'info');
            return;
        }

        const newAccount = { id: Date.now(), name: lead.company, industry: '', phone: lead.phone, email: lead.email };
        crmData.accounts.push(newAccount);
        const newContact = { id: Date.now() + 1, name: lead.name, accountId: newAccount.id, email: lead.email, phone: lead.phone, role: 'Contacto Principal' };
        crmData.contacts.push(newContact);
        const newOpportunity = { id: Date.now() + 2, name: `Oportunidad para ${lead.company}`, accountId: newAccount.id, value: 0, stage: 'Calificación', closeDate: '' };
        crmData.opportunities.push(newOpportunity);
        crmData.leads = crmData.leads.filter(l => l.id != leadId);
        
        saveLocalData();
        showToast('Prospecto convertido con éxito.');
        await loadData();
        render();
    };
    
    window.handleEdit = (module, id) => openFormModal(module, id);
    window.handleDelete = async (module, id) => {
        if (confirm('¿Seguro que deseas eliminar?')) {
            try {
                if (isUserLoggedIn) {
                    await api.delete(`/api/crm/${module}/${id}`);
                } else {
                    crmData[module] = (crmData[module] || []).filter(i => i.id != id);
                    saveLocalData();
                }
                showToast('Registro eliminado');
                await loadData();
                render();
            } catch(e) {}
        }
    };
    window.handleOpportunityWon = (id) => { /* Sin cambios */ };
    window.generateInvoiceFromOpportunity = (id) => { /* Sin cambios */ };

    // --- 7. INITIALIZATION ---
    const init = async () => {
        dom.tabsContainer.addEventListener('click', e => {
            const button = e.target.closest('.tab-btn');
            if (button) {
                dom.tabsContainer.querySelector('.tab-btn.active').classList.remove('active');
                button.classList.add('active');
                render();
            }
        });
        dom.formModal.closeBtn.onclick = () => toggleModal(dom.formModal.el, false);
        
        checkLoginStatus();
        await loadData();
        render();
    };
    
    init();
});