'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { transactionsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { downloadConsolidatedReceipt, printConsolidatedReceipt, downloadReceipt, printReceipt } from '@/lib/receiptGenerator';
import { useCaja } from '@/contexts/CajaContext';

const maestrosConCredito = [
  { nombre: 'Maestra Daniela', grupo: '3° de secundaria' },
  { nombre: 'Maestro Omar', grupo: '1° de secundaria' },
  { nombre: 'Maestro Jorge', grupo: '3° de primaria' },
  { nombre: 'Maestro Ramón', grupo: '4° de primaria' },
  { nombre: 'Maestro Juan Ramón', grupo: '6° de primaria' },
  { nombre: 'Maestra Daniela C.', grupo: '2° de primaria' },
  { nombre: 'Maestra Blanca', grupo: '1° de primaria' },
  { nombre: 'Maestra Rocío', grupo: 'Preescolar' },
  { nombre: 'Maestra Gloriela', grupo: 'Taller Laboral' },
];

export default function RecibosPage() {
  const router = useRouter();
  const { selectedCaja } = useCaja();
  const [viewMode, setViewMode] = useState<'maestros' | 'todas'>('maestros');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSummary, setTeacherSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!selectedCaja) {
      router.push('/');
      return;
    }
  }, [selectedCaja]);

  useEffect(() => {
    if (viewMode === 'todas') {
      loadAllTransactions();
    }
  }, [viewMode, selectedCaja]);

  async function loadAllTransactions() {
    if (!selectedCaja) return;

    setLoading(true);
    try {
      const filters: any = { caja_id: selectedCaja.id, limit: 100 };
      if (showOnlyUnpaid) {
        filters.pagado = 'NO';
      }
      const transactionsList = await transactionsApi.getAll(filters);
      setTransactions(transactionsList);
      setSelectedTransactions(new Set());
    } catch (error) {
      console.error('Error loading all transactions:', error);
      alert('Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  }

  async function loadTeacherData() {
    if (!selectedTeacher || !selectedCaja) return;

    setLoading(true);
    try {
      const [summary, transactionsList] = await Promise.all([
        transactionsApi.getTeacherSummary(selectedTeacher, selectedCaja.id),
        transactionsApi.getByTeacher(selectedTeacher, { only_unpaid: showOnlyUnpaid, caja_id: selectedCaja.id }),
      ]);

      setTeacherSummary(summary);
      setTransactions(transactionsList);
      setSelectedTransactions(new Set()); // Reset selection when loading new data
    } catch (error) {
      console.error('Error loading teacher data:', error);
      alert('Error al cargar datos del maestro');
    } finally {
      setLoading(false);
    }
  }

  function toggleTransactionSelection(transactionId: number) {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId);
    } else {
      newSelection.add(transactionId);
    }
    setSelectedTransactions(newSelection);
  }

  function toggleSelectAll() {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  }

  function handleGenerateConsolidatedReceipt(print: boolean) {
    if (!teacherSummary) return;

    // Filter only selected transactions
    const selectedTxs = transactions.filter(t => selectedTransactions.has(t.id));
    
    if (selectedTxs.length === 0) {
      alert('Por favor, selecciona al menos un ticket para generar el recibo consolidado');
      return;
    }

    const receiptTransactions = selectedTxs.map((t) => ({
      id: t.id,
      fecha: t.fecha,
      cliente: t.cliente,
      grupo: t.grupo,
      productos: t.productos,
      total: t.total,
      pago: t.pago,
      cambio: t.cambio,
      pagado: t.pagado,
    }));

    if (print) {
      printConsolidatedReceipt(teacherSummary.teacher_name, teacherSummary.grupo, receiptTransactions);
    } else {
      downloadConsolidatedReceipt(teacherSummary.teacher_name, teacherSummary.grupo, receiptTransactions);
    }
  }

  function handleGenerateIndividualReceipt(transaction: any, print: boolean) {
    const receiptData = {
      id: transaction.id,
      fecha: transaction.fecha,
      cliente: transaction.cliente,
      grupo: transaction.grupo,
      productos: transaction.productos,
      total: transaction.total,
      pago: transaction.pago,
      cambio: transaction.cambio,
      pagado: transaction.pagado,
    };

    if (print) {
      printReceipt(receiptData);
    } else {
      downloadReceipt(receiptData);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">📄 Gestión de Recibos</h1>

      {/* Selector de modo de visualización */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Tipo de Consulta</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              setViewMode('maestros');
              setTransactions([]);
              setTeacherSummary(null);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              viewMode === 'maestros'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👨‍🏫 Por Maestro
          </button>
          <button
            onClick={() => {
              setViewMode('todas');
              setSelectedTeacher('');
              setTeacherSummary(null);
              loadAllTransactions();
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              viewMode === 'todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Todas las Transacciones
          </button>
        </div>

        {viewMode === 'maestros' && (
          <>
            <h3 className="text-lg font-semibold mb-3">Seleccionar Maestro</h3>
            <div className="flex gap-4">
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar maestro...</option>
                {maestrosConCredito.map((maestro, idx) => (
                  <option key={idx} value={maestro.nombre}>
                    {maestro.nombre} - {maestro.grupo}
                  </option>
                ))}
              </select>
              <button
                onClick={loadTeacherData}
                disabled={!selectedTeacher || loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando...' : 'Cargar Datos'}
              </button>
            </div>

            {selectedTeacher && (
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyUnpaid}
                    onChange={(e) => setShowOnlyUnpaid(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">Mostrar solo pendientes de pago</span>
                </label>
              </div>
            )}
          </>
        )}

        {viewMode === 'todas' && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUnpaid}
                onChange={(e) => {
                  setShowOnlyUnpaid(e.target.checked);
                  loadAllTransactions();
                }}
                className="w-5 h-5"
              />
              <span className="text-sm text-gray-700">Mostrar solo pendientes de pago</span>
            </label>
          </div>
        )}
      </div>

      {/* Resumen del maestro */}
      {teacherSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-md p-6 mb-6 border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">{teacherSummary.teacher_name}</h2>
          <p className="text-gray-700 mb-4">{teacherSummary.grupo}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Transacciones</p>
              <p className="text-2xl font-bold text-blue-600">{teacherSummary.total_transactions}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Monto Total</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(teacherSummary.total_amount)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Pagado</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(teacherSummary.total_paid)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Pendiente</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(teacherSummary.total_pending)}</p>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-semibold text-gray-700">
                    Seleccionar todos ({selectedTransactions.size} de {transactions.length} tickets seleccionados)
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleGenerateConsolidatedReceipt(false)}
                  disabled={selectedTransactions.size === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  📥 Descargar Recibo Consolidado ({selectedTransactions.size} tickets)
                </button>
                <button
                  onClick={() => handleGenerateConsolidatedReceipt(true)}
                  disabled={selectedTransactions.size === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  🖨️ Imprimir Recibo Consolidado ({selectedTransactions.size} tickets)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de transacciones */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Transacciones Individuales</h2>
          <p className="text-sm text-gray-600 mb-4">
            💡 <strong>Tip:</strong> Selecciona los tickets que deseas incluir en el recibo consolidado
          </p>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`border-2 rounded-lg p-4 transition-all ${
                  selectedTransactions.has(transaction.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => toggleTransactionSelection(transaction.id)}
                    className="w-5 h-5 mt-1 cursor-pointer"
                  />
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg">Ticket #{transaction.id}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.fecha).toLocaleString('es-MX')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(transaction.total)}
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                            transaction.pagado === 'SI'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.pagado === 'SI' ? '✓ Pagado' : '✗ Pendiente'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Productos:</p>
                      <ul className="text-sm text-gray-600 ml-4">
                        {transaction.productos.map((producto: any, idx: number) => (
                          <li key={idx}>
                            {producto.cantidad}x {producto.nombre} - {formatCurrency(producto.subtotal)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateIndividualReceipt(transaction, false)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                      >
                        📥 Descargar
                      </button>
                      <button
                        onClick={() => handleGenerateIndividualReceipt(transaction, true)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                      >
                        🖨️ Imprimir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTeacher && !loading && transactions.length === 0 && teacherSummary && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-xl text-gray-600">No hay transacciones para este maestro</p>
        </div>
      )}
    </div>
  );
}
