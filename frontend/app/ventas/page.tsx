'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { productsApi, transactionsApi, debtorsApi, resolveImageUrl, resolveProductImageUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import NumeroSelector from '@/components/NumeroSelector';
import { downloadReceipt, printReceipt } from '@/lib/receiptGenerator';
import { useCaja } from '@/contexts/CajaContext';

interface Product {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  image_url?: string;
  caja_id?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function VentasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCaja } = useCaja();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cliente, setCliente] = useState('');
  const [grupo, setGrupo] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [payment, setPayment] = useState('');
  const [selectedCoins, setSelectedCoins] = useState<Array<{denom: number, count: number}>>([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(0);
  const [changeSuggestionIndex, setChangeSuggestionIndex] = useState(0);
  const [showCustomClientInput, setShowCustomClientInput] = useState(false);
  const [showChangeSuggestionModal, setShowChangeSuggestionModal] = useState(false);
  const [changeSuggestions, setChangeSuggestions] = useState<Array<{ [key: number]: number }>>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Denominaciones de monedas y billetes
  const DENOMINACIONES = [
    { valor: 200, tipo: 'billete', imagen: '/monedas/200.png', alt: '💵' },
    { valor: 100, tipo: 'billete', imagen: '/monedas/100.png', alt: '💵' },
    { valor: 50, tipo: 'billete', imagen: '/monedas/50.png', alt: '💵' },
    { valor: 20, tipo: 'billete', imagen: '/monedas/20pesos.png', alt: '💵' },
    { valor: 10, tipo: 'moneda', imagen: '/monedas/10.png', alt: '🪙' },
    { valor: 5, tipo: 'moneda', imagen: '/monedas/5.png', alt: '🪙' },
    { valor: 2, tipo: 'moneda', imagen: '/monedas/2.png', alt: '🪙' },
    { valor: 1, tipo: 'moneda', imagen: '/monedas/1.png', alt: '🪙' },
    { valor: 0.5, tipo: 'moneda', imagen: '/monedas/50centavos.png', alt: '🪙' },
  ];

  // Lista de maestros con acceso a crédito
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
    { nombre: 'Maestro Emmanuel', grupo: 'Educación Física' },
    { nombre: 'Maestra Gaby', grupo: 'Directora' },
    { nombre: 'Maestra Carito', grupo: 'Cocina' },
  ];

  // Helper para obtener el nombre correcto de la imagen de moneda
  const getMonedaImage = (valor: number): string => {
    if (valor === 0.5) return '/monedas/50centavos.png';
    if (valor === 20) return '/monedas/20pesos.png';
    return `/monedas/${valor}.png`;
  };

  useEffect(() => {
    // Redirigir al dashboard si no hay caja seleccionada
    if (!selectedCaja) {
      router.push('/');
      return;
    }
    
    loadProducts();
    
    // Cargar carrito desde localStorage si existe
    const savedCart = localStorage.getItem('ventas_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart from localStorage:', e);
      }
    }
    
    // Recibir monedas seleccionadas desde URL
    const pagoFromUrl = searchParams.get('pago');
    const monedasFromUrl = searchParams.get('monedas');
    
    if (pagoFromUrl && monedasFromUrl) {
      setPayment(pagoFromUrl);
      try {
        const monedas = JSON.parse(decodeURIComponent(monedasFromUrl));
        setSelectedCoins(monedas);
      } catch (e) {
        console.error('Error parsing monedas:', e);
      }
    }
  }, [searchParams, selectedCaja, router]);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('ventas_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('ventas_cart');
    }
  }, [cart]);

  async function loadProducts() {
    if (!selectedCaja) return;
    
    console.log('[VENTAS] 🔄 Iniciando carga de productos...');
    const startTime = performance.now();
    
    try {
      console.log('[VENTAS] 📡 Llamando a productsApi.getAll()...');
      const data = await productsApi.getAll(selectedCaja.id);
      
      const endTime = performance.now();
      const loadTime = (endTime - startTime).toFixed(2);
      
      console.log('[VENTAS] ✅ Productos cargados exitosamente');
      console.log(`[VENTAS] 📊 Total de productos: ${data.length}`);
      console.log(`[VENTAS] ⏱️ Tiempo de carga: ${loadTime}ms`);
      console.log('[VENTAS] 📦 Datos recibidos:', data);
      
      if (data.length > 0) {
        console.log('[VENTAS] 🔍 Estructura del primer producto:', data[0]);
        console.log('[VENTAS] 🔍 Keys del primer producto:', Object.keys(data[0]));
      }
      
      // Mapear los datos de la API (name, price) a la interfaz esperada (nombre, precio, stock)
      const mappedProducts = data.map((p: any) => ({
        id: p.id,
        nombre: p.name,
        precio: p.price,
        stock: p.stock || 999, // Stock por defecto si no existe
        image_url: p.image_url,
        caja_id: p.caja_id
      }));
      
      console.log('[VENTAS] 🔄 Productos mapeados:', mappedProducts);
      setProducts(mappedProducts);
      console.log('[VENTAS] ✔️ setProducts ejecutado con', mappedProducts.length, 'productos');
    } catch (error) {
      const endTime = performance.now();
      const loadTime = (endTime - startTime).toFixed(2);
      
      console.error('[VENTAS] ❌ Error al cargar productos');
      console.error(`[VENTAS] ⏱️ Tiempo hasta error: ${loadTime}ms`);
      console.error('[VENTAS] 🐛 Detalles del error:', error);
    } finally {
      console.log('[VENTAS] 🏁 Finalizando loadProducts - setLoading(false)');
      setLoading(false);
    }
  }

  const openQuantityModal = (product: Product) => {
    setSelectedProduct(product);
    const existingItem = cart.find(item => item.product.id === product.id);
    setSelectedQuantity(existingItem?.quantity || 0);
    setShowQuantityModal(true);
  };

  const confirmQuantity = () => {
    if (!selectedProduct || selectedQuantity === 0) {
      setShowQuantityModal(false);
      return;
    }

    const existing = cart.find(item => item.product.id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === selectedProduct.id
          ? { ...item, quantity: Math.min(selectedQuantity, selectedProduct.stock) }
          : item
      ));
    } else {
      setCart([...cart, { product: selectedProduct, quantity: Math.min(selectedQuantity, selectedProduct.stock) }]);
    }

    setShowQuantityModal(false);
    setSelectedProduct(null);
    setSelectedQuantity(0);
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: Math.min(newQuantity, item.product.stock) }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.precio * item.quantity), 0);
  };

  const calculateChange = () => {
    const paymentAmount = parseFloat(payment) || 0;
    return paymentAmount - calculateTotal();
  };

  // Función para calcular sugerencias de cambio
  const getChangeSuggestions = (changeAmount: number) => {
    if (changeAmount <= 0) return [];

    const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];
    const suggestions: Array<{ denom: number; count: number }[]> = [];

    // Sugerencia 1: Óptima (menos billetes/monedas)
    let remaining = changeAmount;
    const optimal: { denom: number; count: number }[] = [];
    for (const denom of denominations) {
      const count = Math.floor(remaining / denom);
      if (count > 0) {
        optimal.push({ denom, count });
        remaining = Math.round((remaining - denom * count) * 100) / 100;
      }
    }
    suggestions.push(optimal);

    // Sugerencia 2: Alternativa con billetes más pequeños
    if (changeAmount >= 20) {
      remaining = changeAmount;
      const alternative: { denom: number; count: number }[] = [];
      const altDenoms = [100, 50, 20, 10, 5, 2, 1, 0.5];
      for (const denom of altDenoms) {
        const count = Math.floor(remaining / denom);
        if (count > 0) {
          alternative.push({ denom, count });
          remaining = Math.round((remaining - denom * count) * 100) / 100;
        }
      }
      if (JSON.stringify(alternative) !== JSON.stringify(optimal)) {
        suggestions.push(alternative);
      }
    }

    // Sugerencia 3: Solo billetes de 20 y monedas pequeñas
    if (changeAmount >= 10 && changeAmount <= 200) {
      remaining = changeAmount;
      const smallBills: { denom: number; count: number }[] = [];
      const smallDenoms = [50, 20, 10, 5, 2, 1, 0.5];
      for (const denom of smallDenoms) {
        const count = Math.floor(remaining / denom);
        if (count > 0) {
          smallBills.push({ denom, count });
          remaining = Math.round((remaining - denom * count) * 100) / 100;
        }
      }
      if (JSON.stringify(smallBills) !== JSON.stringify(optimal)) {
        suggestions.push(smallBills);
      }
    }

    return suggestions;
  };

  const getNextChangeSuggestion = () => {
    const change = calculateChange();
    const suggestions = getChangeSuggestions(change);
    setChangeSuggestionIndex((prev) => (prev + 1) % suggestions.length);
  };

  const renderChangeSuggestion = () => {
    const change = calculateChange();
    if (change <= 0) return null;

    const suggestions = getChangeSuggestions(change);
    if (suggestions.length === 0) return null;

    const currentSuggestion = suggestions[changeSuggestionIndex] || suggestions[0];

    return (
      <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-300">
        <div className="flex justify-between items-center mb-3">
          <span className="text-base text-purple-900 font-semibold">💡 Sugerencia para dar el cambio:</span>
          <span className="font-bold text-2xl text-purple-600">
            {formatCurrency(change)}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {currentSuggestion.map((item, idx) => (
            <div key={idx} className="flex flex-wrap gap-1 bg-white p-2 rounded-lg">
              {Array.from({ length: item.count }).map((_, i) => (
                <div key={i} className="relative">
                  <img
                    src={getMonedaImage(item.denom)}
                    alt={`${item.denom}`}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {suggestions.length > 1 && (
          <button
            onClick={getNextChangeSuggestion}
            className="w-full mt-3 text-sm bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
          >
            🔄 Ver otra sugerencia ({changeSuggestionIndex + 1}/{suggestions.length})
          </button>
        )}
      </div>
    );
  };

  const abrirSelectorMonedas = () => {
    const total = calculateTotal();
    router.push(`/monedas?total=${total}&modo=pago`);
  };

  // Función para generar sugerencias de cambio
  const generarSugerenciasCambio = (monto: number) => {
    if (monto <= 0) {
      setChangeSuggestions([]);
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
    
    setChangeSuggestions(sugerencias);
    setCurrentSuggestionIndex(0);
  };

  async function handleCompleteSale() {
    console.log('[VENTAS] 🚀 handleCompleteSale iniciado');
    
    // Prevenir múltiples ejecuciones
    if (isProcessing) {
      console.log('[VENTAS] ⏳ Ya se está procesando una venta');
      return;
    }

    console.log('[VENTAS] - cart.length:', cart.length);
    console.log('[VENTAS] - isCredit:', isCredit);
    console.log('[VENTAS] - payment:', payment);
    console.log('[VENTAS] - cliente:', cliente);
    console.log('[VENTAS] - grupo:', grupo);
    
    if (cart.length === 0) {
      console.log('[VENTAS] ❌ Carrito vacío');
      return;
    }

    if (isCredit && !cliente) {
      console.log('[VENTAS] ❌ Falta seleccionar cliente para crédito');
      alert('Por favor selecciona un cliente para la venta a crédito');
      return;
    }

    if (!isCredit && !payment) {
      console.log('[VENTAS] ❌ Falta el monto del pago');
      alert('Por favor ingresa el monto del pago');
      return;
    }

    // Activar estado de procesamiento
    setIsProcessing(true);

    const total = calculateTotal();
    const paymentAmount = isCredit ? 0 : parseFloat(payment);
    const change = isCredit ? 0 : paymentAmount - total;
    
    console.log('[VENTAS] 💰 Valores calculados:');
    console.log('[VENTAS] - total:', total);
    console.log('[VENTAS] - paymentAmount:', paymentAmount);
    console.log('[VENTAS] - change:', change);
    
    const productosArray = cart.map(item => ({
      nombre: item.product.nombre,
      cantidad: item.quantity,
      precio_unitario: item.product.precio,
      subtotal: item.product.precio * item.quantity
    }));

    console.log('[VENTAS] 📦 Productos:', productosArray);

    try {
      console.log('[VENTAS] 📡 Llamando a API...');
      const transaction = await transactionsApi.create({
        productos: productosArray,
        total,
        cliente: cliente || 'Cliente general',
        grupo: grupo || 'General',
        pagado: isCredit ? 'NO' : 'SI',
        pago: paymentAmount,
        cambio: change,
        caja_id: selectedCaja?.id,
      });

      console.log('[VENTAS] ✅ Transacción creada:', transaction);

      // Generar y descargar recibo automáticamente
      const receiptData = {
        id: transaction.id,
        fecha: transaction.fecha || new Date().toISOString(),
        cliente: cliente || 'Cliente general',
        grupo: grupo || 'General',
        productos: productosArray,
        total,
        pago: paymentAmount,
        cambio: change,
        pagado: isCredit ? 'NO' : 'SI',
      };

      // Preguntar si desea imprimir o solo descargar
      const shouldPrint = confirm('¡Venta completada! ¿Deseas imprimir el recibo?\n\nSí = Imprimir\nNo = Solo descargar PDF');
      
      if (shouldPrint) {
        printReceipt(receiptData);
      } else {
        downloadReceipt(receiptData);
      }

      setCart([]);
      setCliente('');
      setGrupo('');
      setPayment('');
      setIsCredit(false);
      setShowCustomClientInput(false);
      setSelectedCoins([]);
      localStorage.removeItem('ventas_cart'); // Limpiar carrito del localStorage
      loadProducts();
      
      console.log('[VENTAS] 🎉 Venta completada exitosamente');
      
      // Desactivar estado de procesamiento después del éxito
      setIsProcessing(false);
    } catch (error) {
      console.error('[VENTAS] ❌ Error completing sale:', error);
      alert('Error al completar la venta');
      
      // Desactivar estado de procesamiento en caso de error
      setIsProcessing(false);
    }
  }

  const filteredProducts = products.filter(p =>
    p?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log('[VENTAS] 🔎 Estado actual:');
  console.log(`[VENTAS] - products.length: ${products.length}`);
  console.log(`[VENTAS] - filteredProducts.length: ${filteredProducts.length}`);
  console.log(`[VENTAS] - searchTerm: "${searchTerm}"`);
  console.log(`[VENTAS] - loading: ${loading}`);
  if (products.length > 0) {
    console.log('[VENTAS] - Primer producto:', products[0]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-2 sm:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Productos */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              🛒 <span>Nueva Venta</span>
            </h1>
            <div className="bg-blue-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg w-full sm:w-auto text-center lg:hidden">
              <span className="text-xs font-semibold text-blue-900">Caja: {selectedCaja?.nombre}</span>
            </div>
          </div>

          {/* Búsqueda */}
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl mb-3 sm:mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Grid de productos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => openQuantityModal(product)}
                className="bg-white rounded-lg sm:rounded-xl shadow-md p-2 sm:p-3 cursor-pointer hover:shadow-xl hover:scale-105 transition-all border border-transparent hover:border-blue-400"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-md sm:rounded-lg mb-1.5 sm:mb-2 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={resolveProductImageUrl(product.id, product.image_url)}
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
                    <span className="text-2xl sm:text-4xl">📦</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm leading-tight line-clamp-2">{product.nombre}</h3>
                <p className="text-sm sm:text-lg font-bold text-blue-600 mb-0.5">{formatCurrency(product.precio)}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full inline-block">
                  Stock: {product.stock}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:sticky lg:top-20 lg:h-fit">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl p-3 sm:p-4 border border-blue-200">
            <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              🛍️ <span>Carrito</span>
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="text-3xl sm:text-5xl mb-2">🛒</div>
                <p className="text-gray-500 text-sm sm:text-base">Carrito vacío</p>
              </div>
            ) : (
              <div className="max-h-[250px] sm:max-h-[300px] lg:max-h-[350px] overflow-y-auto space-y-2 mb-3 sm:mb-4 pr-1">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs sm:text-sm truncate">{item.product.nombre}</p>
                      <p className="text-sm sm:text-base text-blue-600 font-semibold">{formatCurrency(item.product.precio)}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 hover:bg-red-600 text-white rounded-md text-base sm:text-lg font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <button
                        onClick={() => openQuantityModal(item.product)}
                        className="w-10 sm:w-12 text-center font-bold text-base sm:text-xl bg-white rounded-md py-1 border border-blue-300 hover:border-blue-500"
                      >
                        {item.quantity}
                      </button>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 hover:bg-green-600 text-white rounded-md text-base sm:text-lg font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xl sm:text-2xl md:text-3xl hover:scale-125 transition-transform"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t-2 border-blue-300 pt-3 mb-3">
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-100 to-purple-100 p-2 sm:p-3 rounded-lg mb-3">
                <span className="text-sm sm:text-base font-bold">Total:</span>
                <span className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {/* Selector de Cliente */}
                {showCustomClientInput ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="👤 Nombre del cliente"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="👥 Grupo (opcional)"
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        setShowCustomClientInput(false);
                        setCliente('');
                        setGrupo('');
                      }}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                    >
                      ← Volver a lista de maestros
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={cliente ? `${cliente}|${grupo}` : ''}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setShowCustomClientInput(true);
                          setCliente('');
                          setGrupo('');
                        } else if (e.target.value) {
                          const [nombre, grupoVal] = e.target.value.split('|');
                          setCliente(nombre);
                          setGrupo(grupoVal);
                        } else {
                          setCliente('');
                          setGrupo('');
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">👤 Seleccionar maestro (opcional)</option>
                      {maestrosConCredito.map((maestro, idx) => (
                        <option key={idx} value={`${maestro.nombre}|${maestro.grupo}`}>
                          {maestro.nombre} - {maestro.grupo}
                        </option>
                      ))}
                      <option value="custom">✏️ Otro cliente...</option>
                    </select>
                    {cliente && (
                      <div className="bg-blue-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md">
                        <p className="text-xs sm:text-sm text-blue-900">
                          <strong>{cliente}</strong> - {grupo}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-2 sm:gap-3 cursor-pointer bg-yellow-100 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 border-yellow-300">
                  <input
                    type="checkbox"
                    checked={isCredit}
                    onChange={(e) => setIsCredit(e.target.checked)}
                    className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
                  />
                  <span className="font-bold text-sm sm:text-base md:text-lg">📝 Venta a crédito</span>
                </label>

                {!isCredit && (
                  <>
                    <button
                      onClick={abrirSelectorMonedas}
                      className="w-full bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transition-all"
                    >
                      💰 <span>¿Con cuánto pagas?</span>
                    </button>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="💵 O escribe el monto..."
                        value={payment}
                        onChange={(e) => {
                          setPayment(e.target.value);
                          setSelectedCoins([]); // Limpiar monedas si escribe manualmente
                        setChangeSuggestionIndex(0); // Reset suggestion index on payment change
                      }}
                      className="flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {parseFloat(payment) > calculateTotal() && (
                      <button
                        onClick={() => {
                          const cambio = parseFloat(payment) - calculateTotal();
                          generarSugerenciasCambio(cambio);
                          setShowChangeSuggestionModal(true);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg sm:text-xl md:text-2xl"
                        title="Ver sugerencias de cambio"
                      >
                        💡
                      </button>
                    )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || isProcessing}
              className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all ${
                cart.length === 0 || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-105'
              }`}
            >
              {isProcessing ? '⏳ Procesando...' : '✅ Completar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de selección de cantidad */}
      {showQuantityModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-3 my-2 max-h-[98vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">¿Cuántos llevas?</h2>
              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setSelectedProduct(null);
                  setSelectedQuantity(0);
                }}
                className="text-2xl hover:scale-110 transition-transform"
              >
                ✖️
              </button>
            </div>

            <div className="bg-blue-50 rounded-lg p-2 mb-2">
              <p className="text-base font-bold text-gray-900">{selectedProduct.nombre}</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedProduct.precio)}</p>
              <p className="text-xs text-gray-600">Stock: {selectedProduct.stock}</p>
            </div>

            <NumeroSelector
              cantidad={selectedQuantity}
              onChange={setSelectedQuantity}
              max={selectedProduct.stock}
            />

            <button
              onClick={confirmQuantity}
              disabled={selectedQuantity === 0}
              className={`w-full mt-2 py-2 rounded-lg font-bold text-base shadow-lg transition-all ${
                selectedQuantity === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-105'
              }`}
            >
              ✅ Agregar al Carrito
            </button>
          </div>
        </div>
      )}

      {/* Modal de sugerencias de cambio */}
      {showChangeSuggestionModal && changeSuggestions.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full p-3 sm:p-4 md:p-6 my-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900">💡 Sugerencias de Cambio</h2>
              <button
                onClick={() => setShowChangeSuggestionModal(false)}
                className="text-2xl sm:text-3xl hover:scale-110 transition-transform"
              >
                ✖️
              </button>
            </div>

            <div className="bg-purple-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-sm md:text-base font-semibold text-purple-900">Cambio a entregar:</span>
                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-600">
                  {formatCurrency(parseFloat(payment) - calculateTotal())}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border-2 sm:border-3 md:border-4 border-yellow-400">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-yellow-900">
                  Opción {currentSuggestionIndex + 1} de {changeSuggestions.length}
                </h3>
              </div>

              <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 items-center justify-center mb-3 sm:mb-4 bg-white p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl min-h-[80px] sm:min-h-[100px]">
                {Object.entries(changeSuggestions[currentSuggestionIndex]).map(([valor, cantidad]) => {
                  if (cantidad === 0) return null;
                  return Array.from({ length: cantidad }).map((_, i) => (
                    <img
                      key={`${valor}-${i}`}
                      src={getMonedaImage(parseFloat(valor))}
                      alt={formatCurrency(parseFloat(valor))}
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ));
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setCurrentSuggestionIndex((prev) => 
                      prev > 0 ? prev - 1 : changeSuggestions.length - 1
                    );
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-colors"
                >
                  ⬅️ Anterior
                </button>
                <button
                  onClick={() => {
                    setCurrentSuggestionIndex((prev) => 
                      (prev + 1) % changeSuggestions.length
                    );
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-colors"
                >
                  Siguiente ➡️
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowChangeSuggestionModal(false)}
              className="w-full mt-3 sm:mt-4 md:mt-6 bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-colors"
            >
              ✅ Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
