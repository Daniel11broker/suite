/**
 * src/authLogin.js
 * Este archivo contiene toda la lógica para manejar la autenticación.
 */
export async function handleAuth(request, env) {
  try {
    const { username, password } = await request.json();

    // Busca al usuario en la base de datos D1
    const stmt = env.suite_empresarial.prepare(
      "SELECT id, username, role, password, adminId FROM usuarios WHERE username = ?"
    ).bind(username);
    const user = await stmt.first();

    // Verifica la contraseña
    if (user && user.password === password) {
      const userToReturn = {
        id: user.id,
        username: user.username,
        role: user.role,
        adminId: user.adminId
      };
      // Si es correcto, devuelve los datos del usuario
      return new Response(JSON.stringify({ user: userToReturn }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Si no es correcto, devuelve un error
      return new Response(JSON.stringify({ message: "Credenciales incorrectas" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    // Si algo más falla, devuelve un error de servidor
    console.error("Error en la lógica de autenticación:", error);
    return new Response(JSON.stringify({ message: "Error interno del servidor" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}