'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cajasApi, cashApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCaja } from '@/contexts/CajaContext';

interface CajaInfo {
  id: number;
  nombre: string;
}

interface CashOperation {
  tipo: string;
  monto: number;
  razon: string;
  fecha: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { setSelectedCaja } = useCaja();
  const [saldo, setSaldo] = useState<number>(0);
  const [totalIngresos, setTotalIngresos] = useState<number>(0);
  const [totalEgresos, setTotalEgresos] = useState<number>(0);
  const [recentOperations, setRecentOperations] = useState<CashOperation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeCaja();
  }, []);

  async function initializeCaja() {
    try {
      // Obtener la caja única
      const cajas = await cajasApi.getAll(true);
      if (cajas && cajas.length > 0) {
        const caja = cajas[0];
        setSelectedCaja(caja);
        
        // Cargar datos de la caja
        const [balanceData, operationsData] = await Promise.all([
          cashApi.getBalance(),
          cashApi.getAll({ limit: 10 }),
        ]);
        
        setSaldo(balanceData.saldo || 0);
        setRecentOperations(operationsData || []);
        
        // Calcular totales
        const ingresosTotal = operationsData
          ?.filter((op: CashOperation) => op.tipo === 'INGRESO')
          .reduce((sum: number, op: CashOperation) => sum + op.monto, 0) || 0;
        
        const egresosTotal = operationsData
          ?.filter((op: CashOperation) => op.tipo === 'EGRESO')
          .reduce((sum: number, op: CashOperation) => sum + op.monto, 0) || 0;
        
        setTotalIngresos(ingresosTotal);
        setTotalEgresos(egresosTotal);
      }
    } catch (error) {
      console.error('Error initializing caja:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold text-lg">Cargando Cafetería CAM 15...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header con logo y nombre */}
      <div className="bg-gradient-to-r from-red-600 via-blue-600 to-amber-500 rounded-2xl shadow-xl p-8 mb-8 text-white">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <Image 
            src="/cam15_logo.png" 
            alt="Cafetería CAM 15 Logo" 
            width={80} 
            height={80}
            className="object-contain bg-white rounded-lg p-2"
          />
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-black">Cafetería CAM 15</h1>
            <p className="text-base sm:text-lg text-yellow-100 font-semibold">Centro de Atención Múltiple No.15</p>
            <p className="text-base sm:text-lg text-yellow-100">Punto de Venta - Sistema de Cajas</p>
          </div>
        </div>
      </div>

      {/* Botones de acción rápida */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => router.push('/ventas')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          <div className="text-4xl mb-2">🛒</div>
          <div className="font-bold text-lg">Vender</div>
          <div className="text-xs opacity-90">Ir a ventas</div>
        </button>

        <button
          onClick={() => router.push('/productos')}
          className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300"
        >
          <div className="text-4xl mb-2">📦</div>
          <div className="font-bold text-lg">Productos</div>
          <div className="text-xs opacity-90">Gestionar</div>
        </button>

        <button
          onClick={() => router.push('/recibos')}
          className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
        >
          <div className="text-4xl mb-2">📄</div>
          <div className="font-bold text-lg">Recibos</div>
          <div className="text-xs opacity-90">Historial</div>
        </button>

        <button
          onClick={() => router.push('/caja')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
        >
          <div className="text-4xl mb-2">💰</div>
          <div className="font-bold text-lg">Caja</div>
          <div className="text-xs opacity-90">Operaciones</div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg border-l-4 border-green-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-semibold text-sm">Saldo Actual</p>
              <p className="text-4xl font-black text-green-600 mt-2">{formatCurrency(saldo)}</p>
            </div>
            <div className="text-5xl opacity-30">💵</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-l-4 border-blue-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-semibold text-sm">Total Ingresos</p>
              <p className="text-4xl font-black text-blue-600 mt-2">{formatCurrency(totalIngresos)}</p>
            </div>
            <div className="text-5xl opacity-30">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-l-4 border-red-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 font-semibold text-sm">Total Egresos</p>
              <p className="text-4xl font-black text-red-600 mt-2">{formatCurrency(totalEgresos)}</p>
            </div>
            <div className="text-5xl opacity-30">📉</div>
          </div>
        </div>
      </div>

      {/* Operaciones recientes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Últimas Operaciones</h2>
        
        {recentOperations && recentOperations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Tipo</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Monto</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Razón</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentOperations.map((op, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        op.tipo === 'INGRESO' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {op.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(op.monto)}</td>
                    <td className="py-3 px-4 text-gray-600">{op.razon}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{new Date(op.fecha).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">No hay operaciones registradas</p>
          </div>
        )}
      </div>
    </div>
  );
}
