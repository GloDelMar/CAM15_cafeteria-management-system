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
        return 'text-emerald-700 bg-green-50';
      case 'EGRESO':
        return 'text-red-600 bg-red-50';
      case 'AJUSTE':
        return 'text-blue-900 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header con logo de CAM 15 */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-700 text-white shadow-lg mb-8">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Logo CAM 15 */}
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <img 
                src="/cam15_logo.png" 
                alt="CAM 15" 
                className="w-14 h-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Cafetería CAM 15</h1>
              <p className="text-yellow-100">Control de Caja Registradora</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Saldo actual */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <p className="text-lg mb-2 opacity-90 font-medium">💰 Saldo en Caja</p>
          <p className="text-6xl font-bold">{formatCurrency(balance)}</p>
        </div>

      {/* Estadísticas del día */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-amber-600">
          <p className="text-sm text-gray-600 mb-2 font-medium">📊 Saldo Inicial</p>
          <p className="text-3xl font-bold text-amber-800">{formatCurrency(stats.saldo_inicial)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-green-600">
          <p className="text-sm text-gray-600 mb-2 font-medium">📈 Ingresos del Día</p>
          <p className="text-3xl font-bold text-emerald-700">{formatCurrency(stats.ingresos)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-red-600">
          <p className="text-sm text-gray-600 mb-2 font-medium">📉 Egresos del Día</p>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.egresos)}</p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => openModal('INGRESO')}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          ➕ Ingreso
        </button>
        <button
          onClick={() => openModal('EGRESO')}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          ➖ Egreso
        </button>
        <button
          onClick={() => openModal('AJUSTE')}
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white p-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          ⚙️ Ajuste
        </button>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-amber-100">
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 to-amber-800 text-white">
          <h2 className="text-xl font-bold">📋 Historial de Movimientos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-amber-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {operations.map((op) => (
                <tr key={op.id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateTime(op.fecha)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs rounded-full font-bold ${getOperationColor(op.tipo_operacion)}`}>
                      {op.tipo_operacion}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {op.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`font-bold text-lg ${
                      op.tipo_operacion === 'EGRESO' ? 'text-red-600' : 'text-emerald-700'
                    }`}>
                      {op.tipo_operacion === 'EGRESO' ? '-' : '+'}{formatCurrency(Math.abs(op.monto))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-amber-900 text-lg">
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-3xl">
                {operationType === 'INGRESO' ? '💵' : operationType === 'EGRESO' ? '💸' : '⚙️'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {operationType === 'INGRESO' ? 'Registrar Ingreso' : 
                 operationType === 'EGRESO' ? 'Registrar Egreso' : 'Ajustar Saldo'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white px-4 py-2 rounded-lg font-bold ${
                    operationType === 'INGRESO' ? 'bg-green-600 hover:bg-green-700' :
                    operationType === 'EGRESO' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-amber-600 hover:bg-amber-700'
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
    </div>
  );
}
