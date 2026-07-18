/**
 * Capa de acceso a datos — ahora habla con el BACKEND (/api de Vercel),
 * nunca directo con las tablas de Supabase. Cada llamada viaja con el
 * token de sesión del psicólogo (ver auth.js). Mantiene la misma
 * interfaz que usaba app.js para no reescribir la UI.
 */
const API = (() => {

  const armar = (fila, etiquetas) => {
    if (!fila) return [];
    return etiquetas.map((pregunta, i) => ({
      pregunta,
      numero: i + 1,
      valor: fila[`respuesta_${i + 1}`],
    }));
  };

  return {
    async estadisticas() {
      return Auth.fetchAPI('/api/estadisticas');
    },

    pacientes: {
      async buscar(q) {
        return Auth.fetchAPI('/api/pacientes?q=' + encodeURIComponent(q));
      },
      async obtener(id) {
        return Auth.fetchAPI('/api/pacientes?id=' + encodeURIComponent(id));
      },
    },

    evaluaciones: {
      async historial(pacienteId) {
        return Auth.fetchAPI('/api/evaluaciones?historial=' + encodeURIComponent(pacienteId));
      },

      async detalle(evaluacionId) {
        const r = await Auth.fetchAPI('/api/evaluaciones?detalle=' + encodeURIComponent(evaluacionId));
        return {
          evaluacion_id: r.evaluacion_id,
          fecha: r.fecha,
          hora: r.hora,
          paciente: r.paciente,
          bai: {
            respuestas: armar(r.fila_bai, PREGUNTAS_BAI),
            puntaje_total: r.fila_bai ? r.fila_bai.puntaje_total : null,
            nivel_ansiedad: r.fila_bai ? r.fila_bai.nivel_ansiedad : null,
          },
          bdi: {
            respuestas: armar(r.fila_bdi, PREGUNTAS_BDI),
            puntaje_total: r.fila_bdi ? r.fila_bdi.puntaje_total : null,
            nivel_depresion: r.fila_bdi ? r.fila_bdi.nivel_depresion : null,
          },
        };
      },

      async alertasSeveras(dias = 30) {
        return Auth.fetchAPI('/api/evaluaciones?alertas=1&dias=' + dias);
      },

      async grafica(pacienteId, rango = '30') {
        return Auth.fetchAPI('/api/evaluaciones?grafica=' + encodeURIComponent(pacienteId) + '&rango=' + rango);
      },
    },

    reportes: {
      generarPdf: (paciente, historial) => generarReportePDF(paciente, historial),
      generarExcel: (paciente, historial) => generarReporteExcel(paciente, historial),
    },
  };
})();
