'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { resolveImageUrl, resolveProductImageUrl, transactionsApi } from '@/lib/api';
import { useCaja } from '@/contexts/CajaContext';

interface TransactionOptionSelection {
  group_key: string;
  group_label: string;
  values: string[];
}

interface ProductInTransaction {
  product_id?: number;
  image_url?: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  opciones?: TransactionOptionSelection[];
}

interface DayTransaction {
  id: number;
  fecha: string;
  cliente: string;
  grupo: string;
  total: number;
  pagado: 'SI' | 'NO';
  productos: ProductInTransaction[];
}

const OPTION_VALUE_LABELS: Record<string, string> = {
  mayonesa: 'Mayonesa',
  crema: 'Crema',
  sin_mayonesa_crema: 'Sin mayonesa ni crema',
  cebolla: 'Cebolla',
  jitomate: 'Jitomate',
  lechuga: 'Lechuga',
  chile: 'Chile',
  fria: 'Fría',
  caliente: 'Caliente',
  con_azucar: 'Con azúcar',
  sin_azucar: 'Sin azúcar',
};

const OPTION_IMAGE_BY_VALUE: Record<string, string> = {
  mayonesa: '/mayonesa.png',
  crema: '/crema.png',
  cebolla: '/cebolla.png',
  jitomate: '/jitomate.png',
  lechuga: '/lechuga.png',
  chile: '/chile.png',
  fria: '/frio.png',
  caliente: '/caliente.png',
  sin_azucar: '/sin-azucar.png',
};

function formatFlavorKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getOptionImage(value: string) {
  if (OPTION_IMAGE_BY_VALUE[value]) return OPTION_IMAGE_BY_VALUE[value];
  return `/sabores/${formatFlavorKey(value)}.png`;
}

