const { getAdmin, requireUser, manejarError } = require('./_lib/supabase');

/**
 * GET /api/pacientes?id=<uuid>      -> un paciente
 * GET /api/pacientes?q=<texto>      -> búsqueda por nombre o CURP
 */
module.exports = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const admin = getAdmin();
    const { id, q } = req.query;

    if (id) {
      const { data, error } = await admin
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    const texto = (q || '').trim();
    if (texto.length < 2) return res.status(200).json([]);

    const { data, error } = await admin
      .from('pacientes')
      .select('*')
      .eq('activo', true)
      .or(`nombre_completo.ilike.%${texto}%,curp.ilike.%${texto}%`)
      .order('nombre_completo');
    if (error) throw error;

    res.status(200).json(data || []);
  } catch (e) {
    manejarError(res, e);
  }
};
