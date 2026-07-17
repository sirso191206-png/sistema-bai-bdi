/**
 * Generación de reportes en el navegador — reemplaza al backend.
 * Usa jsPDF + jspdf-autotable para PDF, y SheetJS (xlsx) para Excel.
 */

function generarReportePDF(paciente, historial) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setTextColor(30, 95, 140); // #1E5F8C
  doc.setFontSize(16);
  doc.text('Reporte Clínico — BAI / BDI-II', 14, 18);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(`Paciente: ${paciente.nombre_completo}`, 14, 28);
  doc.text(`Generado el: ${new Date().toLocaleString('es-MX')}`, 14, 34);

  const filas = historial.map((h) => [
    h.fecha,
    h.puntaje_bai ?? '—',
    h.nivel_ansiedad || '—',
    h.puntaje_bdi ?? '—',
    h.nivel_depresion || '—',
  ]);

  doc.autoTable({
    startY: 48,
    head: [['Fecha', 'BAI', 'Nivel ansiedad', 'BDI', 'Nivel depresión']],
    body: filas,
    headStyles: { fillColor: [30, 95, 140] },
    alternateRowStyles: { fillColor: [242, 246, 249] },
    styles: { halign: 'center' },
    columnStyles: { 0: { halign: 'left' } },
  });

  doc.save(`reporte_${paciente.nombre_completo.replace(/\s+/g, '_')}.pdf`);
}

function generarReporteExcel(paciente, historial) {
  const encabezado = ['Fecha', 'BAI', 'Nivel ansiedad', 'BDI', 'Nivel depresión'];
  const filas = historial.map((h) => [
    h.fecha,
    h.puntaje_bai ?? null,
    h.nivel_ansiedad || '',
    h.puntaje_bdi ?? null,
    h.nivel_depresion || '',
  ]);

  const hoja = XLSX.utils.aoa_to_sheet([
    [`Historial clínico — ${paciente.nombre_completo}`],
    [],
    encabezado,
    ...filas,
  ]);
  hoja['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 8 }, { wch: 16 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Historial');
  XLSX.writeFile(libro, `historial_${paciente.nombre_completo.replace(/\s+/g, '_')}.xlsx`);
}
