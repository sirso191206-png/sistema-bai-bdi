/**
 * Sistema BAI / BDI-II — lógica de interfaz (SPA sin framework).
 */

let graficaActual = null;
let pacienteSeleccionadoId = null;

document.addEventListener('DOMContentLoaded', () => {
  configurarNavegacion();
  configurarBuscador();
  configurarMenuMovil();
  // El dashboard lo carga auth.js cuando hay sesión iniciada.
});

// ---------------------------------------------------------------
// Navegación entre secciones
// ---------------------------------------------------------------
function configurarNavegacion() {
  document.querySelectorAll('.nav-link[data-seccion]').forEach((enlace) => {
    enlace.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-seccion]').forEach((e) => e.classList.remove('activo'));
      enlace.classList.add('activo');

      document.querySelectorAll('.seccion').forEach((s) => s.classList.add('oculto'));
      document.getElementById(`seccion-${enlace.dataset.seccion}`).classList.remove('oculto');

      if (enlace.dataset.seccion === 'dashboard') cargarDashboard();
      if (enlace.dataset.seccion === 'buscar') document.getElementById('campo-busqueda').focus();

      document.getElementById('barra-lateral').classList.remove('abierta');
    });
  });
}

function configurarMenuMovil() {
  document.getElementById('boton-menu-movil')?.addEventListener('click', () => {
    document.getElementById('barra-lateral').classList.toggle('abierta');
  });
}

// ---------------------------------------------------------------
// DASHBOARD (pantalla principal)
// ---------------------------------------------------------------
async function cargarDashboard() {
  try {
    const [stats, alertas] = await Promise.all([
      API.estadisticas(),
      API.evaluaciones.alertasSeveras(30),
    ]);
    renderTarjetasStats(stats);
    renderAlertasSeveras(alertas);
  } catch (error) {
    mostrarErrorGlobal('No se pudieron cargar las estadísticas. Verifica que el backend esté activo. ' + error.message);
  }
}

function renderTarjetasStats(s) {
  const grupo1 = [
    { valor: s.evaluados_hoy, etiqueta: 'Evaluados hoy', color: 'verde' },
  ];
  const grupoAnsiedad = [
    { valor: textoPacientes(s.ansiedad_minima), etiqueta: 'Ansiedad mínima', color: 'verde' },
    { valor: textoPacientes(s.ansiedad_leve), etiqueta: 'Ansiedad leve', color: 'amarillo' },
    { valor: textoPacientes(s.ansiedad_moderada), etiqueta: 'Ansiedad moderada', color: 'naranja' },
    { valor: textoPacientes(s.ansiedad_severa), etiqueta: 'Ansiedad severa', color: 'rojo' },
  ];
  const grupoDepresion = [
    { valor: textoPacientes(s.depresion_minima), etiqueta: 'Depresión mínima', color: 'verde' },
    { valor: textoPacientes(s.depresion_leve), etiqueta: 'Depresión leve', color: 'amarillo' },
    { valor: textoPacientes(s.depresion_moderada), etiqueta: 'Depresión moderada', color: 'naranja' },
    { valor: textoPacientes(s.depresion_severa), etiqueta: 'Depresión severa', color: 'rojo' },
  ];

  document.getElementById('contenedor-stats-generales').innerHTML = grupo1.map(tarjetaStatHTML).join('');
  document.getElementById('contenedor-stats-ansiedad').innerHTML = grupoAnsiedad.map(tarjetaStatHTML).join('');
  document.getElementById('contenedor-stats-depresion').innerHTML = grupoDepresion.map(tarjetaStatHTML).join('');
}

function textoPacientes(n) {
  const num = n ?? 0;
  return `${num} <span class="unidad-pacientes">${num === 1 ? 'paciente' : 'pacientes'}</span>`;
}

function tarjetaStatHTML({ valor, etiqueta, color }) {
  return `
    <div class="col-6 col-md-3">
      <div class="tarjeta-stat borde-${color}">
        <div class="valor">${valor ?? 0}</div>
        <div class="etiqueta">${etiqueta}</div>
      </div>
    </div>`;
}

