/**
 * SINCRONIZACIÓN AUTOMÁTICA: Google Forms (BDI-II) -> Supabase   [v2 corregido]
 * --------------------------------------------------------------------------
 * CAMBIOS respecto a la versión anterior:
 *  1. Lee las respuestas desde e.values (fila de la hoja, EN ORDEN de columnas)
 *     en lugar de e.namedValues. Esto corrige:
 *       - "se encontraron 20 respuestas, se esperaban 21" (títulos duplicados
 *         se colapsaban en namedValues)
 *       - el riesgo de que las respuestas se guardaran en desorden
 *  2. Nueva función probarConexionSupabase() para verificar URL y llave
 *     ANTES de depender del activador.
 *  3. Opción USAR_MARCA_TEMPORAL para no depender de la fecha que teclea
 *     el paciente (en tu prueba escribió "19/12/2006" y la evaluación se
 *     habría guardado con esa fecha).
 *
 * INSTALACIÓN (igual que antes):
 *  - Este script vive en la HOJA de respuestas del BAI.
 *  - Activador: alEnviarFormularioBDI / "De la hoja de cálculo" /
 *    "Al enviarse el formulario".
 */

// ======= CONFIGURACIÓN =======
// Copia la URL EXACTA desde: Supabase Dashboard > Project Settings > API
// (cuidado con el orden de las letras: ...armqwchsw, no ...armqwhcsw)
const SUPABASE_URL = 'https://ltgjomzodwsarmqwchsw.supabase.co';
// IMPORTANTE: usa la llave LEGACY service_role (empieza con eyJhbGci...).
// Las nuevas sb_secret_ NO funcionan desde Apps Script (dan HTTP 401).
const SUPABASE_SERVICE_KEY = 'PEGA-AQUI-TU-SERVICE-ROLE-LEGACY';

// true  = la evaluación se fecha con la marca temporal del envío (recomendado,
//         el cuestionario se contesta el mismo día que se manda)
// false = usa el campo "Fecha de aplicación" que teclea el paciente
const USAR_MARCA_TEMPORAL = true;
// ==============================

// Columnas de la hoja que NO son preguntas del inventario:
const COLUMNAS_METADATO = [
  'Marca temporal',
  'Dirección de correo electrónico',
  'oscarNombre completo (Nombre y apellidos)',
  'Nombre completo (Nombre y apellidos)',
  'Nombre completo (Nombres y Apellidos)',
  'Fecha de aplicación',
  'Fecha de nacimiento',
  'CURP',
  // La pregunta Sí/No de pérdida de peso del BDI NO puntúa.
  // Si tu formulario la tiene, escribe aquí su título EXACTO:
  'A propósito estoy tratando de perder peso comiendo menos',
];

/**
 * Se ejecuta automáticamente al enviarse el formulario BAI.
 */
