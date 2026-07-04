'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { debtorsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCaja } from '@/contexts/CajaContext';

interface Debtor {
  id: number;
  nombre: string;
  grupo: string;
  deuda: number;
  fecha_primera_deuda: string;
  ultima_compra: string;
}

export default function DeudoresPage() {
  const router = useRouter();
  const { selectedCaja } = useCaja();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_deudores: 0, total_deuda: 0, promedio_deuda: 0 });
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!selectedCaja) {
      router.push('/');
      return;
    }
    loadDebtors();
    loadSummary();
  }, [selectedCaja]);

  async function loadDebtors() {
    if (!selectedCaja) return;
    try {
      const data = await debtorsApi.getAll(selectedCaja.id);
      setDebtors(data);
    } catch (error) {
      console.error('Error loading debtors:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (!selectedCaja) return;
    try {
      const data = await debtorsApi.getSummary(selectedCaja.id);
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }

  async function handlePayment() {
    if (!selectedDebtor || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedDebtor.deuda) {
      alert('Monto inválido');
      return;
    }

    try {
      const response = await debtorsApi.pay(selectedDebtor.id, amount, selectedCaja?.id);
      setShowPayModal(false);
      setSelectedDebtor(null);
      setPaymentAmount('');
      loadDebtors();
      loadSummary();
      alert(response.mensaje || 'Pago registrado correctamente');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error al procesar el pago');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este deudor? (Esto condonará la deuda)')) return;

    try {
      await debtorsApi.delete(id);
      loadDebtors();
      loadSummary();
    } catch (error) {
      console.error('Error deleting debtor:', error);
      alert('Error al eliminar deudor');
    }
  }

  function openPayModal(debtor: Debtor) {
    setSelectedDebtor(debtor);
    setPaymentAmount(debtor.deuda.toString());
    setShowPayModal(true);
  }

  const filteredDebtors = debtors.filter(d =>
    d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.grupo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Deudores</h1>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-2">Total Deudores</p>
          <p className="text-3xl font-bold text-gray-900">{summary.total_deudores}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-2">Total Deuda</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.total_deuda)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-2">Promedio por Deudor</p>
          <p className="text-3xl font-bold text-orange-600">{formatCurrency(summary.promedio_deuda)}</p>
        </div>
      </div>

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre o grupo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* Lista de deudores */}
      {filteredDebtors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500 text-lg">No hay deudores registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grupo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deuda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Compra
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDebtors.map((debtor) => (
                  <tr key={debtor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{debtor.nombre}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {debtor.grupo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-lg font-bold text-red-600">{formatCurrency(debtor.deuda)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(debtor.ultima_compra)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openPayModal(debtor)}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Pagar
                      </button>
                      <button
                        onClick={() => handleDelete(debtor.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {showPayModal && selectedDebtor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Registrar Pago</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="text-lg font-medium">{selectedDebtor.nombre}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Deuda actual</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedDebtor.deuda)}</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto a pagar
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                max={selectedDebtor.deuda}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setPaymentAmount((selectedDebtor.deuda / 2).toFixed(2))}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  50%
                </button>
                <button
                  onClick={() => setPaymentAmount(selectedDebtor.deuda.toFixed(2))}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Total
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedDebtor(null);
                  setPaymentAmount('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
