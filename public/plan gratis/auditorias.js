// auditorias.js
import { initUserSession } from './user-session.js';

document.addEventListener('DOMContentLoaded', async () => {

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
    let isUserLoggedIn = false; // Flag para determinar el modo de almacenamiento

    const defaultData = {
        audits: [],
        findings: [],
        actionPlans: []
    };

    // --- Capa de API para comunicarse con el Backend ---
    const api = {
        async request(method, endpoint, body = null) {
            try {
                const options = {
                    method,
                    headers: { 'Content-Type': 'application/json' }
                };
                if (body) {
                    options.body = JSON.stringify(body);
                }
                const response = await fetch(endpoint, options);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Error en la solicitud: ${response.status}`);
                }
                if (response.status === 204) return null; // Para respuestas DELETE
                return response.json();
            } catch (error) {
                console.error(`API Error (${method} ${endpoint}):`, error);
                showToast(error.message || 'Error de conexión con el servidor.', 'error');
                throw error;
            }
        },
        get: (endpoint) => api.request('GET', endpoint),
        post: (endpoint, body) => api.request('POST', endpoint, body),
        put: (endpoint, body) => api.request('PUT', endpoint, body),
        delete: (endpoint) => api.request('DELETE', endpoint)
    };

    /**
     * Verifica si hay una sesión de usuario activa revisando localStorage.
     * Ya no necesita llamar al backend.
     */
    const checkLoginStatus = () => {
        const user = localStorage.getItem('loggedInUser');
        isUserLoggedIn = !!user; // Convierte a booleano: true si existe, false si no.
        
        if (isUserLoggedIn) {
            console.log('Modo de operación: Base de Datos (Online)');
        } else {
            console.log('Modo de operación: LocalStorage (Offline)');
        }
    };

    const saveLocalData = () => localStorage.setItem('auditorias_data_v1', JSON.stringify(auditoriasData));
    
    const loadData = async () => {
        if (isUserLoggedIn) {
            // Cargar desde la base de datos a través de la API
            try {
                const [audits, findings, actionPlans] = await Promise.all([
                    api.get('/api/audits'),
                    api.get('/api/findings'),
                    api.get('/api/actionPlans')
                ]);
                auditoriasData = { audits, findings, actionPlans };
            } catch (error) {
                console.error("Fallo al cargar datos de la API, se usará data por defecto.", error);
                auditoriasData = JSON.parse(JSON.stringify(defaultData));
            }
        } else {
            // Cargar desde localStorage (lógica original)
            const savedData = JSON.parse(localStorage.getItem('auditorias_data_v1')) || {};
            auditoriasData = { ...JSON.parse(JSON.stringify(defaultData)), ...savedData };
        }
        // Los datos de empleados se siguen cargando de forma local según la lógica original
        employeesData = (JSON.parse(localStorage.getItem('sgsst_data_v5')) || { employees: [] }).employees;
    };

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
        (employeesData || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(emp => {
            options += `<option value="${emp.id}" ${emp.id == selectedId ? 'selected' : ''}>${emp.name}</option>`;
        });
        return options;
    };
    const getEmployeeName = (id) => (employeesData.find(e => String(e.id) === String(id)) || { name: 'N/A' }).name;
    const getAuditOptions = (selectedId = null) => {
        let options = '<option value="">Seleccione...</option>';
        (auditoriasData.audits || []).forEach(aud => {
            options += `<option value="${aud.id}" ${aud.id == selectedId ? 'selected' : ''}>${aud.name}</option>`;
        });
        return options;
    };
    const getAuditName = (id) => ((auditoriasData.audits || []).find(a => String(a.id) === String(id)) || { name: 'N/A' }).name;
    const getFindingName = (id) => ((auditoriasData.findings || []).find(f => String(f.id) === String(id)) || { description: 'N/A' }).description.substring(0, 50) + '...';

    const renderPage = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        const targetId = activeTab ? activeTab.dataset.target : 'dashboard-section';
        currentModule = targetId.replace('-section', '');
        dom.mainContent.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        const section = document.getElementById(targetId);
        if (section) section.classList.remove('hidden');
        if (currentModule === 'dashboard') {
            renderDashboard();
        } else if (moduleConfig[currentModule]) {
            renderTable(currentModule);
        }
        feather.replace();
    };

    const renderDashboard = () => {
        const section = document.getElementById('dashboard-section');
        const audits = auditoriasData.audits || [];
        const findings = auditoriasData.findings || [];
        const actionPlans = auditoriasData.actionPlans || [];
        const plannedAudits = audits.filter(a => a.status === 'Planificada').length;
        const openFindings = findings.filter(f => f.status === 'Abierto').length;
        const overdueActionPlans = actionPlans.filter(p => p.status !== 'Completado' && new Date(p.dueDate) < new Date()).length;
        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Dashboard de Auditorías</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Auditorías Planeadas</h3><p class="text-3xl font-bold text-blue-600 mt-1">${plannedAudits}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Hallazgos Abiertos</h3><p class="text-3xl font-bold text-orange-600 mt-1">${openFindings}</p></div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow"><h3 class="text-sm font-medium text-gray-500">Planes de Acción Vencidos</h3><p class="text-3xl font-bold text-red-600 mt-1">${overdueActionPlans}</p></div>
            </div>`;
    };

    const moduleConfig = {
        audits: { title: 'Planes de Auditoría', headers: ['Nombre', 'Tipo', 'Fechas', 'Estado', 'Acciones'] },
        findings: { title: 'Hallazgos', headers: ['Auditoría', 'Tipo', 'Descripción', 'Estado', 'Acciones'] },
        actionPlans: { title: 'Planes de Acción', headers: ['Hallazgo Asociado', 'Responsable', 'Fecha Límite', 'Estado', 'Acciones'] }
    };

    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        if (!config) return;
        const section = document.getElementById(moduleKey + '-section');
        if (!section) return;

        let addButtonHtml = `<button id="add-item-btn-${moduleKey}" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 flex items-center"><i data-feather="plus" class="mr-2"></i>Agregar</button>`;
        
        section.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 class="text-2xl font-bold">${config.title}</h2>
                ${addButtonHtml}
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto"><table class="w-full table-auto">
                    <thead class="bg-gray-200 dark:bg-gray-700"><tr>${config.headers.map(h => `<th class="px-4 py-3 text-left font-semibold uppercase">${h}</th>`).join('')}</tr></thead>
                    <tbody id="table-body-${moduleKey}" class="divide-y divide-gray-200 dark:divide-gray-600"></tbody>
                </table></div>
            </div>`;
        
        document.getElementById(`add-item-btn-${moduleKey}`).onclick = () => openFormModal(moduleKey);

        const tableBody = document.getElementById(`table-body-${moduleKey}`);
        const data = auditoriasData[moduleKey] || [];
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${config.headers.length}" class="text-center p-8 text-gray-500">No hay registros.</td></tr>`;
            return;
        }
        tableBody.innerHTML = data.map(item => {
            let cells = '';
            let actions = '';
            const statusColors = {'Planificada':'bg-blue-100 text-blue-800','En Progreso':'bg-yellow-100 text-yellow-800','Completada':'bg-green-100 text-green-800','Abierto':'bg-orange-100 text-orange-800','Cerrado':'bg-gray-100 text-gray-800', 'Pendiente': 'bg-gray-100 text-gray-800', 'Completado': 'bg-green-100 text-green-800'};
            const statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status] || ''}">${item.status}</span>`;

            if (moduleKey === 'audits') {
                cells = `<td class="p-4">${item.name}</td><td class="p-4">${item.type}</td><td class="p-4">${item.startDate} al ${item.endDate}</td><td class="p-4">${statusBadge}</td>`;
                actions = `<td class="p-4">
                    <button onclick="window.generateAuditReport(${item.id})" class="text-green-600 mr-2" title="Generar Reporte"><i data-feather="file-text"></i></button>
                    <button onclick="window.handleEdit('audits', ${item.id})" class="text-blue-600 mr-2" title="Editar"><i data-feather="edit-2"></i></button>
                    <button onclick="window.handleDelete('audits', ${item.id})" class="text-red-600" title="Eliminar"><i data-feather="trash-2"></i></button>
                </td>`;
            } else if (moduleKey === 'findings') {
                cells = `<td class="p-4">${getAuditName(item.auditId)}</td><td class="p-4">${item.type}</td><td class="p-4">${item.description}</td><td class="p-4">${statusBadge}</td>`;
                actions = `<td class="p-4">
                    <button onclick="window.openFormModal('actionPlans', null, { findingId: ${item.id} })" class="text-green-600 mr-2" title="Crear Plan de Acción"><i data-feather="tool"></i></button>
                    <button onclick="window.handleEdit('findings', ${item.id})" class="text-blue-600 mr-2" title="Editar"><i data-feather="edit-2"></i></button>
                    <button onclick="window.handleDelete('findings', ${item.id})" class="text-red-600" title="Eliminar"><i data-feather="trash-2"></i></button>
                </td>`;
            } else if (moduleKey === 'actionPlans') {
                cells = `<td class="p-4">${getFindingName(item.findingId)}</td><td class="p-4">${getEmployeeName(item.responsible)}</td><td class="p-4">${item.dueDate}</td><td class="p-4">${statusBadge}</td>`;
                actions = `<td class="p-4">
                    <button onclick="window.handleEdit('actionPlans', ${item.id})" class="text-blue-600 mr-2" title="Editar"><i data-feather="edit-2"></i></button>
                    <button onclick="window.handleDelete('actionPlans', ${item.id})" class="text-red-600" title="Eliminar"><i data-feather="trash-2"></i></button>
                </td>`;
            }
            return `<tr>${cells}${actions}</tr>`;
        }).join('');
        feather.replace();
    };

    const formTemplates = {
        audits: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                <div><label>Nombre/Objetivo de la Auditoría</label><input type="text" name="name" class="input" value="${data.name || ''}" required></div>
                <div><label>Alcance</label><textarea name="scope" rows="2" class="input">${data.scope || ''}</textarea></div>
                <div><label>Objetivos</label><textarea name="objectives" rows="2" class="input">${data.objectives || ''}</textarea></div>
                <div><label>Criterios (Norma, Ley, etc.)</label><input type="text" name="criteria" class="input" value="${data.criteria || ''}"></div>
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label>Tipo</label><select name="type" class="input"><option ${data.type === 'Interna' ? 'selected':''}>Interna</option><option ${data.type === 'Externa' ? 'selected':''}>Externa</option></select></div>
                    <div><label>Auditor Líder</label><select name="auditorLead" class="input">${getEmployeeOptions(data.auditorLead)}</select></div>
                </div>
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label>Fecha Inicio</label><input type="date" name="startDate" class="input" value="${data.startDate || ''}"></div>
                    <div><label>Fecha Fin</label><input type="date" name="endDate" class="input" value="${data.endDate || ''}"></div>
                </div>
                <div><label>Estado</label><select name="status" class="input"><option ${data.status === 'Planificada' ? 'selected':''}>Planificada</option><option ${data.status === 'En Progreso' ? 'selected':''}>En Progreso</option><option ${data.status === 'Completada' ? 'selected':''}>Completada</option></select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t"><button type="button" id="cancel-btn" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-lg mr-2">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg">Guardar</button></div>`,
        findings: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <div class="space-y-4">
                 <div><label>Auditoría Asociada</label><select name="auditId" class="input" required>${getAuditOptions(data.auditId)}</select></div>
                 <div><label>Tipo de Hallazgo</label><select name="type" class="input"><option ${data.type === 'No Conformidad Mayor' ? 'selected':''}>No Conformidad Mayor</option><option ${data.type === 'No Conformidad Menor' ? 'selected':''}>No Conformidad Menor</option><option ${data.type === 'Oportunidad de Mejora' ? 'selected':''}>Oportunidad de Mejora</option></select></div>
                 <div><label>Descripción</label><textarea name="description" rows="3" class="input">${data.description || ''}</textarea></div>
                 <div><label>Evidencia</label><textarea name="evidence" rows="2" class="input">${data.evidence || ''}</textarea></div>
                 <div><label>Análisis de Causa Raíz</label><textarea name="rootCause" rows="3" class="input">${data.rootCause || ''}</textarea></div>
                 <div><label>Estado</label><select name="status" class="input"><option ${data.status === 'Abierto' ? 'selected':''}>Abierto</option><option ${data.status === 'Cerrado' ? 'selected':''}>Cerrado</option></select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t"><button type="button" id="cancel-btn" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-lg mr-2">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg">Guardar</button></div>`,
        actionPlans: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <input type="hidden" name="findingId" value="${data.findingId || ''}">
            <div class="space-y-4">
                <div><label>Hallazgo Asociado</label><select name="findingId" class="input" required ${data.findingId ? 'disabled' : ''}>${(auditoriasData.findings || []).map(f => `<option value="${f.id}" ${f.id == data.findingId ? 'selected' : ''}>${f.description.substring(0, 70)}...</option>`).join('')}</select></div>
                <div><label>Plan de Acción / Tareas a Realizar</label><textarea name="plan" rows="3" class="input" required>${data.plan || ''}</textarea></div>
                <div class="grid md:grid-cols-2 gap-4">
                    <div><label>Responsable</label><select name="responsible" class="input" required>${getEmployeeOptions(data.responsible)}</select></div>
                    <div><label>Fecha Límite</label><input type="date" name="dueDate" class="input" value="${data.dueDate || ''}" required></div>
                </div>
                <div><label>Estado</label><select name="status" class="input"><option ${data.status === 'Pendiente' ? 'selected':''}>Pendiente</option><option ${data.status === 'En Progreso' ? 'selected':''}>En Progreso</option><option ${data.status === 'Completado' ? 'selected':''}>Completado</option></select></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t"><button type="button" id="cancel-btn" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-lg mr-2">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg">Guardar</button></div>`
    };

    window.openFormModal = (moduleKey, id = null, extraData = {}) => {
        if (!formTemplates[moduleKey]) return alert(`Error: No hay un formulario definido para "${moduleKey}".`);
        editingId = id;
        const data = id ? (auditoriasData[moduleKey] || []).find(i => String(i.id) === String(id)) : { ...extraData };
        dom.formModal.title.textContent = `${id ? 'Editar' : 'Agregar'} ${moduleConfig[moduleKey].title.slice(0, -1)}`;
        const formHtml = formTemplates[moduleKey](data)
            .replace(/<label>/g, '<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">')
            .replace(/class="input"/g, 'class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600"');
        dom.formModal.form.innerHTML = formHtml;
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(dom.formModal.el, false);
        
        dom.formModal.form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target).entries());
            
            if (moduleKey === 'actionPlans' && data.findingId) {
                formData.findingId = data.findingId;
            }

            if (isUserLoggedIn) {
                try {
                    if (editingId) {
                        await api.put(`/api/${moduleKey}/${editingId}`, formData);
                        showToast('Registro actualizado.', 'success');
                    } else {
                        await api.post(`/api/${moduleKey}`, formData);
                        showToast('Registro agregado.', 'success');
                    }
                } catch (error) {
                    return; 
                }
            } else {
                if (editingId) {
                    const index = auditoriasData[moduleKey].findIndex(i => String(i.id) === String(editingId));
                    if (index > -1) {
                        auditoriasData[moduleKey][index] = { ...auditoriasData[moduleKey][index], ...formData, id: Number(editingId) };
                    }
                    showToast('Registro actualizado.', 'success');
                } else {
                    formData.id = Date.now();
                    if (!auditoriasData[moduleKey]) {
                        auditoriasData[moduleKey] = [];
                    }
                    auditoriasData[moduleKey].push(formData);
                    showToast('Registro agregado.', 'success');
                }
                saveLocalData();
            }

            await loadData(); 
            renderPage();
            toggleModal(dom.formModal.el, false);
        };
        toggleModal(dom.formModal.el, true);
    };

    window.handleEdit = (module, id) => openFormModal(module, id);

    window.handleDelete = async (module, id) => {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            if (isUserLoggedIn) {
                try {
                    await api.delete(`/api/${module}/${id}`);
                    showToast('Registro eliminado.', 'success');
                } catch (error) {
                    return;
                }
            } else {
                auditoriasData[module] = (auditoriasData[module] || []).filter(i => String(i.id) !== String(id));
                saveLocalData();
                showToast('Registro eliminado.', 'success');
            }
            await loadData();
            renderPage();
        }
    };
    
    window.generateAuditReport = (auditId) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const audit = (auditoriasData.audits || []).find(a => String(a.id) === String(auditId));
        if (!audit) return alert('No se encontró la auditoría.');
        const relatedFindings = (auditoriasData.findings || []).filter(f => String(f.auditId) === String(auditId));
        doc.setFontSize(18);
        doc.text(`Informe de Auditoría: ${audit.name}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Periodo: ${audit.startDate || 'N/A'} al ${audit.endDate || 'N/A'}`, 14, 30);
        doc.text(`Tipo: ${audit.type || 'N/A'}`, 14, 36);
        doc.text(`Auditor Líder: ${getEmployeeName(audit.auditorLead)}`, 14, 42);
        doc.text(`Criterios: ${audit.criteria || 'N/A'}`, 14, 48);
        doc.setFontSize(14);
        doc.text('Hallazgos Encontrados', 14, 60);
        doc.autoTable({
            startY: 65,
            head: [['Tipo', 'Descripción', 'Evidencia']],
            body: relatedFindings.map(f => [f.type, f.description, f.evidence]),
            theme: 'grid'
        });
        doc.save(`Reporte-Auditoria-${audit.name.replace(/ /g, '_')}.pdf`);
    };

    dom.tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button) return;
        dom.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderPage();
    });

    dom.formModal.closeBtn.onclick = () => toggleModal(dom.formModal.el, false);
    
    // --- INICIALIZACIÓN DE LA APLICACIÓN ---
    checkLoginStatus();       // 1. Revisa si hay sesión en localStorage (sincrónico)
    await initUserSession();    // 2. Carga el componente de UI basado en lo anterior
    await loadData();           // 3. Carga los datos de la app (desde API o local)
    renderPage();               // 4. Renderiza la página
});