function getUtcMinus6DateKey(date: Date) {
  // Convierte cualquier fecha a "hora local" de UTC-6 sin depender de la zona del navegador.
  const utcMillis = date.getTime() + date.getTimezoneOffset() * 60_000;
  const utcMinus6 = new Date(utcMillis - 6 * 60 * 60 * 1000);

  const year = utcMinus6.getUTCFullYear();
  const month = String(utcMinus6.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcMinus6.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const COMANDA_WINDOW_HOURS = 5;

function formatOptionValue(value: string) {
  return OPTION_VALUE_LABELS[value] || value;
}

function parseServerDate(value: string) {
  const normalizedFraction = value.replace(/\.(\d{3})\d+/, '.$1');
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalizedFraction);
  const normalized = hasTimezone ? normalizedFraction : `${normalizedFraction}Z`;
  return new Date(normalized);
}

export default function ComandasPage() {
  const router = useRouter();
  const { selectedCaja, isLoading: cajaLoading } = useCaja();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<DayTransaction[]>([]);
  const [deliveredIds, setDeliveredIds] = useState<Set<number>>(new Set());

  const todayKey = useMemo(() => getUtcMinus6DateKey(new Date()), []);
  const storageKey = useMemo(
    () => `comandas_entregadas_${selectedCaja?.id || 'no_caja'}_${todayKey}`,
    [selectedCaja?.id, todayKey]
  );

  useEffect(() => {
    if (cajaLoading) return;
    if (!selectedCaja) {
      router.push('/');
    }
  }, [cajaLoading, selectedCaja, router]);

  useEffect(() => {
    if (!selectedCaja) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setDeliveredIds(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(raw) as number[];
      setDeliveredIds(new Set(parsed));
    } catch (error) {
      console.error('Error loading delivered comandas:', error);
      setDeliveredIds(new Set());
    }
  }, [selectedCaja, storageKey]);

  useEffect(() => {
    if (!selectedCaja) return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(deliveredIds)));
  }, [deliveredIds, selectedCaja, storageKey]);

  const loadTodayComandas = useCallback(async (silent = false) => {
    if (!selectedCaja) return;

    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await transactionsApi.getAll({
        caja_id: selectedCaja.id,
        pagado: 'SI',
        limit: 300,
      });

      const now = Date.now();
      const maxAgeMs = COMANDA_WINDOW_HOURS * 60 * 60 * 1000;

      const todayTransactions = (data as DayTransaction[])
        .filter((transaction) => {
          const transactionDate = parseServerDate(transaction.fecha);
          const ageMs = now - transactionDate.getTime();
          return ageMs >= 0 && ageMs <= maxAgeMs;
        })
        .sort((a, b) => parseServerDate(a.fecha).getTime() - parseServerDate(b.fecha).getTime());

      setTransactions(todayTransactions);
    } catch (error) {
      console.error('Error loading today comandas:', error);
      alert('No se pudieron cargar las comandas del día');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCaja, todayKey]);

  useEffect(() => {
    if (!selectedCaja) return;
    loadTodayComandas();

    const interval = setInterval(() => {
      loadTodayComandas(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedCaja, loadTodayComandas]);

  const visibleComandas = useMemo(
    () =>
      transactions
        .filter((transaction) => !deliveredIds.has(transaction.id))
        .sort((a, b) => parseServerDate(a.fecha).getTime() - parseServerDate(b.fecha).getTime()),
    [transactions, deliveredIds]
  );

  const deliveredComandas = useMemo(
    () =>
      transactions
        .filter((transaction) => deliveredIds.has(transaction.id))
        .sort((a, b) => parseServerDate(b.fecha).getTime() - parseServerDate(a.fecha).getTime()),
    [transactions, deliveredIds]
  );

  const markDelivered = (transactionId: number) => {
    setDeliveredIds((prev) => {
      const next = new Set(prev);
      next.add(transactionId);
      return next;
    });
  };

  const recoverComanda = (transactionId: number) => {
    setDeliveredIds((prev) => {
      const next = new Set(prev);
      next.delete(transactionId);
      return next;
    });
  };

  const recoverAll = () => {
    setDeliveredIds(new Set());
  };

  if (cajaLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto">
      <div className="bg-blue-900 rounded-2xl p-5 sm:p-6 md:p-8 text-white shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black flex items-center gap-2">
              🍽️ Comandas del Día
            </h1>
            <p className="text-amber-50 mt-2 text-sm sm:text-base">
              Solo comandas pagadas creadas en las ultimas {COMANDA_WINDOW_HOURS} horas
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => loadTodayComandas(true)}
              className="px-4 py-2 bg-white text-blue-900 rounded-lg font-bold hover:bg-amber-50 transition-colors"
            >
              {refreshing ? 'Actualizando...' : '🔄 Actualizar'}
            </button>
            {deliveredComandas.length > 0 && (
              <button
                onClick={recoverAll}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors"
              >
                ♻️ Recuperar todas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <section>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border-2 border-blue-200">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4">
              🧾 En preparación y entrega ({visibleComandas.length})
            </h2>

            {visibleComandas.length === 0 ? (
              <div className="text-center py-10 bg-amber-50 rounded-xl">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-semibold text-blue-900">No hay comandas pendientes por entregar</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {visibleComandas.map((transaction, index) => (
                  <article
                    key={transaction.id}
                    className="relative w-full lg:w-fit lg:max-w-full bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 rounded-2xl border-2 border-amber-400 p-2.5 sm:p-3 shadow-md"
                  >
                    <div className="absolute inset-2 border-2 border-dashed border-amber-300 rounded-xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-900 text-white flex items-center justify-center font-black text-xl">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-black text-amber-900 text-lg">{transaction.cliente || 'Cliente general'}</p>
                          <p className="text-sm text-amber-900/80">
                            {parseServerDate(transaction.fecha).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                          <p className="text-sm font-semibold text-amber-900/80">
                            {transaction.grupo || 'General'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Image src="/charola.svg" alt="Charola de comanda" width={54} height={54} className="w-12 h-12 sm:w-14 sm:h-14" />
                        <button
                          onClick={() => markDelivered(transaction.id)}
                          className="w-10 h-10 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center"
                          title="Marcar como entregada"
                          aria-label="Marcar como entregada"
                        >
                          ✅
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory lg:w-fit lg:overflow-visible">
                      {transaction.productos?.map((product, productIndex) => (
                        <div key={`${transaction.id}-${productIndex}`} className="min-w-[220px] sm:min-w-[240px] md:min-w-[260px] max-w-[300px] flex-shrink-0 snap-start bg-white/95 rounded-lg p-2 border border-amber-300">
                          <div className="flex justify-center items-start gap-3">
                            <div className="flex items-start gap-3 min-w-0 w-full justify-center">
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 relative">
                                {product.product_id && product.image_url ? (
                                  <img
                                    src={resolveProductImageUrl(product.product_id, product.image_url)}
                                    alt={product.nombre}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      const fallback = resolveImageUrl(product.image_url);
                                      if (fallback && e.currentTarget.src !== fallback) {
                                        e.currentTarget.src = fallback;
                                        return;
                                      }
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-3xl">🍽️</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {product.opciones && product.opciones.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {product.opciones
                                .filter((option) => option.values?.length > 0)
                                .map((option, optionIndex) => (
                                  <div key={`${transaction.id}-${productIndex}-${optionIndex}`}>
                                    <div className="flex flex-wrap gap-2">
                                      {option.values.map((value) => {
                                        const imagePath = getOptionImage(value);
                                        return (
                                          <span
                                            key={`${transaction.id}-${productIndex}-${optionIndex}-${value}`}
                                            className="inline-flex items-center gap-1.5 bg-amber-100 px-2 py-1.5 rounded-full border border-amber-400 text-amber-900"
                                            title={formatOptionValue(value)}
                                            aria-label={formatOptionValue(value)}
                                          >
                                            <img
                                              src={imagePath}
                                              alt={formatOptionValue(value)}
                                              className="w-8 h-8 object-contain"
                                              onError={(e) => {
                                                e.currentTarget.src = '/charola.svg';
                                              }}
                                            />
                                            <span className="text-xs font-semibold">{formatOptionValue(value)}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                      </div>

                      {(transaction.productos?.length || 0) > 1 && (
                        <div className="lg:hidden pointer-events-none absolute right-0 top-0 bottom-1 w-10 flex items-center justify-center bg-gradient-to-l from-amber-200/90 to-transparent rounded-r-lg">
                          <span className="text-2xl font-black text-amber-900 animate-pulse">›</span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside>
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border-2 border-amber-300">
            <h2 className="text-lg sm:text-xl font-bold text-blue-900 mb-4">
              ♻️ Entregadas ({deliveredComandas.length})
            </h2>

            {deliveredComandas.length === 0 ? (
              <p className="text-sm text-gray-600">Aquí aparecerán las comandas entregadas para recuperarlas si hubo error.</p>
            ) : (
              <div className="space-y-2">
                {deliveredComandas.map((transaction) => (
                  <div key={`delivered-${transaction.id}`} className="w-full bg-amber-50 border border-amber-300 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-blue-900">{transaction.cliente || `Comanda #${transaction.id}`}</p>
                        <p className="text-xs text-gray-700">
                          {parseServerDate(transaction.fecha).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => recoverComanda(transaction.id)}
                        className="px-3 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        ↩️ Recuperar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}