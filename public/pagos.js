// Archivo: todo/pagos.js
// ELIMINADO: Ya no se necesita la importación de la base de datos local.
// import { db } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    feather.replace();

    // --- LÓGICA DEL MENÚ, TEMA Y AUTENTICACIÓN (sin cambios) ---
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
    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');
    applyTheme(localStorage.getItem('theme') || 'light');
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        renderRevenueChart();
    });
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        window.location.href = './login.html';
    });

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser || loggedInUser.role !== 'superadmin') {
        window.location.href = './login.html';
        return;
    }
    
    // --- NUEVO: URL base de la API ---
    const API_URL = 'http://localhost:3000/api';

    // --- SELECTORES Y ESTADO (sin cambios) ---
    const dom = {
        tableBody: document.getElementById('payments-table-body'),
        searchInput: document.getElementById('search-input'),
        statusFilter: document.getElementById('status-filter'),
        historyModal: {
            el: document.getElementById('history-modal'),
            title: document.getElementById('history-modal-title'),
            content: document.getElementById('history-modal-content'),
            closeBtn: document.getElementById('close-history-modal-btn'),
        },
        paymentFormModal: {
            el: document.getElementById('payment-form-modal'),
            title: document.getElementById('payment-form-title'),
            form: document.getElementById('payment-form'),
            closeBtn: document.getElementById('close-payment-form-btn'),
            cancelBtn: document.getElementById('cancel-payment-btn'),
            paymentIdInput: document.getElementById('payment-id'),
            adminIdInput: document.getElementById('admin-id'),
        },
        kpi: {
            mrr: document.getElementById('kpi-mrr'),
            paid: document.getElementById('kpi-paid-accounts'),
            overdue: document.getElementById('kpi-overdue-accounts'),
        }
    };
    
    let revenueChartInstance = null;
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

    // --- RENDERIZADO PRINCIPAL (Modificado para usar API) ---
    const renderPage = async () => {
        // Obtenemos los datos desde el servidor en lugar de Dexie
        const adminsResponse = await fetch(`${API_URL}/admins`);
        const allAdmins = await adminsResponse.json();
        const admins = allAdmins.filter(a => a.role === 'admin'); // Nos aseguramos de manejar solo administradores

        const paymentsResponse = await fetch(`${API_URL}/paymentHistory`);
        const payments = await paymentsResponse.json();
        
        updateKPIs(admins, payments);
        renderRevenueChart(payments);
        renderPaymentsTable(admins, payments);
    };

    const updateKPIs = (admins, payments) => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const paymentsThisMonth = payments.filter(p => p.paymentMonth === currentMonth);
        
        dom.kpi.mrr.textContent = formatCurrency(paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0));
        
        const paidAdminIds = new Set(paymentsThisMonth.map(p => p.adminId));
        dom.kpi.paid.textContent = paidAdminIds.size;
        dom.kpi.overdue.textContent = admins.length - paidAdminIds.size;
    };
    
    const renderRevenueChart = async (paymentsData) => {
        // Esta función puede recibir los datos directamente para no tener que pedirlos a la API de nuevo
        const payments = paymentsData || (await (await fetch(`${API_URL}/paymentHistory`)).json());
        const monthlyRevenue = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = d.toISOString().slice(0, 7);
            monthlyRevenue[monthKey] = 0;
        }
        payments.forEach(p => {
            if (monthlyRevenue.hasOwnProperty(p.paymentMonth)) {
                monthlyRevenue[p.paymentMonth] += p.amount;
            }
        });
        const labels = Object.keys(monthlyRevenue).map(key => new Date(key + '-02').toLocaleString('es-CO', { month: 'short', year: 'numeric' }));
        const data = Object.values(monthlyRevenue);
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        if(revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Ingresos', data, backgroundColor: 'rgba(59, 130, 246, 0.7)' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { display: false } } }
        });
    };

    const renderPaymentsTable = (admins, payments) => {
        const searchTerm = dom.searchInput.value.toLowerCase();
        const statusFilter = dom.statusFilter.value;
        dom.tableBody.innerHTML = '';
        const currentMonth = new Date().toISOString().slice(0, 7);

        admins.forEach(admin => {
            const lastPayment = payments.filter(p => p.adminId === admin.id).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
            const hasPaidThisMonth = payments.some(p => p.adminId === admin.id && p.paymentMonth === currentMonth);
            const paymentStatus = hasPaidThisMonth ? 'Pagado' : 'Atrasado';

            if (searchTerm && !admin.username.toLowerCase().includes(searchTerm)) return;
            if (statusFilter !== 'all' && paymentStatus !== statusFilter) return;

            const paymentStatusColors = { 'Pagado': 'bg-green-100 text-green-800', 'Atrasado': 'bg-red-100 text-red-800' };
            const accountStatusColors = { 'Activo': 'bg-green-100 text-green-800', 'Inactivo': 'bg-gray-100 text-gray-800' };
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50';
            tr.innerHTML = `
                <td class="px-6 py-4 font-medium">${admin.username}</td>
                <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentStatusColors[paymentStatus]}">${paymentStatus}</span></td>
                <td class="px-6 py-4">${lastPayment ? lastPayment.paymentDate : 'Nunca'}</td>
                <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${accountStatusColors[admin.status]}">${admin.status}</span></td>
                <td class="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button data-id="${admin.id}" class="view-history-btn text-gray-500 hover:text-blue-600" title="Ver Historial"><i data-feather="list" class="h-5 w-5"></i></button>
                    <button data-id="${admin.id}" class="add-payment-btn bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full">Registrar Pago</button>
                </td>`;
            dom.tableBody.appendChild(tr);
        });
        feather.replace();
    };

    const openPaymentFormModal = (adminId, payment = null) => {
        dom.paymentFormModal.form.reset();
        dom.paymentFormModal.adminIdInput.value = adminId;
        if (payment) {
            dom.paymentFormModal.title.textContent = "Editar Pago";
            dom.paymentFormModal.paymentIdInput.value = payment.id;
            document.getElementById('payment-amount').value = payment.amount;
            document.getElementById('payment-date').value = payment.paymentDate;
            document.getElementById('payment-month').value = payment.paymentMonth;
        } else {
            dom.paymentFormModal.title.textContent = "Registrar Nuevo Pago";
            document.getElementById('payment-date').value = new Date().toISOString().slice(0, 10);
            document.getElementById('payment-month').value = new Date().toISOString().slice(0, 7);
        }
        dom.paymentFormModal.el.classList.remove('hidden');
    };

    const openHistoryModal = async (adminId) => {
        const adminResponse = await fetch(`${API_URL}/admins/${adminId}`);
        const admin = await adminResponse.json();

        const paymentsResponse = await fetch(`${API_URL}/paymentHistory`);
        const allPayments = await paymentsResponse.json();
        const history = allPayments.filter(p => p.adminId === adminId).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

        dom.historyModal.title.textContent = `Historial de ${admin.username}`;
        if (history.length === 0) {
            dom.historyModal.content.innerHTML = `<p class="text-gray-500">No hay pagos registrados.</p>`;
        } else {
            dom.historyModal.content.innerHTML = `
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 dark:bg-gray-700"><tr>
                        <th class="p-2 text-left">Fecha Pago</th><th class="p-2 text-left">Periodo</th>
                        <th class="p-2 text-right">Monto</th><th class="p-2 text-center">Acciones</th>
                    </tr></thead>
                    <tbody>${history.map(p => `
                        <tr class="border-b dark:border-gray-700">
                            <td class="p-2">${p.paymentDate}</td><td class="p-2">${p.paymentMonth}</td>
                            <td class="p-2 text-right">${formatCurrency(p.amount)}</td>
                            <td class="p-2 text-center">
                                <button data-admin-id="${adminId}" data-payment-id="${p.id}" class="edit-payment-btn text-blue-500 hover:text-blue-700 p-1"><i data-feather="edit-2" class="h-4 w-4"></i></button>
                                <button data-admin-id="${adminId}" data-payment-id="${p.id}" class="delete-payment-btn text-red-500 hover:text-red-700 p-1"><i data-feather="trash-2" class="h-4 w-4"></i></button>
                            </td></tr>`).join('')}
                    </tbody></table>`;
        }
        feather.replace();
        dom.historyModal.el.classList.remove('hidden');
    };

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        toast.className = `fixed bottom-5 right-5 ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg animate-bounce`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    // --- MANEJO DE EVENTOS ---
    dom.searchInput.addEventListener('input', renderPage);
    dom.statusFilter.addEventListener('change', renderPage);
    dom.historyModal.closeBtn.addEventListener('click', () => dom.historyModal.el.classList.add('hidden'));
    dom.paymentFormModal.closeBtn.addEventListener('click', () => dom.paymentFormModal.el.classList.add('hidden'));
    dom.paymentFormModal.cancelBtn.addEventListener('click', () => dom.paymentFormModal.el.classList.add('hidden'));

    dom.paymentFormModal.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const paymentData = {
            adminId: parseInt(data['admin-id']),
            amount: parseFloat(data['payment-amount']),
            paymentDate: data['payment-date'],
            paymentMonth: data['payment-month'],
            status: 'Pagado'
        };

        const paymentId = data['payment-id'];
        const method = paymentId ? 'PUT' : 'POST';
        const url = paymentId ? `${API_URL}/paymentHistory/${paymentId}` : `${API_URL}/paymentHistory`;

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        // Si es un nuevo pago, actualizamos el estado del admin a 'Activo'
        if (!paymentId) {
            await fetch(`${API_URL}/admins/${paymentData.adminId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Solo enviamos el campo que queremos cambiar
                body: JSON.stringify({ status: 'Activo' })
            });
            showNotification('Pago registrado y cuenta activada.', 'success');
        } else {
            showNotification('Pago actualizado correctamente.', 'success');
        }

        dom.paymentFormModal.el.classList.add('hidden');
        await renderPage();
        // Si el modal de historial está abierto, refrescarlo
        if (!dom.historyModal.el.classList.contains('hidden')) {
            await openHistoryModal(paymentData.adminId);
        }
    });
    
    document.body.addEventListener('click', async (e) => {
        const addPaymentBtn = e.target.closest('.add-payment-btn');
        if (addPaymentBtn) {
            openPaymentFormModal(parseInt(addPaymentBtn.dataset.id));
        }

        const viewHistoryBtn = e.target.closest('.view-history-btn');
        if (viewHistoryBtn) {
            openHistoryModal(parseInt(viewHistoryBtn.dataset.id));
        }
        
        const editPaymentBtn = e.target.closest('.edit-payment-btn');
        if (editPaymentBtn) {
            const paymentId = parseInt(editPaymentBtn.dataset.paymentId);
            const response = await fetch(`${API_URL}/paymentHistory`);
            const allPayments = await response.json();
            const payment = allPayments.find(p => p.id === paymentId);
            openPaymentFormModal(parseInt(editPaymentBtn.dataset.adminId), payment);
        }
        
        const deletePaymentBtn = e.target.closest('.delete-payment-btn');
        if (deletePaymentBtn) {
            if (confirm('¿Estás seguro de eliminar este registro de pago?')) {
                const paymentId = parseInt(deletePaymentBtn.dataset.paymentId);
                const adminId = parseInt(deletePaymentBtn.dataset.adminId);
                await fetch(`${API_URL}/paymentHistory/${paymentId}`, { method: 'DELETE' });
                showNotification('Registro de pago eliminado.', 'success');
                await renderPage();
                await openHistoryModal(adminId);
            }
        }
    });
    
    // --- INICIALIZACIÓN ---
    await renderPage();
});