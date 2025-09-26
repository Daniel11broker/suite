// src/aiChatHandler.js

import { GEMINI_API_KEY } from './config.js';

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${GEMINI_API_KEY}`;

export async function handleAiChatRequest(request, env) {
    if (request.method !== 'POST') {
        return new Response('Método no permitido', { status: 405 });
    }

    try {
        const { history, question } = await request.json();

        // Prompt del sistema: Define el rol y el conocimiento del asistente.
        const systemPrompt = `Eres un asistente virtual experto de "Suite Empresarial". Tu objetivo es responder preguntas sobre el negocio, sus módulos (Facturación, CRM, Inventario, etc.) y cómo funciona la plataforma. Sé amable, servicial y responde únicamente sobre temas relacionados con Suite Empresarial. Si te preguntan otra cosa, responde cortésmente que solo puedes ayudar con información sobre la suite.`;

        const contents = [
            ...history, // Incluye el historial de la conversación
            {
                role: 'user',
                parts: [{ text: question }],
            },
        ];

        const geminiRequestPayload = {
            contents,
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemPrompt }],
            },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                maxOutputTokens: 1024,
            }
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiRequestPayload),
        });

        if (!geminiResponse.ok) {
            console.error('Error de la API de Gemini:', await geminiResponse.text());
            return new Response('El asistente no está disponible en este momento.', { status: 500 });
        }

        // Devolvemos la respuesta en streaming directamente al cliente.
        return new Response(geminiResponse.body, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });

    } catch (error) {
        console.error('Error en el manejador del chat de IA:', error);
        return new Response('Error interno del servidor', { status: 500 });
    }
}