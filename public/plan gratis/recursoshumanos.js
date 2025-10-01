document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. CONFIG & GLOBALS ---
    const dom = {
        mainContent: document.getElementById('main-content'),
        employeeListView: document.getElementById('employee-list-view'),
        employeeProfileView: document.getElementById('employee-profile-view'),
        formModal: { el: document.getElementById('form-modal'), title: document.getElementById('modal-title'), form: document.getElementById('main-form'), closeBtn: document.getElementById('close-modal-btn') },
        toastContainer: document.getElementById('toast-container'),
    };
    
    let employeesData = [];
    let currentView = 'list';
    let currentProfileId = null;
    let editingId = null;
    let currentFormType = 'employee';
    let currentSearchTerm = '';
    let currentSort = { key: 'name', order: 'asc' };
    let isUserLoggedIn = false;

    // --- 2. DATA HANDLING (UNIFIED & ONLINE/OFFLINE) ---
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
        console.log('Modo de operación RRHH:', isUserLoggedIn ? 'Base de Datos (Online)' : 'LocalStorage (Offline)');
    };

    const loadAllEmployeeData = async () => {
        if (isUserLoggedIn) {
            try {
                employeesData = await api.get('/api/rrhh/employees');
            } catch (error) {
                console.error("Fallo al cargar datos de la API de RRHH.", error);
                employeesData = [];
            }
        } else {
            const sstData = JSON.parse(localStorage.getItem('sgsst_data_v5')) || { employees: [] };
            employeesData = sstData.employees.map(emp => ({
                ...emp,
                department: emp.department || 'No Asignado',
                status: emp.status || 'Activo',
                baseSalary: emp.baseSalary || 0,
                contractType: emp.contractType || 'Término Indefinido',
                contractStart: emp.contractStart || '',
                vacationDays: emp.vacationDays === undefined ? 15 : emp.vacationDays,
                documents: emp.documents || [],
                leaves: emp.leaves || []
            }));
        }
    };

    const saveLocalData = () => {
        let sstDataToSave = { employees: employeesData };
        localStorage.setItem('sgsst_data_v5', JSON.stringify(sstDataToSave));
    };

    // --- 3. UTILITIES & PAYROLL INTEGRATION ---
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);
    const showToast = (message, type = 'success') => {
        const toastColors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
        const toast = document.createElement('div');
        toast.className = `toast text-white p-4 rounded-lg shadow-lg mb-2 ${toastColors[type] || 'bg-gray-800'}`;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    };
    const toggleModal = (show) => {
        if (show) {
            dom.formModal.el.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        } else {
            dom.formModal.el.classList.add('opacity-0', 'scale-95');
            setTimeout(() => dom.formModal.el.classList.add('pointer-events-none'), 300);
        }
    };
    const createPayrollNovelty = (novelty) => {
        let nominaData = JSON.parse(localStorage.getItem('nomina_data_v2')) || { novelties: [] };
        if (!nominaData.novelties) nominaData.novelties = [];
        novelty.id = Date.now();
        novelty.status = 'pending';
        nominaData.novelties.push(novelty);
        localStorage.setItem('nomina_data_v2', JSON.stringify(nominaData));
        showToast(`Novedad '${novelty.concept}' enviada a Nómina.`, 'info');
    };

    // --- 4. CORE ACTIONS ---
    const deleteEmployee = async (employeeId) => {
        if (confirm('¿Estás seguro de que quieres eliminar a este empleado? Esta acción no se puede deshacer.')) {
            try {
                if (isUserLoggedIn) {
                    await api.delete(`/api/rrhh/employees/${employeeId}`);
                } else {
                    employeesData = employeesData.filter(emp => emp.id !== employeeId);
                    saveLocalData();
                }
                showToast('Empleado eliminado correctamente.', 'success');
                currentView = 'list';
                await loadAllEmployeeData();
                render();
            } catch(e) { /* Error ya mostrado por la capa de API */ }
        }
    };
    
    const exportToCSV = () => {
        const headers = ['ID', 'Nombre', 'Cedula', 'Cargo', 'Departamento', 'Estado', 'SalarioBase', 'FechaInicio'];
        const rows = employeesData.map(emp => [
            emp.id, `"${emp.name}"`, emp.idNumber, `"${emp.position}"`, `"${emp.department}"`,
            emp.status, emp.baseSalary, emp.contractStart
        ].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reporte_empleados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Reporte CSV generado.', 'info');
    };

    // --- 5. UI RENDERING ---
    const render = () => {
        if (currentView === 'list') {
            renderEmployeeListView();
        } else if (currentView === 'profile') {
            renderEmployeeProfileView(currentProfileId);
        }
        feather.replace();
    };

    const renderDashboardKPIs = () => {
        const totalEmployees = employeesData.length;
        const activeEmployees = employeesData.filter(e => e.status === 'Activo').length;
        const totalSalary = employeesData.reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);
        const averageSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;
        const departmentCount = new Set(employeesData.map(e => e.department)).size;

        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow flex items-center">
                    <div class="bg-blue-100 text-blue-600 p-3 rounded-full mr-4"><i data-feather="users"></i></div>
                    <div><p class="text-gray-500 dark:text-gray-400 text-sm">Total Empleados</p><p class="text-2xl font-bold">${totalEmployees}</p></div>
                </div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow flex items-center">
                    <div class="bg-green-100 text-green-600 p-3 rounded-full mr-4"><i data-feather="user-check"></i></div>
                    <div><p class="text-gray-500 dark:text-gray-400 text-sm">Empleados Activos</p><p class="text-2xl font-bold">${activeEmployees}</p></div>
                </div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow flex items-center">
                    <div class="bg-yellow-100 text-yellow-600 p-3 rounded-full mr-4"><i data-feather="dollar-sign"></i></div>
                    <div><p class="text-gray-500 dark:text-gray-400 text-sm">Salario Promedio</p><p class="text-2xl font-bold">${formatCurrency(averageSalary)}</p></div>
                </div>
                <div class="kpi-card bg-white dark:bg-gray-800 p-5 rounded-lg shadow flex items-center">
                    <div class="bg-indigo-100 text-indigo-600 p-3 rounded-full mr-4"><i data-feather="grid"></i></div>
                    <div><p class="text-gray-500 dark:text-gray-400 text-sm">Departamentos</p><p class="text-2xl font-bold">${departmentCount}</p></div>
                </div>
            </div>`;
    };

    const renderEmployeeListView = () => {
        dom.employeeListView.classList.remove('hidden');
        dom.employeeProfileView.classList.add('hidden');
        
        let content = renderDashboardKPIs();
        content += `<div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div class="relative w-full md:w-auto"><input type="text" id="search-input" class="w-full p-2 pl-10 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Buscar..." value="${currentSearchTerm}"><i data-feather="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i></div>
                <div class="flex items-center gap-2 w-full md:w-auto">
                    <select id="sort-select" class="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"><option value="name-asc">Nombre (A-Z)</option><option value="name-desc">Nombre (Z-A)</option><option value="salary-desc">Salario (Mayor a Menor)</option><option value="salary-asc">Salario (Menor a Mayor)</option></select>
                    <button id="export-csv-btn" class="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600" title="Exportar a CSV"><i data-feather="download"></i></button>
                </div>
                <button id="add-employee-btn" class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 flex items-center w-full md:w-auto justify-center"><i data-feather="plus" class="mr-2"></i>Nuevo Empleado</button>
            </div>
            <div id="employee-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
        
        let filteredEmployees = employeesData.filter(emp =>
            emp.name.toLowerCase().includes(currentSearchTerm) ||
            (emp.idNumber && emp.idNumber.toLowerCase().includes(currentSearchTerm)) ||
            (emp.department && emp.department.toLowerCase().includes(currentSearchTerm))
        );

        filteredEmployees.sort((a, b) => {
            const { key, order } = currentSort;
            const valA = key === 'name' ? a[key].toLowerCase() : a.baseSalary;
            const valB = key === 'name' ? b[key].toLowerCase() : b.baseSalary;
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });

        if (filteredEmployees.length > 0) {
            filteredEmployees.forEach(emp => {
                const statusColor = emp.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                content += `<div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow border dark:border-gray-700 employee-card" data-id="${emp.id}">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h3 class="font-bold text-lg text-blue-600 dark:text-blue-400">${emp.name}</h3>
                                        <p class="text-gray-600 dark:text-gray-400 text-sm">${emp.position}</p>
                                    </div>
                                    <span class="text-xs font-medium px-2 py-1 rounded-full ${statusColor}">${emp.status}</span>
                                </div>
                                <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">${emp.department} - C.C. ${emp.idNumber}</p>
                            </div>`;
            });
        } else {
            content += `<p class="col-span-full text-center text-gray-500 py-8">No se encontraron empleados.</p>`;
        }
        
        content += `</div></div>`;
        dom.employeeListView.innerHTML = content;
        
        document.getElementById('add-employee-btn').addEventListener('click', () => openFormModal('employee'));
        document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
        document.getElementById('search-input').addEventListener('input', e => { currentSearchTerm = e.target.value.toLowerCase(); render(); });
        document.getElementById('sort-select').addEventListener('change', e => {
            const [key, order] = e.target.value.split('-');
            currentSort = { key: key === 'salary' ? 'baseSalary' : 'name', order };
            render();
        });
        document.querySelectorAll('.employee-card').forEach(card => {
            card.addEventListener('click', () => viewProfile(parseInt(card.dataset.id)));
        });
    };
    
    const renderEmployeeProfileView = (employeeId) => {
        dom.employeeListView.classList.add('hidden');
        dom.employeeProfileView.classList.remove('hidden');
        const emp = employeesData.find(e => e.id === employeeId);
        if (!emp) { currentView = 'list'; render(); return; }
        
        dom.employeeProfileView.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                 <button id="back-to-list" class="flex items-center text-blue-600 hover:underline"><i data-feather="arrow-left" class="mr-2"></i>Volver a la Lista</button>
                 <div class="flex gap-2">
                    <button onclick="window.openFormModal('employee', ${emp.id})" class="bg-gray-200 dark:bg-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-300 dark:hover:bg-gray-600"><i data-feather="edit" class="mr-2 h-4 w-4"></i>Editar</button>
                    <button id="delete-employee-btn" class="bg-red-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-red-600"><i data-feather="trash-2" class="mr-2 h-4 w-4"></i>Eliminar</button>
                 </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div class="p-6 border-b dark:border-gray-700"><h2 class="text-3xl font-bold text-gray-900 dark:text-white">${emp.name}</h2><p class="text-gray-500 dark:text-gray-400 text-lg">${emp.position}</p></div>
                <div class="border-b border-gray-200 dark:border-gray-700"><nav class="-mb-px flex space-x-4 px-6" id="profile-tabs">
                    <button data-tab="general" class="tab-btn active whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">Información General</button>
                    <button data-tab="documents" class="tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 dark:text-gray-400">Documentos</button>
                    <button data-tab="leaves" class="tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 dark:text-gray-400">Ausencias</button>
                </nav></div>
                <div id="tab-content" class="p-6"></div>
            </div>`;

        document.getElementById('back-to-list').addEventListener('click', () => { currentView = 'list'; render(); });
        document.getElementById('delete-employee-btn').addEventListener('click', () => deleteEmployee(emp.id));
        document.querySelectorAll('#profile-tabs .tab-btn').forEach(tab => tab.addEventListener('click', () => {
            document.querySelectorAll('#profile-tabs .tab-btn').forEach(t => {
                t.classList.remove('active', 'border-blue-600', 'text-blue-600');
                t.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            });
            tab.classList.add('active', 'border-blue-600', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            renderTabContent(tab.dataset.tab, emp);
        }));
        renderTabContent('general', emp);
    };

    const renderTabContent = (tabName, emp) => {
        const container = document.getElementById('tab-content');
        let content = '';
        if(tabName === 'general'){
            content = `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div><strong>Departamento:</strong> ${emp.department}</div>
                <div><strong>Estado:</strong> ${emp.status}</div>
                <div><strong>Salario Base:</strong> <span class="text-green-600 font-semibold">${formatCurrency(emp.baseSalary)}</span></div>
                <div><strong>Tipo de Contrato:</strong> ${emp.contractType}</div>
                <div><strong>Fecha de Inicio:</strong> ${emp.contractStart || 'N/A'}</div>
                <div><strong>Días de Vacaciones Disp.:</strong> <span class="font-bold text-lg">${emp.vacationDays}</span></div>
            </div>`;
        } else if (tabName === 'documents'){
            content = `<div class="flex justify-between items-center mb-3"><h3 class="text-xl font-semibold">Documentos del Empleado</h3><button onclick="window.openFormModal('document', ${emp.id})" class="bg-blue-100 text-blue-600 text-sm font-semibold py-1 px-3 rounded-lg flex items-center hover:bg-blue-200"><i data-feather="plus" class="mr-1 h-4 w-4"></i>Generar Hoja de Vida</button></div>`;
            if (emp.documents && emp.documents.length > 0) {
                 content += `<ul class="space-y-3 mt-4">${emp.documents.map(doc => `
                    <li class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${doc.name}</p>
                            <p class="text-sm text-gray-500">${doc.type} - Generado: ${new Date(doc.uploadDate).toLocaleDateString()}</p>
                        </div>
                        <div class="flex items-center gap-2">
                             <button onclick="window.deleteDocument(${emp.id}, ${doc.id})" class="text-red-500 hover:text-red-700" title="Eliminar Registro"><i data-feather="trash-2"></i></button>
                        </div>
                    </li>`).join('')}</ul>`;
            } else {
                content += `<p class="text-gray-500 mt-4">No hay documentos generados para este empleado.</p>`;
            }
        } else if (tabName === 'leaves'){
            content = `<div class="flex justify-between items-center mb-3"><h3 class="text-xl font-semibold">Registro de Ausencias</h3><button onclick="window.openFormModal('leave', ${emp.id})" class="bg-blue-100 text-blue-600 text-sm font-semibold py-1 px-3 rounded-lg flex items-center hover:bg-blue-200"><i data-feather="plus" class="mr-1 h-4 w-4"></i>Registrar Ausencia</button></div>`;
            if (emp.leaves && emp.leaves.length > 0) {
                content += `<ul class="space-y-3 mt-4">${emp.leaves.map(leave => `
                    <li class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                        <div>
                            <p class="font-semibold">${leave.type}</p>
                            <p class="text-sm text-gray-500">${leave.startDate} a ${leave.endDate} (${leave.days} días)</p>
                        </div>
                        <span class="text-sm font-medium ${leave.isPaid ? 'text-green-600' : 'text-red-600'}">${leave.isPaid ? 'Remunerada' : 'No Remunerada'}</span>
                    </li>`).join('')}</ul>`;
            } else {
                content += `<p class="text-gray-500 mt-4">No hay ausencias registradas para este empleado.</p>`;
            }
        }
        container.innerHTML = content;
        feather.replace();
    };

    // --- 6. FORMS & EVENT HANDLERS ---
    const formTemplates = {
        employee: (data = {}) => `
            <input type="hidden" name="id" value="${data.id || ''}">
            <h4 class="font-bold mb-2">Información Básica</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium">Nombre</label><input type="text" name="name" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.name || ''}" required></div>
                <div><label class="block text-sm font-medium">Cédula</label><input type="text" name="idNumber" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.idNumber || ''}" required></div>
                <div><label class="block text-sm font-medium">Cargo</label><input type="text" name="position" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.position || ''}" required></div>
                <div><label class="block text-sm font-medium">Departamento</label><input type="text" name="department" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.department || ''}" required></div>
            </div>
            <h4 class="font-bold mt-6 mb-2 border-t dark:border-gray-700 pt-4">Información de Contrato</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label class="block text-sm font-medium">Salario Base</label><input type="number" name="baseSalary" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.baseSalary || ''}" required></div>
                 <div><label class="block text-sm font-medium">Tipo de Contrato</label><input type="text" name="contractType" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.contractType || 'Término Indefinido'}"></div>
                 <div><label class="block text-sm font-medium">Fecha de Inicio</label><input type="date" name="contractStart" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" value="${data.contractStart || ''}"></div>
                 <div><label class="block text-sm font-medium">Estado</label>
                    <select name="status" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600">
                        <option value="Activo" ${data.status === 'Activo' ? 'selected' : ''}>Activo</option>
                        <option value="Inactivo" ${data.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                        <option value="De Licencia" ${data.status === 'De Licencia' ? 'selected' : ''}>De Licencia</option>
                    </select>
                 </div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded mr-2 hover:bg-gray-400 dark:hover:bg-gray-500" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">Guardar</button></div>`,
        document: (data = {}) => `
            <input type="hidden" name="employeeId" value="${data.id}">
            <p class="text-sm mb-4">Esta herramienta genera una Hoja de Vida en formato PDF con la información proporcionada.</p>
            <div><label class="block text-sm font-medium">Dirección de Residencia</label><input type="text" name="address" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" required></div>
            <div><label class="block text-sm font-medium">Teléfono de Contacto</label><input type="tel" name="phone" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" required></div>
            <div><label class="block text-sm font-medium">Correo Electrónico Personal</label><input type="email" name="email" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" required></div>
            <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Generar PDF</button></div>`,
        leave: (data = {}) => `
            <input type="hidden" name="employeeId" value="${data.id}">
            <div class="space-y-4">
                <div><label class="block text-sm font-medium">Tipo de Ausencia</label>
                    <select name="type" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600">
                        <option>Licencia de Maternidad/Paternidad</option>
                        <option>Incapacidad Médica</option>
                        <option>Licencia No Remunerada</option>
                        <option>Vacaciones</option>
                        <option>Permiso Personal</option>
                    </select>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">Fecha de Inicio</label><input type="date" name="startDate" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" required></div>
                    <div><label class="block text-sm font-medium">Fecha de Fin</label><input type="date" name="endDate" class="mt-1 block w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600" required></div>
                </div>
                <div><label class="flex items-center"><input type="checkbox" name="isPaid" class="h-4 w-4 rounded border-gray-300 text-blue-600" checked><span class="ml-2">Es remunerada</span></label></div>
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t dark:border-gray-700"><button type="button" class="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded mr-2" id="cancel-btn">Cancelar</button><button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded">Registrar</button></div>`
    };

    window.openFormModal = (type, id = null) => {
        const isEdit = id && type === 'employee';
        editingId = id;
        currentFormType = type;
        const data = id ? employeesData.find(e => e.id == id) : { id: id };
        if (id && !data) {
            return showToast('No se encontró el empleado para editar.', 'error');
        }
        
        const titles = { employee: 'Empleado', document: 'Generar Hoja de Vida', leave: 'Registrar Ausencia' };
        dom.formModal.title.textContent = `${isEdit ? 'Editar' : (type === 'employee' ? 'Nuevo' : '')} ${titles[type]}`;
        dom.formModal.form.innerHTML = formTemplates[type](data);
        dom.formModal.form.querySelector('#cancel-btn').onclick = () => toggleModal(false);
        toggleModal(true);
        feather.replace();
    };
    
    dom.formModal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(dom.formModal.form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (currentFormType === 'employee') {
                data.baseSalary = parseFloat(data.baseSalary) || 0;
                if (editingId) {
                    const index = employeesData.findIndex(e => e.id == editingId);
                    const updatedEmployee = { ...employeesData[index], ...data };
                    if (isUserLoggedIn) {
                        await api.put(`/api/rrhh/employees/${editingId}`, updatedEmployee);
                    } else {
                        employeesData[index] = updatedEmployee;
                        saveLocalData();
                    }
                    showToast('Empleado actualizado.', 'success');
                } else {
                    data.documents = [];
                    data.leaves = [];
                    if (isUserLoggedIn) {
                        await api.post('/api/rrhh/employees', data);
                    } else {
                        data.id = Date.now();
                        employeesData.push(data);
                        saveLocalData();
                    }
                    showToast('Empleado creado.', 'success');
                }
            } else {
                const employeeId = parseInt(data.employeeId);
                const employeeIndex = employeesData.findIndex(e => e.id === employeeId);
                if (employeeIndex === -1) return showToast('Empleado no encontrado', 'error');
                const employeeToUpdate = { ...employeesData[employeeIndex] };

                if (currentFormType === 'document') {
                    // La lógica para generar PDF se mantiene en el cliente
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    doc.text(`Hoja de Vida de ${employeeToUpdate.name}`, 20, 20);
                    doc.text(`Dirección: ${data.address}`, 20, 30);
                    doc.text(`Teléfono: ${data.phone}`, 20, 40);
                    doc.text(`Email: ${data.email}`, 20, 50);
                    doc.save(`Hoja_de_Vida_${employeeToUpdate.name.replace(/ /g, '_')}.pdf`);
                    
                    showToast('Hoja de Vida en PDF generada.');
                    const newDocRecord = { id: Date.now(), name: `Hoja de Vida`, type: 'Hoja de Vida', uploadDate: new Date().toISOString() };
                    if (!employeeToUpdate.documents) employeeToUpdate.documents = [];
                    employeeToUpdate.documents.push(newDocRecord);
                } else if (currentFormType === 'leave') {
                    const startDate = new Date(data.startDate);
                    const endDate = new Date(data.endDate);
                    const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                    const newLeave = { id: Date.now(), type: data.type, startDate: data.startDate, endDate: data.endDate, days: days, isPaid: data.isPaid === 'on' };
                    if (!employeeToUpdate.leaves) employeeToUpdate.leaves = [];
                    employeeToUpdate.leaves.push(newLeave);
                    showToast('Ausencia registrada.');

                    if (!newLeave.isPaid && !isUserLoggedIn) {
                        createPayrollNovelty({
                            period: data.startDate.substring(0, 7),
                            employeeId: employeeId,
                            type: 'deduccion',
                            concept: `Deducción por ${days} día(s) de licencia no remunerada`,
                            value: (employeeToUpdate.baseSalary / 30) * days,
                            addsToIBC: false
                        });
                    }
                }
                
                if (isUserLoggedIn) {
                    await api.put(`/api/rrhh/employees/${employeeId}`, employeeToUpdate);
                } else {
                    employeesData[employeeIndex] = employeeToUpdate;
                    saveLocalData();
                }
            }
            
            await loadAllEmployeeData();
            render();
            toggleModal(false);
        } catch (e) { /* El error ya se muestra en la capa de API */ }
    });

    window.deleteDocument = async (employeeId, docId) => {
         if (confirm('¿Estás seguro de eliminar este registro de documento?')) {
            const empIndex = employeesData.findIndex(e => e.id === employeeId);
            if(empIndex > -1) {
                const employeeToUpdate = { ...employeesData[empIndex] };
                employeeToUpdate.documents = employeeToUpdate.documents.filter(d => d.id !== docId);

                if (isUserLoggedIn) {
                    await api.put(`/api/rrhh/employees/${employeeId}`, employeeToUpdate);
                } else {
                    employeesData[empIndex] = employeeToUpdate;
                    saveLocalData();
                }
                
                await loadAllEmployeeData();
                renderTabContent('documents', employeesData.find(e => e.id === employeeId));
                showToast('Registro de documento eliminado.');
            }
         }
    };

    dom.formModal.closeBtn.addEventListener('click', () => toggleModal(false));

    const viewProfile = (employeeId) => {
        currentProfileId = employeeId;
        currentView = 'profile';
        render();
    };

    // --- 7. INITIALIZATION ---
    const init = async () => {
        checkLoginStatus();
        await loadAllEmployeeData();
        render();
    };
    
    init();
});