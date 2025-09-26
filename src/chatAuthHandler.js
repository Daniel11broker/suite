// src/chatAuthHandler.js

/**
 * Verifica si un usuario existe y está activo en la base de datos D1.
 */
export async function verifySupportUser(username, env) {
  if (!username) {
    return false;
  }

  try {
    // Busca en tu tabla de usuarios, que ahora sí tiene la columna 'status'.
    const stmt = env.suite_empresarial.prepare(
      "SELECT status FROM usuarios WHERE username = ? LIMIT 1"
    );
    const user = await stmt.bind(username).first();

    // El usuario es válido si existe y su estado es 'Activo'.
    if (user && user.status === 'Activo') {
      return true;
    }
  } catch (error) {
    console.error("Error al verificar usuario para el chat:", error);
  }

  return false;
}