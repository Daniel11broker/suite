// public/ai-chat-widget.js

export function initializeAiChat(translations, initialLang) {
    let currentLang = initialLang;

    const aiToggleButton = document.getElementById('ai-toggle-button');
    const aiChatWindow = document.getElementById('ai-chat-window');
    const aiMessageList = document.getElementById('ai-message-list');
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiMessageInput = document.getElementById('ai-message-input');
    let aiChatHistory = [];

    if (!aiToggleButton) return;

    aiToggleButton.addEventListener('click', () => {
        aiChatWindow.classList.toggle('hidden');
        const supportChatWindow = document.getElementById('support-chat-window');
        if (supportChatWindow) supportChatWindow.classList.add('hidden');
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

    document.addEventListener('languageChanged', (event) => {
        currentLang = event.detail.lang;
    });
}