function renderAlertasSeveras(alertas) {
  const contenedor = document.getElementById('contenedor-alertas');
  if (!alertas || alertas.length === 0) {
    contenedor.innerHTML = '';
    return;
  }
  contenedor.innerHTML = `
    <div class="alerta-severa">
      <i class="bi bi-exclamation-triangle-fill mt-1"></i>
      <div>
        <strong>${alertas.length} paciente(s)</strong> con ansiedad o depresión severa en los últimos 30 días:
        <div class="mt-2 d-flex flex-wrap gap-2">
          ${alertas.slice(0, 8).map((a) => `
            <button class="btn btn-sm btn-outline-danger" onclick="abrirPaciente('${a.paciente_id}')">
              ${a.nombre_completo} — ${a.fecha}
            </button>`).join('')}
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------
// BUSCADOR
// ---------------------------------------------------------------
function configurarBuscador() {
  const campo = document.getElementById('campo-busqueda');
  let temporizador = null;
  campo.addEventListener('input', () => {
    clearTimeout(temporizador);
    const texto = campo.value.trim();
    if (texto.length < 2) {
      document.getElementById('resultados-busqueda').innerHTML = '';
      return;
    }
    temporizador = setTimeout(() => ejecutarBusqueda(texto), 300);
  });
}

async function ejecutarBusqueda(texto) {
  const contenedor = document.getElementById('resultados-busqueda');
  contenedor.innerHTML = '<p class="text-muted">Buscando…</p>';
  try {
    const resultados = await API.pacientes.buscar(texto);
    if (resultados.length === 0) {
      contenedor.innerHTML = '<p class="text-muted">No se encontraron pacientes.</p>';
      return;
    }
    contenedor.innerHTML = resultados.map((p) => `
      <div class="resultado-paciente" onclick="abrirPaciente('${p.id}')">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${p.nombre_completo}</div>
            <div class="text-muted small">${p.curp ? 'CURP: ' + p.curp : 'Registrado el ' + new Date(p.fecha_registro).toLocaleDateString('es-MX')}</div>
          </div>
          <i class="bi bi-chevron-right text-muted"></i>
        </div>
      </div>`).join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">Error al buscar: ${error.message}</p>`;
  }
}

// ---------------------------------------------------------------
// FICHA DE PACIENTE (información, historial, gráficas)
// ---------------------------------------------------------------
async function abrirPaciente(pacienteId) {
  pacienteSeleccionadoId = pacienteId;

  document.querySelectorAll('.nav-link[data-seccion]').forEach((e) => e.classList.remove('activo'));
  document.querySelectorAll('.seccion').forEach((s) => s.classList.add('oculto'));
  document.getElementById('seccion-paciente').classList.remove('oculto');

  try {
    const [paciente, historial] = await Promise.all([
      API.pacientes.obtener(pacienteId),
      API.evaluaciones.historial(pacienteId),
    ]);
    renderFichaPaciente(paciente);
    renderHistorial(historial);
    await renderGrafica(pacienteId, '30');
  } catch (error) {
    mostrarErrorGlobal('No se pudo cargar la ficha del paciente: ' + error.message);
  }
}

function renderFichaPaciente(p) {
  document.getElementById('info-paciente').innerHTML = `
    <h4 class="mb-1">${p.nombre_completo}</h4>
    <div class="text-muted mb-2">Paciente desde ${new Date(p.fecha_registro).toLocaleDateString('es-MX')}</div>
    ${p.curp ? `<div class="small"><strong>CURP:</strong> <code>${p.curp}</code></div>` : ''}`;

  document.getElementById('boton-exportar-pdf').onclick = async () => {
    const historial = await API.evaluaciones.historial(p.id);
    API.reportes.generarPdf(p, historial);
  };
  document.getElementById('boton-exportar-excel').onclick = async () => {
    const historial = await API.evaluaciones.historial(p.id);
    API.reportes.generarExcel(p, historial);
  };
  document.getElementById('boton-imprimir').onclick = () => window.print();
}

function renderHistorial(historial) {
  const cuerpo = document.getElementById('cuerpo-tabla-historial');
  if (!historial || historial.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Aún no hay evaluaciones registradas.</td></tr>';
    return;
  }
  cuerpo.innerHTML = historial.map((h) => `
    <tr class="fila-clickeable" onclick="verDetalleEvaluacion('${h.evaluacion_id}')">
      <td>${h.fecha}</td>
      <td>${h.puntaje_bai ?? '—'}</td>
      <td>${badgeNivel(h.nivel_ansiedad)}</td>
      <td>${h.puntaje_bdi ?? '—'}</td>
      <td>${badgeNivel(h.nivel_depresion)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-azul" onclick="event.stopPropagation(); verDetalleEvaluacion('${h.evaluacion_id}')">
          Ver resultados
        </button>
      </td>
    </tr>`).join('');
}

function badgeNivel(nivel) {
  if (!nivel) return '<span class="text-muted">—</span>';
  const clase = nivel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `<span class="badge-nivel ${clase}">${nivel}</span>`;
}

// ---------------------------------------------------------------
// GRÁFICAS DE EVOLUCIÓN (Chart.js)
// ---------------------------------------------------------------
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-rango]')) {
    document.querySelectorAll('[data-rango]').forEach((b) => b.classList.remove('active'));
    e.target.classList.add('active');
    renderGrafica(pacienteSeleccionadoId, e.target.dataset.rango);
  }
});

