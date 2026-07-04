'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { formatCurrency } from '@/lib/utils';

// Billetes y monedas mexicanos
const DENOMINACIONES = [
  { valor: 200, tipo: 'billete', color: 'bg-green-200', imagen: '/monedas/200.png', alt: '💵' },
  { valor: 100, tipo: 'billete', color: 'bg-red-200', imagen: '/monedas/100.png', alt: '💵' },
  { valor: 50, tipo: 'billete', color: 'bg-pink-200', imagen: '/monedas/50.png', alt: '💵' },
  { valor: 20, tipo: 'billete', color: 'bg-blue-100', imagen: '/monedas/20pesos.png', alt: '💵' },
  { valor: 10, tipo: 'moneda', color: 'bg-yellow-200', imagen: '/monedas/10.png', alt: '🪙' },
  { valor: 5, tipo: 'moneda', color: 'bg-yellow-100', imagen: '/monedas/5.png', alt: '🪙' },
  { valor: 2, tipo: 'moneda', color: 'bg-gray-200', imagen: '/monedas/2.png', alt: '🪙' },
  { valor: 1, tipo: 'moneda', color: 'bg-gray-100', imagen: '/monedas/1.png', alt: '🪙' },
  { valor: 0.5, tipo: 'moneda', color: 'bg-orange-100', imagen: '/monedas/50centavos.png', alt: '🪙' },
];

function MonedasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const total = parseFloat(searchParams.get('total') || '0');
  const modo = searchParams.get('modo') || 'pago'; // 'pago' o 'cambio'
  
  const [cantidades, setCantidades] = useState<{ [key: number]: number }>({});
  const [totalSeleccionado, setTotalSeleccionado] = useState(0);
  const [changeSuggestionIndex, setChangeSuggestionIndex] = useState(0);
  const [sugerenciasGeneradas, setSugerenciasGeneradas] = useState<Array<{ [key: number]: number }>>([]);

  // Helper para obtener el nombre correcto de la imagen de moneda
  const getMonedaImage = (valor: number): string => {
    const denom = DENOMINACIONES.find(d => d.valor === valor);
    return denom?.imagen || `/monedas/${valor}.png`;
  };

  useEffect(() => {
    const suma = Object.entries(cantidades).reduce((acc, [valor, cantidad]) => {
      return acc + (parseFloat(valor) * cantidad);
    }, 0);
    setTotalSeleccionado(suma);
  }, [cantidades]);

  const cambio = modo === 'pago' ? Math.max(0, totalSeleccionado - total) : 0;

  const incrementar = (valor: number) => {
    setCantidades(prev => ({
      ...prev,
      [valor]: (prev[valor] || 0) + 1
    }));
  };

  const decrementar = (valor: number) => {
    setCantidades(prev => ({
      ...prev,
      [valor]: Math.max(0, (prev[valor] || 0) - 1)
    }));
  };

  const limpiar = () => {
    setCantidades({});
  };

  const generarNuevasSugerencias = (monto: number) => {
    if (monto <= 0) {
      setSugerenciasGeneradas([]);
      return;
    }
    
    const sugerencias: Array<{ [key: number]: number }> = [];
    
    // Generar 15 sugerencias diferentes
    for (let intento = 0; intento < 15; intento++) {
      const resultado: { [key: number]: number } = {};
      let restante = Math.round(monto * 100) / 100;
      
      // Crear lista de denominaciones y mezclarlas aleatoriamente
      const denomsDisponibles = [...DENOMINACIONES].sort(() => Math.random() - 0.5);
      
      for (const denom of denomsDisponibles) {
        if (restante >= denom.valor) {
          const maxCantidad = Math.floor(restante / denom.valor);
          // Variar la estrategia: a veces usar máximo, a veces aleatorio
          const cantidad = Math.random() > 0.5 ? maxCantidad : Math.max(1, Math.floor(Math.random() * maxCantidad) + 1);
          
          if (cantidad > 0) {
            resultado[denom.valor] = cantidad;
            restante = Math.round((restante - (cantidad * denom.valor)) * 100) / 100;
          }
        }
      }
      
      // Si aún queda resto, completar con la denominación más pequeña
      if (restante > 0) {
        const denominacionMinima = 0.5;
        const cantidadFaltante = Math.ceil(restante / denominacionMinima);
        resultado[denominacionMinima] = (resultado[denominacionMinima] || 0) + cantidadFaltante;
      }
      
      sugerencias.push(resultado);
    }
    
    // Ordenar sugerencias por cantidad total de elementos (menor a mayor)
    sugerencias.sort((a, b) => {
      const totalA = Object.values(a).reduce((sum, val) => sum + val, 0);
      const totalB = Object.values(b).reduce((sum, val) => sum + val, 0);
      return totalA - totalB;
    });
    
    setSugerenciasGeneradas(sugerencias);
    setChangeSuggestionIndex(0);
  };

  useEffect(() => {
    if (modo === 'pago' && cambio > 0) {
      generarNuevasSugerencias(cambio);
    } else {
      setSugerenciasGeneradas([]);
    }
  }, [cambio, modo]);
  
  const getNextChangeSuggestion = () => {
    if (sugerenciasGeneradas.length > 0) {
      setChangeSuggestionIndex((prev) => (prev + 1) % sugerenciasGeneradas.length);
    }
  };
  
  const sugerenciaCambio = sugerenciasGeneradas[changeSuggestionIndex] || {};

  const confirmar = () => {
    if (modo === 'pago') {
      // Preparar array de monedas seleccionadas
      const monedasSeleccionadas = Object.entries(cantidades)
        .filter(([_, cantidad]) => cantidad > 0)
        .map(([valor, cantidad]) => ({
          denom: parseFloat(valor),
          count: cantidad
        }));
      
      // Construir URL con parámetros
      const params = new URLSearchParams({
        pago: totalSeleccionado.toString(),
        monedas: JSON.stringify(monedasSeleccionadas)
      });
      
      router.push(`/ventas?${params.toString()}`);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="text-4xl hover:scale-110 transition-transform"
            >
              ⬅️
            </button>
            <h1 className="text-4xl font-bold text-gray-800">
              {modo === 'pago' ? '💰 ¿Con cuánto pagas?' : '💵 Tu cambio'}
            </h1>
            <button
              onClick={limpiar}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl text-xl font-bold"
            >
              🗑️ Limpiar
            </button>
          </div>

          {/* Display de totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-100 rounded-2xl p-6 text-center">
              <p className="text-xl font-semibold text-blue-900 mb-2">Total a pagar</p>
              <p className="text-4xl font-bold text-blue-600">{formatCurrency(total)}</p>
            </div>
            <div className="bg-green-100 rounded-2xl p-6">
              <p className="text-xl font-semibold text-green-900 mb-2 text-center">Pagas con</p>
              <p className="text-4xl font-bold text-green-600 text-center mb-3">{formatCurrency(totalSeleccionado)}</p>
              {Object.keys(cantidades).some(k => cantidades[parseFloat(k)] > 0) && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {Object.entries(cantidades)
                    .filter(([_, cantidad]) => cantidad > 0)
                    .map(([valor, cantidad]) => {
                      const denom = DENOMINACIONES.find(d => d.valor === parseFloat(valor));
                      if (!denom) return null;
                      return Array.from({ length: cantidad }).map((_, i) => (
                        <img
                          key={`${valor}-${i}`}
                          src={getMonedaImage(parseFloat(valor))}
                          alt={formatCurrency(parseFloat(valor))}
                          className="w-14 h-14 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ));
                    })}
                </div>
              )}
            </div>
            <div className={`rounded-2xl p-6 text-center ${cambio >= 0 ? 'bg-purple-100' : 'bg-red-100'}`}>
              <p className="text-xl font-semibold mb-2">Tu cambio</p>
              <p className={`text-4xl font-bold ${cambio >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(cambio))}
              </p>
              {cambio < 0 && <p className="text-red-600 mt-2 text-lg">❌ Falta dinero</p>}
            </div>
          </div>
        </div>

        {/* Selector de monedas y billetes */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            {modo === 'pago' ? '👇 Selecciona billetes y monedas' : '💡 Opciones para dar cambio'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {DENOMINACIONES.map((denom) => {
              const cantidad = cantidades[denom.valor] || 0;
              return (
                <div
                  key={denom.valor}
                  className={`${denom.color} rounded-2xl p-4 shadow-lg border-4 ${cantidad > 0 ? 'border-blue-500 ring-4 ring-blue-300' : 'border-gray-300'} transition-all`}
                >
                  <div className="text-center">
                    <div 
                      onClick={() => incrementar(denom.valor)}
                      className="text-6xl mb-2 h-32 flex items-center justify-center bg-white rounded-xl overflow-hidden cursor-pointer hover:scale-105 hover:shadow-xl transition-all active:scale-95"
                    >
                      <img 
                        src={denom.imagen} 
                        alt={`${denom.tipo} de ${formatCurrency(denom.valor)}`}
                        className="max-w-full max-h-full object-contain pointer-events-none"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<span class="text-6xl">${denom.alt}</span>`;
                        }}
                      />
                    </div>
                    <p className="text-3xl font-bold text-gray-800 mb-3">
                      {formatCurrency(denom.valor)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <button
                        onClick={() => decrementar(denom.valor)}
                        className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-xl text-3xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={cantidad === 0}
                      >
                        −
                      </button>
                      <div className="bg-white rounded-xl px-4 py-2 min-w-[60px]">
                        <p className="text-3xl font-bold text-gray-800">{cantidad}</p>
                      </div>
                      <button
                        onClick={() => incrementar(denom.valor)}
                        className="bg-green-500 hover:bg-green-600 text-white w-12 h-12 rounded-xl text-3xl font-bold"
                      >
                        +
                      </button>
                    </div>
                    {cantidad > 0 && (
                      <p className="text-lg font-semibold text-gray-700 mt-2">
                        = {formatCurrency(denom.valor * cantidad)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sugerencia de cambio */}
        {modo === 'pago' && cambio > 0 && Object.keys(sugerenciaCambio).length > 0 && (
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-3xl shadow-2xl p-6 border-4 border-yellow-400">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-yellow-900 flex items-center gap-3">
                💡 <span>Sugerencia para dar el cambio</span>
              </h2>
              <span className="text-2xl font-bold text-yellow-900">{formatCurrency(cambio)}</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-center mb-4">
              {Object.entries(sugerenciaCambio).map(([valor, cantidad]) => {
                const denom = DENOMINACIONES.find(d => d.valor === parseFloat(valor));
                if (!denom || cantidad === 0) return null;
                return Array.from({ length: cantidad }).map((_, i) => (
                  <img
                    key={`${valor}-${i}`}
                    src={getMonedaImage(parseFloat(valor))}
                    alt={formatCurrency(parseFloat(valor))}
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ));
              })}
            </div>
            <button
              onClick={getNextChangeSuggestion}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-2xl text-xl font-bold transition-colors"
            >
              🔄 Ver otra sugerencia
            </button>
          </div>
        )}

        {/* Botón confirmar */}
        {modo === 'pago' && cambio >= 0 && (
          <div className="mt-6">
            <button
              onClick={confirmar}
              disabled={totalSeleccionado < total}
              className={`w-full text-3xl font-bold py-6 rounded-2xl shadow-lg transition-all ${
                totalSeleccionado >= total
                  ? 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ✅ Confirmar Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonedasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <MonedasContent />
    </Suspense>
  );
}
