import { initUserSession } from './user-session.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. CONFIGURACIÓN INICIAL Y SELECTORES GLOBALES ---
    const dom = {
        tabsContainer: document.getElementById('tabs-container'),
        mainContent: document.getElementById('main-content'),
        formModal: { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form'), closeBtn: document.getElementById('close-modal-btn') },
        payslipModal: { el: document.getElementById('payslip-modal'), content: document.getElementById('payslip-content'), closeBtn: document.getElementById('close-payslip-modal-btn'), downloadBtn: document.getElementById('download-payslip-btn') },
        toastContainer: document.getElementById('toast-container')
    };

    let nominaData = {};
    let currentModule = 'dashboard';
    let editingId = null;
    let prenominaCache = [];
    let currentPayrollRecord = null;
    let isUserLoggedIn = false;

    const defaultData = {
        settings: {
            salarioMinimo: 1300000, auxTransporte: 162000, topeAuxTransporte: 2, uvt: 47065,
            saludEmpleado: 4, pensionEmpleado: 4, saludEmpleador: 8.5, pensionEmpleador: 12,
            arl: 0.522, sena: 2, icbf: 3, cajaCompensacion: 4
        },
        employees: [],
        novelties: [],
        payrollHistory: []
    };
    
    // --- 2. LÓGICA DE DATOS Y ESTADO ---
    const api = {
        async request(method, endpoint, body = null) {
            try {
                const options = { method, headers: { 'Content-Type': 'application/json' } };
                if (body) options.body = JSON.stringify(body);
                const response = await fetch(endpoint, options);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor' }));
                    throw new Error(errorData.error || `Error en la solicitud: ${response.status}`);
                }
                if (response.status === 204) return null;
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

    const checkLoginStatus = () => {
        isUserLoggedIn = !!localStorage.getItem('loggedInUser');
        console.log('Modo de operación Nómina:', isUserLoggedIn ? 'Base de Datos (Online)' : 'LocalStorage (Offline)');
    };

    const saveLocalData = () => {
        const dataToSave = {
            settings: nominaData.settings,
            novelties: nominaData.novelties,
            payrollHistory: nominaData.payrollHistory
        };
        localStorage.setItem('nomina_data_v2', JSON.stringify(dataToSave));
    };
    
    const deepMerge = (target, source) => {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    };

    const loadData = async () => {
        if (isUserLoggedIn) {
            try {
                const initialData = await api.get('/api/nomina/initial-data');
                const defaultDataCopy = JSON.parse(JSON.stringify(defaultData));
                
                nominaData.settings = deepMerge(initialData.settings, defaultDataCopy.settings);
                nominaData.novelties = initialData.novelties || [];
                nominaData.payrollHistory = initialData.payrollHistory || [];
                nominaData.employees = initialData.employees || [];

            } catch (error) {
                showToast('No se pudieron cargar los datos del servidor.', 'error');
                nominaData = JSON.parse(JSON.stringify(defaultData));
            }
        } else {
            const storedData = localStorage.getItem('nomina_data_v2');
            const parsedData = storedData ? JSON.parse(storedData) : {};
            const defaultDataCopy = JSON.parse(JSON.stringify(defaultData));
            nominaData = deepMerge(parsedData, defaultDataCopy);
            
            const hrData = JSON.parse(localStorage.getItem('sgsst_data_v5')) || { employees: [] };
            nominaData.employees = hrData.employees;
        }
    };

    // --- 3. FUNCIONES UTILITARIAS ---
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    const showToast = (message, type = 'success') => {
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-blue-500' : 'bg-red-500';
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
        }, 4000);
    };
    const toggleModal = (modalEl, show) => modalEl.classList.toggle('hidden', !show);
    const getEmployeeName = (id) => (nominaData.employees.find(e => e.id == id) || {name: 'N/A'}).name;

    // --- 4. LÓGICA DE CÁLCULO DE NÓMINA ---
    const calculatePayrollForEmployee = (employee, period) => {
        const S = nominaData.settings;
        let baseSalary = employee.baseSalary;
        
        const employeeLeaves = employee.leaves || [];
        const unpaidLeavesInPeriod = employeeLeaves.filter(l => !l.isPaid && l.startDate.substring(0, 7) === period);
        let unpaidDays = unpaidLeavesInPeriod.reduce((sum, l) => sum + l.days, 0);
        let salaryDeductionForUnpaidLeave = 0;
        
        if (unpaidDays > 0) {
            salaryDeductionForUnpaidLeave = (baseSalary / 30) * unpaidDays;
            baseSalary -= salaryDeductionForUnpaidLeave;
        }

        const employeeNovelties = nominaData.novelties.filter(n => n.employeeId == employee.id && n.period === period);
        const noveltyEarnings = employeeNovelties.filter(n => n.type === 'devengado').reduce((sum, n) => sum + n.value, 0);
        const noveltyDeductions = employeeNovelties.filter(n => n.type === 'deduccion').reduce((sum, n) => sum + n.value, 0);
        
        const ibc = baseSalary + employeeNovelties.filter(n => n.type === 'devengado' && n.addsToIBC).reduce((sum, n) => sum + n.value, 0);
        const receivesTransportAid = baseSalary <= (S.salarioMinimo * S.topeAuxTransporte) && unpaidDays < 30;
        const transportAid = receivesTransportAid ? (S.auxTransporte / 30) * (30 - unpaidDays) : 0;
        const totalEarnings = baseSalary + transportAid + noveltyEarnings;
        
        const healthDeduction = ibc * (S.saludEmpleado / 100);
        const pensionDeduction = ibc * (S.pensionEmpleado / 100);
        
        const smmlvCount = ibc / S.salarioMinimo;
        let fspRate = 0;
        if (smmlvCount >= 4) fspRate = 0.01;
        const fspDeduction = ibc * fspRate;
        
        const totalDeductions = healthDeduction + pensionDeduction + fspDeduction + noveltyDeductions;
        const netPay = totalEarnings - totalDeductions;

        const healthEmployer = ibc * (S.saludEmpleador / 100);
        const pensionEmployer = ibc * (S.pensionEmpleador / 100);
        const arlEmployer = ibc * (S.arl / 100);
        const cajaEmployer = ibc * (S.cajaCompensacion / 100);
        const isExemptParafiscales = baseSalary < (S.salarioMinimo * 10);
        const icbfEmployer = isExemptParafiscales ? 0 : ibc * (S.icbf / 100);
        const senaEmployer = isExemptParafiscales ? 0 : ibc * (S.sena / 100);
        const totalEmployerContributions = healthEmployer + pensionEmployer + arlEmployer + cajaEmployer + icbfEmployer + senaEmployer;
        const provisionsBase = totalEarnings - transportAid;
        const cesantias = provisionsBase * 0.0833;
        const interesesCesantias = cesantias * 0.12;
        const prima = provisionsBase * 0.0833;
        const vacaciones = baseSalary * 0.0417;
        const totalProvisions = cesantias + interesesCesantias + prima + vacaciones;
        const totalCompanyCost = totalEarnings + totalEmployerContributions + totalProvisions;
        
        return {
            employeeId: employee.id, employeeName: employee.name, baseSalary: employee.baseSalary,
            transportAid, totalEarnings, healthDeduction, pensionDeduction, fspDeduction,
            totalDeductions, netPay, novelties: employeeNovelties,
            unpaidLeave: { days: unpaidDays, deduction: salaryDeductionForUnpaidLeave },
            employerContributions: { health: healthEmployer, pension: pensionEmployer, arl: arlEmployer, caja: cajaEmployer, icbf: icbfEmployer, sena: senaEmployer, total: totalEmployerContributions },
            provisions: { cesantias, interesesCesantias, prima, vacaciones, total: totalProvisions },
            totalCompanyCost
        };
    };

    // --- 5. LÓGICA DE RENDERIZADO ---
    const render = () => {
        const activeTab = dom.tabsContainer.querySelector('.tab-btn.active');
        if (activeTab) {
            const moduleKey = activeTab.dataset.target.replace('-section', '');
            renderModule(moduleKey);
        } else {
            dom.tabsContainer.querySelector('[data-target="dashboard-section"]').classList.add('active');
            renderModule('dashboard');
        }
        feather.replace();
    };

    const renderModule = (moduleKey) => {
        currentModule = moduleKey;
        dom.mainContent.querySelectorAll('section.tab-content').forEach(s => s.classList.add('hidden'));
        let section;
        
        if (['employees', 'novelties', 'history'].includes(moduleKey)) {
            section = document.getElementById('table-section');
            renderTable(moduleKey);
        } else {
            section = document.getElementById(`${moduleKey}-section`);
            const camelCaseKey = moduleKey.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            const renderFunctionName = `render${camelCaseKey.charAt(0).toUpperCase() + camelCaseKey.slice(1)}Section`;
            if (window[renderFunctionName]) window[renderFunctionName]();
        }
        if (section) section.classList.remove('hidden');
    };
    
    window.renderDashboardSection = () => { 
        const lastPayroll = nominaData.payrollHistory && nominaData.payrollHistory.length > 0 ? nominaData.payrollHistory[nominaData.payrollHistory.length - 1] : { records: [] };
        const totalCost = lastPayroll.records.reduce((sum, r) => sum + r.totalCompanyCost, 0);
        const netPaid = lastPayroll.records.reduce((sum, r) => sum + r.netPay, 0);
        const totalDeductions = lastPayroll.records.reduce((sum, r) => sum + r.totalDeductions, 0);

        document.getElementById('dashboard-section').innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Panel de Control (Último Periodo: ${lastPayroll.period || 'N/A'})</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Costo Total Nómina</h3><p class="text-2xl font-bold text-blue-600 mt-1">${formatCurrency(totalCost)}</p></div>
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Neto Pagado</h3><p class="text-2xl font-bold text-green-600 mt-1">${formatCurrency(netPaid)}</p></div>
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">Total Deducciones</h3><p class="text-2xl font-bold text-red-600 mt-1">${formatCurrency(totalDeductions)}</p></div>
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center"><h3 class="text-sm font-medium text-gray-500">N° Empleados</h3><p class="text-2xl font-bold text-gray-700 mt-1">${lastPayroll.records.length}</p></div>
            </div>`;
    };
    window.renderPayrollRunSection = () => {
         const today = new Date();
        const currentPeriod = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        document.getElementById('payroll-run-section').innerHTML = `
            <div id="view-only-banner" class="hidden bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                <p class="font-bold">Modo de solo lectura</p>
                <p>Está viendo un registro histórico del periodo. No se pueden realizar cambios.</p>
            </div>
            <h2 class="text-2xl font-bold mb-4">Procesar Nómina</h2>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label for="payroll-period" class="block text-sm font-medium">Periodo a Liquidar</label>
                        <input type="month" id="payroll-period" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${currentPeriod}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium invisible">Acción</label>
                        <button id="calculate-payroll-btn" class="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 flex items-center justify-center"><i data-feather="calculator" class="mr-2"></i> Calcular Prenómina</button>
                    </div>
                </div>
                
                <div id="instruction-message" class="text-center text-gray-500 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg mt-6 border-2 border-dashed">
                    <i data-feather="info" class="mx-auto h-10 w-10 text-blue-400"></i>
                    <p class="mt-2 font-semibold">Comience a procesar su nómina</p>
                    <p class="text-sm">Seleccione un periodo y haga clic en <strong>Calcular Prenómina</strong> para ver los resultados.</p>
                </div>

                <div id="prenomina-results" class="hidden">
                    <h3 class="text-xl font-bold mb-4">Resultados de la Prenómina</h3>
                    <div class="overflow-x-auto"><table class="w-full table-auto">
                        <thead class="bg-gray-200 dark:bg-gray-700">
                            <tr>
                                <th class="px-4 py-3 text-left font-semibold uppercase">Empleado</th><th class="px-4 py-3 text-left font-semibold uppercase">Total Devengado</th>
                                <th class="px-4 py-3 text-left font-semibold uppercase">Total Deducido</th><th class="px-4 py-3 text-left font-semibold uppercase">Neto a Pagar</th>
                                <th class="px-4 py-3 text-center font-semibold uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="prenomina-table-body" class="divide-y divide-gray-200 dark:divide-gray-600"></tbody>
                    </table></div>
                    <div class="flex justify-end mt-6">
                        <button id="confirm-payroll-btn" class="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-green-700 flex items-center"><i data-feather="check-circle" class="mr-2"></i> Confirmar y Guardar Nómina</button>
                    </div>
                </div>
            </div>`;
    };
    window.renderReportsSection = () => {
        document.getElementById('reports-section').innerHTML = `
            <h2 class="text-2xl font-bold mb-4">Informes de Nómina</h2>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold mb-2">Informe de Aportes y Provisiones</h3>
                <p class="text-sm text-gray-500 mb-4">Genere un resumen de los costos del empleador para un periodo específico.</p>
                <div class="flex items-end gap-4">
                    <div class="flex-grow">
                        <label for="report-period" class="block text-sm font-medium">Seleccione el Periodo</label>
                        <select id="report-period" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></select>
                    </div>
                    <button data-action="generate-report" class="bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-700">Generar Informe</button>
                </div>
                <div id="report-output" class="mt-6"></div>
            </div>`;
        const periodSelect = document.getElementById('report-period');
        const reversedHistory = [...(nominaData.payrollHistory || [])].reverse();
        periodSelect.innerHTML = reversedHistory.map(h => `<option value="${h.period}">${h.period}</option>`).join('');
    };
    window.renderSettingsSection = () => {
        document.getElementById('settings-section').innerHTML = `
             <h2 class="text-2xl font-bold mb-4">Configuración de Nómina</h2>
             <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                <form id="settings-form" class="space-y-6">
                    <div>
                        <h3 class="text-lg font-semibold border-b pb-2 mb-4">Parámetros Generales</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label class="block text-sm font-medium">Salario Mínimo</label><input type="number" step="any" min="0" name="salarioMinimo" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">Aux. Transporte</label><input type="number" step="any" min="0" name="auxTransporte" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">Tope Aux. Transp. (SMMLV)</label><input type="number" name="topeAuxTransporte" class="mt-1 block w-full border rounded-md p-2 bg-gray-100 dark:bg-gray-600" readonly></div>
                            <div><label class="block text-sm font-medium">Valor UVT</label><input type="number" step="any" min="0" name="uvt" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold border-b pb-2 mb-4">Aportes de Seguridad Social y Parafiscales (%)</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label class="block text-sm font-medium">Salud (Empleado)</label><input type="number" step="any" min="0" name="saludEmpleado" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">Pensión (Empleado)</label><input type="number" step="any" min="0" name="pensionEmpleado" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">Salud (Empleador)</label><input type="number" step="any" min="0" name="saludEmpleador" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">Pensión (Empleador)</label><input type="number" step="any" min="0" name="pensionEmpleador" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">ARL (Riesgo 1)</label><input type="number" step="any" min="0" name="arl" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">SENA</label><input type="number" step="any" min="0" name="sena" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">ICBF</label><input type="number" step="any" min="0" name="icbf" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                            <div><label class="block text-sm font-medium">Caja Compensación</label><input type="number" step="any" min="0" name="cajaCompensacion" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"></div>
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar Configuración</button>
                    </div>
                </form>
             </div>
             <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">Gestión de Datos</h3>
                <p class="text-sm text-gray-500 mb-4">Exporte sus datos como respaldo de seguridad o impórtelos para restaurar su información.</p>
                <div class="flex items-center gap-4">
                    <button data-action="export-data" class="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center"><i data-feather="download" class="mr-2"></i>Exportar Datos</button>
                    <label class="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center cursor-pointer">
                        <i data-feather="upload" class="mr-2"></i>Importar Datos
                        <input type="file" id="import-file-input" class="hidden" accept=".json">
                    </label>
                </div>
            </div>`;
        const form = document.getElementById('settings-form');
        const settings = nominaData.settings;
        for (const key in settings) { if (form.elements[key]) form.elements[key].value = settings[key]; }
    };

    const moduleConfig = {
        employees: { title: 'Empleados', headers: ['Nombre', 'Cédula', 'Cargo', 'Salario Base', 'Acciones'], noData: 'No hay empleados. Agréguelos desde el módulo de Recursos Humanos.' },
        novelties: { title: 'Novedades de Nómina', headers: ['Periodo', 'Empleado', 'Tipo', 'Concepto', 'Valor', 'Acciones'], noData: 'No hay novedades registradas.' },
        history: { title: 'Historial de Nóminas', headers: ['Periodo', 'N° Empleados', 'Costo Total', 'Neto Pagado', 'Acciones'], noData: 'No hay nóminas procesadas.' }
    };
    
    const renderTable = (moduleKey) => {
        const config = moduleConfig[moduleKey];
        const tableSection = document.getElementById('table-section');
        tableSection.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 class="text-2xl font-bold">${config.title}</h2>
                <button data-action="add" data-module="${moduleKey}" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 flex items-center ${moduleKey === 'employees' ? 'hidden' : ''}"><i data-feather="plus" class="mr-2"></i> Agregar</button>
            </div>
            ${moduleKey === 'employees' ? `<div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4" role="alert"><p>Los datos de los empleados se sincronizan desde <strong>Recursos Humanos</strong>. Las acciones de Crear, Editar o Eliminar deben realizarse en dicho módulo.</p></div>` : ''}
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full table-auto">
                        <thead class="bg-gray-200 dark:bg-gray-700"><tr>${config.headers.map(h => `<th class="px-4 py-3 text-left font-semibold uppercase">${h}</th>`).join('')}</tr></thead>
                        <tbody id="table-body" class="divide-y divide-gray-200 dark:divide-gray-600"></tbody>
                    </table>
                </div>
                <div id="no-data-message" class="hidden text-center p-8"><i data-feather="folder" class="mx-auto h-12 w-12 text-gray-400"></i><p class="mt-2">${config.noData}</p></div>
            </div>`;

        const tableBody = document.getElementById('table-body');
        const dataArray = nominaData[moduleKey] || [];
        const data = (dataArray || []).slice().reverse();
        
        if(data.length === 0) { document.getElementById('no-data-message').classList.remove('hidden'); }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
            let cells = '';
            if (moduleKey === 'employees') {
                cells = `<td class="px-4 py-3">${item.name}</td><td>${item.idNumber}</td><td>${item.position}</td><td>${formatCurrency(item.baseSalary)}</td>`;
            } else if (moduleKey === 'novelties') {
                cells = `<td class="px-4 py-3">${item.period}</td><td class="px-4 py-3">${getEmployeeName(item.employeeId)}</td>
                         <td class="px-4 py-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${item.type === 'devengado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${item.type}</span></td>
                         <td class="px-4 py-3">${item.concept}</td><td class="px-4 py-3">${formatCurrency(item.value)}</td>`;
            } else if (moduleKey === 'history') {
                const totalCost = item.records.reduce((sum, r) => sum + r.totalCompanyCost, 0);
                const netPaid = item.records.reduce((sum, r) => sum + r.netPay, 0);
                cells = `<td class="px-4 py-3 font-bold">${item.period}</td><td class="px-4 py-3">${item.records.length}</td><td class="px-4 py-3">${formatCurrency(totalCost)}</td><td class="px-4 py-3">${formatCurrency(netPaid)}</td>`;
            }
            
            let actions = '';
            if (moduleKey === 'employees') {
                actions = `<td class="px-4 py-3"><a href="./recursoshumanos.html" class="flex items-center text-blue-600 hover:underline" title="Ver en RRHH"><i data-feather="external-link" class="mr-2"></i> Gestionar en RRHH</a></td>`;
            } else if (moduleKey === 'history') {
                actions = `<td class="px-4 py-3 text-left flex items-center justify-start gap-2"><button data-action="view-history" data-id="${item.period}" class="text-blue-600 hover:text-blue-900" title="Ver Detalle"><i data-feather="eye"></i></button></td>`;
            } else { // Novedades
                actions = `<td class="px-4 py-3 text-left flex items-center justify-start gap-2">
                            <button data-action="edit" data-module="${moduleKey}" data-id="${item.id}" class="text-blue-600 hover:text-blue-900" title="Editar"><i data-feather="edit-2"></i></button>
                            <button data-action="delete" data-module="${moduleKey}" data-id="${item.id}" class="text-red-600 hover:text-red-900" title="Eliminar"><i data-feather="trash-2"></i></button>
                          </td>`;
            }
            tr.innerHTML = cells + actions;
            tableBody.appendChild(tr);
        });
    };

    const renderPayslip = (record, period) => {
        currentPayrollRecord = { record, period };
        const employee = nominaData.employees.find(e => e.id === record.employeeId);
        const S = nominaData.settings;
        const tdStyle = "padding: 6px; border: 1px solid #ddd;";
        const tdRight = tdStyle + " text-align: right;";
        
        dom.payslipModal.content.innerHTML = `
            <div class="p-2 border rounded dark:border-gray-600" id="payslip-pdf-content">
                <h3 class="text-xl font-bold text-center">Comprobante de Pago de Nómina</h3>
                <p class="text-center text-sm mb-4">Periodo: ${period}</p>
                <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div><strong>Empleado:</strong> ${employee.name}</div><div><strong>C.C.:</strong> ${employee.idNumber}</div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                        <h4 class="font-bold text-lg mb-2 text-green-600">Devengados</h4>
                        <table class="w-full border-collapse text-sm">
                            <tr><td style="${tdStyle}">Salario Base</td><td style="${tdRight}">${formatCurrency(record.baseSalary)}</td></tr>
                            <tr><td style="${tdStyle}">Auxilio de Transporte</td><td style="${tdRight}">${formatCurrency(record.transportAid)}</td></tr>
                            ${record.novelties.filter(n=>n.type==='devengado').map(n=>`<tr><td style="${tdStyle}">${n.concept}</td><td style="${tdRight}">${formatCurrency(n.value)}</td></tr>`).join('')}
                            <tr class="font-bold bg-gray-100 dark:bg-gray-700"><td style="${tdStyle}">TOTAL DEVENGADO</td><td style="${tdRight}">${formatCurrency(record.totalEarnings)}</td></tr>
                        </table>
                    </div>
                    <div>
                        <h4 class="font-bold text-lg mb-2 text-red-600">Deducciones</h4>
                        <table class="w-full border-collapse text-sm">
                            <tr><td style="${tdStyle}">Aporte Salud (${S.saludEmpleado}%)</td><td style="${tdRight}">${formatCurrency(record.healthDeduction)}</td></tr>
                            <tr><td style="${tdStyle}">Aporte Pensión (${S.pensionEmpleado}%)</td><td style="${tdRight}">${formatCurrency(record.pensionDeduction)}</td></tr>
                            <tr><td style="${tdStyle}">Fondo Solidaridad</td><td style="${tdRight}">${formatCurrency(record.fspDeduction)}</td></tr>
                             ${record.novelties.filter(n=>n.type==='deduccion').map(n=>`<tr><td style="${tdStyle}">${n.concept}</td><td style="${tdRight}">${formatCurrency(n.value)}</td></tr>`).join('')}
                             ${record.unpaidLeave && record.unpaidLeave.days > 0 ? `<tr><td style="${tdStyle}">Deducción Licencia No Rem. (${record.unpaidLeave.days} días)</td><td style="${tdRight}">${formatCurrency(record.unpaidLeave.deduction)}</td></tr>` : ''}
                            <tr class="font-bold bg-gray-100 dark:bg-gray-700"><td style="${tdStyle}">TOTAL DEDUCIDO</td><td style="${tdRight}">${formatCurrency(record.totalDeductions)}</td></tr>
                        </table>
                    </div>
                </div>
                 <div class="mt-6 text-center bg-blue-100 dark:bg-blue-900/50 p-3 rounded">
                    <h3 class="text-xl font-bold">NETO A PAGAR: ${formatCurrency(record.netPay)}</h3>
                </div>

                <div class="mt-6 border-t pt-4">
                    <h4 class="font-bold text-lg mb-2 text-gray-600 dark:text-gray-300">Resumen de Costos para el Empleador</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                            <h5 class="font-semibold mb-1">Aportes y Parafiscales</h5>
                            <table class="w-full border-collapse text-sm">
                                <tr><td style="${tdStyle}">Salud (${S.saludEmpleador}%)</td><td style="${tdRight}">${formatCurrency(record.employerContributions.health)}</td></tr>
                                <tr><td style="${tdStyle}">Pensión (${S.pensionEmpleador}%)</td><td style="${tdRight}">${formatCurrency(record.employerContributions.pension)}</td></tr>
                                <tr><td style="${tdStyle}">ARL (${S.arl}%)</td><td style="${tdRight}">${formatCurrency(record.employerContributions.arl)}</td></tr>
                                <tr><td style="${tdStyle}">Caja de Compensación (${S.cajaCompensacion}%)</td><td style="${tdRight}">${formatCurrency(record.employerContributions.caja)}</td></tr>
                                <tr><td style="${tdStyle}">ICBF (${S.icbf}%)</td><td style="${tdRight}">${formatCurrency(record.employerContributions.icbf)}</td></tr>
                                <tr><td style="${tdStyle}">SENA (${S.sena}%)</td><td style="${tdRight}">${formatCurrency(record.employerContributions.sena)}</td></tr>
                                <tr class="font-bold bg-gray-100 dark:bg-gray-700"><td style="${tdStyle}">Subtotal Aportes</td><td style="${tdRight}">${formatCurrency(record.employerContributions.total)}</td></tr>
                            </table>
                        </div>
                        <div>
                            <h5 class="font-semibold mb-1">Provisiones de Prestaciones</h5>
                             <table class="w-full border-collapse text-sm">
                                <tr><td style="${tdStyle}">Cesantías (8.33%)</td><td style="${tdRight}">${formatCurrency(record.provisions.cesantias)}</td></tr>
                                <tr><td style="${tdStyle}">Intereses s/ Cesantías (12%)</td><td style="${tdRight}">${formatCurrency(record.provisions.interesesCesantias)}</td></tr>
                                <tr><td style="${tdStyle}">Prima de Servicios (8.33%)</td><td style="${tdRight}">${formatCurrency(record.provisions.prima)}</td></tr>
                                <tr><td style="${tdStyle}">Vacaciones (4.17%)</td><td style="${tdRight}">${formatCurrency(record.provisions.vacaciones)}</td></tr>
                                <tr class="font-bold bg-gray-100 dark:bg-gray-700"><td style="${tdRight}">Subtotal Provisiones</td><td style="${tdRight}">${formatCurrency(record.provisions.total)}</td></tr>
                            </table>
                        </div>
                    </div>
                     <div class="mt-4 text-center bg-gray-200 dark:bg-gray-700 p-3 rounded">
                        <h3 class="text-lg font-bold">COSTO TOTAL EMPRESA: ${formatCurrency(record.totalCompanyCost)}</h3>
                    </div>
                </div>
            </div>`;
        toggleModal(dom.payslipModal.el, true);
    };

    const formTemplates = {
        novelties: (data = {}) => {
            const employeeOptions = nominaData.employees.map(e => `<option value="${e.id}" ${data.employeeId == e.id ? 'selected' : ''}>${e.name}</option>`).join('');
            return `
                <input type="hidden" name="id" value="${data.id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Periodo (YYYY-MM)</label><input type="month" name="period" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.period || ''}" required></div>
                    <div><label class="block text-sm font-medium">Empleado</label><select name="employeeId" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required>${employeeOptions}</select></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     <div><label class="block text-sm font-medium">Tipo</label><select name="type" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" required><option value="devengado" ${data.type === 'devengado' ? 'selected' : ''}>Devengado</option><option value="deduccion" ${data.type === 'deduccion' ? 'selected' : ''}>Deducción</option></select></div>
                     <div><label class="block text-sm font-medium">Suma a IBC?</label><select name="addsToIBC" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700"><option value="true" ${data.addsToIBC ? 'selected' : ''}>Sí</option><option value="false" ${!data.addsToIBC ? 'selected' : ''}>No</option></select></div>
                </div>
                <div class="mt-4"><label class="block text-sm font-medium">Concepto</label><input type="text" name="concept" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" placeholder="Ej: Bonificación, Cuota Préstamo" value="${data.concept || ''}" required></div>
                <div class="mt-4"><label class="block text-sm font-medium">Valor</label><input type="number" min="0" name="value" class="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700" value="${data.value || ''}" required></div>
                <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-600"><button type="button" class="bg-gray-300 dark:bg-gray-600 font-semibold py-2 px-4 rounded-lg mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Guardar</button></div>`;
        }
    };
    
     const openFormModal = (moduleKey, data = {}, onSaveCallback = null) => {
        editingId = data.id || null;
        const titles = { novelties: 'Novedad' };
        dom.formModal.title.textContent = `${editingId ? 'Editar' : 'Agregar'} ${titles[moduleKey]}`;
        dom.formModal.form.innerHTML = formTemplates[moduleKey](data);
        dom.formModal.form.onsave = onSaveCallback;
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(dom.formModal.el, false);
        toggleModal(dom.formModal.el, true);
    };
    
    // --- 6. MANEJADORES DE ACCIONES ---
    const handleAdd = (module) => openFormModal(module);
    const handleEdit = (module, id) => {
        const item = nominaData[module].find(i => i.id === parseInt(id));
        if (item) openFormModal(module, item);
    };
    const handleDelete = async (module, idStr) => {
        if (module === 'employees') {
             showToast('La gestión de empleados es desde RRHH.', 'error'); return;
        }
        const id = parseInt(idStr);
        if (confirm(`¿Estás seguro de eliminar este registro?`)) {
            try {
                if (isUserLoggedIn) {
                    await api.delete(`/api/nomina/novelties/${id}`);
                } else {
                    nominaData[module] = nominaData[module].filter(i => i.id !== id);
                    saveLocalData();
                }
                showToast('Registro eliminado.', 'success');
                await loadData();
                render();
            } catch (e) { /* El error ya se muestra en la capa de api */ }
        }
    };
    const viewHistoryDetail = (period) => {
        const historyRecord = nominaData.payrollHistory.find(h => h.period === period);
        dom.tabsContainer.querySelector('.tab-btn.active').classList.remove('active');
        const payrollTab = dom.tabsContainer.querySelector('[data-target="payroll-run-section"]');
        payrollTab.classList.add('active');
        renderModule('payroll-run');

        document.getElementById('instruction-message').classList.add('hidden');
        document.getElementById('payroll-period').value = period;
        document.getElementById('payroll-period').disabled = true;
        document.getElementById('calculate-payroll-btn').disabled = true;
        document.getElementById('view-only-banner').classList.remove('hidden');

        prenominaCache = historyRecord.records;
        renderPrenominaTable(true);
        document.getElementById('prenomina-results').classList.remove('hidden');
        document.getElementById('confirm-payroll-btn').classList.add('hidden');
    };
    const viewPrenominaDetail = (employeeId) => {
        const period = document.getElementById('payroll-period').value;
        const record = prenominaCache.find(r => r.employeeId === parseInt(employeeId));
        if(record) renderPayslip(record, period);
    };
    const addNoveltyFromPrenomina = (employeeId) => {
        const period = document.getElementById('payroll-period').value;
        openFormModal('novelties', { employeeId: parseInt(employeeId), period: period }, handleCalculatePayroll);
    };

    const handleCalculatePayroll = () => {
        if (nominaData.employees.length === 0) {
            showToast('No hay empleados. Agréguelos desde RRHH.', 'error');
            return; 
        }
        const period = document.getElementById('payroll-period').value;
        if (!period) return showToast('Por favor, seleccione un periodo.', 'error');
        
        prenominaCache = nominaData.employees.map(emp => calculatePayrollForEmployee(emp, period));
        renderPrenominaTable(false);
        
        document.getElementById('instruction-message').classList.add('hidden');
        document.getElementById('prenomina-results').classList.remove('hidden');
        document.getElementById('confirm-payroll-btn').classList.remove('hidden');
        feather.replace();
    };
    
    const handleConfirmPayroll = async () => {
        const period = document.getElementById('payroll-period').value;
        
        if (isUserLoggedIn) {
            await api.post('/api/nomina/history', { period: period, records: prenominaCache });
        } else {
            if (nominaData.payrollHistory.some(h => h.period === period)) {
                return showToast('El periodo seleccionado ya ha sido procesado.', 'error');
            }
            nominaData.payrollHistory.push({ period: period, records: prenominaCache });
            saveLocalData();
        }

        showToast(`Nómina del periodo ${period} guardada.`);

        try {
            const tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [], manualTransactions: [] };
            const totalNetPaid = prenominaCache.reduce((sum, record) => sum + record.netPay, 0);

            if (totalNetPaid > 0 && tesoreriaData.accounts.length > 0) {
                const primaryAccount = tesoreriaData.accounts[0].id;
                const newTransaction = {
                    id: Date.now(),
                    date: new Date().toISOString().slice(0, 10),
                    accountId: primaryAccount,
                    type: 'outflow',
                    description: `Pago de Nómina - Periodo ${period}`,
                    amount: totalNetPaid
                };
                tesoreriaData.manualTransactions.push(newTransaction);
                localStorage.setItem('tesoreria_data_v1', JSON.stringify(tesoreriaData));
                showToast(`Egreso de ${formatCurrency(totalNetPaid)} registrado en Tesorería.`, 'info');
            } else if (totalNetPaid > 0) {
                 showToast('Nómina guardada, pero no se encontró cuenta en Tesorería para registrar el egreso.', 'error');
            }
        } catch (error) {
            console.error("Error al integrar con Tesorería:", error);
            showToast('Error al registrar el egreso en Tesorería.', 'error');
        }

        document.getElementById('prenomina-results').classList.add('hidden');
        document.getElementById('instruction-message').classList.remove('hidden');
        prenominaCache = [];
        await loadData();
        render();
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newSettings = { ...nominaData.settings };
        for (const [key, value] of formData.entries()) {
            if(e.target.elements[key] && !e.target.elements[key].readOnly) {
                 newSettings[key] = parseFloat(value);
            }
        }
        
        try {
            if (isUserLoggedIn) {
                await api.post('/api/nomina/settings', newSettings);
            } else {
                nominaData.settings = newSettings;
                saveLocalData();
            }
            showToast('Configuración guardada.');
            await loadData();
        } catch(e) { /* Error ya mostrado por la capa de api */ }
    };
    const handleGenerateReport = () => {
        const period = document.getElementById('report-period').value;
        if (!period) return showToast('Seleccione un periodo para el informe.', 'error');
        const history = nominaData.payrollHistory.find(h => h.period === period);
        if (!history) return showToast('No hay datos para el periodo seleccionado.', 'error');
        
        const output = document.getElementById('report-output');
        let totalContributions = 0, totalProvisions = 0;
        
        const rows = history.records.map(r => {
            totalContributions += r.employerContributions.total;
            totalProvisions += r.provisions.total;
            return `<tr>
                <td class="border p-2">${r.employeeName}</td><td class="border p-2 text-right">${formatCurrency(r.employerContributions.total)}</td>
                <td class="border p-2 text-right">${formatCurrency(r.provisions.total)}</td><td class="border p-2 text-right">${formatCurrency(r.employerContributions.total + r.provisions.total)}</td>
            </tr>`;
        }).join('');
        
        output.innerHTML = `
            <h4 class="text-lg font-bold mt-4">Resumen de Costos del Empleador - Periodo ${period}</h4>
            <table class="w-full table-auto mt-2 border-collapse border">
                <thead class="bg-gray-200 dark:bg-gray-700"><tr>
                    <th class="border p-2 text-left">Empleado</th><th class="border p-2 text-right">Aportes</th>
                    <th class="border p-2 text-right">Provisiones</th><th class="border p-2 text-right">Subtotal</th>
                </tr></thead>
                <tbody>${rows}</tbody>
                <tfoot class="font-bold bg-gray-100 dark:bg-gray-600"><tr>
                    <td class="border p-2">TOTALES</td><td class="border p-2 text-right">${formatCurrency(totalContributions)}</td>
                    <td class="border p-2 text-right">${formatCurrency(totalProvisions)}</td><td class="border p-2 text-right">${formatCurrency(totalContributions + totalProvisions)}</td>
                </tr></tfoot>
            </table>`;
    };

    const renderPrenominaTable = (isViewOnly = false) => {
        const tbody = document.getElementById('prenomina-table-body');
        tbody.innerHTML = '';
        prenominaCache.forEach(record => {
            const tr = document.createElement('tr');
            const actions = isViewOnly
                ? `<button data-action="view-prenomina" data-id="${record.employeeId}" class="text-blue-600 hover:text-blue-900" title="Ver Detalle"><i data-feather="eye"></i></button>`
                : `<button data-action="view-prenomina" data-id="${record.employeeId}" class="text-blue-600 hover:text-blue-900" title="Ver Detalle"><i data-feather="eye"></i></button>
                   <button data-action="add-novelty" data-id="${record.employeeId}" class="text-green-600 hover:text-green-900" title="Agregar Novedad"><i data-feather="plus-circle"></i></button>`;

            tr.innerHTML = `
                <td class="px-4 py-3">${record.employeeName}</td><td class="px-4 py-3">${formatCurrency(record.totalEarnings)}</td>
                <td class="px-4 py-3">${formatCurrency(record.totalDeductions)}</td><td class="px-4 py-3 font-bold">${formatCurrency(record.netPay)}</td>
                <td class="px-4 py-3 text-center flex items-center gap-2">${actions}</td>`;
            tbody.appendChild(tr);
        });
        feather.replace();
    };

    const downloadPayslipPDF = () => {
        if (!currentPayrollRecord) return showToast('No hay datos para descargar.', 'error');

        const { record, period } = currentPayrollRecord;
        const employee = nominaData.employees.find(e => e.id === record.employeeId);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const S = nominaData.settings;

        doc.setFontSize(18); doc.text('Comprobante de Pago de Nómina', 105, 20, { align: 'center' });
        doc.setFontSize(11); doc.text(`Periodo de Liquidación: ${period}`, 105, 28, { align: 'center' });
        doc.setFontSize(12); doc.text(`Empleado: ${employee.name}`, 14, 40); doc.text(`Cédula: ${employee.idNumber}`, 14, 46);

        const earningsBody = [
            ['Salario Base', formatCurrency(record.baseSalary)], ['Auxilio de Transporte', formatCurrency(record.transportAid)],
            ...record.novelties.filter(n => n.type === 'devengado').map(n => [n.concept, formatCurrency(n.value)])];
        doc.autoTable({ startY: 55, head: [['Devengados', 'Valor']], body: earningsBody, foot: [['TOTAL DEVENGADO', formatCurrency(record.totalEarnings)]], theme: 'grid', headStyles: { fillColor: [22, 160, 133] }, footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' } });
        
        const deductionsBody = [
            [`Aporte Salud (${S.saludEmpleado}%)`, formatCurrency(record.healthDeduction)], [`Aporte Pensión (${S.pensionEmpleado}%)`, formatCurrency(record.pensionDeduction)],
            ['Fondo Solidaridad Pensional', formatCurrency(record.fspDeduction)], ...record.novelties.filter(n => n.type === 'deduccion').map(n => [n.concept, formatCurrency(n.value)])];
        doc.autoTable({ startY: doc.lastAutoTable.finalY + 5, head: [['Deducciones', 'Valor']], body: deductionsBody, foot: [['TOTAL DEDUCIDO', formatCurrency(record.totalDeductions)]], theme: 'grid', headStyles: { fillColor: [192, 57, 43] }, footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' } });
        
        doc.setFontSize(14); doc.setFont(undefined, 'bold');
        doc.text(`NETO A PAGAR: ${formatCurrency(record.netPay)}`, 105, doc.lastAutoTable.finalY + 10, { align: 'center' });

        const employerCostsBody = [
            [`Salud Empleador (${S.saludEmpleador}%)`, formatCurrency(record.employerContributions.health)],
            [`Pensión Empleador (${S.pensionEmpleador}%)`, formatCurrency(record.employerContributions.pension)],
            [`ARL (${S.arl}%)`, formatCurrency(record.employerContributions.arl)],
            [`Caja de Compensación (${S.cajaCompensacion}%)`, formatCurrency(record.employerContributions.caja)],
            ['--- Provisiones ---', ''],
            ['Cesantías', formatCurrency(record.provisions.cesantias)],
            ['Intereses s/ Cesantías', formatCurrency(record.provisions.interesesCesantias)],
            ['Prima de Servicios', formatCurrency(record.provisions.prima)],
            ['Vacaciones', formatCurrency(record.provisions.vacaciones)]
        ];
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 18,
            head: [['Costos del Empleador (Informativo)', 'Valor']],
            body: employerCostsBody,
            foot: [['COSTO TOTAL EMPRESA', formatCurrency(record.totalCompanyCost)]],
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
        });

        doc.save(`Comprobante-${employee.name.replace(/ /g, '_')}-${period}.pdf`);
    };

    const exportData = () => {
        const dataToSave = {
            settings: nominaData.settings,
            novelties: nominaData.novelties,
            payrollHistory: nominaData.payrollHistory
        };
        const dataStr = JSON.stringify(dataToSave, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nomina_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Datos exportados exitosamente.');
    };
    const importData = (event) => { 
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if(importedData.settings && importedData.novelties && importedData.payrollHistory) {
                    if(isUserLoggedIn) {
                        showToast('La importación masiva solo está disponible en modo offline.', 'error');
                        return;
                    }
                    nominaData = deepMerge(importedData, JSON.parse(JSON.stringify(defaultData)));
                    saveLocalData();
                    showToast('Datos importados correctamente. La página se recargará.');
                    setTimeout(() => location.reload(), 2000);
                } else { showToast('El archivo no tiene el formato correcto.', 'error'); }
            } catch (error) { showToast('Error al leer el archivo JSON.', 'error'); } 
            finally { event.target.value = ''; }
        };
        reader.readAsText(file);
    };

    // --- 7. EVENT LISTENERS ---
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]'); if (!target) return;
        const { action, module, id } = target.dataset;
        const actions = {
            'add': () => handleAdd(module), 'edit': () => handleEdit(module, id), 'delete': () => handleDelete(module, id),
            'view-history': () => viewHistoryDetail(id), 'view-prenomina': () => viewPrenominaDetail(id), 'add-novelty': () => addNoveltyFromPrenomina(id),
            'generate-report': handleGenerateReport, 'export-data': exportData
        };
        if (actions[action]) actions[action]();
    });

    dom.tabsContainer.addEventListener('click', e => {
        const button = e.target.closest('.tab-btn'); if (!button) return;
        dom.tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active'); render();
    });

    document.getElementById('main-content').addEventListener('click', e => {
        const target = e.target.closest('button');
        if(!target) return;
        if (target.id === 'calculate-payroll-btn') handleCalculatePayroll();
        if (target.id === 'confirm-payroll-btn') handleConfirmPayroll();
    });
    
    document.getElementById('main-content').addEventListener('change', e => {
        if (e.target.id === 'import-file-input') importData(e);
    });

    dom.formModal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(dom.formModal.form);
        let data = Object.fromEntries(formData.entries());
        ['value'].forEach(key => { if(data[key]) data[key] = parseFloat(data[key]); });
        ['employeeId'].forEach(key => { if(data[key]) data[key] = parseInt(data[key]); });
        if(data.addsToIBC) data.addsToIBC = data.addsToIBC === 'true';

        try {
            if (isUserLoggedIn) {
                if (editingId) {
                    await api.put(`/api/nomina/novelties/${editingId}`, data);
                } else {
                    await api.post(`/api/nomina/novelties`, data);
                }
            } else {
                if (editingId) {
                    const index = nominaData[currentModule].findIndex(i => i.id == editingId);
                    nominaData[currentModule][index] = { ...nominaData[currentModule][index], ...data, id: editingId };
                } else {
                    data.id = Date.now();
                    nominaData[currentModule].push(data);
                }
                saveLocalData();
            }
            
            showToast(`Novedad ${editingId ? 'actualizada' : 'agregada'}.`);
            toggleModal(dom.formModal.el, false);
            await loadData();

            if (typeof dom.formModal.form.onsave === 'function') {
                dom.formModal.form.onsave();
                dom.formModal.form.onsave = null;
            } else { render(); }

        } catch(e) { /* Error ya mostrado */ }
    });

    document.getElementById('main-content').addEventListener('submit', e => {
        if (e.target.id === 'settings-form') handleSettingsSave(e);
    });

    dom.payslipModal.closeBtn.addEventListener('click', () => toggleModal(dom.payslipModal.el, false));
    dom.payslipModal.downloadBtn.addEventListener('click', downloadPayslipPDF);
    dom.formModal.closeBtn.onclick = () => toggleModal(dom.formModal.el, false);
    
    // --- 8. INICIALIZACIÓN ---
    const init = async () => { 
        checkLoginStatus();
        // initUserSession es llamado por sidebar.js, no es necesario aquí.
        await loadData();
        render();
    };
    init();
});