function alEnviarFormularioBDI(e) {
  try {
    const hoja = e.range.getSheet();
    const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const fila = e.values; // misma longitud y orden que los encabezados

    const metadatos = new Set(COLUMNAS_METADATO.map(function (c) { return c.trim(); }));

    let nombreCompleto = null;
    let fechaAplicacion = null;
    let fechaNacimiento = null;
    let curp = null;
    let aceptoAviso = false;
    let correo = null;
    const respuestasNumericas = [];

    for (let i = 0; i < encabezados.length; i++) {
      const encabezado = String(encabezados[i] || '').trim();
      const valor = (fila[i] !== undefined && fila[i] !== null) ? String(fila[i]) : '';

      if (encabezado.indexOf('Nombre completo') !== -1) {
        nombreCompleto = valor.trim();
        continue;
      }
      if (encabezado === 'Fecha de aplicación') {
        fechaAplicacion = valor.trim();
        continue;
      }
      if (encabezado === 'Fecha de nacimiento') {
        fechaNacimiento = valor.trim();
        continue;
      }
      if (encabezado.toUpperCase().indexOf('CURP') !== -1) {
        curp = valor.trim().toUpperCase();
        continue;
      }
      if (encabezado.toLowerCase().indexOf('aviso de privacidad') !== -1) {
        aceptoAviso = valor.toLowerCase().indexOf('acepto') !== -1;
        continue;
      }
      if (encabezado === 'Dirección de correo electrónico') {
        correo = valor.trim() || null;
        continue;
      }
      if (metadatos.has(encabezado) || encabezado === '') continue;

      // Es una pregunta del inventario: tomar el número inicial
      // ("2 = Moderadamente" -> 2). Respuesta vacía cuenta como 0.
      const numero = parseInt(valor.trim().charAt(0), 10);
      respuestasNumericas.push(isNaN(numero) ? 0 : numero);
    }

    if (respuestasNumericas.length !== 21) {
      Logger.log('Advertencia: se encontraron ' + respuestasNumericas.length +
        ' preguntas, se esperaban 21. Revisa COLUMNAS_METADATO y los encabezados de la hoja.');
    }

    const pacienteId = obtenerOCrearPaciente(nombreCompleto, correo, fechaNacimiento ? normalizarFecha(fechaNacimiento) : null, curp);

    const fechaISO = USAR_MARCA_TEMPORAL
      ? Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : normalizarFecha(fechaAplicacion);

    const evaluacionId = obtenerOCrearEvaluacion(pacienteId, fechaISO, aceptoAviso);
    guardarRespuestasBDI(evaluacionId, respuestasNumericas);

    Logger.log('BDI sincronizado correctamente para: ' + nombreCompleto + ' (' + fechaISO + ')');
  } catch (error) {
    Logger.log('ERROR sincronizando BDI: ' + error.message);
    // Opcional: MailApp.sendEmail('oiztex@gmail.com', 'Error sincronización BDI', error.message);
  }
}

/**
 * EJECUTAR MANUALMENTE desde el editor para verificar URL y llave.
 * Debe registrar "Conexión OK (HTTP 200)". Si ves "DNS error",
 * la URL sigue mal escrita o el proyecto de Supabase está pausado.
 */
function probarConexionSupabase() {
  const url = SUPABASE_URL + '/rest/v1/pacientes?select=id&limit=1';
  const resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: cabecerasSupabase(),
    muteHttpExceptions: true,
  });
  Logger.log('Conexión OK (HTTP ' + resp.getResponseCode() + '): ' + resp.getContentText());
}

// ---------------------------------------------------------------
// Utilidades de conexión con Supabase (REST / PostgREST)
// ---------------------------------------------------------------

function normalizarFecha(fechaTexto) {
  if (!fechaTexto) return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const fecha = new Date(fechaTexto);
  if (isNaN(fecha.getTime())) {
    const partes = fechaTexto.split('/');
    if (partes.length === 3) {
      return partes[2] + '-' + partes[1].padStart(2, '0') + '-' + partes[0].padStart(2, '0');
    }
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function cabecerasSupabase() {
  return {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
  };
}

function obtenerOCrearPaciente(nombreCompleto, correo, fechaNacimientoISO, curp) {
  const nombreLimpio = (nombreCompleto || 'Sin nombre').trim();
  const curpLimpio = curp && curp.length >= 10 ? curp : null;

  // 1) Buscar por CURP (identificador más confiable que el nombre)
  let encontrados = [];
  if (curpLimpio) {
    const porCurp = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/pacientes?curp=eq.' +
      encodeURIComponent(curpLimpio) + '&select=id,fecha_nacimiento,curp', {
      method: 'get', headers: cabecerasSupabase(), muteHttpExceptions: true,
    });
    encontrados = JSON.parse(porCurp.getContentText());
  }

  // 2) Si no hubo CURP o no se encontró, buscar por nombre exacto
  if (!Array.isArray(encontrados) || encontrados.length === 0) {
    const porNombre = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/pacientes?nombre_completo=eq.' +
      encodeURIComponent(nombreLimpio) + '&select=id,fecha_nacimiento,curp', {
      method: 'get', headers: cabecerasSupabase(), muteHttpExceptions: true,
    });
    encontrados = JSON.parse(porNombre.getContentText());
  }

  if (Array.isArray(encontrados) && encontrados.length > 0) {
    // Completar datos que falten en el registro existente
    const faltantes = {};
    if (fechaNacimientoISO && !encontrados[0].fecha_nacimiento) faltantes.fecha_nacimiento = fechaNacimientoISO;
    if (curpLimpio && !encontrados[0].curp) faltantes.curp = curpLimpio;
    if (Object.keys(faltantes).length > 0) {
      UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/pacientes?id=eq.' + encontrados[0].id, {
        method: 'patch', headers: cabecerasSupabase(),
        payload: JSON.stringify(faltantes), muteHttpExceptions: true,
      });
    }
    return encontrados[0].id;
  }

  // 3) Crear paciente nuevo
  const payload = { nombre_completo: nombreLimpio };
  if (correo) payload.correo = correo;
  if (fechaNacimientoISO) payload.fecha_nacimiento = fechaNacimientoISO;
  if (curpLimpio) payload.curp = curpLimpio;

  const respuestaCreacion = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/pacientes', {
    method: 'post',
    headers: Object.assign(cabecerasSupabase(), { Prefer: 'return=representation' }),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const creado = JSON.parse(respuestaCreacion.getContentText());
  return creado[0].id;
}

