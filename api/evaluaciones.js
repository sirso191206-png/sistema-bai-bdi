const { getAdmin, requireUser, manejarError } = require('./_lib/supabase');

/**
 * GET /api/evaluaciones?historial=<paciente_id>
 * GET /api/evaluaciones?detalle=<evaluacion_id>
 * GET /api/evaluaciones?grafica=<paciente_id>&rango=7|30|90|todo
 * GET /api/evaluaciones?alertas=1&dias=30
 */
module.exports = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const admin = getAdmin();
    const { historial, detalle, grafica, alertas, rango, dias } = req.query;

    // ---------------- Historial ----------------
    if (historial) {
      const { data, error } = await admin
        .from('vista_evaluaciones_completas')
        .select('*')
        .eq('paciente_id', historial)
        .order('fecha', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // ---------------- Detalle ----------------
    if (detalle) {
      const { data: evaluacion, error: e1 } = await admin
        .from('evaluaciones')
        .select('*, pacientes(*)')
        .eq('id', detalle)
        .single();
      if (e1) throw e1;

      const { data: filaBai } = await admin
        .from('bai').select('*').eq('evaluacion_id', detalle).maybeSingle();
      const { data: filaBdi } = await admin
        .from('bdi').select('*').eq('evaluacion_id', detalle).maybeSingle();

      return res.status(200).json({
        evaluacion_id: detalle,
        fecha: evaluacion.fecha,
        hora: evaluacion.hora,
        paciente: evaluacion.pacientes,
        fila_bai: filaBai || null,
        fila_bdi: filaBdi || null,
      });
    }

    // ---------------- Gráfica ----------------
    if (grafica) {
      let consulta = admin
        .from('vista_evaluaciones_completas')
        .select('fecha,puntaje_bai,puntaje_bdi,nivel_ansiedad,nivel_depresion')
        .eq('paciente_id', grafica)
        .order('fecha', { ascending: true });

      const r = rango || '30';
      if (r !== 'todo') {
        const desde = new Date();
        desde.setDate(desde.getDate() - parseInt(r, 10));
        consulta = consulta.gte('fecha', desde.toISOString().slice(0, 10));
      }

      const { data, error } = await consulta;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // ---------------- Alertas severas ----------------
    if (alertas) {
      const d = parseInt(dias || '30', 10);
      const desde = new Date();
      desde.setDate(desde.getDate() - d);

      const { data, error } = await admin
        .from('vista_evaluaciones_completas')
        .select('*')
        .eq('alerta_severa', true)
        .gte('fecha', desde.toISOString().slice(0, 10))
        .order('fecha', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    res.status(400).json({ error: 'Parámetro no reconocido' });
  } catch (e) {
    manejarError(res, e);
  }
};
