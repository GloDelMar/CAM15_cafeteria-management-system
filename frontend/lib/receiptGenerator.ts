import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Transaction {
  id: number;
  fecha: string;
  cliente: string;
  grupo: string;
  productos: Product[];
  total: number;
  pago: number;
  cambio: number;
  pagado: string;
}

export function generateReceipt(transaction: Transaction) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // Formato ticket (80mm ancho, altura variable)
  });

  let yPos = 10;

  // Logo
  try {
    const logo = '/cam15_logo.png';
    doc.addImage(logo, 'PNG', 30, yPos, 20, 20);
    yPos += 22;
  } catch (e) {
    console.log('Logo no disponible');
  }

  // Encabezado
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Centro de Atención Múltiple No.15', 40, yPos, { align: 'center' });
  yPos += 4;
  doc.setFontSize(9);
  doc.text('Taller de Formación Laboral', 40, yPos, { align: 'center' });
  yPos += 5;
  doc.setFontSize(12);
  doc.text('La Tiendita', 40, yPos, { align: 'center' });
  
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Recibo de Venta', 40, yPos, { align: 'center' });
  
  yPos += 5;
  doc.text('================================', 40, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(7);
  
  // Información de la transacción
  const fecha = new Date(transaction.fecha);
  doc.text(`Ticket: #${transaction.id}`, 5, yPos);
  yPos += 4;
  doc.text(`Fecha: ${fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 5, yPos);
  yPos += 4;
  doc.text(`Hora: ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, 5, yPos);
  yPos += 4;
  
  if (transaction.cliente && transaction.cliente !== 'Cliente general') {
    doc.text(`Cliente: ${transaction.cliente}`, 5, yPos);
    yPos += 4;
    if (transaction.grupo) {
      doc.text(`Grupo: ${transaction.grupo}`, 5, yPos);
      yPos += 4;
    }
  }
  
  yPos += 2;
  doc.text('================================', 40, yPos, { align: 'center' });
  yPos += 5;

  // Productos
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTOS', 40, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');

  transaction.productos.forEach((producto) => {
    // Nombre del producto
    doc.text(producto.nombre, 5, yPos);
    yPos += 4;
    
    // Cantidad y precio
    const linea = `  ${producto.cantidad} x $${producto.precio_unitario.toFixed(2)} = $${producto.subtotal.toFixed(2)}`;
    doc.text(linea, 5, yPos);
    yPos += 5;
  });

  yPos += 2;
  doc.text('================================', 40, yPos, { align: 'center' });
  yPos += 5;

  // Totales
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: $${transaction.total.toFixed(2)}`, 75, yPos, { align: 'right' });
  yPos += 5;

  if (transaction.pagado === 'SI') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Pago: $${transaction.pago.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 4;
    doc.text(`Cambio: $${transaction.cambio.toFixed(2)}`, 75, yPos, { align: 'right' });
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('PAGADO', 40, yPos, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('CRÉDITO - PENDIENTE DE PAGO', 40, yPos, { align: 'center' });
  }

  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Gracias por su compra', 40, yPos, { align: 'center' });
  
  return doc;
}

export function downloadReceipt(transaction: Transaction) {
  const doc = generateReceipt(transaction);
  doc.save(`recibo_${transaction.id}_${transaction.cliente.replace(/\s+/g, '_')}.pdf`);
}

export function printReceipt(transaction: Transaction) {
  const doc = generateReceipt(transaction);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

// Generar recibo consolidado para un maestro
export function generateConsolidatedReceipt(
  maestro: string,
  grupo: string,
  transactions: Transaction[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  let yPos = 20;

  // Logo
  try {
    const logo = '/cam15_logo.png';
    doc.addImage(logo, 'PNG', 15, yPos, 30, 30);
  } catch (e) {
    console.log('Logo no disponible');
  }

  // Encabezado
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Centro de Atención Múltiple No.15', 105, yPos + 5, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Taller de Formación Laboral', 105, yPos + 12, { align: 'center' });
  doc.setFontSize(18);
  doc.text('La Tiendita', 105, yPos + 20, { align: 'center' });
  
  yPos += 35;
  doc.setFontSize(12);
  doc.text('Recibo Consolidado', 105, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Maestro: ${maestro}`, 20, yPos);
  yPos += 6;
  doc.text(`Grupo: ${grupo}`, 20, yPos);
  yPos += 6;
  const fecha = new Date();
  doc.text(`Fecha de emisión: ${fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, 20, yPos);
  yPos += 10;

  // Tabla de transacciones
  const tableData = transactions.map((t) => {
    const fecha = new Date(t.fecha);
    const productosDesc = t.productos.map(p => `${p.nombre} (${p.cantidad})`).join(', ');
    return [
      `#${t.id}`,
      fecha.toLocaleDateString('es-MX'),
      productosDesc,
      `$${t.total.toFixed(2)}`,
      t.pagado === 'SI' ? '✓ Pagado' : '✗ Pendiente',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Ticket', 'Fecha', 'Productos', 'Total', 'Estado']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 80 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
    },
  });

  // Total general
  const totalGeneral = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalPagado = transactions
    .filter((t) => t.pagado === 'SI')
    .reduce((sum, t) => sum + t.total, 0);
  const totalPendiente = totalGeneral - totalPagado;

  yPos = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de transacciones: ${transactions.length}`, 20, yPos);
  yPos += 7;
  doc.text(`Total general: $${totalGeneral.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.setTextColor(0, 150, 0);
  doc.text(`Total pagado: $${totalPagado.toFixed(2)}`, 20, yPos);
  yPos += 7;
  
  if (totalPendiente > 0) {
    doc.setTextColor(255, 0, 0);
    doc.text(`Total pendiente: $${totalPendiente.toFixed(2)}`, 20, yPos);
  }

  doc.setTextColor(0, 0, 0);

  return doc;
}

export function downloadConsolidatedReceipt(
  maestro: string,
  grupo: string,
  transactions: Transaction[]
) {
  const doc = generateConsolidatedReceipt(maestro, grupo, transactions);
  doc.save(`recibo_consolidado_${maestro.replace(/\s+/g, '_')}.pdf`);
}

export function printConsolidatedReceipt(
  maestro: string,
  grupo: string,
  transactions: Transaction[]
) {
  const doc = generateConsolidatedReceipt(maestro, grupo, transactions);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
