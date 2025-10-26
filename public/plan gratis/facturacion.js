document.addEventListener('DOMContentLoaded', async () => {
    // --- Selectores DOM y Estado Global ---
    const dom = {
        documentListView: document.getElementById('document-list-view'),
        documentEditorView: document.getElementById('document-editor-view'),
        toastContainer: document.getElementById('toast-container')
    };
    
    let documentosData = {};
    let clientsData = [];
    let currentView = 'list';
    let currentDocumentType = 'invoices';
    let editingId = null;
    let prefilledData = null;
    let isUserLoggedIn = false;
    let state = {
        filters: { search: '', startDate: '', endDate: '' },
        pagination: { currentPage: 1, itemsPerPage: 10 }
    };
    const defaultData = { 
        invoices: [], creditNotes: [], debitNotes: [], chargeAccounts: []
    };
    
    // --- Gestión de Datos ---
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
        console.log('Modo de operación Facturación:', isUserLoggedIn ? 'Base de Datos (Online)' : 'LocalStorage (Offline)');
    };

    const saveLocalData = () => {
        localStorage.setItem('documentos_data_v3', JSON.stringify(documentosData));
        localStorage.setItem('clients', JSON.stringify(clientsData));
    };
    
    const loadData = async () => {
        if (isUserLoggedIn) {
            try {
                const initialData = await api.get('/api/facturacion/initial-data');
                documentosData.invoices = initialData.invoices || [];
                documentosData.creditNotes = initialData.creditNotes || [];
                documentosData.debitNotes = initialData.debitNotes || [];
                documentosData.chargeAccounts = initialData.chargeAccounts || [];
                clientsData = initialData.clients || [];
            } catch(e) {
                documentosData = JSON.parse(JSON.stringify(defaultData));
                clientsData = [];
            }
        } else {
            const data = localStorage.getItem('documentos_data_v3');
            documentosData = data ? JSON.parse(data) : JSON.parse(JSON.stringify(defaultData));
            clientsData = JSON.parse(localStorage.getItem('clients')) || [];
        }
    };
    
    // --- Utilidades ---
    const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
    const formatDate = (d) => { if (!d) return ''; const date = new Date(d); return new Date(date.getTime() + (date.getTimezoneOffset() * 60000)).toLocaleDateString('es-CO'); };
    const showToast = (message, type = 'success') => {
        const icon = type === 'success' ? 'check-circle' : 'alert-triangle';
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white py-3 px-5 rounded-lg shadow-lg flex items-center gap-3`;
        toast.innerHTML = `<i data-feather="${icon}" class="h-5 w-5"></i><span>${message}</span>`;
        dom.toastContainer.appendChild(toast);
        feather.replace();
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 4000);
    };

    // --- Lógica de Filtrado, Paginación y Exportación ---
    const getFilteredData = () => {
        const documents = documentosData[currentDocumentType] || [];
        const { search, startDate, endDate } = state.filters;
        const searchTerm = search.toLowerCase();
        return documents.filter(doc => {
            const matchesSearch = (doc.clientName?.toLowerCase() || '').includes(searchTerm) || (doc.number?.toLowerCase() || '').includes(searchTerm) || (doc.status?.toLowerCase() || '').includes(searchTerm);
            const docDate = doc.issueDate || '';
            return matchesSearch && (!startDate || (docDate && docDate >= startDate)) && (!endDate || (docDate && docDate <= endDate));
        }).slice().reverse();
    };
    const exportToPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const filteredData = getFilteredData();
        if (filteredData.length === 0) return showToast('No hay datos para exportar.', 'error');
        const docTitles = { invoices: "Facturas de Venta", chargeAccounts: "Cuentas de Cobro", creditNotes: "Notas de Crédito", debitNotes: "Notas de Débito" };
        doc.text(docTitles[currentDocumentType] || "Documentos", 14, 16);
        doc.autoTable({ startY: 22, head: [['#', 'Cliente', 'F. Emisión', 'Estado', 'Total']], body: filteredData.map(d => [d.number, d.clientName, formatDate(d.issueDate), d.status, formatCurrency(d.total)]) });
        doc.save(`${currentDocumentType}_${new Date().toISOString().slice(0,10)}.pdf`);
    };
    const exportToCSV = () => {
        const filteredData = getFilteredData();
        if (filteredData.length === 0) return showToast('No hay datos para exportar.', 'error');
        const headers = ['Numero', 'Cliente', 'Fecha Emision', 'Estado', 'Subtotal', 'IVA', 'Retefuente', 'ICA', 'Total', 'Emitido Por', 'Recibido Por', 'Notas'];
        const csvRows = [headers.join(','), ...filteredData.map(d => [d.number, `"${d.clientName}"`, formatDate(d.issueDate), d.status, d.subtotal || 0, d.iva || 0, d.retefuente || 0, d.ica || 0, d.total, `"${d.issuedBy || ''}"`, `"${d.receivedBy || ''}"`, `"${d.notes || ''}"`].join(','))];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentDocumentType}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Lógica de Renderizado ---
    const render = () => {
        if (currentView === 'list') {
            dom.documentListView.classList.remove('hidden');
            dom.documentEditorView.classList.add('hidden');
            renderDocumentListView();
        } else {
            dom.documentListView.classList.add('hidden');
            dom.documentEditorView.classList.remove('hidden');
            renderDocumentEditorView(editingId);
        }
    };

    const renderDocumentListView = () => {
        state.pagination.currentPage = 1;
        const docInfo = { invoices: { title: "Facturas de Venta" }, chargeAccounts: { title: "Cuentas de Cobro"}, creditNotes: { title: "Notas de Crédito" }, debitNotes: { title: "Notas de Débito" } };
        const currentTitle = docInfo[currentDocumentType]?.title || "Documentos";
        dom.documentListView.innerHTML = `
            <header class="mb-6 text-center relative"><h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Gestión de Documentos</h1><p class="text-gray-600 dark:text-gray-400 mt-2">Crea y administra tus documentos comerciales.</p></header>
            <div class="mb-4 border-b border-gray-200 dark:border-gray-700"><nav class="-mb-px flex space-x-4 overflow-x-auto" id="document-type-tabs"><button data-type="invoices" class="tab-btn">Facturas</button><button data-type="chargeAccounts" class="tab-btn">Cuentas de Cobro</button><button data-type="creditNotes" class="tab-btn">Notas Crédito</button><button data-type="debitNotes" class="tab-btn">Notas Débito</button></nav></div>
            <div class="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><input type="text" id="document-search-input" placeholder="Buscar..." class="input md:col-span-1"><div><label class="label-xs">Desde:</label><input type="date" id="start-date-filter" class="input"></div><div><label class="label-xs">Hasta:</label><input type="date" id="end-date-filter" class="input"></div></div></div>
            <div class="flex justify-end items-center gap-2 mb-4"><button id="export-pdf-btn" title="Exportar a PDF" class="btn-icon"><i data-feather="file-text" class="h-5 w-5"></i></button><button id="export-csv-btn" title="Exportar a CSV" class="btn-icon bg-green-600 hover:bg-green-700"><i data-feather="grid" class="h-5 w-5"></i></button><button id="add-document-btn" class="btn-primary"><i data-feather="plus" class="mr-2"></i>Crear ${currentTitle.slice(0, -1)}</button></div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"><div class="overflow-x-auto"><table class="w-full table-auto"><thead class="bg-gray-50 dark:bg-gray-700"><tr><th class="th">#</th><th class="th">Cliente</th><th class="th">F. Emisión</th><th class="th">Estado</th><th class="th">Total</th><th class="th text-right">Acciones</th></tr></thead><tbody class="divide-y divide-gray-200 dark:divide-gray-700" id="document-table-body"></tbody></table></div><div id="no-data-message" class="hidden text-center p-8"></div><div id="pagination-controls" class="p-4 border-t dark:border-gray-700"></div></div>`;
        dom.documentListView.querySelectorAll('.tab-btn').forEach(el=>el.className='py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap');dom.documentListView.querySelectorAll('.input').forEach(el=>el.className='w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600');dom.documentListView.querySelectorAll('.label-xs').forEach(el=>el.className='block text-xs text-gray-600 dark:text-gray-400 mb-1');dom.documentListView.querySelectorAll('.btn-icon').forEach(el=>el.className='text-white font-semibold py-2 px-3 rounded-lg shadow flex items-center transition-all bg-gray-600 hover:bg-gray-700');dom.documentListView.querySelector('#add-document-btn').className='text-white font-semibold py-2 px-4 rounded-lg shadow flex items-center transition-all bg-blue-600 hover:bg-blue-700';dom.documentListView.querySelectorAll('.th').forEach(el=>el.className='px-6 py-3 text-left text-xs font-medium uppercase');
        document.getElementById('add-document-btn').addEventListener('click',()=>{editingId=null;currentView='editor';render();});document.getElementById('export-pdf-btn').addEventListener('click',exportToPDF);document.getElementById('export-csv-btn').addEventListener('click',exportToCSV);const tabContainer=document.getElementById('document-type-tabs');tabContainer.querySelectorAll('button').forEach(tab=>{tab.classList.add('border-transparent','text-gray-500','hover:text-gray-700','hover:border-gray-300');if(tab.dataset.type===currentDocumentType){tab.classList.remove('border-transparent','text-gray-500','hover:text-gray-700','hover:border-gray-300');tab.classList.add('border-blue-500','text-blue-600');}tab.addEventListener('click',e=>{currentDocumentType=e.currentTarget.dataset.type;renderDocumentListView();});});const updateFilters=()=>{state.pagination.currentPage=1;renderDocumentTable();};document.getElementById('document-search-input').addEventListener('input',e=>{state.filters.search=e.target.value;updateFilters();});document.getElementById('start-date-filter').addEventListener('change',e=>{state.filters.startDate=e.target.value;updateFilters();});document.getElementById('end-date-filter').addEventListener('change',e=>{state.filters.endDate=e.target.value;updateFilters();});
        renderDocumentTable();
    };
    
    const renderStatusBadge = (status) => `<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${{'Pagado':'bg-green-100 text-green-800','Enviado':'bg-blue-100 text-blue-800','Anulado':'bg-red-100 text-red-800','Borrador':'bg-gray-100 text-gray-800','Pendiente':'bg-yellow-100 text-yellow-800'}[status]||'bg-gray-100 text-gray-800'}">${status}</span>`;

    const renderDocumentTable = () => {
        const tableBody=document.getElementById('document-table-body');const noData=document.getElementById('no-data-message');if(!tableBody||!noData)return;const filtered=getFilteredData();noData.classList.toggle('hidden',filtered.length>0);noData.innerHTML=filtered.length===0?'<p class="text-gray-500">No se encontraron documentos.</p>':'';const {currentPage,itemsPerPage}=state.pagination;const paginatedItems=filtered.slice((currentPage-1)*itemsPerPage,currentPage*itemsPerPage);
        tableBody.innerHTML=paginatedItems.map(doc=>`<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td class="px-6 py-4 font-medium">${doc.number}</td><td class="px-6 py-4">${doc.clientName}</td><td class="px-6 py-4">${formatDate(doc.issueDate)}</td><td class="px-6 py-4">${renderStatusBadge(doc.status)}</td><td class="px-6 py-4">${formatCurrency(doc.total)}</td><td class="px-6 py-4 text-right flex justify-end gap-1"><button onclick="window.duplicateDocument('${currentDocumentType}',${doc.id})" title="Duplicar" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><i data-feather="copy" class="h-4 w-4 text-green-600"></i></button><button onclick="window.editDocument('${currentDocumentType}',${doc.id})" title="Editar" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><i data-feather="edit" class="h-4 w-4 text-blue-600"></i></button><button onclick="window.deleteDocument('${currentDocumentType}',${doc.id})" title="Eliminar" class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><i data-feather="trash-2" class="h-4 w-4 text-red-600"></i></button></td></tr>`).join('');
        renderPaginationControls(Math.ceil(filtered.length/itemsPerPage),filtered.length);feather.replace();
    };

    const renderPaginationControls = (totalPages,totalItems)=>{const paginationControls=document.getElementById('pagination-controls');if(!paginationControls||totalPages<=1){if(paginationControls)paginationControls.innerHTML='';return;}const{currentPage}=state.pagination;let buttons=Array.from({length:totalPages},(_,i)=>i+1).map(i=>`<button class="pagination-btn ${i===currentPage?'active':''}" data-page="${i}">${i}</button>`).join('');paginationControls.innerHTML=`<div class="flex flex-col md:flex-row justify-between items-center"><p class="text-sm text-gray-500 mb-2 md:mb-0">Mostrando ${((currentPage-1)*10)+1}-${Math.min(currentPage*10,totalItems)} de ${totalItems}</p><div class="flex items-center space-x-1"><button class="pagination-btn" data-page="${currentPage-1}" ${currentPage===1?'disabled':''}>Anterior</button>${buttons}<button class="pagination-btn" data-page="${currentPage+1}" ${currentPage===totalPages?'disabled':''}>Siguiente</button></div></div>`.replace(/class="pagination-btn"/g,'class="px-3 py-1 rounded-md border dark:border-gray-600 text-sm font-medium transition"').replace(/class="pagination-btn active"/g,'class="px-3 py-1 rounded-md border dark:border-gray-600 text-sm font-medium transition bg-blue-600 text-white border-blue-600"');paginationControls.querySelectorAll('button').forEach(button=>button.addEventListener('click',e=>{state.pagination.currentPage=Number(e.currentTarget.dataset.page);renderDocumentTable();}));};

    const renderDocumentEditorView = (docId) => {
        let doc = docId ? (documentosData[currentDocumentType] || []).find(d => d.id == docId) : (prefilledData || {});
        if(prefilledData) prefilledData = null;

        const docInfo = { invoices: { title: "Factura de Venta" }, chargeAccounts: { title: "Cuenta de Cobro"}, creditNotes: { title: "Nota de Crédito" }, debitNotes: { title: "Nota de Débito" }}[currentDocumentType];
        
        const clientOptions = clientsData.map(c => `<option value="${c.id}" ${doc?.clientId == c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        const statusOptions = ['Borrador', 'Enviado', 'Pagado', 'Anulado'].map(s => `<option value="${s}" ${doc?.status == s ? 'selected' : ''}>${s}</option>`).join('');

        const inputClasses = "w-full bg-slate-50 border border-slate-300 rounded-md p-2 shadow-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition";
        const labelClasses = "block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1";
        const sectionClasses = "py-6 border-t border-slate-200 dark:border-gray-700";
        const titleClasses = "text-lg font-semibold text-gray-800 dark:text-gray-200";

        dom.documentEditorView.innerHTML = `
            <div class="max-w-4xl mx-auto"><div class="flex justify-between items-center mb-4"><button id="back-to-list-btn" class="flex items-center text-blue-600 hover:underline"><i data-feather="arrow-left" class="mr-2"></i>Volver a la lista</button></div>
                <form id="document-form" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8"><input type="hidden" name="id" value="${doc.id || ''}">
                    <div class="flex justify-between items-baseline pb-6"><h2 class="text-2xl font-bold text-gray-900 dark:text-white">${doc.id && !doc.isDuplicate ? 'Editar' : 'Nuevo'} ${docInfo.title}</h2><div class="text-right"><label class="${labelClasses}">Total Calculado</label><p id="calculated-total" class="text-3xl font-bold text-blue-600 dark:text-blue-400">${formatCurrency(doc.total || 0)}</p></div></div>
                    <div class="space-y-4">
                        <div class="${sectionClasses}"><h3 class="${titleClasses} mb-4">Información General</h3><div class="grid md:grid-cols-3 gap-x-6 gap-y-4">
                            <div class="md:col-span-2">
                                <label class="${labelClasses}">Cliente</label>
                                <div class="flex items-end gap-2">
                                    <div class="flex-grow"><select name="clientId" id="client-select" class="${inputClasses}" required>${clientOptions}</select></div>
                                    <button type="button" id="add-client-btn" title="Añadir Cliente" class="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition"><i data-feather="plus"></i></button>
                                </div>
                                <div id="client-id-display" class="mt-2 text-sm text-gray-500 h-5"></div>
                            </div>
                            <div><label class="${labelClasses}"># Documento</label><input type="text" name="number" value="${doc?.number || ''}" class="${inputClasses}" required></div>
                            <div><label class="${labelClasses}">Fecha Emisión</label><input type="date" name="issueDate" value="${doc?.issueDate || new Date().toISOString().slice(0,10)}" class="${inputClasses}" required></div>
                        </div></div>
                        <div class="${sectionClasses}"><h3 class="${titleClasses} mb-4">Detalles Financieros</h3><div class="grid md:grid-cols-4 gap-x-6 gap-y-4">
                            <div><label class="${labelClasses}">Subtotal</label><input type="number" name="subtotal" value="${doc?.subtotal || ''}" placeholder="0" class="${inputClasses} financial-input" required></div>
                            <div><label class="${labelClasses}">IVA</label><input type="number" name="iva" value="${doc?.iva || ''}" placeholder="0" class="${inputClasses} financial-input"></div>
                            <div><label class="${labelClasses}">Retefuente</label><input type="number" name="retefuente" value="${doc?.retefuente || ''}" placeholder="0" class="${inputClasses} financial-input"></div>
                            <div><label class="${labelClasses}">ICA</label><input type="number" name="ica" value="${doc?.ica || ''}" placeholder="0" class="${inputClasses} financial-input"></div>
                        </div></div>
                        <div class="${sectionClasses}"><h3 class="${titleClasses} mb-4">Trazabilidad y Estado</h3><div class="grid md:grid-cols-3 gap-x-6 gap-y-4">
                            <div><label class="${labelClasses}">Estado</label><select name="status" class="${inputClasses}">${statusOptions}</select></div>
                            <div><label class="${labelClasses}">Emitido por</label><input type="text" name="issuedBy" value="${doc?.issuedBy || ''}" placeholder="Tu nombre" class="${inputClasses}"></div>
                            <div><label class="${labelClasses}">Recibido por</label><input type="text" name="receivedBy" value="${doc?.receivedBy || ''}" placeholder="Nombre del cliente" class="${inputClasses}"></div>
                            <div class="md:col-span-3"><label class="${labelClasses}">Notas</label><textarea name="notes" class="${inputClasses}" rows="3" placeholder="Añade términos...">${doc?.notes || ''}</textarea></div>
                        </div></div>
                    </div>
                    <div class="flex justify-end mt-8 pt-6 border-t border-slate-200 dark:border-gray-700"><button type="submit" class="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">Guardar</button></div>
                </form>
            </div>`;
        setupDocumentEditor(doc.clientId);
    };

    const setupDocumentEditor = (initialClientId) => {
        document.getElementById('back-to-list-btn').addEventListener('click', () => { currentView = 'list'; render(); });
        document.getElementById('document-form').addEventListener('submit', handleSaveDocument);
        document.getElementById('add-client-btn').addEventListener('click', showClientModal);
        
        const calculateTotal = () => {
            const subtotal = parseFloat(document.querySelector('[name="subtotal"]').value) || 0;
            const iva = parseFloat(document.querySelector('[name="iva"]').value) || 0;
            const retefuente = parseFloat(document.querySelector('[name="retefuente"]').value) || 0;
            const ica = parseFloat(document.querySelector('[name="ica"]').value) || 0;
            document.getElementById('calculated-total').textContent = formatCurrency(subtotal + iva - retefuente - ica);
        };
        document.querySelectorAll('.financial-input').forEach(input => input.addEventListener('input', calculateTotal));
        
        const clientSelect = document.getElementById('client-select');
        const clientIdDisplay = document.getElementById('client-id-display');
        const updateClientIdDisplay = () => {
            const selectedClient = clientsData.find(c => c.id == clientSelect.value);
            if (selectedClient && selectedClient.idNumber) {
                clientIdDisplay.textContent = `NIT/CC: ${selectedClient.idNumber}`;
            } else {
                clientIdDisplay.textContent = '';
            }
        };
        clientSelect.addEventListener('change', updateClientIdDisplay);
        if (initialClientId) { updateClientIdDisplay(); }

        feather.replace();
    };
    
    const showClientModal = () => {
        // Lógica para un futuro modal de creación rápida de clientes
        showToast('La creación rápida de clientes aún no está implementada.', 'info');
    };

    const handleSaveDocument = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const total = parseFloat(document.getElementById('calculated-total').textContent.replace(/[^0-9,-]+/g,"").replace(',','.'));
        
        const newDoc = {
            id: editingId || undefined, number: data.number,
            clientId: parseInt(data.clientId), clientName: clientsData.find(c => c.id == data.clientId)?.name || 'N/A',
            issueDate: data.issueDate, status: data.status, subtotal: parseFloat(data.subtotal) || 0,
            iva: parseFloat(data.iva) || 0, retefuente: parseFloat(data.retefuente) || 0, ica: parseFloat(data.ica) || 0,
            issuedBy: data.issuedBy, receivedBy: data.receivedBy, notes: data.notes, total: total
        };

        try {
            if (isUserLoggedIn) {
                const endpoint = `/api/facturacion/${currentDocumentType}${editingId ? `/${editingId}` : ''}`;
                const method = editingId ? 'PUT' : 'POST';
                await api.request(method, endpoint, newDoc);
            } else {
                if (editingId) {
                    const index = documentosData[currentDocumentType].findIndex(d => d.id == editingId);
                    newDoc.id = Number(editingId);
                    documentosData[currentDocumentType][index] = newDoc;
                } else {
                    newDoc.id = Date.now();
                    documentosData[currentDocumentType].push(newDoc);
                }
                saveLocalData();
            }
            showToast('Documento guardado con éxito.');
            currentView = 'list';
            render();
        } catch(e) {}
    };

    window.editDocument = (docType, id) => {
        currentDocumentType = docType;
        editingId = id;
        currentView = 'editor';
        render();
    };
    
    window.deleteDocument = async (docType, id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
            try {
                if(isUserLoggedIn) {
                    await api.delete(`/api/facturacion/${docType}/${id}`);
                } else {
                    documentosData[docType] = documentosData[docType].filter(d => d.id != id);
                    saveLocalData();
                }
                showToast('Documento eliminado.');
                render();
            } catch(e) {}
        }
    };
    
    window.duplicateDocument = (docType, id) => {
        const originalDoc = (documentosData[docType] || []).find(d => d.id == id);
        if(originalDoc) {
            prefilledData = {...originalDoc, id: null, number: '', status: 'Borrador', isDuplicate: true};
            currentDocumentType = docType;
            editingId = null;
            currentView = 'editor';
            render();
        }
    };

    const init = async () => {
        checkLoginStatus();
        await loadData();

        // Lógica para pre-llenar desde otros módulos
        const invoiceFromCrm = localStorage.getItem('invoiceFromCrm');
        if (invoiceFromCrm) {
            prefilledData = JSON.parse(invoiceFromCrm);
            localStorage.removeItem('invoiceFromCrm');
            currentView = 'editor';
            currentDocumentType = 'invoices';
            editingId = null;
        }

        render();
    };
    
    init();
});