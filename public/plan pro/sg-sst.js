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

    // --- 1. CONFIGURACIÓN INICIAL Y SELECTORES ---
    const dom = {
        themeToggle: document.getElementById('theme-toggle'),
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
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

    let sstData = {};
    let editingId = null;
    let currentModule = 'dashboard';
    let riskChartInstance = null;
    
    const defaultData = {
        settings: {}, // Eliminamos la configuración de aquí
        employees: [], risks: [], incidents: [], trainings: [], medicalExams: [], inspections: [], annualPlan: [], actionPlans: []
    };

    // --- 2. LÓGICA DE DATOS Y ESTADO ---
    const saveData = () => localStorage.setItem('sgsst_data_v5', JSON.stringify(sstData));
    const loadData = () => {
        const data = localStorage.getItem('sgsst_data_v5');
        sstData = data ? JSON.parse(data) : JSON.parse(JSON.stringify(defaultData));
        for (const key in defaultData) {
            if (!sstData.hasOwnProperty(key)) sstData[key] = defaultData[key];
        }
    };
    
    // --- 3. FUNCIONES UTILITARIAS ---
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
        const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'info');
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `toast ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg flex items-center gap-2`;
        toastElement.innerHTML = `<i data-feather="${icon}" class="h-5 w-5"></i><span>${message}</span>`;
        toastContainer.appendChild(toastElement);
        feather.replace();
        setTimeout(() => toastElement.classList.add('show'), 10);
        setTimeout(() => {
            toastElement.classList.remove('show');
            setTimeout(() => toastElement.remove(), 500);
        }, 3000);
    };
    const toggleModal = (modalEl, show) => modalEl.classList.toggle('hidden', !show);
    const showConfirmation = (title, message, callback) => {
        dom.confirm.title.textContent = title;
        dom.confirm.message.textContent = message;
        dom.confirm.buttons.innerHTML = `<button id="confirm-cancel-btn" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg">Cancelar</button><button id="confirm-action-btn" class="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg">Confirmar</button>`;
        toggleModal(dom.confirm.el, true);
        document.getElementById('confirm-cancel-btn').onclick = () => toggleModal(dom.confirm.el, false);
        document.getElementById('confirm-action-btn').onclick = () => { callback(); toggleModal(dom.confirm.el, false); };
    };
    const getEmployeeOptions = (selectedId = null) => {
        let options = '<option value="">Seleccione...</option>';
        sstData.employees.sort((a,b) => a.name.localeCompare(b.name)).forEach(emp => {
            options += `<option value="${emp.id}" ${emp.id == selectedId ? 'selected' : ''}>${emp.name}</option>`;
        });
        return options;
    };
    const getEmployeeName = (id) => (sstData.employees.find(e => e.id == id) || {name: 'N/A'}).name;

    // --- 4. RENDERIZADO Y ACTUALIZACIÓN DE UI ---
    const renderPage = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        const targetId = activeTab ? activeTab.dataset.target : 'dashboard-section';
        currentModule = targetId.replace('-section', '');

        dom.mainContent.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

        if (moduleConfig[currentModule]) {
            openModuleTable(currentModule);
        } else {
            const section = document.getElementById(targetId);
            if(section) section.classList.remove('hidden');

            if(currentModule === 'dashboard') updateDashboard();
            if(currentModule === 'indicators') calculateAndRenderIndicators();
            if(currentModule === 'more-modules') renderMoreModulesSection();
        }
        
        feather.replace();
    };

    const updateDashboard = () => {
        const section = document.getElementById('dashboard-section');
        if (!section) return;
        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Panel de Control</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="kpi-card p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Plan Anual</h3><p id="dashboard-plan-progress" class="text-2xl font-bold text-blue-600 mt-1">0%</p></div>
                <div class="kpi-card p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Riesgos Nivel I</h3><p id="dashboard-high-risks" class="text-2xl font-bold text-red-600 mt-1">0</p></div>
                <div class="kpi-card p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Accidentes (Año)</h3><p id="dashboard-accidents" class="text-2xl font-bold text-orange-600 mt-1">0</p></div>
                <div class="kpi-card p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Planes de Acción Abiertos</h3><p id="dashboard-open-actions" class="text-2xl font-bold text-yellow-600 mt-1">0</p></div>
            </div>
            <div class="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><h3 class="text-lg font-semibold mb-4">Distribución de Riesgos por Nivel</h3><div class="h-64"><canvas id="risk-chart"></canvas></div></div>`;

        const completedTasks = sstData.annualPlan.filter(t => t.status === 'Completado').length;
        const totalTasks = sstData.annualPlan.length;
        section.querySelector('#dashboard-plan-progress').textContent = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%';
        section.querySelector('#dashboard-high-risks').textContent = sstData.risks.filter(r => r.riskLevel === 'I').length;
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        section.querySelector('#dashboard-accidents').textContent = sstData.incidents.filter(i => i.type === 'Accidente de Trabajo' && new Date(i.date) >= oneYearAgo).length;
        section.querySelector('#dashboard-open-actions').textContent = sstData.actionPlans.filter(a => a.status !== 'Completado').length;

        const riskCounts = { 'I': 0, 'II': 0, 'III': 0, 'IV': 0 };
        sstData.risks.forEach(risk => { if(riskCounts.hasOwnProperty(risk.riskLevel)) riskCounts[risk.riskLevel]++; });
        
        if (riskChartInstance) riskChartInstance.destroy();
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const riskChartCanvas = section.querySelector('#risk-chart');
        if (riskChartCanvas) {
            riskChartInstance = new Chart(riskChartCanvas.getContext('2d'), { type: 'bar', data: { labels: ['Nivel I', 'Nivel II', 'Nivel III', 'Nivel IV'], datasets: [{ label: 'Número de Riesgos', data: Object.values(riskCounts), backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e'] }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { display: false } } } });
        }
    };

    const calculateAndRenderIndicators = () => {
        const section = document.getElementById('indicators-section');
        if (!section) return;
        section.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Indicadores de Gestión (Resolución 0312 de 2019)</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Estos valores se calculan con base en los datos de los empleados registrados en RRHH y los incidentes del último año.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="indicators-grid"></div>`;
        
        const grid = section.querySelector('#indicators-grid');
        const N = (sstData.employees || []).filter(e => e.status === 'Activo').length;
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const incidentsLastYear = sstData.incidents.filter(i => new Date(i.date) >= oneYearAgo);
        const accidentsLastYear = incidentsLastYear.filter(i => i.type === 'Accidente de Trabajo');
        const totalAccidents = accidentsLastYear.length;
        const daysLost = accidentsLastYear.reduce((sum, i) => sum + (parseInt(i.daysLost, 10) || 0), 0);
        
        const indicators = [
            { title: 'Frecuencia de Accidentes', value: N > 0 ? ((totalAccidents / N) * 100).toFixed(2) + '%' : 'N/A', formula: '(N° Accidentes / N° Trabajadores) * 100' },
            { title: 'Severidad de Accidentes', value: N > 0 ? ((daysLost / N) * 100).toFixed(2) + '%' : 'N/A', formula: '(Días Perdidos / N° Trabajadores) * 100' },
            { title: 'Mortalidad de Accidentes', value: totalAccidents > 0 ? ((accidentsLastYear.filter(i => i.severity === 'Mortal').length / totalAccidents) * 100).toFixed(2) + '%' : '0.00%', formula: '(N° Accidentes Mortales / Total Accidentes) * 100'},
            { title: 'Prevalencia Enfermedad Laboral', value: N > 0 ? ((sstData.incidents.filter(i => i.type === 'Enfermedad Laboral').length / N) * 100000).toFixed(2) : 'N/A', formula: '(N° Casos Existentes EL / N° Trabajadores) * 100,000' },
            { title: 'Incidencia Enfermedad Laboral', value: N > 0 ? ((incidentsLastYear.filter(i => i.type === 'Enfermedad Laboral').length / N) * 100000).toFixed(2) : 'N/A', formula: '(N° Casos Nuevos EL / N° Trabajadores) * 100,000' },
            { title: 'Ausentismo por Causa Médica', value: 'N/A', formula: 'Próximamente' }
        ];
        
        indicators.forEach(ind => {
            const card = document.createElement('div');
            card.className = 'kpi-card p-5 rounded-lg shadow';
            card.innerHTML = `<h4 class="font-semibold text-gray-800 dark:text-gray-200">${ind.title}</h4><p class="text-3xl font-bold text-blue-600 my-2">${ind.value}</p><p class="text-xs text-gray-500 dark:text-gray-400">Fórmula: ${ind.formula}</p>`;
            grid.appendChild(card);
        });
    };
    
    // --- FUNCIÓN NUEVA PARA RENDERIZAR "MÁS MÓDULOS" ---
    const renderMoreModulesSection = () => {
        const section = document.getElementById('more-modules-section');
        if (!section) return;
        section.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">👥 Empleados</h3>
                        <button onclick="window.openModuleTable('employees')" class="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-blue-700">Gestionar</button>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Administra la lista de trabajadores de la empresa.</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">🎓 Capacitaciones</h3>
                        <button onclick="window.openModuleTable('trainings')" class="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-blue-700">Gestionar</button>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Planifica y registra las formaciones del personal.</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">🩺 Exámenes Médicos</h3>
                        <button onclick="window.openModuleTable('medicalExams')" class="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-blue-700">Gestionar</button>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Control de evaluaciones médicas ocupacionales.</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">🔍 Inspecciones</h3>
                        <button onclick="window.openModuleTable('inspections')" class="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-blue-700">Gestionar</button>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Registra inspecciones a equipos, EPP y áreas.</p>
                </div>
            </div>`;
    };
    
    const moduleConfig = {
        annualPlan: { title: 'Plan Anual de Trabajo', headers: ['Actividad', 'Responsable', 'Fecha Límite', 'Estado', 'Acciones'] },
        risks: { title: 'Matriz de Riesgos', headers: ['Proceso/Actividad', 'Clasificación', 'Nivel de Riesgo', 'Controles', 'Acciones'] },
        incidents: { title: 'Reporte de Incidentes', headers: ['Fecha', 'Tipo', 'Descripción', 'Involucrados', 'Acciones'] },
        actionPlans: { title: 'Planes de Acción', headers: ['Tarea', 'Origen', 'Responsable', 'Fecha Límite', 'Estado', 'Acciones'] },
        employees: { title: 'Empleados (desde RRHH)', headers: ['Nombre', 'Cédula', 'Cargo', 'Acciones'] },
        trainings: { title: 'Capacitaciones', headers: ['Tema', 'Fecha', 'Instructor', 'Estado', 'Acciones'] },
        medicalExams: { title: 'Exámenes Médicos', headers: ['Empleado', 'Tipo de Examen', 'Fecha', 'Concepto', 'Acciones'] },
        inspections: { title: 'Inspecciones de Seguridad', headers: ['Área/Equipo', 'Fecha', 'Responsable', 'Estado', 'Acciones'] }
    };

    window.openModuleTable = (moduleKey) => {
        currentModule = moduleKey;
        const config = moduleConfig[moduleKey];
        
        dom.mainContent.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
        
        const tableSection = document.getElementById('generic-table-section');
        tableSection.classList.remove('hidden');

        tableSection.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 id="table-title" class="text-2xl font-bold">${config.title}</h2>
                <button id="add-item-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 flex items-center ${moduleKey === 'employees' ? 'hidden' : ''}">
                    <i data-feather="plus" class="mr-2"></i> Agregar
                </button>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full table-auto">
                        <thead id="table-head" class="bg-gray-200 dark:bg-gray-700"></thead>
                        <tbody id="table-body" class="divide-y divide-gray-200 dark:divide-gray-700"></tbody>
                    </table>
                </div>
            </div>`;
        
        if (moduleKey === 'employees') {
            const infoBanner = document.createElement('div');
            infoBanner.className = "bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4";
            infoBanner.setAttribute('role', 'alert');
            infoBanner.innerHTML = `<p class="font-bold">Información</p><p>La gestión de empleados (crear, editar, eliminar) se realiza desde el módulo de <strong>Recursos Humanos</strong>.</p>`;
            tableSection.insertBefore(infoBanner, tableSection.children[1]);
        }

        tableSection.querySelector('#add-item-btn').onclick = () => openFormModal(currentModule);
        renderTable(moduleKey);
    };
    
    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const tableHead = document.getElementById('table-head');
        const tableBody = document.getElementById('table-body');
        
        tableHead.innerHTML = `<tr>${config.headers.map(h => `<th class="px-4 py-3 text-left font-semibold uppercase">${h}</th>`).join('')}</tr>`;
        
        const data = sstData[moduleKey] || [];
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${config.headers.length}" class="text-center p-6 text-gray-500">No hay registros. Comienza agregando uno.</td></tr>`;
            return;
        }

        data.sort((a, b) => (b.id || 0) - (a.id || 0)).forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            let cellsHTML = '';
            let extraActions = '';

            switch(moduleKey) {
                case 'annualPlan': cellsHTML = `<td>${item.activity}</td><td>${getEmployeeName(item.responsible)}</td><td>${item.dueDate}</td><td><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Completado' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}">${item.status}</span></td>`; break;
                case 'risks': const riskColor = item.riskLevel === 'I' ? 'text-red-600' : item.riskLevel === 'II' ? 'text-orange-500' : 'text-yellow-500'; cellsHTML = `<td><div class="font-medium">${item.process}</div><div class="text-sm text-gray-500">${item.task}</div></td><td>${item.classification}</td><td class="font-bold ${riskColor}">${item.riskLevel} - ${item.riskInterpretation}</td><td>${item.controls}</td>`; extraActions = `<button onclick="window.createActionPlan('Riesgo', ${item.id}, 'Controlar riesgo: ${item.task.replace(/'/g, "\\'")}')" class="text-green-600 hover:text-green-900 mr-2" title="Crear Plan de Acción"><i data-feather="plus-circle" class="h-5 w-5"></i></button>`; break;
                case 'incidents': cellsHTML = `<td>${item.date}</td><td>${item.type}</td><td>${item.description}</td><td>${item.involved}</td>`; extraActions = `<button onclick="window.createActionPlan('Incidente', ${item.id}, 'Investigar incidente: ${item.description.replace(/'/g, "\\'")}')" class="text-green-600 hover:text-green-900 mr-2" title="Crear Plan de Acción"><i data-feather="plus-circle" class="h-5 w-5"></i></button>`; break;
                case 'actionPlans': cellsHTML = `<td>${item.task}</td><td>${item.sourceType} N° ${item.sourceId}</td><td>${getEmployeeName(item.responsible)}</td><td>${item.dueDate}</td><td><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Completado' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}">${item.status}</span></td>`; break;
                case 'employees': cellsHTML = `<td>${item.name}</td><td>${item.idNumber}</td><td>${item.position}</td>`; extraActions = `<a href="./recursoshumanos.html" class="text-blue-600 hover:text-blue-800" title="Gestionar en RRHH"><i data-feather="external-link" class="h-5 w-5"></i></a>`; break;
                case 'trainings': cellsHTML = `<td>${item.topic}</td><td>${item.date}</td><td>${item.instructor}</td><td><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Realizada' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}">${item.status}</span></td>`; break;
                case 'medicalExams': cellsHTML = `<td>${getEmployeeName(item.employeeId)}</td><td>${item.examType}</td><td>${item.date}</td><td>${item.result}</td>`; break;
                case 'inspections': cellsHTML = `<td>${item.area}</td><td>${item.date}</td><td>${getEmployeeName(item.responsible)}</td><td><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Conforme' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}">${item.status}</span></td>`; extraActions = item.status === 'No Conforme' ? `<button onclick="window.createActionPlan('Inspección', ${item.id}, 'Corregir hallazgo en: ${item.area.replace(/'/g, "\\'")}')" class="text-green-600 hover:text-green-900 mr-2" title="Crear Plan de Acción"><i data-feather="plus-circle" class="h-5 w-5"></i></button>`: ''; break;
            }
            const actionsHTML = `<td class="px-4 py-3 text-center flex items-center justify-center">${extraActions}<button onclick="window.handleEdit('${moduleKey}', ${item.id})" class="text-blue-600 hover:text-blue-900 mr-2" title="Editar"><i data-feather="edit-2" class="h-5 w-5"></i></button><button onclick="window.handleDelete('${moduleKey}', ${item.id})" class="text-red-600 hover:text-red-900" title="Eliminar"><i data-feather="trash-2" class="h-5 w-5"></i></button></td>`;
            tr.innerHTML = cellsHTML.split('</td>').map(cell => cell ? `<td class="px-4 py-3">${cell.substring(4)}</td>` : '').join('') + actionsHTML;
            tableBody.appendChild(tr);
        });
        feather.replace();
    };
    
    // El resto del script sigue igual
    const gtc45 = { interpretacion: { 'I': 'No Aceptable', 'II': 'Aceptable con Control', 'III': 'Mejorable', 'IV': 'Aceptable' } };
    const calculateRiskLevel = () => {
        const form = dom.modal.mainForm;
        const nd = form.querySelector('[name="deficiencyLevel"]')?.value, ne = form.querySelector('[name="exposureLevel"]')?.value, nc = form.querySelector('[name="consequenceLevel"]')?.value;
        if (!nd || !ne || !nc) return;
        const np = parseInt(nd, 10) + parseInt(ne, 10);
        form.querySelector('#np_value').textContent = np;
        let npText;
        if (np >= 20) npText = 'MA'; else if (np >= 10) npText = 'A'; else if (np >= 6) npText = 'B'; else npText = 'M';
        form.querySelector('#np_level').textContent = npText;
        const ir = np * parseInt(nc, 10);
        form.querySelector('#ir_value').textContent = ir;
        let nivelRiesgo = 'IV';
        if (ir >= 600) nivelRiesgo = 'I'; else if (ir >= 150) nivelRiesgo = 'II'; else if (ir >= 40) nivelRiesgo = 'III';
        form.querySelector('[name="riskLevel"]').value = nivelRiesgo;
        form.querySelector('[name="riskInterpretation"]').value = gtc45.interpretacion[nivelRiesgo];
    };
    const formTemplates = {
        employees: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Nombre Completo</label><input type="text" name="name" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.name || ''}" required></div><div><label class="block text-sm font-medium">Cédula</label><input type="text" name="idNumber" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.idNumber || ''}"></div></div><div class="mt-4"><label class="block text-sm font-medium">Cargo</label><input type="text" name="position" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.position || ''}"></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        annualPlan: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div><label class="block text-sm font-medium">Actividad</label><input type="text" name="activity" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.activity || ''}" required></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><div><label class="block text-sm font-medium">Responsable</label><select name="responsible" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${getEmployeeOptions(data.responsible)}</select></div><div><label class="block text-sm font-medium">Fecha Límite</label><input type="date" name="dueDate" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.dueDate || ''}" required></div></div><div class="mt-4"><label class="block text-sm font-medium">Estado</label><select name="status" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required><option ${data.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option><option ${data.status === 'En Progreso' ? 'selected' : ''}>En Progreso</option><option ${data.status === 'Completado' ? 'selected' : ''}>Completado</option></select></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        risks: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Proceso</label><input type="text" name="process" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.process || ''}" required></div><div><label class="block text-sm font-medium">Actividad</label><input type="text" name="task" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.task || ''}" required></div></div><div class="mt-4"><label class="block text-sm font-medium">Clasificación del Peligro</label><select name="classification" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>Biológico</option><option>Físico</option><option>Químico</option><option>Psicosocial</option><option>Biomecánico</option><option>Condiciones de Seguridad</option><option>Fenómenos Naturales</option></select></div><div class="mt-4 border-t pt-4"><p class="font-semibold mb-2">Evaluación del Riesgo (GTC 45)</p><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label class="block text-sm font-medium">Nivel de Deficiencia (ND)</label><select name="deficiencyLevel" class="gtc45-calc mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option value="10">Muy Alto</option><option value="6">Alto</option><option value="2">Medio</option><option value="0">Bajo</option></select></div><div><label class="block text-sm font-medium">Nivel de Exposición (NE)</label><select name="exposureLevel" class="gtc45-calc mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option value="4">Continua</option><option value="3">Frecuente</option><option value="2">Ocasional</option><option value="1">Esporádica</option></select></div><div><label class="block text-sm font-medium">Nivel de Consecuencia (NC)</label><select name="consequenceLevel" class="gtc45-calc mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option value="100">Mortal</option><option value="60">Muy Grave</option><option value="25">Grave</option><option value="10">Leve</option></select></div></div><div class="grid grid-cols-3 gap-4 mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded"><div class="text-center"><p class="text-xs">Nivel Probabilidad (NP=ND+NE)</p><p class="font-bold text-lg"><span id="np_level">--</span> (<span id="np_value">--</span>)</p></div><div class="text-center"><p class="text-xs">Nivel Riesgo (NR=NPxNC)</p><p class="font-bold text-lg" id="ir_value">--</p></div><div class="text-center"><p class="text-xs">Nivel / Interpretación</p><div class="flex justify-center items-center font-bold text-lg"><input type="text" name="riskLevel" class="w-8 bg-transparent text-center p-0 border-0" readonly> - <input type="text" name="riskInterpretation" class="w-full bg-transparent p-0 border-0" readonly></div></div></div></div><div class="mt-4"><label class="block text-sm font-medium">Controles Existentes (Fuente, Medio, Individuo)</label><textarea name="controls" rows="2" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${data.controls || ''}</textarea></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        incidents: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Fecha del Evento</label><input type="date" name="date" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.date || new Date().toISOString().slice(0,10)}" required></div><div><label class="block text-sm font-medium">Tipo de Evento</label><select name="type" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>Incidente de Trabajo</option><option>Accidente de Trabajo</option><option>Enfermedad Laboral</option></select></div></div><div class="mt-4"><label class="block text-sm font-medium">Descripción del Evento</label><textarea name="description" rows="3" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${data.description || ''}</textarea></div><div class="mt-4"><label class="block text-sm font-medium">Personas Involucradas</label><input type="text" name="involved" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.involved || ''}"></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><div><label class="block text-sm font-medium">Severidad (si aplica)</label><select name="severity" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>N/A</option><option>Leve</option><option>Grave</option><option>Mortal</option></select></div><div><label class="block text-sm font-medium">Días Perdidos (si aplica)</label><input type="number" name="daysLost" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.daysLost || 0}"></div></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        trainings: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div><label class="block text-sm font-medium">Tema de Capacitación</label><input type="text" name="topic" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.topic || ''}" required></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><div><label class="block text-sm font-medium">Fecha</label><input type="date" name="date" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.date || ''}" required></div><div><label class="block text-sm font-medium">Instructor</label><input type="text" name="instructor" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.instructor || ''}"></div></div><div class="mt-4"><label class="block text-sm font-medium">Estado</label><select name="status" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>Programada</option><option>Realizada</option><option>Cancelada</option></select></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        medicalExams: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Empleado</label><select name="employeeId" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${getEmployeeOptions(data.employeeId)}</select></div><div><label class="block text-sm font-medium">Fecha del Examen</label><input type="date" name="date" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.date || ''}" required></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><div><label class="block text-sm font-medium">Tipo de Examen</label><select name="examType" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>Ingreso</option><option>Periódico</option><option>Egreso</option><option>Post-incapacidad</option></select></div><div><label class="block text-sm font-medium">Concepto de Aptitud</label><select name="result" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>Apto</option><option>Apto con Restricciones</option><option>No Apto</option><option>Aplazado</option></select></div></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        inspections: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Área / Equipo Inspeccionado</label><input type="text" name="area" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.area || ''}" required></div><div><label class="block text-sm font-medium">Fecha</label><input type="date" name="date" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.date || ''}" required></div></div><div class="mt-4"><label class="block text-sm font-medium">Responsable</label><select name="responsible" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${getEmployeeOptions(data.responsible)}</select></div><div class="mt-4"><label class="block text-sm font-medium">Hallazgos / Observaciones</label><textarea name="findings" rows="3" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${data.findings || ''}</textarea></div><div class="mt-4"><label class="block text-sm font-medium">Estado</label><select name="status" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option>Conforme</option><option>No Conforme</option></select></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`,
        actionPlans: (data = {}) => `<input type="hidden" name="id" value="${data.id || ''}"><input type="hidden" name="sourceType" value="${data.sourceType || 'General'}"><input type="hidden" name="sourceId" value="${data.sourceId || 'N/A'}"><div class="mb-2 p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md text-sm"><strong>Origen:</strong> ${data.sourceType || 'General'} N° ${data.sourceId || 'N/A'}</div><div><label class="block text-sm font-medium">Tarea a Realizar</label><textarea name="task" rows="3" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${data.task || ''}</textarea></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><div><label class="block text-sm font-medium">Responsable</label><select name="responsible" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700">${getEmployeeOptions(data.responsible)}</select></div><div><label class="block text-sm font-medium">Fecha Límite</label><input type="date" name="dueDate" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.dueDate || ''}" required></div></div><div class="mt-4"><label class="block text-sm font-medium">Estado</label><select name="status" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required><option>Pendiente</option><option>En Progreso</option><option>Completado</option></select></div><div class="flex justify-end mt-6"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`
    };

    const openFormModal = (moduleKey, id = null, prefillData = {}) => {
        currentModule = moduleKey;
        editingId = id;
        const itemData = id ? { ...sstData[moduleKey].find(i => i.id == id) } : { ...prefillData };
        const titles = { employees: id ? 'Editar Empleado' : 'Agregar Empleado', annualPlan: id ? 'Editar Actividad' : 'Agregar Actividad al Plan', risks: id ? 'Editar Riesgo' : 'Identificar Peligro', incidents: id ? 'Editar Reporte' : 'Reportar Incidente', trainings: id ? 'Editar Capacitación' : 'Programar Capacitación', medicalExams: id ? 'Editar Examen' : 'Registrar Examen Médico', inspections: id ? 'Editar Inspección' : 'Registrar Inspección', actionPlans: id ? 'Editar Plan de Acción' : 'Crear Plan de Acción' };
        dom.modal.title.textContent = titles[moduleKey] || 'Formulario';
        dom.modal.mainForm.innerHTML = formTemplates[moduleKey](itemData);
        if (moduleKey === 'risks') { dom.modal.mainForm.querySelectorAll('.gtc45-calc').forEach(el => el.addEventListener('change', calculateRiskLevel)); if (id || Object.keys(itemData).length > 0) calculateRiskLevel(); }
        dom.modal.mainForm.querySelector('#cancel-btn').onclick = () => toggleModal(dom.modal.el, false);
        toggleModal(dom.modal.el, true);
    };
    
    window.handleEdit = (module, id) => openFormModal(module, id);
    window.handleDelete = (module, id) => { showConfirmation("Confirmar Eliminación", "¿Estás seguro de que deseas eliminar este registro?", () => { sstData[module] = sstData[module].filter(i => i.id != id); saveData(); renderTable(module); renderPage(); showToast('Registro eliminado', 'error'); }); };
    window.createActionPlan = (sourceType, sourceId, task) => { openFormModal('actionPlans', null, { sourceType, sourceId, task }); };
    
    dom.modal.mainForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(dom.modal.mainForm);
        const data = Object.fromEntries(formData.entries());
        if (editingId) { const index = sstData[currentModule].findIndex(i => i.id == editingId); sstData[currentModule][index] = { ...sstData[currentModule][index], ...data, id: editingId }; showToast('Registro actualizado'); } else { data.id = Date.now(); sstData[currentModule].push(data); showToast('Registro agregado'); } renderTable(currentModule);
        saveData();
        renderPage();
        toggleModal(dom.modal.el, false);
        editingId = null;
    });

    dom.tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button) return;
        dom.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderPage();
    });

    const init = () => {
        const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');
        applyTheme(localStorage.getItem('theme') || 'light');
        
        loadData();
        renderPage();
        
        dom.themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            renderPage();
        });
        dom.modal.closeBtn.addEventListener('click', () => toggleModal(dom.modal.el, false));
    };
    
    init();
});