async function renderGrafica(pacienteId, rango) {
  const datos = await API.evaluaciones.grafica(pacienteId, rango);
  const ctx = document.getElementById('grafica-evolucion').getContext('2d');

  if (graficaActual) graficaActual.destroy();

  // Aviso didáctico cuando aún no hay suficientes evaluaciones para una línea
  const aviso = document.getElementById('aviso-grafica');
  if (aviso) {
    if (datos.length === 0) {
      aviso.innerHTML = '<i class="bi bi-info-circle"></i> Aún no hay evaluaciones en este rango. Prueba con «Todo».';
      aviso.classList.remove('oculto');
    } else if (datos.length === 1) {
      aviso.innerHTML = '<i class="bi bi-info-circle"></i> Hay una sola evaluación: se muestra como punto. La línea de evolución aparecerá a partir de la segunda.';
      aviso.classList.remove('oculto');
    } else {
      aviso.classList.add('oculto');
    }
  }

  graficaActual = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.map((d) => d.fecha),
      datasets: [
        {
          label: 'BAI (Ansiedad)',
          data: datos.map((d) => d.puntaje_bai),
          borderColor: '#1E5F8C',
          backgroundColor: 'rgba(30,95,140,0.08)',
          pointBackgroundColor: '#1E5F8C',
          pointRadius: 6,
          pointHoverRadius: 9,
          tension: 0.3,
          spanGaps: true,
          fill: true,
        },
        {
          label: 'BDI-II (Depresión)',
          data: datos.map((d) => d.puntaje_bdi),
          borderColor: '#6F42C1',
          backgroundColor: 'rgba(111,66,193,0.07)',
          pointBackgroundColor: '#6F42C1',
          pointRadius: 6,
          pointHoverRadius: 9,
          tension: 0.3,
          spanGaps: true,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v === null || v === undefined) return null;
              const nivel = ctx.datasetIndex === 0 ? clasificarAnsiedad(v) : clasificarDepresion(v);
              const escala = ctx.datasetIndex === 0 ? 'Ansiedad' : 'Depresión';
              return ` ${ctx.dataset.label}: ${v} pts — ${escala} ${nivel.toLowerCase()}`;
            },
          },
        },
      },
      scales: { y: { beginAtZero: true, max: 63, title: { display: true, text: 'Puntaje (0–63)' } } },
    },
  });
}

// ---------------------------------------------------------------
// DETALLE DE UNA EVALUACIÓN (modal)
// ---------------------------------------------------------------
async function verDetalleEvaluacion(evaluacionId) {
  const modalElemento = document.getElementById('modal-detalle');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);
  document.getElementById('cuerpo-modal-detalle').innerHTML = '<p class="text-muted">Cargando…</p>';
  modal.show();

  try {
    const detalle = await API.evaluaciones.detalle(evaluacionId);
    document.getElementById('titulo-modal-detalle').textContent =
      `${detalle.paciente.nombre_completo} — ${detalle.fecha}`;

    const columnasBAI = detalle.bai.respuestas.map((r) => `
      <tr><td>${r.numero}. ${r.pregunta}</td><td class="text-end fw-semibold">${r.valor ?? '—'}</td></tr>`).join('');
    const columnasBDI = detalle.bdi.respuestas.map((r) => `
      <tr><td>${r.numero}. ${r.pregunta}</td><td class="text-end fw-semibold">${r.valor ?? '—'}</td></tr>`).join('');

    document.getElementById('cuerpo-modal-detalle').innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <h6 class="d-flex justify-content-between">
            Inventario de Ansiedad (BAI)
            <span>${badgeNivel(detalle.bai.nivel_ansiedad)} <strong>${detalle.bai.puntaje_total ?? '—'} pts</strong></span>
          </h6>
          <table class="table table-sm">${columnasBAI}</table>
        </div>
        <div class="col-md-6">
          <h6 class="d-flex justify-content-between">
            Inventario de Depresión (BDI-II)
            <span>${badgeNivel(detalle.bdi.nivel_depresion)} <strong>${detalle.bdi.puntaje_total ?? '—'} pts</strong></span>
          </h6>
          <table class="table table-sm">${columnasBDI}</table>
        </div>
      </div>`;
  } catch (error) {
    document.getElementById('cuerpo-modal-detalle').innerHTML =
      `<p class="text-danger">Error al cargar el detalle: ${error.message}</p>`;
  }
}

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------
function mostrarErrorGlobal(mensaje) {
  const contenedor = document.getElementById('contenedor-alertas');
  contenedor.innerHTML = `
    <div class="alert alert-warning">
      <i class="bi bi-exclamation-circle me-1"></i> ${mensaje}
    </div>`;
}
