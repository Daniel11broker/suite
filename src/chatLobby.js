// src/chatLobby.js

export class ChatLobby {
    constructor(state, env) {
        this.state = state;
        this.agents = new Map(); // Agentes conectados: <socket, agentInfo>
        this.waitingUsers = []; // Usuarios esperando ser atendidos
    }

    async fetch(request) {
        // Cargar datos persistentes al iniciar
        this.waitingUsers = await this.state.storage.get("waitingUsers") || [];

        const { 0: client, 1: server } = new WebSocketPair();
        const agentName = new URL(request.url).searchParams.get('agentName') || 'Agente';
        
        this.handleAgentSession(server, agentName);

        return new Response(null, { status: 101, webSocket: client });
    }

    handleAgentSession(ws, agentName) {
        ws.accept();
        this.agents.set(ws, { name: agentName });

        // Enviar la lista de espera actual al agente que se conecta
        ws.send(JSON.stringify({ type: 'queueUpdate', queue: this.waitingUsers }));

        ws.addEventListener('close', () => {
            this.agents.delete(ws);
        });
        ws.addEventListener('error', () => {
            this.agents.delete(ws);
        });
    }

    // Método para añadir un usuario a la cola
    async queueUser(userInfo) {
        this.waitingUsers.push(userInfo);
        await this.state.storage.put("waitingUsers", this.waitingUsers);
        this.broadcastQueue();
    }
    
    // Método para quitar un usuario de la cola (cuando es atendido)
    async dequeueUser(sessionId) {
        this.waitingUsers = this.waitingUsers.filter(u => u.sessionId !== sessionId);
        await this.state.storage.put("waitingUsers", this.waitingUsers);
        this.broadcastQueue();
    }

    // Notificar a todos los agentes sobre cambios en la cola
    broadcastQueue() {
        const message = JSON.stringify({ type: 'queueUpdate', queue: this.waitingUsers });
        for (const [ws] of this.agents) {
            ws.send(message);
        }
    }

    // El endpoint fetch puede recibir peticiones HTTP también
    async handleHttpRequest(request) {
        const url = new URL(request.url);
        const user = await request.json();

        if (url.pathname.endsWith('/queue')) {
            await this.queueUser(user);
            return new Response('User queued', { status: 200 });
        }
        if (url.pathname.endsWith('/dequeue')) {
            await this.dequeueUser(user.sessionId);
            return new Response('User dequeued', { status: 200 });
        }

        return new Response('Not found', { status: 404 });
    }
}