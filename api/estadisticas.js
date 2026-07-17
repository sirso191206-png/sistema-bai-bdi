const { getAdmin, requireUser, manejarError } = require('./_lib/supabase');

module.exports = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { data, error } = await getAdmin()
      .from('vista_estadisticas_globales')
      .select('*')
      .single();
    if (error) throw error;

    res.status(200).json(data);
  } catch (e) {
    manejarError(res, e);
  }
};
