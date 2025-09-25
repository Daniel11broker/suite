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

    let auditoriasData = {};
    let employeesData = [];
    let currentModule = 'dashboard';
    let editingId = null;

    const defaultData = {
        audits: [],
        findings: []
    };

    // --- LÓGICA DE DATOS ---
    const saveData = () => localStorage.setItem('auditorias_data_v1', JSON.stringify(auditoriasData));
    const loadData = () => {
        auditoriasData = JSON.parse(localStorage.getItem('auditorias_data_v1')) || JSON.parse(JSON.stringify(defaultData));
        employeesData = (JSON.parse(localStorage.getItem('sgsst_data_v5')) || { employees: [] }).employees;
    };

    // --- UTILIDADES ---
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
    const getEmployeeOptions = (selectedId = null) => {
        let options = '<option value="">Seleccione...</option>';
        employeesData.sort((a,b) => (a.name || '').localeCompare(b.name || '')).forEach(emp => {
            options += `<option value="${emp.id}" ${emp.id == selectedId ? 'selected' : ''}>${emp.name}</option>`;
        });
        return options;
    };
    const getEmployeeName = (id) => (employeesData.find(e => e.id == id) || { name: 'N/A' }).name;
    const getAuditOptions = (selectedId = null) => {
        let options = '<option value="">Seleccione...</option>';
        auditoriasData.audits.forEach(aud => {
            options += `<option value="${aud.id}" ${aud.id == selectedId ? 'selected' : ''}>${aud.name}</option>`;
        });
        return options;
    };
    const getAuditName = (id) => (auditoriasData.audits.find(a => a.id == id) || { name: 'N/A' }).name;

    // --- RENDERIZADO DE UI ---
    const renderPage = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        const targetId = activeTab ? activeTab.dataset.target : 'dashboard-section';
        currentModule = targetId.replace('-section', '');

        dom.mainContent.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        
        const section = document.getElementById(targetId);
        section.classList.remove('hidden');

        if (currentModule === 'dashboard') {
            renderDashboard();
        } else {
            renderTable(currentModule);
        }
        feather.replace();
    };

    const renderDashboard = () => {
        const section = document.getElementById('dashboard-section');
        const audits = auditoriasData.audits;
        const findings = auditoriasData.findings;

        const plannedAudits = audits.filter(a => a.status === 'Planificada').length;
        const completedAudits = audits.filter(a => a.status === 'Completada').length;
        const openFindings = findings.filter(f => f.status === 'Abierto').length;

        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Dashboard de Auditorías</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Auditorías Planeadas</h3><p class="text-3xl font-bold text-blue-600 mt-1">${plannedAudits}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Auditorías Completadas</h3><p class="text-3xl font-bold text-green-600 mt-1">${completedAudits}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Hallazgos Abiertos</h3><p class="text-3xl font-bold text-red-600 mt-1">${openFindings}</p></div>
            </div>`;
    };

    const moduleConfig = {
        audits: { title: 'Planes de Auditoría', headers: ['Nombre', 'Tipo', 'Auditor Líder', 'Fechas', 'Estado', 'Acciones'] },
        findings: { title: 'Hallazgos', headers: ['Auditoría', 'Tipo', 'Descripción', 'Estado', 'Acciones'] }
    };

    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const section = document.getElementById(moduleKey + '-section');
        
        section.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 class="text-2xl font-bold">${config.title}</h2>
                <button id="add-item-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 flex items-center"><i data-feather="plus" class="mr-2"></i>Agregar</button>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto"><table class="w-full table-auto">
                    <thead class="bg-gray-200 dark:bg-gray-700"><tr>${config.headers.map(h => `<th class="px-4 py-3 text-left font-semibold uppercase">${h}</th>`).join('')}</tr></thead>
                    <tbody id="table-body-${moduleKey}" class="divide-y divide-gray-200 dark:divide-gray-600"></tbody>
                </table></div>
            </div>`;

        document.getElementById('add-item-btn').onclick = () => openFormModal(moduleKey);

        const tableBody = document.getElementById(`table-body-${moduleKey}`);
        const data = auditoriasData[moduleKey];
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${config.headers.length}" class="text-center p-8 text-gray-500">No hay registros.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(item => {
            let cells = '';
            const statusColors = {
                'Planificada': 'bg-blue-100 text-blue-800', 'En Progreso': 'bg-yellow-100 text-yellow-800', 'Completada': 'bg-green-100 text-green-800',
                'Abierto': 'bg-red-100 text-red-800', 'Cerrado': 'bg-gray-100 text-gray-800'
            };
            const statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status] || ''}">${item.status}</span>`;

            if (moduleKey === 'audits') {
                cells = `<td class="p-4">${item.name}</td><td class="p-4">${item.type}</td><td class="p-4">${getEmployeeName(item.auditorLead)}</td><td class="p-4">${item.startDate} al ${item.endDate}</td><td class="p-4">${statusBadge}</td>`;
            } else if (moduleKey === 'findings') {
                cells = `<td class="p-4">${getAuditName(item.auditId)}</td><td class="p-4">${item.type}</td><td class="p-4">${item.description}</td><td class="p-4">${statusBadge}</td>`;
            }
            const actions = `<td class="p-4"><button onclick="window.handleEdit('${moduleKey}', ${item.id})" class="text-blue-600 mr-2"><i data-feather="edit-2"></i></button><button onclick="window.handleDelete('${moduleKey}', ${item.id})" class="text-red-600"><i data-feather="trash-2"></i></button></td>`;
            return `<tr>${cells}${actions}</tr>`;
        }).join('');
    };

    // --- FORMULARIOS Y MANEJO DE EVENTOS ---
    const formTemplates = {
        audits: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                <div><label>Nombre/Objetivo de la Auditoría</label><input type="text" name="name" class="input" value="${data.name || ''}" required></div>
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label>Tipo</label><select name="type" class="input"><option ${data.type === 'Interna' ? 'selected' : ''}>Interna</option><option ${data.type === 'Externa' ? 'selected' : ''}>Externa</option></select></div>
                    <div><label>Auditor Líder</label><select name="auditorLead" class="input">${getEmployeeOptions(data.auditorLead)}</select></div>
                </div>
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label>Fecha Inicio</label><input type="date" name="startDate" class="input" value="${data.startDate || ''}"></div>
                    <div><label>Fecha Fin</label><input type="date" name="endDate" class="input" value="${data.endDate || ''}"></div>
                </div>
                <div><label>Estado</label><select name="status" class="input"><option ${data.status === 'Planificada' ? 'selected' : ''}>Planificada</option><option ${data.status === 'En Progreso' ? 'selected' : ''}>En Progreso</option><option ${data.status === 'Completada' ? 'selected' : ''}>Completada</option></select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t"><button type="button" id="cancel-btn" class="btn-secondary mr-2">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>`,
        findings: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                 <div><label>Auditoría Asociada</label><select name="auditId" class="input" required>${getAuditOptions(data.auditId)}</select></div>
                 <div><label>Tipo de Hallazgo</label><select name="type" class="input"><option ${data.type === 'No Conformidad Mayor' ? 'selected' : ''}>No Conformidad Mayor</option><option ${data.type === 'No Conformidad Menor' ? 'selected' : ''}>No Conformidad Menor</option><option ${data.type === 'Oportunidad de Mejora' ? 'selected' : ''}>Oportunidad de Mejora</option></select></div>
                 <div><label>Descripción</label><textarea name="description" rows="3" class="input">${data.description || ''}</textarea></div>
                 <div><label>Estado</label><select name="status" class="input"><option ${data.status === 'Abierto' ? 'selected' : ''}>Abierto</option><option ${data.status === 'Cerrado' ? 'selected' : ''}>Cerrado</option></select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t"><button type="button" id="cancel-btn" class="btn-secondary mr-2">Cancelar</button><button type="submit" class="btn-primary">Guardar</button></div>`
    };

    const openFormModal = (moduleKey, id = null) => {
        editingId = id;
        const data = id ? auditoriasData[moduleKey].find(i => i.id == id) : {};
        dom.formModal.title.textContent = `${id ? 'Editar' : 'Agregar'} ${moduleConfig[moduleKey].title.slice(0, -1)}`;
        
        const formHtml = formTemplates[moduleKey](data)
            .replace(/<label>/g, '<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">')
            .replace(/class="input"/g, 'class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"')
            .replace(/class="btn-primary"/g, 'class="bg-blue-600 text-white py-2 px-4 rounded-lg"')
            .replace(/class="btn-secondary"/g, 'class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-lg"');
            
        dom.formModal.form.innerHTML = formHtml;
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(dom.formModal.el, false);
        toggleModal(dom.formModal.el, true);
    };

    dom.formModal.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        if (editingId) {
            const index = auditoriasData[currentModule].findIndex(i => i.id == editingId);
            auditoriasData[currentModule][index] = { ...auditoriasData[currentModule][index], ...data, id: Number(editingId) };
        } else {
            data.id = Date.now();
            auditoriasData[currentModule].push(data);
        }
        saveData();
        renderPage();
        toggleModal(dom.formModal.el, false);
    });

    window.handleEdit = (module, id) => openFormModal(module, id);
    window.handleDelete = (module, id) => {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            auditoriasData[module] = auditoriasData[module].filter(i => i.id != id);
            saveData();
            renderPage();
            showToast('Registro eliminado.', 'success');
        }
    };

    dom.tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button) return;
        dom.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderPage();
    });

    dom.formModal.closeBtn.onclick = () => toggleModal(dom.formModal.el, false);

    // --- INICIALIZACIÓN ---
    loadData();
    renderPage();
});