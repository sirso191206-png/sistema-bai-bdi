/**
 * Utilidades compartidas del backend (Vercel Serverless Functions).
 * - getAdmin(): cliente de Supabase con la service_role key (ignora RLS).
 *   La llave vive SOLO en variables de entorno de Vercel, nunca en el navegador.
 * - requireUser(req, res): valida el token de sesión que manda el frontend.
 *   Si no hay sesión válida, responde 401 y devuelve null.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminSingleton = null;

function getAdmin() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Faltan variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Vercel.');
  }
  if (!adminSingleton) {
    adminSingleton = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminSingleton;
}

async function requireUser(req, res) {
  const cabecera = req.headers['authorization'] || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Sesión requerida' });
    return null;
  }
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data || !data.user) {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
    return null;
  }
  return data.user;
}

function manejarError(res, error) {
  console.error(error);
  res.status(500).json({ error: error.message || 'Error interno' });
}

module.exports = { getAdmin, requireUser, manejarError };
