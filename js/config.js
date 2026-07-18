/**
 * Configuración del cliente de Supabase — SOLO para autenticación.
 * Los datos ya no se consultan desde el navegador: viajan por /api,
 * donde el backend usa la service_role key guardada en Vercel.
 * La publishable key es segura de exponer.
 */
const SUPABASE_URL = 'https://ltgjomzodwsarmqwchsw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Xtk2n11Qg-uuyghYnpDBaQ_5wEnpmbh';

const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
