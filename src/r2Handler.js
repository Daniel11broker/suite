/**
 * src/r2Handler.js
 * Este archivo contiene toda la lógica para interactuar con Cloudflare R2.
 */
export async function handleR2Request(request, env) {
  try {
    const url = new URL(request.url);
    // Extraemos la "clave" (nombre del archivo) de la URL. Ej: en /r2/mi-archivo.txt, la clave es "mi-archivo.txt"
    const key = url.pathname.split('/')[2];

    if (!key) {
      return new Response("Debes especificar una clave (nombre de archivo) en la URL (ej: /r2/mi-archivo.txt)", { status: 400 });
    }

    // Usamos el nombre del binding que definiste en wrangler.jsonc
    // En tu archivo, el binding es "suite".
    const R2_BUCKET = env.suite;

    switch (request.method) {
      case 'GET': {
        const object = await R2_BUCKET.get(key);

        if (object === null) {
          return new Response(`Objeto con clave '${key}' no encontrado.`, { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        return new Response(object.body, { headers });
      }

      case 'POST': {
        await R2_BUCKET.put(key, request.body, {
            httpMetadata: request.headers,
        });
        return new Response(`Objeto '${key}' subido correctamente.`, { status: 200 });
      }

      case 'DELETE': {
        await R2_BUCKET.delete(key);
        return new Response(`Objeto '${key}' borrado correctamente.`, { status: 200 });
      }

      default:
        return new Response("Método no permitido. Usa GET, POST, o DELETE.", { status: 405 });
    }
  } catch (error) {
    console.error("Error en la lógica de R2:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}