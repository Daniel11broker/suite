document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. CONFIGURACIÓN INICIAL Y SELECTORES ---
    const dom = {
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
        dashboard: {
            section: document.getElementById('dashboard-section'),
            callsToday: document.getElementById('dashboard-calls-today'),
            avgDuration: document.getElementById('dashboard-avg-duration'),
            resolutionRate: document.getElementById('dashboard-resolution-rate'),
            openTasks: document.getElementById('dashboard-open-tasks'),
            agentCallChart: document.getElementById('agent-call-chart').getContext('2d'),
            callTypeChart: document.getElementById('call-type-chart').getContext('2d'),
        },
        settings: {
            callTypesList: document.getElementById('call-types-list'),
            addCallTypeForm: document.getElementById('add-call-type-form'),
            resolutionStatusesList: document.getElementById('resolution-statuses-list'),
            addResolutionStatusForm: document.getElementById('add-resolution-status-form'),
        },
        genericTableSection: document.getElementById('generic-table-section'),
        modal: {
            el: document.getElementById('form-modal'),
            title: document.getElementById('modal-title'),
            mainForm: document.getElementById('main-form'),
            closeBtn: document.getElementById('close-modal-btn')
        },
        confirm: {
            el: document.getElementById('confirm-modal'),
            title: document.getElementById('confirm-title'),
            message: document.getElementById('confirm-message'),
            buttons: document.getElementById('confirm-buttons')
        }
    };

    let callCenterData = {};
    let editingId = null;
    let currentModule = '';
    let agentCallChartInstance = null;
    let callTypeChartInstance = null;
    let isUserLoggedIn = false;
    
    const defaultData = {
        settings: {
            callTypes: ['Soporte Técnico', 'Ventas', 'Consulta de Información', 'Queja/Reclamo'],
            resolutionStatuses: ['Resuelto', 'Requiere Seguimiento', 'Escalado a Supervisor', 'No Resuelto']
        },
        agents: [], contacts: [], calls: [], tasks: []
    };

    // --- 2. LÓGICA DE DATOS Y ESTADO ---
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
        console.log('Modo de operación Call Center:', isUserLoggedIn ? 'Base de Datos (Online)' : 'LocalStorage (Offline)');
    };
    
    const saveLocalData = () => localStorage.setItem('call_center_data_v1', JSON.stringify(callCenterData));
    
    const loadData = async () => {
        if (isUserLoggedIn) {
            try {
                const initialData = await api.get('/api/call-center/initial-data');
                // Combina los datos del servidor con los por defecto para asegurar que 'settings' siempre exista
                callCenterData = { ...JSON.parse(JSON.stringify(defaultData)), ...initialData };
            } catch(e) {
                callCenterData = JSON.parse(JSON.stringify(defaultData));
            }
        } else {
            const data = localStorage.getItem('call_center_data_v1');
            callCenterData = data ? JSON.parse(data) : JSON.parse(JSON.stringify(defaultData));
            // Asegura que todas las propiedades existan
            for (const key in defaultData) {
                if (!callCenterData.hasOwnProperty(key)) callCenterData[key] = defaultData[key];
            }
        }
    };
    
    // --- 3. FUNCIONES UTILITARIAS ---
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        toast.className = `toast ${bgColor} text-white p-4 rounded-lg shadow-lg`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };
    const toggleModal = (modalEl, show) => modalEl.classList.toggle('hidden', !show);
    const showConfirmation = (title, message, onConfirm) => {
        dom.confirm.title.textContent = title;
        dom.confirm.message.textContent = message;
        dom.confirm.buttons.innerHTML = `
            <button id="confirm-cancel" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
            <button id="confirm-ok" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">Confirmar</button>
        `;
        toggleModal(dom.confirm.el, true);
        document.getElementById('confirm-ok').onclick = () => {
            onConfirm();
            toggleModal(dom.confirm.el, false);
        };
        document.getElementById('confirm-cancel').onclick = () => toggleModal(dom.confirm.el, false);
    };

    // --- 4. RENDERIZADO Y ACTUALIZACIÓN DE UI ---
    const render = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        if (!activeTab) return;
        const targetId = activeTab.dataset.target;
        currentModule = targetId.replace('-section', '');

        dom.mainContent.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        
        if (moduleConfig[currentModule]) {
            openModuleTable(currentModule);
        } else {
            document.getElementById(targetId).classList.remove('hidden');
            if (currentModule === 'dashboard') updateDashboard();
            if (currentModule === 'settings') renderSettings();
        }
    };
    
    const updateDashboard = () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const callsToday = callCenterData.calls.filter(c => c.dateTime.startsWith(todayStr));
        
        dom.dashboard.callsToday.textContent = callsToday.length;

        const totalDuration = callCenterData.calls.reduce((sum, c) => sum + (parseInt(c.duration, 10) || 0), 0);
        dom.dashboard.avgDuration.textContent = callCenterData.calls.length > 0 ? (totalDuration / callCenterData.calls.length).toFixed(1) : '0';

        const resolvedCalls = callCenterData.calls.filter(c => c.resolution === 'Resuelto').length;
        dom.dashboard.resolutionRate.textContent = callCenterData.calls.length > 0 ? `${Math.round((resolvedCalls / callCenterData.calls.length) * 100)}%` : '0%';

        dom.dashboard.openTasks.textContent = callCenterData.tasks.filter(t => t.status !== 'Completada').length;
        
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';

        const callsByAgent = {};
        (callCenterData.agents || []).forEach(a => { callsByAgent[a.id] = 0; });
        callsToday.forEach(c => { if(callsByAgent.hasOwnProperty(c.agentId)) callsByAgent[c.agentId]++; });

        if (agentCallChartInstance) agentCallChartInstance.destroy();
        agentCallChartInstance = new Chart(dom.dashboard.agentCallChart, {
            type: 'bar',
            data: {
                labels: (callCenterData.agents || []).map(a => a.name),
                datasets: [{ label: 'Llamadas', data: (callCenterData.agents || []).map(a => callsByAgent[a.id]), backgroundColor: '#3b82f6' }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { display: false } } }
        });

        const callsByType = {};
        (callCenterData.settings.callTypes || []).forEach(type => { callsByType[type] = 0; });
        (callCenterData.calls || []).forEach(c => { if(callsByType.hasOwnProperty(c.type)) callsByType[c.type]++; });

        if (callTypeChartInstance) callTypeChartInstance.destroy();
        callTypeChartInstance = new Chart(dom.dashboard.callTypeChart, {
            type: 'pie',
            data: {
                labels: Object.keys(callsByType),
                datasets: [{ data: Object.values(callsByType), backgroundColor: ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor } } } }
        });
    };
    
    const renderSettings = () => {
        dom.settings.callTypesList.innerHTML = (callCenterData.settings.callTypes || []).map(type => 
            `<li class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                <span>${type}</span>
                <button onclick="window.handleDeleteSetting('callTypes', '${type}')" class="text-red-500 hover:text-red-700 p-1"><i data-feather="trash-2" class="h-4 w-4"></i></button>
            </li>`
        ).join('');

        dom.settings.resolutionStatusesList.innerHTML = (callCenterData.settings.resolutionStatuses || []).map(status => 
            `<li class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                <span>${status}</span>
                <button onclick="window.handleDeleteSetting('resolutionStatuses', '${status}')" class="text-red-500 hover:text-red-700 p-1"><i data-feather="trash-2" class="h-4 w-4"></i></button>
            </li>`
        ).join('');
        feather.replace();
    };

    const moduleConfig = {
        calls: { title: 'Registro de Llamadas', headers: ['Agente/Contacto', 'Fecha/Hora', 'Tipo/Dirección', 'Duración (min)', 'Resolución', 'Acciones'] },
        tasks: { title: 'Gestión de Tareas', headers: ['Tarea', 'Origen', 'Asignado a', 'Fecha Límite', 'Estado', 'Acciones'] },
        agents: { title: 'Gestión de Agentes', headers: ['Nombre', 'Email', 'Extensión', 'Estado', 'Acciones'] },
        contacts: { title: 'Libreta de Contactos', headers: ['Nombre', 'Empresa', 'Teléfono', 'Email', 'Acciones'] },
    };
    
    const getOptions = (dataArray, valueProp, textProp, selectedId) => {
        let options = '<option value="">Seleccione...</option>';
        (dataArray || []).sort((a,b) => (a[textProp] || '').localeCompare(b[textProp] || '')).forEach(item => {
            options += `<option value="${item[valueProp]}" ${item[valueProp] == selectedId ? 'selected' : ''}>${item[textProp]}</option>`;
        });
        return options;
    };
    const getAgentOptions = (selectedId) => getOptions(callCenterData.agents, 'id', 'name', selectedId);
    const getContactOptions = (selectedId) => getOptions(callCenterData.contacts, 'id', 'name', selectedId);
    const getSettingOptions = (settingKey, selectedValue) => {
        let options = '<option value="">Seleccione...</option>';
        (callCenterData.settings[settingKey] || []).forEach(value => {
             options += `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${value}</option>`;
        });
        return options;
    };
    const getNameById = (dataArray, id) => ((dataArray || []).find(item => item.id == id) || { name: 'N/A' }).name;

    window.openModuleTable = (moduleKey) => {
        currentModule = moduleKey;
        const config = moduleConfig[moduleKey];
        
        dom.mainContent.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
        dom.genericTableSection.classList.remove('hidden');

        dom.genericTableSection.querySelector('#table-title').textContent = config.title;
        dom.genericTableSection.querySelector('#add-item-btn').onclick = () => openFormModal(currentModule);
        renderTable(moduleKey);
    };
    
    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const tableHead = dom.genericTableSection.querySelector('#table-head');
        const tableBody = dom.genericTableSection.querySelector('#table-body');
        
        tableHead.innerHTML = `<tr>${config.headers.map(h => `<th class="px-4 py-3 text-left font-semibold uppercase">${h}</th>`).join('')}</tr>`;
        
        const data = callCenterData[moduleKey] || [];
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${config.headers.length}" class="text-center p-6 text-gray-500">No hay registros.</td></tr>`;
            return;
        }

        data.sort((a, b) => (b.id || 0) - (a.id || 0)).forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            let cells = '';
            let extraActions = '';

            switch(moduleKey) {
                case 'agents':
                    cells = `<td>${item.name}</td><td>${item.email}</td><td>${item.extension}</td><td><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${item.status}</span></td>`; break;
                case 'contacts':
                    cells = `<td>${item.name}</td><td>${item.company}</td><td>${item.phone}</td><td>${item.email}</td>`; break;
                case 'calls':
                    const callDateTime = new Date(item.dateTime);
                    const formattedDateTime = `${callDateTime.toLocaleDateString()} ${callDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    cells = `<td><div class="font-medium">${getNameById(callCenterData.agents, item.agentId)}</div><div class="text-sm text-gray-500">${getNameById(callCenterData.contacts, item.contactId)}</div></td>
                             <td>${formattedDateTime}</td>
                             <td><div class="font-medium">${item.type}</div><div class="text-sm text-gray-500">${item.direction}</div></td>
                             <td>${item.duration}</td><td>${item.resolution}</td>`;
                    extraActions = `<button onclick="window.createTaskFromCall(${item.id})" class="text-green-600 hover:text-green-900 mr-2" title="Crear Tarea"><i data-feather="plus-circle" class="h-5 w-5"></i></button>`;
                    break;
                case 'tasks':
                    cells = `<td>${item.description}</td><td>Llamada N° ${item.sourceId}</td><td>${getNameById(callCenterData.agents, item.assignedTo)}</td><td>${item.dueDate}</td><td><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Completada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${item.status}</span></td>`; break;
            }
            const actions = `<td class="px-4 py-3 text-center flex items-center justify-center">${extraActions}<button onclick="window.handleEdit('${moduleKey}', ${item.id})" class="text-blue-600 hover:text-blue-900 mr-2" title="Editar"><i data-feather="edit-2" class="h-5 w-5"></i></button><button onclick="window.handleDelete('${moduleKey}', ${item.id})" class="text-red-600 hover:text-red-900" title="Eliminar"><i data-feather="trash-2" class="h-5 w-5"></i></button></td>`;
            tr.innerHTML = cells.split('<td>').map(c => `<td class="px-4 py-3">${c}</td>`).join('').substring(5) + actions;
            tableBody.appendChild(tr);
        });
        feather.replace();
    };

    const formTemplates = {
        agents: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium">Nombre Completo</label><input type="text" name="name" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.name || ''}" required></div>
                <div><label class="block text-sm font-medium">Email</label><input type="email" name="email" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.email || ''}"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label class="block text-sm font-medium">Extensión</label><input type="text" name="extension" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.extension || ''}"></div>
                <div><label class="block text-sm font-medium">Estado</label><select name="status" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option ${data.status === 'Activo' ? 'selected' : ''}>Activo</option><option ${data.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option></select></div>
            </div>
            <div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        
        contacts: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium">Nombre del Contacto</label><input type="text" name="name" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.name || ''}" required></div>
                <div><label class="block text-sm font-medium">Empresa</label><input type="text" name="company" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.company || ''}"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label class="block text-sm font-medium">Teléfono</label><input type="tel" name="phone" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.phone || ''}" required></div>
                <div><label class="block text-sm font-medium">Email</label><input type="email" name="email" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.email || ''}"></div>
            </div>
            <div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,

        calls: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium">Agente</label><select name="agentId" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${getAgentOptions(data.agentId)}</select></div>
                <div><label class="block text-sm font-medium">Contacto</label><select name="contactId" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${getContactOptions(data.contactId)}</select></div>
            </div>
             <div class="mt-4"><label class="block text-sm font-medium">Fecha y Hora</label><input type="datetime-local" name="dateTime" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.dateTime || new Date().toISOString().slice(0, 16)}" required></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label class="block text-sm font-medium">Tipo de Llamada</label><select name="type" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${getSettingOptions('callTypes', data.type)}</select></div>
                <div><label class="block text-sm font-medium">Dirección</label><select name="direction" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option ${data.direction === 'Entrante' ? 'selected' : ''}>Entrante</option><option ${data.direction === 'Saliente' ? 'selected' : ''}>Saliente</option></select></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label class="block text-sm font-medium">Duración (minutos)</label><input type="number" name="duration" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.duration || ''}"></div>
                <div><label class="block text-sm font-medium">Resolución</label><select name="resolution" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${getSettingOptions('resolutionStatuses', data.resolution)}</select></div>
            </div>
            <div class="mt-4"><label class="block text-sm font-medium">Resumen / Notas</label><textarea name="summary" rows="3" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${data.summary || ''}</textarea></div>
            <div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,

        tasks: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <input type="hidden" name="sourceId" value="${data.sourceId || 'N/A'}">
            <div class="mb-2 p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md text-sm"><strong>Origen:</strong> Llamada N° ${data.sourceId || 'General'}</div>
            <div><label class="block text-sm font-medium">Descripción de la Tarea</label><textarea name="description" rows="3" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${data.description || ''}</textarea></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label class="block text-sm font-medium">Asignado a</label><select name="assignedTo" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${getAgentOptions(data.assignedTo)}</select></div>
                <div><label class="block text-sm font-medium">Fecha Límite</label><input type="date" name="dueDate" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.dueDate || ''}" required></div>
            </div>
            <div class="mt-4"><label class="block text-sm font-medium">Estado</label><select name="status" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required><option>Pendiente</option><option>En Progreso</option><option>Completada</option></select></div>
            <div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`
    };

    const openFormModal = (moduleKey, id = null, prefillData = {}) => {
        currentModule = moduleKey;
        editingId = id;
        const itemData = id ? { ...(callCenterData[moduleKey] || []).find(i => i.id == id) } : { ...prefillData };
        
        const titles = {
            agents: id ? 'Editar Agente' : 'Agregar Agente',
            contacts: id ? 'Editar Contacto' : 'Agregar Contacto',
            calls: id ? 'Editar Llamada' : 'Registrar Llamada',
            tasks: id ? 'Editar Tarea' : 'Crear Tarea'
        };

        dom.modal.title.textContent = titles[moduleKey] || 'Formulario';
        dom.modal.mainForm.innerHTML = formTemplates[moduleKey](itemData);
        dom.modal.mainForm.querySelector('#cancel-btn').onclick = () => toggleModal(dom.modal.el, false);
        toggleModal(dom.modal.el, true);
        feather.replace();
    };
    
    window.handleEdit = (module, id) => openFormModal(module, id);
    
    window.handleDelete = async (module, id) => {
        showConfirmation('Confirmar Eliminación', '¿Estás seguro de que quieres eliminar este registro?', async () => {
            try {
                if (isUserLoggedIn) {
                    await api.delete(`/api/call-center/${module}/${id}`);
                } else {
                    callCenterData[module] = callCenterData[module].filter(item => item.id != id);
                    saveLocalData();
                }
                await loadData();
                renderTable(module);
                showToast('Registro eliminado');
            } catch(e) {}
        });
    };
    
    window.createTaskFromCall = (callId) => {
        const call = callCenterData.calls.find(c => c.id == callId);
        if (!call) return;
        const prefill = {
            sourceId: callId,
            description: `Seguimiento de llamada con ${getNameById(callCenterData.contacts, call.contactId)} del ${new Date(call.dateTime).toLocaleDateString()}.\nResumen: ${call.summary || 'N/A'}`
        }
        openFormModal('tasks', null, prefill);
    };

    window.handleDeleteSetting = async (settingKey, value) => {
        showConfirmation('Confirmar Eliminación', `¿Estás seguro de eliminar "${value}"?`, async () => {
            const currentSettings = callCenterData.settings;
            currentSettings[settingKey] = currentSettings[settingKey].filter(item => item !== value);
            try {
                if (isUserLoggedIn) {
                    await api.post('/api/call-center/settings', currentSettings);
                } else {
                    callCenterData.settings = currentSettings;
                    saveLocalData();
                }
                await loadData();
                renderSettings();
                showToast('Elemento eliminado');
            } catch(e) {}
        });
    };
    
    dom.modal.mainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            if (isUserLoggedIn) {
                const endpoint = `/api/call-center/${currentModule}${editingId ? `/${editingId}` : ''}`;
                const method = editingId ? 'PUT' : 'POST';
                await api.request(method, endpoint, data);
            } else {
                const id = editingId ? Number(editingId) : Date.now();
                if (editingId) {
                    const index = callCenterData[currentModule].findIndex(item => item.id == editingId);
                    callCenterData[currentModule][index] = { ...callCenterData[currentModule][index], ...data, id: id };
                } else {
                    callCenterData[currentModule].push({ ...data, id: id });
                }
                saveLocalData();
            }
            await loadData();
            renderTable(currentModule);
            toggleModal(dom.modal.el, false);
            showToast(`Registro ${editingId ? 'actualizado' : 'guardado'}`);
            editingId = null;
        } catch(e) {}
    });

    dom.tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button) return;
        const targetId = button.dataset.target;
        
        dom.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        render();
    });

    const handleSettingsForm = async (e, settingKey, inputName) => {
        e.preventDefault();
        const newValue = e.target.elements[inputName].value.trim();
        const currentSettings = callCenterData.settings;
        if (newValue && !currentSettings[settingKey].includes(newValue)) {
            currentSettings[settingKey].push(newValue);
            try {
                if (isUserLoggedIn) {
                    await api.post('/api/call-center/settings', currentSettings);
                } else {
                    callCenterData.settings = currentSettings;
                    saveLocalData();
                }
                await loadData();
                renderSettings();
                showToast('Elemento agregado');
            } catch(e) {}
        }
        e.target.reset();
    };
    
    dom.settings.addCallTypeForm.addEventListener('submit', (e) => handleSettingsForm(e, 'callTypes', 'callTypeName'));
    dom.settings.addResolutionStatusForm.addEventListener('submit', (e) => handleSettingsForm(e, 'resolutionStatuses', 'statusName'));

    const init = async () => {
        checkLoginStatus();
        await loadData();
        render();
        dom.modal.closeBtn.addEventListener('click', () => toggleModal(dom.modal.el, false));
    };
    
    init();
});