/**
 * Catálogo de preguntas y reglas de clasificación BAI / BDI-II.
 * La base de datos ya calcula puntaje_total y nivel_* automáticamente
 * (columnas generadas), este archivo solo sirve para mostrar las
 * etiquetas de cada pregunta en el detalle de una evaluación.
 */
const PREGUNTAS_BAI = [
  'Entumecimiento u hormigueo',
  'Sensación de calor (bochorno)',
  'Debilidad en las piernas',
  'Dificultad para relajarse',
  'Miedo a que ocurra lo peor',
  'Sensación de mareo o presión en el pecho',
  'Inseguridad',
  'Terror',
  'Nerviosismo',
  'Sensación de ahogo',
  'Manos temblorosas',
  'Cuerpo tembloroso',
  'Miedo a perder el control',
  'Dificultad para respirar',
  'Miedo a morir',
  'Sentirse atemorizado',
  'Problemas digestivos',
  'Sensación de desmayo',
  'Rubor facial',
  'Sudor frío/caliente',
  'Palpitaciones o taquicardia',
];

const PREGUNTAS_BDI = [
  'Tristeza', 'Pesimismo', 'Fracaso', 'Pérdida de placer',
  'Sentimientos de culpa', 'Sentimientos de castigo', 'Disconformidad con uno mismo',
  'Autocrítica', 'Pensamientos o deseos suicidas', 'Llanto',
  'Agitación', 'Pérdida de interés', 'Indecisión', 'Desvalorización',
  'Pérdida de energía', 'Cambios en los hábitos de sueño', 'Irritabilidad',
  'Cambios en el apetito', 'Dificultad de concentración', 'Cansancio o fatiga',
  'Pérdida de interés en el sexo',
];

function clasificarAnsiedad(puntaje) {
  if (puntaje <= 5) return 'Mínima';
  if (puntaje <= 15) return 'Leve';
  if (puntaje <= 30) return 'Moderada';
  return 'Severa';
}

function clasificarDepresion(puntaje) {
  if (puntaje <= 9) return 'Mínima';
  if (puntaje <= 16) return 'Leve';
  if (puntaje <= 29) return 'Moderada';
  return 'Severa';
}
