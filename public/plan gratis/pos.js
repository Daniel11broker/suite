document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

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
    let tesoreriaData = {};
    let clientsData = [];

    // --- Cargar Datos del Inventario (Robusto) ---
    const loadData = () => {
        try {
            const inventoryData = localStorage.getItem('inventory');
            inventory = inventoryData ? JSON.parse(inventoryData) : [];
            const tesoreriaDataString = localStorage.getItem('tesoreria_data_v1');
            tesoreriaData = tesoreriaDataString ? JSON.parse(tesoreriaDataString) : { accounts: [], manualTransactions: [] };
            const clientsDataString = localStorage.getItem('clients');
            clientsData = clientsDataString ? JSON.parse(clientsDataString) : [];
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            inventory = [];
            tesoreriaData = { accounts: [], manualTransactions: [] };
            clientsData = [];
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
        const validProducts = products.filter(p => p && p.name && (p.quantity || p.quantity === 0) && (p.salePrice || p.salePrice === 0));
        
        if (validProducts.length === 0) {
            productList.innerHTML = `<p class="col-span-full text-center text-gray-500">No hay productos en stock. Agrega algunos en el módulo de Inventarios.</p>`;
            return;
        }

        validProducts.forEach(product => {
            if (parseInt(product.quantity) > 0) {
                const productEl = document.createElement('div');
                productEl.className = 'p-4 border rounded-md text-center cursor-pointer hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 transition-transform hover:scale-105';
                productEl.innerHTML = `
                    <h3 class="font-semibold">${product.name}</h3>
                    <p class="text-gray-500 dark:text-gray-400">$${parseInt(product.salePrice).toLocaleString()}</p>
                    <p class="text-xs text-gray-400">Stock: ${product.quantity}</p>
                `;
                productEl.addEventListener('click', () => addToCart(product));
                productList.appendChild(productEl);
            }
        });
    };
    
    // --- Lógica del Carrito ---
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        const stock = parseInt(product.quantity);

        if (existingItem) {
            if (existingItem.quantity < stock) {
                existingItem.quantity++;
            } else {
                showToast(`No hay más stock para ${product.name}.`, 'error');
            }
        } else {
             if (stock > 0) {
                cart.push({ ...product, price: parseInt(product.salePrice), quantity: 1 });
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
                    <p class="text-sm text-gray-500 dark:text-gray-400">$${item.price.toLocaleString()} x ${item.quantity}</p>
                </div>
                <div class="flex items-center">
                    <button class="px-2 py-1 text-sm btn-secondary remove-from-cart" data-id="${item.id}">-</button>
                    <span class="px-2">${item.quantity}</span>
                    <button class="px-2 py-1 text-sm btn-secondary add-to-cart" data-id="${item.id}">+</button>
                </div>
            `;
            cartItems.appendChild(itemEl);
            subtotal += item.price * item.quantity;
        });
        
        const taxRate = applyIvaCheckbox.checked ? 0.19 : 0;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        cartSubtotal.textContent = `$${subtotal.toLocaleString()}`;
        cartTax.textContent = `$${tax.toLocaleString()}`;
        cartTotal.textContent = `$${total.toLocaleString()}`;

        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const item = cart.find(item => item.id === id);
                if (item) {
                    item.quantity--;
                    if (item.quantity === 0) {
                        cart = cart.filter(item => item.id !== id);
                    }
                    renderCart();
                }
            });
        });
        
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                 const id = parseInt(e.target.dataset.id, 10);
                 const productInCart = cart.find(item => item.id === id);
                 const productInInventory = inventory.find(item => item.id === id);

                 if (productInCart && productInInventory) {
                    if (productInCart.quantity < parseInt(productInInventory.quantity)) {
                        productInCart.quantity++;
                        renderCart();
                    } else {
                        showToast(`No hay más stock para ${productInCart.name}.`, 'error');
                    }
                 }
            });
        });
    };
    
    // Función para rellenar el selector de método de pago
    const populatePaymentMethods = () => {
        paymentMethodSelect.innerHTML = `<option value="cash">Efectivo</option>`;
        tesoreriaData.accounts.forEach(account => {
            paymentMethodSelect.innerHTML += `<option value="${account.id}">${account.name} (${account.bank})</option>`;
        });
    };
    
    // Función para rellenar el selector de clientes
    const populateClients = () => {
        const consumidorFinal = clientsData.find(c => c.name === 'Consumidor Final');
        if (consumidorFinal) {
            clientSelect.innerHTML = `<option value="${consumidorFinal.id}">Consumidor Final</option>`;
        } else {
            // Fallback si por alguna razón no existe
            clientSelect.innerHTML = `<option value="1">Consumidor Final</option>`;
        }
        
        clientsData.filter(c => c.name !== 'Consumidor Final').forEach(client => {
            clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
        });
    };

    // --- Event Listeners ---
    applyIvaCheckbox.addEventListener('change', renderCart);

    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            showToast('El carrito está vacío.', 'error');
            return;
        }
        
        const selectedClient = clientSelect.options[clientSelect.selectedIndex];
        const clientId = parseInt(selectedClient.value, 10);
        const clientName = selectedClient.text;
        const selectedPaymentMethod = paymentMethodSelect.value;
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const taxRate = applyIvaCheckbox.checked ? 0.19 : 0;
        const iva = subtotal * taxRate;
        const total = subtotal + iva;
        const invoiceNumber = `POS-${Date.now()}`;
        const today = new Date().toISOString().slice(0, 10);

        // Lógica de integración con Inventarios
        const movements = JSON.parse(localStorage.getItem('inventory_movements')) || [];
        const updatedInventory = [...inventory];
        cart.forEach(cartItem => {
            const inventoryItem = updatedInventory.find(invItem => invItem.id === cartItem.id);
            if (inventoryItem) {
                const oldQuantity = parseInt(inventoryItem.quantity);
                const quantitySold = cartItem.quantity;
                const newQuantity = oldQuantity - quantitySold;
                inventoryItem.quantity = newQuantity;

                movements.push({
                    id: Date.now() + Math.random(),
                    productId: cartItem.id,
                    date: today,
                    type: 'Venta',
                    quantityChange: `-${quantitySold}`,
                    newQuantity: newQuantity,
                    reason: `Venta POS #${invoiceNumber}`
                });
            }
        });
        localStorage.setItem('inventory', JSON.stringify(updatedInventory));
        localStorage.setItem('inventory_movements', JSON.stringify(movements));

        // Lógica de integración con Facturación
        const invoiceData = {
            id: Date.now() + 2,
            clientId: clientId, 
            clientName: clientName,
            number: invoiceNumber,
            issueDate: today,
            subtotal: subtotal,
            iva: iva,
            total: total,
            status: 'Pagado',
            items: cart
        };
        const facturacionData = JSON.parse(localStorage.getItem('documentos_data_v3')) || { invoices: [], creditNotes: [], debitNotes: [], chargeAccounts: [] };
        facturacionData.invoices.push(invoiceData);
        localStorage.setItem('documentos_data_v3', JSON.stringify(facturacionData));
        

        // Lógica de integración con Tesorería
        const tesoreriaData = JSON.parse(localStorage.getItem('tesoreria_data_v1')) || { accounts: [], manualTransactions: [] };
        let targetAccountId;
        if (selectedPaymentMethod === 'cash') {
            let cashAccount = tesoreriaData.accounts.find(acc => acc.name === 'Caja General');
            if (!cashAccount) {
                const newAccountId = Date.now();
                cashAccount = { id: newAccountId, name: 'Caja General', bank: 'N/A', type: 'Efectivo', initialBalance: 0, currentBalance: 0 };
                tesoreriaData.accounts.push(cashAccount);
            }
            targetAccountId = cashAccount.id;
        } else {
            targetAccountId = parseInt(selectedPaymentMethod, 10);
        }

        tesoreriaData.manualTransactions.push({
            id: Date.now() + 1,
            date: today,
            accountId: targetAccountId,
            type: 'inflow',
            description: `Venta POS #${invoiceNumber}`,
            amount: total
        });
        localStorage.setItem('tesoreria_data_v1', JSON.stringify(tesoreriaData));

        showToast('¡Venta completada! Redirigiendo a facturación...', 'success');

        setTimeout(() => {
            window.location.href = 'facturacion.html';
        }, 1500);
    });

    const init = () => {
        loadData();
        renderProducts(inventory);
        populatePaymentMethods();
        populateClients();
    };

    init();
});