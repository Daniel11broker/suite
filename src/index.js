/**
 * src/index.js
 * EL ENRUTADOR PRINCIPAL
 */

// 1. Importa los tres manejadores
import { handleAuth } from './authLogin.js';
import { handleKvRequest } from './kvHandler.js';
import { handleR2Request } from './r2Handler.js'; // Nueva importación

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    console.log(`Petición recibida: ${method} ${pathname}`);

    // Ruta para la autenticación
    if (method === 'POST' && pathname === '/authLogin') {
      console.log("Coincidencia de ruta encontrada! Ejecutando handleAuth...");
      return handleAuth(request, env);
    } 
    // Ruta para cualquier solicitud que empiece con /kv/
    else if (pathname.startsWith('/kv/')) {
        console.log("Coincidencia de ruta encontrada! Ejecutando handleKvRequest...");
        return handleKvRequest(request, env);
    }
    // NUEVA RUTA: para cualquier solicitud que empiece con /r2/
    else if (pathname.startsWith('/r2/')) {
        console.log("Coincidencia de ruta encontrada! Ejecutando handleR2Request...");
        return handleR2Request(request, env);
    }

    // Si no coincide ninguna ruta, devolvemos un error 404.
    console.log("No se encontró ninguna coincidencia de ruta.");
    return new Response(`La ruta '${pathname}' no fue encontrada en el servidor.`, { status: 404 });
  },
};