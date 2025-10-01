// public/support-chat-widget.js

export function initializeSupportChat(translations, initialLang) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    let currentLang = initialLang;

    const getChatTranslation = (key) => {
        return key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations[currentLang]);
    };

    const supportToggleButton = document.getElementById('support-toggle-button');
    const supportChatWindow = document.getElementById('support-chat-window');
    const supportLoginView = document.getElementById('support-login-view');
    const supportMainView = document.getElementById('support-main-view');
    const supportLoginForm = document.getElementById('support-login-form');
    const supportUsernameInput = document.getElementById('support-username-input');
    const supportDepartmentSelect = document.getElementById('support-department-select');
    const supportMessageList = document.getElementById('support-message-list');
    const supportChatForm = document.getElementById('support-chat-form');
    const supportMessageInput = document.getElementById('support-message-input');
    const supportChatHeader = document.getElementById('support-chat-header');
    let supportSocket = null;

    if (!supportToggleButton) return;

    supportToggleButton.addEventListener('click', () => {
        supportChatWindow.classList.toggle('hidden');
        const aiChatWindow = document.getElementById('ai-chat-window');
        if (aiChatWindow) aiChatWindow.classList.add('hidden');
    });

    supportLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = supportUsernameInput.value.trim();
        const department = supportDepartmentSelect.value;
        if (userName && !supportSocket) {
            connectToPrivateChat(userName, department);
        }
    });

    const addSupportMessageToUI = (msgData) => {
        const msg = typeof msgData === 'string' ? JSON.parse(msgData) : msgData;
        const item = document.createElement('div');
        item.className = 'mb-3';
        const messageContent = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        item.innerHTML = `<div><span class="font-bold text-sm">${msg.user.replace(/</g, "&lt;")}</span><span class="text-xs text-gray-500 ml-2">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><div class="text-gray-800 dark:text-gray-200 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded-md mt-1">${messageContent}</div>`;
        supportMessageList.appendChild(item);
        supportMessageList.scrollTop = supportMessageList.scrollHeight;
    };

    const connectToPrivateChat = async (userName, department) => {
        try {
            const response = await fetch('/api/chat/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName, department })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`No se pudo crear la sesión: ${errorText}`);
            }
            const { sessionId } = await response.json();
            if (!sessionId) throw new Error('No se recibió un ID de sesión del servidor.');
            
            supportLoginView.classList.add('hidden');
            supportMainView.classList.remove('hidden');
            supportChatHeader.textContent = `${getChatTranslation('support_chat.title')} - ${department}`;

            const wsUrl = `${wsProtocol}//${wsHost}/api/chat/session/${sessionId}`;
            supportSocket = new WebSocket(wsUrl);

            supportSocket.addEventListener('message', event => {
                const data = JSON.parse(event.data);
                if (data.type === 'history') {
                    supportMessageList.innerHTML = '';
                    (data.messages || []).forEach(msg => addSupportMessageToUI(JSON.stringify(msg)));
                } else {
                    addSupportMessageToUI(event.data);
                }
            });

            supportSocket.addEventListener('close', () => {
                supportSocket = null;
                supportLoginView.classList.remove('hidden');
                supportMainView.classList.add('hidden');
            });
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    supportChatForm.addEventListener('submit', event => {
        event.preventDefault();
        const text = supportMessageInput.value.trim();
        if (text && supportSocket) {
            const userName = supportUsernameInput.value.trim();
            const message = { user: userName, text: text, timestamp: new Date().toISOString() };
            supportSocket.send(JSON.stringify(message));
            supportMessageInput.value = '';
        }
    });

    document.addEventListener('languageChanged', (event) => {
        currentLang = event.detail.lang;
    });
}