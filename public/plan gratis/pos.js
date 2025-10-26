document.addEventListener('DOMContentLoaded', async () => {
    // --- Selectores del DOM ---
    const productList = document.getElementById('product-list');
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTax = document.getElementById('cart-tax');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const toastContainer = document.getElementById('toast-container');
    const applyIvaCheckbox = document.getElementById('apply-iva');
    const paymentMethodSelect = document.getElementById('payment-method');
    const clientSelect = document.getElementById('client-select');

    // --- Estado de la aplicación ---
    let cart = [];
    let inventory = [];
    let tesoreriaData = { accounts: [] };
    let clientsData = [];
    let isUserLoggedIn = false;

    // --- Lógica de Datos ---
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
                return response;
            } catch (error) {
                showToast(error.message, 'error');
                throw error;
            }
        },
        get: (endpoint) => api.request('GET', endpoint),
        post: (endpoint, body) => api.request('POST', endpoint, body)
    };

    const checkLoginStatus = () => {
        isUserLoggedIn = !!localStorage.getItem('loggedInUser');
        console.log('Modo de operación POS:', isUserLoggedIn ? 'Base de Datos (Online)' : 'LocalStorage (Offline)');
    };

    const loadData = async () => {
        if(isUserLoggedIn) {
            try {
                const response = await api.get('/api/pos/initial-data');
                const data = await response.json();
                inventory = data.inventory || [];
                clientsData = data.clients || [];
                tesoreriaData.accounts = data.accounts || [];
            } catch(e) {
                inventory = []; clientsData = []; tesoreriaData = { accounts: [] };
            }
        } else {
            try {
                inventory = JSON.parse(localStorage.getItem('inventory')) || [];
                tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [], manualTransactions: [] };
                clientsData = JSON.parse(localStorage.getItem('clients')) || [];
            } catch (error) {
                console.error("Error al cargar datos locales:", error);
                inventory = []; tesoreriaData = { accounts: [] }; clientsData = [];
            }
        }
    };

    // --- Utilidades ---
    const showToast = (message, type = 'success') => {
        const icon = type === 'success' ? 'check-circle' : 'alert-triangle';
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white py-3 px-5 rounded-lg shadow-lg flex items-center gap-3`;
        toast.innerHTML = `<i data-feather="${icon}" class="h-5 w-5"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        feather.replace();
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 4000);
    };

    // --- Lógica de Renderizado ---
    const renderProducts = (products) => {
        productList.innerHTML = '';
        const validProducts = (products || []).filter(p => p && p.name && (p.stock || p.stock === 0) && (p.price || p.price === 0));
        
        if (validProducts.length === 0) {
            productList.innerHTML = `<p class="col-span-full text-center text-gray-500">No hay productos. Agrega algunos en Inventarios.</p>`;
            return;
        }

        validProducts.forEach(product => {
            if (parseInt(product.stock) > 0) {
                const productEl = document.createElement('div');
                productEl.className = 'p-4 border rounded-md text-center cursor-pointer hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700';
                productEl.innerHTML = `
                    <h3 class="font-semibold">${product.name}</h3>
                    <p class="text-gray-500 dark:text-gray-400">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.price)}</p>
                    <p class="text-xs text-gray-400">Stock: ${product.stock}</p>`;
                productEl.addEventListener('click', () => addToCart(product));
                productList.appendChild(productEl);
            }
        });
    };
    
    // --- Lógica del Carrito ---
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        const stock = parseInt(product.stock);

        if (existingItem) {
            if (existingItem.quantity < stock) {
                existingItem.quantity++;
            } else {
                showToast(`No hay más stock para ${product.name}.`, 'error');
            }
        } else {
             if (stock > 0) {
                cart.push({ ...product, quantity: 1 });
             } else {
                showToast(`${product.name} no tiene stock disponible.`, 'error');
             }
        }
        renderCart();
    };
    
    const renderCart = () => {
        cartItems.innerHTML = '';
        let subtotal = 0;

        cart.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'flex justify-between items-center mb-2';
            itemEl.innerHTML = `
                <div>
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.price)} x ${item.quantity}</p>
                </div>
                <div class="flex items-center">
                    <button class="px-2 py-1 text-sm btn-secondary remove-from-cart" data-id="${item.id}">-</button>
                    <span class="px-2">${item.quantity}</span>
                    <button class="px-2 py-1 text-sm btn-secondary add-to-cart" data-id="${item.id}">+</button>
                </div>`;
            cartItems.appendChild(itemEl);
            subtotal += item.price * item.quantity;
        });
        
        const taxRate = applyIvaCheckbox.checked ? 0.19 : 0;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        cartSubtotal.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(subtotal);
        cartTax.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(tax);
        cartTotal.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total);

        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const item = cart.find(item => item.id === id);
                if (item) {
                    item.quantity--;
                    if (item.quantity === 0) cart = cart.filter(item => item.id !== id);
                    renderCart();
                }
            });
        });
        
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                 const id = parseInt(e.target.dataset.id, 10);
                 const productInCart = cart.find(item => item.id === id);
                 const productInInventory = inventory.find(item => item.id === id);
                 if (productInCart && productInInventory && productInCart.quantity < parseInt(productInInventory.stock)) {
                    productInCart.quantity++;
                    renderCart();
                 } else {
                    showToast(`No hay más stock para ${productInCart.name}.`, 'error');
                 }
            });
        });
    };
    
    const populatePaymentMethods = () => {
        let cashAccount = (tesoreriaData.accounts || []).find(acc => acc.name === 'Caja General');
        if (!cashAccount && !isUserLoggedIn) {
            cashAccount = { id: 1, name: 'Caja General' }; 
        }
        paymentMethodSelect.innerHTML = cashAccount ? `<option value="${cashAccount.id}">Caja General (Efectivo)</option>` : '';
        (tesoreriaData.accounts || []).filter(acc => acc.name !== 'Caja General').forEach(account => {
            paymentMethodSelect.innerHTML += `<option value="${account.id}">${account.name} (${account.bank})</option>`;
        });
    };
    
    const populateClients = () => {
        const consumidorFinal = (clientsData || []).find(c => c.name === 'Consumidor Final') || { id: 1, name: 'Consumidor Final'};
        clientSelect.innerHTML = `<option value="${consumidorFinal.id}">Consumidor Final</option>`;
        (clientsData || []).filter(c => c.name !== 'Consumidor Final').forEach(client => {
            clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
        });
    };

    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) return showToast('El carrito está vacío.', 'error');
        
        const selectedClient = clientSelect.options[clientSelect.selectedIndex];
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const taxRate = applyIvaCheckbox.checked ? 0.19 : 0;
        const iva = subtotal * taxRate;
        
        const saleData = {
            cart: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price, name: item.name, stock: item.stock })),
            subtotal: subtotal, iva: iva, total: subtotal + iva,
            clientId: parseInt(selectedClient.value, 10),
            clientName: selectedClient.text,
            paymentMethod: paymentMethodSelect.value,
        };
        
        try {
            if (isUserLoggedIn) {
                const response = await api.post('/api/pos/checkout', saleData);
                if (response.ok) {
                    showToast('¡Venta completada!', 'success');
                    cart = [];
                    await loadData();
                    renderProducts(inventory);
                    renderCart();
                }
            } else {
                // Lógica offline
                const today = new Date().toISOString().slice(0, 10);
                const invoiceNumber = `POS-${Date.now()}`;
                
                cart.forEach(cartItem => {
                    const inventoryItem = inventory.find(invItem => invItem.id === cartItem.id);
                    if(inventoryItem) inventoryItem.stock -= cartItem.quantity;
                });
                localStorage.setItem('inventory', JSON.stringify(inventory));

                const facturacionData = JSON.parse(localStorage.getItem('documentos_data_v3')) || { invoices: [] };
                facturacionData.invoices.push({ id: Date.now(), ...saleData, number: invoiceNumber, issueDate: today, status: 'Pagado' });
                localStorage.setItem('documentos_data_v3', JSON.stringify(facturacionData));
                
                const localTesoreria = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [], manualTransactions: []};
                localTesoreria.manualTransactions.push({
                    id: Date.now() + 1, date: today, accountId: saleData.paymentMethod, type: 'inflow',
                    description: `Venta POS #${invoiceNumber}`, amount: saleData.total
                });
                localStorage.setItem('tesoreria_data_v1', JSON.stringify(localTesoreria));

                showToast('Venta local guardada. Sincroniza al iniciar sesión.');
                cart = [];
                renderProducts(inventory);
                renderCart();
            }
        } catch(e) {}
    });

    const init = async () => {
        checkLoginStatus();
        await loadData();
        renderProducts(inventory);
        populatePaymentMethods();
        populateClients();
        applyIvaCheckbox.addEventListener('change', renderCart);
        feather.replace();
    };

    init();
});