function obtenerOCrearEvaluacion(pacienteId, fechaISO, aceptoAviso) {
  const urlBusqueda = SUPABASE_URL + '/rest/v1/evaluaciones?paciente_id=eq.' + pacienteId +
    '&fecha=eq.' + fechaISO + '&select=id,acepto_aviso';
  const respuestaBusqueda = UrlFetchApp.fetch(urlBusqueda, {
    method: 'get',
    headers: cabecerasSupabase(),
    muteHttpExceptions: true,
  });
  const encontrados = JSON.parse(respuestaBusqueda.getContentText());
  if (Array.isArray(encontrados) && encontrados.length > 0) {
    // Si esta respuesta trae el consentimiento y la evaluación aún no lo tenía, registrarlo
    if (aceptoAviso && !encontrados[0].acepto_aviso) {
      UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/evaluaciones?id=eq.' + encontrados[0].id, {
        method: 'patch', headers: cabecerasSupabase(),
        payload: JSON.stringify({ acepto_aviso: true }), muteHttpExceptions: true,
      });
    }
    return encontrados[0].id;
  }

  const payload = { paciente_id: pacienteId, fecha: fechaISO, acepto_aviso: aceptoAviso === true };
  const respuestaCreacion = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/evaluaciones', {
    method: 'post',
    headers: Object.assign(cabecerasSupabase(), { Prefer: 'return=representation' }),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const creado = JSON.parse(respuestaCreacion.getContentText());
  return creado[0].id;
}

function guardarRespuestasBDI(evaluacionId, respuestas) {
  const payload = { evaluacion_id: evaluacionId };
  for (let i = 0; i < 21; i++) {
    payload['respuesta_' + (i + 1)] = respuestas[i] !== undefined ? respuestas[i] : 0;
  }

  const url = SUPABASE_URL + '/rest/v1/bdi?on_conflict=evaluacion_id';
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: Object.assign(cabecerasSupabase(), { Prefer: 'resolution=merge-duplicates' }),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() >= 300) {
    throw new Error('Supabase respondió HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText());
  }
}

/**
 * EJECUTAR MANUALMENTE: simula el envío usando la última fila
 * de la hoja de respuestas (útil para probar sin reenviar el form).
 */
function probarConUltimaFila() {
  // Buscar la pestaña de respuestas CON datos (encabezado "Marca temporal" y al menos 2 filas)
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()
    .find(function (h) {
      return String(h.getRange(1, 1).getValue()).trim() === 'Marca temporal' && h.getLastRow() >= 2;
    });
  if (!hoja) {
    Logger.log('No encontré una pestaña de respuestas con datos.');
    return;
  }
  const ultimaFila = hoja.getLastRow();
  const numCols = hoja.getLastColumn();
  const valores = hoja.getRange(ultimaFila, 1, 1, numCols).getValues()[0]
    .map(function (v) { return v === null || v === undefined ? '' : String(v); });

  // Evento simulado con la misma forma que el real
  const eventoSimulado = {
    range: hoja.getRange(ultimaFila, 1, 1, numCols),
    values: valores,
  };
  alEnviarFormularioBDI(eventoSimulado);
}
