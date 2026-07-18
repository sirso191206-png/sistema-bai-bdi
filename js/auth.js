/**
 * Autenticación del panel (Supabase Auth).
 * - Muestra la pantalla de login si no hay sesión.
 * - Expone fetchAPI(ruta) que agrega el token a cada llamada al backend.
 * - El acceso es exclusivo del psicólogo: los usuarios se crean manualmente
 *   en Supabase > Authentication > Users (no hay registro público).
 */

const Auth = (() => {
  let sesionActual = null;

  async function iniciar() {
    const { data } = await clienteSupabase.auth.getSession();
    sesionActual = data.session;

    clienteSupabase.auth.onAuthStateChange((_evento, sesion) => {
      sesionActual = sesion;
      if (!sesion) mostrarLogin();
    });

    if (sesionActual) {
      mostrarApp();
    } else {
      mostrarLogin();
    }

    document.getElementById('form-login').addEventListener('submit', alEnviarLogin);
    document.getElementById('boton-cerrar-sesion').addEventListener('click', cerrarSesion);
  }

  async function alEnviarLogin(evento) {
    evento.preventDefault();
    const correo = document.getElementById('login-correo').value.trim();
    const contrasena = document.getElementById('login-contrasena').value;
    const errorEl = document.getElementById('login-error');
    const boton = document.getElementById('boton-entrar');

    errorEl.classList.add('oculto');
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando…';

    const { error } = await clienteSupabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    boton.disabled = false;
    boton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Entrar';

    if (error) {
      errorEl.textContent = error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : 'No se pudo iniciar sesión: ' + error.message;
      errorEl.classList.remove('oculto');
      return;
    }
    mostrarApp();
  }

  async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    mostrarLogin();
  }

  function mostrarLogin() {
    document.getElementById('pantalla-login').classList.remove('oculto');
    document.getElementById('barra-lateral').classList.add('oculto');
    document.querySelector('.contenido-principal').classList.add('oculto');
  }

  function mostrarApp() {
    document.getElementById('pantalla-login').classList.add('oculto');
    document.getElementById('barra-lateral').classList.remove('oculto');
    document.querySelector('.contenido-principal').classList.remove('oculto');
    // Cargar el dashboard hasta tener sesión (app.js define cargarDashboard)
    if (typeof cargarDashboard === 'function') cargarDashboard();
  }

  /** fetch al backend con el token de sesión. Si expira, regresa al login. */
  async function fetchAPI(ruta) {
    const { data } = await clienteSupabase.auth.getSession();
    const token = data.session ? data.session.access_token : null;
    if (!token) {
      mostrarLogin();
      throw new Error('Sesión expirada. Inicia sesión de nuevo.');
    }

    const respuesta = await fetch(ruta, {
      headers: { Authorization: 'Bearer ' + token },
    });

    if (respuesta.status === 401) {
      mostrarLogin();
      throw new Error('Sesión expirada. Inicia sesión de nuevo.');
    }
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      throw new Error(cuerpo.error || `Error ${respuesta.status}`);
    }
    return respuesta.json();
  }

  return { iniciar, fetchAPI };
})();

document.addEventListener('DOMContentLoaded', () => Auth.iniciar());
