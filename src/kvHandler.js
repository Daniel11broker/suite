/**
 * src/kvHandler.js
 * Este archivo contiene toda la lógica para interactuar con Workers KV.
 */
export async function handleKvRequest(request, env) {
  try {
    const url = new URL(request.url);
    // Extraemos la "clave" de la URL. Ej: en /kv/user_theme, la clave es "user_theme"
    const key = url.pathname.split('/')[2];

    if (!key) {
      return new Response("Debes especificar una clave en la URL (ej: /kv/mi-clave)", { status: 400 });
    }

    // Usamos el nombre del binding que definiste en wrangler.toml
    // Reemplaza 'SUITE_CONFIG' si tu binding se llama diferente.
    const KV_NAMESPACE = env.SUITE_CONFIG;

    switch (request.method) {
      case 'GET': {
        const value = await KV_NAMESPACE.get(key);
        if (value === null) {
          return new Response(`La clave '${key}' no fue encontrada.`, { status: 404 });
        }
        return new Response(value, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }

      case 'POST': {
        const value = await request.text();
        if (!value) {
            return new Response("El cuerpo de la petición no puede estar vacío.", { status: 400 });
        }
        await KV_NAMESPACE.put(key, value);
        return new Response(`Valor para la clave '${key}' guardado correctamente.`, { status: 200 });
      }

      case 'DELETE': {
        await KV_NAMESPACE.delete(key);
        return new Response(`Clave '${key}' borrada correctamente.`, { status: 200 });
      }

      default:
        return new Response("Método no permitido. Usa GET, POST, o DELETE.", { status: 405 });
    }
  } catch (error) {
    console.error("Error en la lógica de KV:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}