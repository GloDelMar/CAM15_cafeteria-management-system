'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cashApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useCaja } from '@/contexts/CajaContext';

interface CashOperation {
  id: number;
  tipo_operacion: string;
  monto: number;
  saldo: number;
  descripcion?: string;
  fecha: string;
}

export default function CajaPage() {
  const router = useRouter();
  const { selectedCaja } = useCaja();
  const [operations, setOperations] = useState<CashOperation[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [operationType, setOperationType] = useState<'INGRESO' | 'EGRESO' | 'AJUSTE'>('INGRESO');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [stats, setStats] = useState({ ingresos: 0, egresos: 0, saldo_inicial: 0 });

  useEffect(() => {
    if (!selectedCaja) {
      router.push('/');
      return;
    }
    loadData();
  }, [selectedCaja]);

  async function loadData() {
    if (!selectedCaja) return;
    try {
      const [balanceData, operationsData, dailyStats] = await Promise.all([
        cashApi.getBalance(selectedCaja.id),
        cashApi.getAll({ limit: 50, caja_id: selectedCaja.id }),
        cashApi.getDailyStats(selectedCaja.id),
      ]);
      
      setBalance(balanceData.saldo);
      setOperations(operationsData);
      setStats(dailyStats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!amount || !description) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (!selectedCaja) {
      alert('Debes seleccionar una caja');
      return;
    }

    try {
      const numAmount = parseFloat(amount);
      
      if (operationType === 'INGRESO') {
        await cashApi.addIncome(numAmount, description, selectedCaja.id);
      } else if (operationType === 'EGRESO') {
        await cashApi.addExpense(numAmount, description, selectedCaja.id);
      } else {
        await cashApi.adjust(numAmount, description, selectedCaja.id);
      }

      setShowModal(false);
      setAmount('');
      setDescription('');
      loadData();
      alert('Operación registrada correctamente');
    } catch (error) {
      console.error('Error saving operation:', error);
      alert('Error al registrar operación');
    }
  }

  function openModal(type: 'INGRESO' | 'EGRESO' | 'AJUSTE') {
    setOperationType(type);
    setAmount('');
    setDescription('');
    setShowModal(true);
  }

  function getOperationColor(type: string) {
    switch (type) {
      case 'INGRESO':
      case 'VENTA':
        return 'text-green-600 bg-green-50';
      case 'EGRESO':
        return 'text-red-600 bg-red-50';
      case 'AJUSTE':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Control de Caja</h1>

      {/* Saldo actual */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 mb-8 text-white">
        <p className="text-lg mb-2 opacity-90">Saldo en Caja</p>
        <p className="text-5xl font-bold">{formatCurrency(balance)}</p>
      </div>

      {/* Estadísticas del día */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-2">Saldo Inicial</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.saldo_inicial)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-2">Ingresos del Día</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.ingresos)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-2">Egresos del Día</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.egresos)}</p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => openModal('INGRESO')}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-medium transition-colors"
        >
          + Registrar Ingreso
        </button>
        <button
          onClick={() => openModal('EGRESO')}
          className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg font-medium transition-colors"
        >
          - Registrar Egreso
        </button>
        <button
          onClick={() => openModal('AJUSTE')}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-medium transition-colors"
        >
          ⚙️ Ajustar Saldo
        </button>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Historial de Movimientos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {operations.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(op.fecha)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getOperationColor(op.tipo_operacion)}`}>
                      {op.tipo_operacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {op.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`font-bold ${
                      op.tipo_operacion === 'EGRESO' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {op.tipo_operacion === 'EGRESO' ? '-' : '+'}{formatCurrency(Math.abs(op.monto))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                    {formatCurrency(op.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {operationType === 'INGRESO' ? 'Registrar Ingreso' : 
               operationType === 'EGRESO' ? 'Registrar Egreso' : 'Ajustar Saldo'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe el motivo..."
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setAmount('');
                    setDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white px-4 py-2 rounded-lg ${
                    operationType === 'INGRESO' ? 'bg-green-600 hover:bg-green-700' :
                    operationType === 'EGRESO' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
