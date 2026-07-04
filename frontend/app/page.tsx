'use client';

import { useEffect, useState } from 'react';
import { cajasApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCaja } from '@/contexts/CajaContext';

interface Caja {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const { setSelectedCaja } = useCaja();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajasStats, setCajasStats] = useState<Map<number, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCajas();
  }, []);

  async function loadCajas() {
    try {
      const data = await cajasApi.getAll(true); // Solo cajas activas
      setCajas(data);
      
      // Cargar estadísticas de cada caja
      const statsPromises = data.map(async (caja: Caja) => {
        try {
          const [saldo, productos] = await Promise.all([
            cajasApi.getSaldo(caja.id),
            cajasApi.getProductos(caja.id),
          ]);
          return { id: caja.id, saldo: saldo.saldo, totalProductos: productos.length };
        } catch (error) {
          return { id: caja.id, saldo: 0, totalProductos: 0 };
        }
      });

      const stats = await Promise.all(statsPromises);
      const statsMap = new Map(stats.map(s => [s.id, s]));
      setCajasStats(statsMap);
    } catch (error) {
      console.error('Error loading cajas:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCaja(caja: Caja) {
    setSelectedCaja(caja);
    router.push('/ventas');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* School Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center space-x-4">
          <Image 
            src="/cam15_logo.png" 
            alt="CAM15 Logo" 
            width={80} 
            height={80}
            className="object-contain bg-white rounded-lg p-2"
          />
          <div>
            <h1 className="text-2xl font-bold">Centro de Atención Múltiple No.15</h1>
            <p className="text-lg">Taller de Formación Laboral</p>
            <p className="text-xl font-semibold mt-1">La Tiendita - Sistema POS</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Selecciona una Caja</h2>
        <p className="text-gray-600">Elige la caja con la que deseas trabajar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cajas.map((caja) => {
          const stats = cajasStats.get(caja.id) || { saldo: 0, totalProductos: 0 };
          const iconMap: Record<string, string> = {
            'Agua': '💧',
            'Papelería': '📝',
            'Panadería': '🍞',
            'General': '📦'
          };
          
          return (
            <button
              key={caja.id}
              onClick={() => handleSelectCaja(caja)}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all border-4 border-transparent hover:border-blue-400 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl">{iconMap[caja.nombre] || '🏪'}</div>
                <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Activa
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{caja.nombre}</h3>
              {caja.descripcion && (
                <p className="text-sm text-gray-600 mb-4">{caja.descripcion}</p>
              )}
              
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Saldo:</span>
                  <span className="font-bold text-green-600">{formatCurrency(stats.saldo)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Productos:</span>
                  <span className="font-bold text-blue-600">{stats.totalProductos}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center text-blue-600 font-semibold">
                  <span>Seleccionar</span>
                  <span className="ml-2">→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {cajas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <span className="text-6xl mb-4 block">📦</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay cajas disponibles</h3>
          <p className="text-gray-600">Contacta al administrador para crear cajas</p>
        </div>
      )}
    </div>
  );
}
