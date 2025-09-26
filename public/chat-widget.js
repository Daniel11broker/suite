// public/chat-widget.js

/**
 * Módulo de Chat para Suite Empresarial
 * Encapsula la lógica para los widgets de Soporte/Ventas y Asistente de IA.
 * @param {object} translations - El objeto completo de traducciones.
 * @param {string} initialLang - El idioma inicial (ej: 'es', 'en').
 */
export function initializeAllChats(translations, initialLang) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    let currentLang = initialLang;

    // Función auxiliar para obtener traducciones dentro del módulo
    const getChatTranslation = (key) => {
        return key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations[currentLang]);
    };

    // --- Lógica para el Chat de Soporte/Ventas ---
    const supportToggleButton = document.getElementById('support-toggle-button');
    const supportChatWindow = document.getElementById('support-chat-window');
    // ... (El resto de los selectores para el chat de soporte)
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

    if (supportToggleButton) {
        supportToggleButton.addEventListener('click', () => {
            supportChatWindow.classList.toggle('hidden');
            document.getElementById('ai-chat-window').classList.add('hidden');
        });

        supportLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userName = supportUsernameInput.value.trim();
            const department = supportDepartmentSelect.value;
            if (userName && !supportSocket) {
                connectToSupportSocket(userName, department);
                supportLoginView.classList.add('hidden');
                supportMainView.classList.remove('hidden');
                supportChatHeader.textContent = `${getChatTranslation('support_chat.title')} - ${department}`;
            }
        });

        const addSupportMessageToUI = (msg) => {
            const item = document.createElement('div');
            item.className = 'mb-3';
            const messageContent = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            item.innerHTML = `<div><span class="font-bold text-sm">${msg.user.replace(/</g, "&lt;")}</span><span class="text-xs text-gray-500 ml-2">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><div class="text-gray-800 dark:text-gray-200 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded-md mt-1">${messageContent}</div>`;
            supportMessageList.appendChild(item);
            supportMessageList.scrollTop = supportMessageList.scrollHeight;
        };

        const connectToSupportSocket = (userName, department) => {
            const wsUrl = `${wsProtocol}//${wsHost}/api/chat?user=${encodeURIComponent(userName)}&room=${encodeURIComponent(department)}`;
            supportSocket = new WebSocket(wsUrl);

            supportSocket.addEventListener('message', event => {
                const data = JSON.parse(event.data);
                if (data.type === 'history') {
                    supportMessageList.innerHTML = '';
                    data.messages.forEach(addSupportMessageToUI);
                } else if (data.type === 'text') {
                    addSupportMessageToUI(data);
                }
            });

            supportSocket.addEventListener('close', () => {
                supportSocket = null;
                supportLoginView.classList.remove('hidden');
                supportMainView.classList.add('hidden');
            });
        };

        supportChatForm.addEventListener('submit', event => {
            event.preventDefault();
            const text = supportMessageInput.value.trim();
            if (text && supportSocket) {
                supportSocket.send(JSON.stringify({ type: 'text', text: text }));
                supportMessageInput.value = '';
            }
        });
    }

    // --- Lógica para el Asistente IA ---
    const aiToggleButton = document.getElementById('ai-toggle-button');
    const aiChatWindow = document.getElementById('ai-chat-window');
    // ... (El resto de los selectores para el chat de IA)
    const aiMessageList = document.getElementById('ai-message-list');
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiMessageInput = document.getElementById('ai-message-input');
    let aiChatHistory = [];

    if (aiToggleButton) {
        aiToggleButton.addEventListener('click', () => {
            aiChatWindow.classList.toggle('hidden');
            document.getElementById('support-chat-window').classList.add('hidden');
        });

        const addAiMessageToUI = (text, sender, isStreaming = false) => {
            if (isStreaming) {
                let lastMessage = aiMessageList.querySelector('.streaming');
                if (!lastMessage) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `ai-message ${sender} streaming`;
                    messageDiv.innerHTML = `<div class="ai-message-bubble"></div>`;
                    aiMessageList.appendChild(messageDiv);
                    lastMessage = messageDiv;
                }
                const bubble = lastMessage.querySelector('.ai-message-bubble');
                bubble.innerHTML += text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            } else {
                aiMessageList.querySelectorAll('.streaming').forEach(el => el.classList.remove('streaming'));
                const messageDiv = document.createElement('div');
                messageDiv.className = `ai-message ${sender}`;
                messageDiv.innerHTML = `<div class="ai-message-bubble">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
                aiMessageList.appendChild(messageDiv);
            }
            aiMessageList.scrollTop = aiMessageList.scrollHeight;
        };

        aiChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userMessage = aiMessageInput.value.trim();
            if (!userMessage) return;

            addAiMessageToUI(userMessage, 'user');
            aiChatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            aiMessageInput.value = '';
            aiMessageInput.disabled = true;

            try {
                const response = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        history: aiChatHistory.slice(0, -1),
                        question: userMessage,
                    }),
                });

                if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const parts = chunk.match(/"text":\s*"(.*?)"/g);
                    if (parts) {
                        const extractedText = parts.map(p => JSON.parse(`{${p}}`).text).join('');
                        fullResponse += extractedText;
                        addAiMessageToUI(extractedText.replace(/\n/g, '<br>'), 'assistant', true);
                    }
                }
                
                aiChatHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
                aiMessageList.querySelectorAll('.streaming').forEach(el => el.classList.remove('streaming'));
            } catch (error) {
                console.error('Error al contactar al asistente de IA:', error);
                addAiMessageToUI('Lo siento, no puedo responder en este momento.', 'assistant');
            } finally {
                aiMessageInput.disabled = false;
                aiMessageInput.focus();
            }
        });
    }

    // Permite que el idioma del chat se actualice desde fuera
    document.addEventListener('languageChanged', (event) => {
        currentLang = event.detail.lang;
    });
}