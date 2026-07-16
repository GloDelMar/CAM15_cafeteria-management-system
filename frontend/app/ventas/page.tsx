'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { productsApi, transactionsApi, debtorsApi, resolveImageUrl, resolveProductImageUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import NumeroSelector from '@/components/NumeroSelector';
import { useCaja } from '@/contexts/CajaContext';

interface Product {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  image_url?: string;
  caja_id?: number;
  category?: string;
  beverage_type?: string;
  beverage_flavors_enabled?: boolean;
  beverage_flavors?: string[];
  option_groups?: ProductOptionGroup[];
}

interface ProductOptionGroup {
  key: string;
  label: string;
  selection_type: 'single' | 'multiple';
  choices: string[];
}

interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, string[]>;
}

export default function VentasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCaja, isLoading: cajaLoading } = useCaja();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [cliente, setCliente] = useState('');
  const [grupo, setGrupo] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [payment, setPayment] = useState('');
  const [selectedCoins, setSelectedCoins] = useState<Array<{denom: number, count: number}>>([]);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, string[]>>({});
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [changeSuggestionIndex, setChangeSuggestionIndex] = useState(0);
  const [showCustomClientInput, setShowCustomClientInput] = useState(false);
  const [showChangeSuggestionModal, setShowChangeSuggestionModal] = useState(false);
  const [changeSuggestions, setChangeSuggestions] = useState<Array<{ [key: number]: number }>>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const OPTION_GROUP_LABELS: Record<string, string> = {
    salsa: 'Mayonesa o crema',
    verduras: 'Verduras',
    temperatura: 'Temperatura',
    azucar: 'Azúcar',
    sabores: 'Sabores',
  };

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
    sin_sabor: 'Sin sabor',
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
    sin_sabor: '/sin-azucar.png',
  };

  const formatFlavorKey = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const formatDynamicOptionLabel = (value: string) => {
    if (OPTION_VALUE_LABELS[value]) return OPTION_VALUE_LABELS[value];
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getOptionImage = (value: string) => {
    if (OPTION_IMAGE_BY_VALUE[value]) return OPTION_IMAGE_BY_VALUE[value];
    return `/sabores/${formatFlavorKey(value)}.png`;
  };

  const getTemperatureChoices = (product: Product): string[] => {
    if (product.beverage_type === 'fria') return ['fria'];
    if (product.beverage_type === 'caliente') return ['caliente'];
    return ['fria', 'caliente'];
  };

  const mapSelectedOptionsToTransactionOptions = (selectedOptions?: Record<string, string[]>) => {
    if (!selectedOptions) return [];
    return Object.entries(selectedOptions)
      .filter(([, values]) => values.length > 0)
      .map(([groupKey, values]) => ({
        group_key: groupKey,
        group_label: OPTION_GROUP_LABELS[groupKey] || groupKey,
        values,
      }));
  };

  const formatOptionValue = (value: string) => formatDynamicOptionLabel(value);

  const createLineId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getOptionsSignature = (selectedOptions?: Record<string, string[]>) => {
    if (!selectedOptions) return '{}';

    const normalized = Object.keys(selectedOptions)
      .sort()
      .reduce<Record<string, string[]>>((acc, key) => {
        const values = (selectedOptions[key] || []).slice().sort();
        if (values.length > 0) {
          acc[key] = values;
        }
        return acc;
      }, {});

    return JSON.stringify(normalized);
  };

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
    if (cajaLoading) {
      return;
    }

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
        const parsedCart = JSON.parse(savedCart) as CartItem[];
        const migratedCart = parsedCart.map((item) => ({
          ...item,
          lineId: item.lineId || createLineId(),
        }));
        setCart(migratedCart);
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
  }, [searchParams, selectedCaja, cajaLoading, router]);

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
        caja_id: p.caja_id,
        category: p.category || 'alimentos',
        beverage_type: p.beverage_type || null,
        beverage_flavors_enabled: !!p.beverage_flavors_enabled,
        beverage_flavors: Array.isArray(p.beverage_flavors) ? p.beverage_flavors : [],
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

  const openQuantityModal = (product: Product, existingItem?: CartItem) => {
    setSelectedProduct(product);
    const initialQuantity = existingItem?.quantity || (product.category === 'postres' ? 0 : 1);
    const initialOptions = { ...(existingItem?.selectedOptions || {}) };
    setEditingLineId(existingItem?.lineId || null);

    if (product.category === 'bebidas') {
      const allowedTemperatures = getTemperatureChoices(product);
      if (allowedTemperatures.length === 1) {
        initialOptions.temperatura = [allowedTemperatures[0]];
      } else if (initialOptions.temperatura?.length) {
        initialOptions.temperatura = initialOptions.temperatura.filter((value) => allowedTemperatures.includes(value));
      } else {
        initialOptions.temperatura = [allowedTemperatures[0]];
      }

      if (!initialOptions.azucar || initialOptions.azucar.length === 0) {
        initialOptions.azucar = ['con_azucar'];
      }

      if (product.beverage_flavors_enabled && (product.beverage_flavors || []).length > 0) {
        if (!initialOptions.sabores || initialOptions.sabores.length === 0) {
          initialOptions.sabores = ['sin_sabor'];
        }
      }
    }

    setSelectedQuantity(initialQuantity);
    setSelectedIngredients(initialOptions);
    setShowIngredientsModal(true);
  };

  const confirmQuantity = () => {
    if (!selectedProduct || selectedQuantity === 0) {
      setShowIngredientsModal(false);
      setEditingLineId(null);
      return;
    }

    const nextQuantity = Math.min(selectedQuantity, selectedProduct.stock);
    const nextSignature = getOptionsSignature(selectedIngredients);

    if (editingLineId) {
      setCart(cart.map(item =>
        item.lineId === editingLineId
          ? {
              ...item,
              quantity: nextQuantity,
              selectedOptions: selectedIngredients,
            }
          : item
      ));
    } else {
      const existingSameLine = cart.find(item =>
        item.product.id === selectedProduct.id &&
        getOptionsSignature(item.selectedOptions) === nextSignature
      );

      if (existingSameLine) {
        setCart(cart.map(item =>
          item.lineId === existingSameLine.lineId
            ? {
                ...item,
                quantity: Math.min(item.quantity + nextQuantity, item.product.stock),
              }
            : item
        ));
      } else {
        setCart([...cart, {
          lineId: createLineId(),
          product: selectedProduct,
          quantity: nextQuantity,
          selectedOptions: selectedIngredients,
        }]);
      }
    }

    setShowIngredientsModal(false);
    setSelectedProduct(null);
    setSelectedQuantity(0);
    setSelectedIngredients({});
    setEditingLineId(null);
  };

  const updateQuantity = (lineId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(lineId);
      return;
    }
    setCart(cart.map(item =>
      item.lineId === lineId
        ? { ...item, quantity: Math.min(newQuantity, item.product.stock) }
        : item
    ));
  };

  const removeFromCart = (lineId: string) => {
    setCart(cart.filter(item => item.lineId !== lineId));
  };

  const groupedCart = cart.reduce<Record<number, { product: Product; quantity: number; subtotal: number }>>((acc, item) => {
    const key = item.product.id;
    if (!acc[key]) {
      acc[key] = {
        product: item.product,
        quantity: 0,
        subtotal: 0,
      };
    }

    acc[key].quantity += item.quantity;
    acc[key].subtotal += item.product.precio * item.quantity;
    return acc;
  }, {});

  const groupedCartList = Object.values(groupedCart);

  const decrementGroupedProduct = (productId: number) => {
    const lineToUpdate = [...cart].reverse().find((line) => line.product.id === productId);
    if (!lineToUpdate) return;

    if (lineToUpdate.quantity > 1) {
      setCart(cart.map((line) =>
        line.lineId === lineToUpdate.lineId
          ? { ...line, quantity: line.quantity - 1 }
          : line
      ));
      return;
    }

    removeFromCart(lineToUpdate.lineId);
  };

  const incrementGroupedProduct = (product: Product) => {
    if (product.category === 'postres') {
      const existing = cart.find((line) => line.product.id === product.id);
      if (existing) {
        setCart(cart.map((line) =>
          line.lineId === existing.lineId
            ? { ...line, quantity: Math.min(line.quantity + 1, line.product.stock) }
            : line
        ));
        return;
      }
    }

    openQuantityModal(product);
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
    const normalizedCliente = cliente.trim();
    const normalizedGrupo = grupo.trim();
    
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

    if (!normalizedCliente) {
      console.log('[VENTAS] ❌ Falta capturar nombre del cliente');
      alert('Por favor agrega el nombre del cliente antes de realizar el pago');
      return;
    }

    if (isCredit && !normalizedGrupo) {
      console.log('[VENTAS] ❌ Falta capturar grupo para venta a crédito');
      alert('Por favor agrega el grupo del cliente para la venta a crédito');
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
    
    const productosArray = cart.map(item => {
      const opciones = mapSelectedOptionsToTransactionOptions(item.selectedOptions);

      return {
        product_id: item.product.id,
        image_url: item.product.image_url,
        nombre: item.product.nombre,
        cantidad: item.quantity,
        precio_unitario: item.product.precio,
        subtotal: item.product.precio * item.quantity,
        opciones
      };
    });

    console.log('[VENTAS] 📦 Productos:', productosArray);

    try {
      console.log('[VENTAS] 📡 Llamando a API...');
      const transaction = await transactionsApi.create({
        productos: productosArray,
        total,
        cliente: normalizedCliente,
        grupo: isCredit ? normalizedGrupo : (normalizedGrupo || 'General'),
        pagado: isCredit ? 'NO' : 'SI',
        pago: paymentAmount,
        cambio: change,
        caja_id: selectedCaja?.id,
      });

      console.log('[VENTAS] ✅ Transacción creada:', transaction);

      alert('Transacción realizada con éxito');

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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p?.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  console.log('[VENTAS] 🔎 Estado actual:');
  console.log(`[VENTAS] - products.length: ${products.length}`);
  console.log(`[VENTAS] - filteredProducts.length: ${filteredProducts.length}`);
  console.log(`[VENTAS] - searchTerm: "${searchTerm}"`);
  console.log(`[VENTAS] - loading: ${loading}`);
  if (products.length > 0) {
    console.log('[VENTAS] - Primer producto:', products[0]);
  }

  if (cajaLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-2 sm:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Productos */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-2">
              🛒 <span>Vender</span>
            </h1>
            <div className="bg-blue-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg w-full sm:w-auto text-center lg:hidden">
              <span className="text-xs font-semibold text-white">🏪 {selectedCaja?.nombre}</span>
            </div>
          </div>

          {/* Búsqueda */}
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-blue-300 rounded-lg sm:rounded-xl mb-3 sm:mb-4 focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
            aria-label="Buscar productos"
          />

          {/* Filtros por categoría */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {['todos', 'alimentos', 'bebidas', 'postres'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 rounded-lg font-bold whitespace-nowrap transition-all focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                  selectedCategory === cat
                    ? 'bg-blue-900 text-white shadow-lg focus:ring-blue-900'
                    : 'bg-white text-gray-700 border-2 border-blue-300 hover:border-blue-700 hover:bg-amber-50 focus:ring-blue-900'
                }`}
                aria-pressed={selectedCategory === cat}
              >
                {cat === 'todos' && '🍽️ Todos'}
                {cat === 'alimentos' && '🥘 Alimentos'}
                {cat === 'bebidas' && '🥤 Bebidas'}
                {cat === 'postres' && '🍰 Postres'}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => openQuantityModal(product)}
                className="bg-white rounded-lg sm:rounded-xl shadow-md p-2 sm:p-3 cursor-pointer hover:shadow-xl hover:scale-105 transition-all border-2 border-transparent hover:border-blue-400 focus-within:ring-2 focus-within:ring-orange-700"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') openQuantityModal(product);
                }}
              >
                <div className="aspect-square bg-amber-100 rounded-md sm:rounded-lg mb-1.5 sm:mb-2 flex items-center justify-center overflow-hidden">
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
                <h3 className="font-bold text-gray-900 mb-0.5 sm:mb-1 text-xs sm:text-sm leading-tight line-clamp-2">{product.nombre}</h3>
                <p className="text-sm sm:text-lg font-bold text-blue-700 mb-0.5">{formatCurrency(product.precio)}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 bg-amber-100 px-1.5 sm:px-2 py-0.5 rounded-full inline-block">
                  📦 {product.stock}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:sticky lg:top-20 lg:h-fit">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-xl p-3 sm:p-4 border-2 border-blue-300">
            <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-blue-900">
              🛍️ <span>Carrito</span>
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="text-3xl sm:text-5xl mb-2">🛒</div>
                <p className="text-gray-500 text-sm sm:text-base">Carrito vacío</p>
              </div>
            ) : (
              <div className="max-h-[250px] sm:max-h-[300px] lg:max-h-[350px] overflow-y-auto space-y-2 mb-3 sm:mb-4 pr-1">
                {groupedCartList.map((item) => (
                  <div key={item.product.id} className="p-2 bg-amber-50 rounded-lg border-2 border-blue-300">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-blue-900 truncate">{item.product.nombre}</p>
                        <p className="text-sm sm:text-base text-blue-700 font-bold">{formatCurrency(item.product.precio)}</p>
                      </div>
                      <button
                        onClick={() => decrementGroupedProduct(item.product.id)}
                        className="text-lg sm:text-xl hover:scale-125 transition-transform flex-shrink-0"
                        title="Quitar una unidad"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 justify-between">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                          onClick={() => decrementGroupedProduct(item.product.id)}
                          className="w-6 h-6 sm:w-7 sm:h-7 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs sm:text-sm font-bold flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-8 sm:w-10 text-center font-bold text-sm sm:text-lg bg-white rounded-md py-0.5 border-2 border-blue-300">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => incrementGroupedProduct(item.product)}
                          className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs sm:text-sm font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-blue-900 text-xs sm:text-sm">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t-2 border-blue-300 pt-3 mb-3">
              <div className="flex justify-between items-center bg-amber-100 p-2 sm:p-3 rounded-lg mb-3 border-2 border-blue-400">
                <span className="text-sm sm:text-base font-bold text-blue-900">Total:</span>
                <span className="text-xl sm:text-2xl font-bold text-blue-900">{formatCurrency(calculateTotal())}</span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {/* Selector de Cliente */}
                {showCustomClientInput ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="👤 Nombre del cliente *"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    />
                    <input
                      type="text"
                      placeholder={isCredit ? '👥 Grupo *' : '👥 Grupo (opcional)'}
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                    />
                    <button
                      onClick={() => {
                        setShowCustomClientInput(false);
                        setCliente('');
                        setGrupo('');
                      }}
                      className="text-xs sm:text-sm text-blue-900 hover:text-blue-800"
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
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 bg-white"
                    >
                      <option value="">👤 Seleccionar cliente *</option>
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

                {!cliente.trim() && (
                  <p className="text-xs sm:text-sm text-red-700 font-semibold bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                    El nombre del cliente es obligatorio para completar la venta.
                  </p>
                )}

                {isCredit && !grupo.trim() && (
                  <p className="text-xs sm:text-sm text-red-700 font-semibold bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                    El grupo es obligatorio para registrar una venta a crédito.
                  </p>
                )}

                <label className="flex items-center gap-2 sm:gap-3 cursor-pointer bg-amber-100 p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 border-blue-300">
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
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2"
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
                      className="flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-blue-900 focus:border-blue-900"
                    />
                    {parseFloat(payment) > calculateTotal() && (
                      <button
                        onClick={() => {
                          const cambio = parseFloat(payment) - calculateTotal();
                          generarSugerenciasCambio(cambio);
                          setShowChangeSuggestionModal(true);
                        }}
                        className="bg-amber-500 hover:bg-blue-800 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg sm:text-xl md:text-2xl focus:outline-none focus:ring-4 focus:ring-blue-400"
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
              disabled={cart.length === 0 || isProcessing || !cliente.trim() || (isCredit && !grupo.trim())}
              className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all ${
                cart.length === 0 || isProcessing || !cliente.trim() || (isCredit && !grupo.trim())
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:from-green-600 hover:to-green-700 text-white hover:scale-105'
              }`}
            >
              {isProcessing ? '⏳ Procesando...' : '✅ Completar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de selección de características y cantidad */}
      {showIngredientsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-5 my-2 max-h-[95vh] overflow-y-auto border-4 border-blue-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-blue-900">🛍️ Personalizar Comanda</h2>
              <button
                onClick={() => {
                  setShowIngredientsModal(false);
                  setSelectedProduct(null);
                  setSelectedQuantity(0);
                  setSelectedIngredients({});
                  setEditingLineId(null);
                }}
                className="text-2xl hover:scale-110 transition-transform"
              >
                ✖️
              </button>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-amber-50 rounded-xl p-3 mb-4 border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-blue-200 flex items-center justify-center shrink-0">
                  {selectedProduct.image_url ? (
                    <img
                      src={resolveProductImageUrl(selectedProduct.id, selectedProduct.image_url)}
                      alt={selectedProduct.nombre}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const fallback = resolveImageUrl(selectedProduct.image_url);
                        if (fallback && e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                          return;
                        }
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-black text-gray-900 truncate">{selectedProduct.nombre}</p>
                  <p className="text-lg sm:text-xl font-black text-blue-900">{formatCurrency(selectedProduct.precio)}</p>
                  <p className="text-xs font-semibold text-gray-700 capitalize">{selectedProduct.category || 'alimentos'}</p>
                </div>
              </div>
              {selectedProduct.category !== 'postres' && (
                <p className="text-xs text-gray-700 mt-2">Se agrega de uno en uno por selección.</p>
              )}
            </div>

            {/* Características según categoría */}
            {selectedProduct.category === 'alimentos' && (
              <div className="mb-4 space-y-3">
                <p className="text-sm font-black text-blue-900">🌶️ Ingredientes</p>
                
                {/* Salsas/Cremas */}
                <div className="bg-white p-3 rounded-lg border-2 border-amber-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">🤍 Mayonesa o crema:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {['mayonesa', 'crema', 'sin_mayonesa_crema'].map((choice) => {
                      const isSelected = (selectedIngredients['salsa'] || []).includes(choice);
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() =>
                            setSelectedIngredients({
                              ...selectedIngredients,
                              salsa: isSelected ? [] : [choice],
                            })
                          }
                          className={`p-2.5 rounded-lg border-2 flex items-center gap-2 justify-start transition-colors ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          {OPTION_IMAGE_BY_VALUE[choice] ? (
                            <img src={OPTION_IMAGE_BY_VALUE[choice]} alt={formatOptionValue(choice)} className="w-8 h-8 object-contain" />
                          ) : null}
                          <span className="text-sm font-semibold">{formatOptionValue(choice)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Verduras */}
                <div className="bg-white p-3 rounded-lg border-2 border-amber-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">🥬 Verduras:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['cebolla', 'jitomate', 'lechuga', 'chile'].map((choice) => {
                      const isSelected = (selectedIngredients['verduras'] || []).includes(choice);
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => {
                            const current = selectedIngredients.verduras || [];
                            setSelectedIngredients({
                              ...selectedIngredients,
                              verduras: isSelected
                                ? current.filter((item) => item !== choice)
                                : [...current, choice],
                            });
                          }}
                          className={`p-2.5 rounded-lg border-2 flex items-center gap-2 justify-start transition-colors ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          {OPTION_IMAGE_BY_VALUE[choice] ? (
                            <img src={OPTION_IMAGE_BY_VALUE[choice]} alt={formatOptionValue(choice)} className="w-8 h-8 object-contain" />
                          ) : null}
                          <span className="text-sm font-semibold">{formatOptionValue(choice)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Para bebidas */}
            {selectedProduct.category === 'bebidas' && (
              <div className="mb-4 space-y-3">
                <p className="text-sm font-black text-blue-900">☕ Características de Bebida</p>

                {/* Temperatura */}
                <div className="bg-white p-3 rounded-lg border-2 border-sky-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">🌡️ Temperatura:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getTemperatureChoices(selectedProduct).map((choice) => {
                      const isSelected = (selectedIngredients['temperatura'] || []).includes(choice);
                      const label = formatOptionValue(choice);
                      const temperatureLocked = selectedProduct.beverage_type !== 'ambas';
                      return (
                        <button
                          key={choice}
                          type="button"
                          disabled={temperatureLocked}
                          onClick={() => setSelectedIngredients({ ...selectedIngredients, temperatura: [choice] })}
                          className={`p-2.5 rounded-lg border-2 flex items-center gap-2 justify-start transition-colors ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50'
                          } ${temperatureLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {OPTION_IMAGE_BY_VALUE[choice] ? (
                            <img src={OPTION_IMAGE_BY_VALUE[choice]} alt={label} className="w-8 h-8 object-contain" />
                          ) : null}
                          <span className="text-sm font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedProduct.beverage_type !== 'ambas' && (
                    <p className="text-xs text-gray-600 mt-2">Temperatura fija para esta bebida.</p>
                  )}
                </div>

                {/* Azúcar */}
                <div className="bg-white p-3 rounded-lg border-2 border-sky-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">🍯 Azúcar:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[['con_azucar', 'Con azúcar'], ['sin_azucar', 'Sin azúcar']].map(([choice, label]) => {
                      const isSelected = (selectedIngredients['azucar'] || []).includes(choice);
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setSelectedIngredients({ ...selectedIngredients, azucar: [choice] })}
                          className={`p-2.5 rounded-lg border-2 flex items-center gap-2 justify-start transition-colors ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50'
                          }`}
                        >
                          {choice === 'sin_azucar' && OPTION_IMAGE_BY_VALUE[choice] ? (
                            <img src={OPTION_IMAGE_BY_VALUE[choice]} alt={label} className="w-8 h-8 object-contain" />
                          ) : null}
                          <span className="text-sm font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedProduct.beverage_flavors_enabled && (selectedProduct.beverage_flavors || []).length > 0 && (
                  <div className="bg-white p-3 rounded-lg border-2 border-sky-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">🍓 Sabor:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['sin_sabor', ...(selectedProduct.beverage_flavors || [])].map((choice) => {
                        const current = selectedIngredients['sabores'] || ['sin_sabor'];
                        const isSelected = current.includes(choice);
                        const label = formatOptionValue(choice);
                        const imagePath = getOptionImage(choice);

                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setSelectedIngredients({ ...selectedIngredients, sabores: [choice] })}
                            className={`p-2.5 rounded-lg border-2 flex items-center gap-2 justify-start transition-colors ${
                              isSelected
                                ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50'
                            }`}
                          >
                            <img
                              src={imagePath}
                              alt={label}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <span className="text-sm font-semibold">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cantidad solo para postres */}
            {selectedProduct.category === 'postres' && (
              <div className="mb-4 bg-white rounded-lg border-2 border-pink-200 p-3">
                <p className="text-sm font-black text-blue-900 mb-2">📦 Cantidad</p>
                <NumeroSelector
                  cantidad={selectedQuantity}
                  onChange={setSelectedQuantity}
                  max={selectedProduct.stock}
                />
              </div>
            )}

            <button
              onClick={confirmQuantity}
              disabled={selectedQuantity === 0}
              className={`w-full py-3 rounded-lg font-bold text-base shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                selectedQuantity === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 focus:ring-green-500'
              }`}
            >
              {editingLineId ? '✅ Actualizar Línea' : '✅ Agregar al Carrito'}
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

            <div className="bg-amber-100 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border-2 sm:border-3 md:border-4 border-blue-400">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-900">
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
                  className="bg-amber-500 hover:bg-blue-800 text-white px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-blue-400"
                >
                  ⬅️ Anterior
                </button>
                <button
                  onClick={() => {
                    setCurrentSuggestionIndex((prev) => 
                      (prev + 1) % changeSuggestions.length
                    );
                  }}
                  className="bg-amber-500 hover:bg-blue-800 text-white px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-blue-400"
                >
                  Siguiente ➡️
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowChangeSuggestionModal(false)}
              className="w-full mt-3 sm:mt-4 md:mt-6 bg-blue-900 hover:bg-blue-900 text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-colors"
            >
              ✅ Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
