// src/chatSession.js

export class ChatSession {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = []; // Máximo 2: el usuario y el agente
        this.messages = [];
    }

    async fetch(request) {
        this.messages = await this.state.storage.get('messages') || [];
        const { 0: client, 1: server } = new WebSocketPair();
        this.handleSession(server);
        return new Response(null, { status: 101, webSocket: client });
    }

    handleSession(ws) {
        ws.accept();
        this.sessions.push(ws);

        ws.send(JSON.stringify({ type: 'history', messages: this.messages }));

        ws.addEventListener('message', async (msg) => {
            // Reenviar el mensaje al OTRO participante de la sesión
            const message = msg.data;
            this.messages.push(JSON.parse(message));
            await this.state.storage.put('messages', this.messages);
            this.broadcast(message);
        });

        ws.addEventListener('close', () => {
            this.sessions = this.sessions.filter(s => s !== ws);
        });
    }

    broadcast(message) {
        this.sessions.forEach(session => {
            session.send(message);
        });
    }
}