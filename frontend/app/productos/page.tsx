'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, cajasApi, resolveImageUrl, resolveProductImageUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCaja } from '@/contexts/CajaContext';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  category?: string; // alimentos, bebidas, postres
  beverage_type?: string; // fria, caliente, ambas
  beverage_flavors_enabled?: boolean;
  beverage_flavors?: string[];
  created_at: string;
  caja_id?: number;
}

interface Caja {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const { selectedCaja, isLoading: cajaLoading } = useCaja();
  const [products, setProducts] = useState<Product[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    caja_id: '',
    category: 'alimentos',
    beverage_type: '',
    beverage_flavors_enabled: false,
    beverage_flavors: [] as string[],
  });
  const [newFlavorInput, setNewFlavorInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (cajaLoading) {
      return;
    }

    if (!selectedCaja) {
      router.push('/');
      return;
    }
    loadCajas();
    loadProducts();
  }, [selectedCaja, cajaLoading, router]);

  async function loadCajas() {
    try {
      const data = await cajasApi.getAll(true); // Solo cajas activas
      setCajas(data);
    } catch (error) {
      console.error('Error loading cajas:', error);
    }
  }

  async function loadProducts() {
    if (!selectedCaja) return;
    
    try {
      const data = await productsApi.getAll(selectedCaja.id);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (!selectedCaja) {
      alert('Debes seleccionar una caja primero');
      return;
    }

    try {
      const productData: any = {
        name: formData.name,
        price: parseFloat(formData.price),
        caja_id: selectedCaja.id, // Asignar automáticamente la caja seleccionada
        category: formData.category || 'alimentos',
        beverage_type: formData.category === 'bebidas' ? (formData.beverage_type || null) : null,
        beverage_flavors_enabled: formData.category === 'bebidas' ? formData.beverage_flavors_enabled : false,
        beverage_flavors:
          formData.category === 'bebidas' && formData.beverage_flavors_enabled
            ? formData.beverage_flavors
            : [],
      };

      let savedProduct;
      if (editingProduct) {
        savedProduct = await productsApi.update(editingProduct.id, productData);
      } else {
        savedProduct = await productsApi.create(productData);
      }

      // Subir imagen si existe
      if (imageFile && savedProduct.id) {
        await productsApi.uploadImage(savedProduct.id, imageFile);
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        caja_id: '',
        category: 'alimentos',
        beverage_type: '',
        beverage_flavors_enabled: false,
        beverage_flavors: [],
      });
      setNewFlavorInput('');
      setImageFile(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar producto');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await productsApi.delete(id);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar producto');
    }
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormData({ 
      name: product.name, 
      price: product.price.toString(),
      caja_id: product.caja_id?.toString() || '',
      category: product.category || 'alimentos',
      beverage_type: product.beverage_type || '',
      beverage_flavors_enabled: !!product.beverage_flavors_enabled,
      beverage_flavors: product.beverage_flavors || [],
    });
    setNewFlavorInput('');
    setShowModal(true);
  }

  function openNewModal() {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      caja_id: '',
      category: 'alimentos',
      beverage_type: '',
      beverage_flavors_enabled: false,
      beverage_flavors: [],
    });
    setNewFlavorInput('');
    setImageFile(null);
    setShowModal(true);
  }

  const normalizeFlavorName = (value: string) =>
    value
      .trim()
      .replace(/\s+/g, ' ');

  const flavorImagePath = (value: string) => {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return `/sabores/${normalized}.png`;
  };

  const addFlavor = () => {
    const flavor = normalizeFlavorName(newFlavorInput);
    if (!flavor) return;

    const alreadyExists = formData.beverage_flavors.some(
      (item) => item.toLowerCase() === flavor.toLowerCase()
    );
    if (alreadyExists) {
      setNewFlavorInput('');
      return;
    }

    setFormData({
      ...formData,
      beverage_flavors: [...formData.beverage_flavors, flavor],
    });
    setNewFlavorInput('');
  };

  const removeFlavor = (flavorToRemove: string) => {
    setFormData({
      ...formData,
      beverage_flavors: formData.beverage_flavors.filter((item) => item !== flavorToRemove),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          {selectedCaja && (
            <p className="text-sm text-gray-600 mt-1">
              Caja: <span className="font-semibold text-blue-900">{selectedCaja.nombre}</span>
            </p>
          )}
        </div>
        <button
          onClick={openNewModal}
          className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-48 bg-gray-100 flex items-center justify-center">
              {product.image_url ? (
                <img
                  src={resolveProductImageUrl(product.id, product.image_url)}
                  alt={product.name}
                  className="h-full w-full object-contain"
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
                <span className="text-6xl">📦</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{product.name}</h3>
              <p className="text-2xl font-bold text-blue-900 mb-2">{formatCurrency(product.price)}</p>
              {product.category && (
                <p className="text-sm text-gray-600 mb-1">
                  📂 {product.category === 'alimentos' ? '🍔' : product.category === 'bebidas' ? '🍹' : '🍰'} {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                </p>
              )}
              {product.beverage_type && (
                <p className="text-sm text-gray-600 mb-2">
                  {product.beverage_type === 'fria' ? '❄️' : product.beverage_type === 'caliente' ? '☕' : '🔄'} {product.beverage_type.charAt(0).toUpperCase() + product.beverage_type.slice(1)}
                </p>
              )}
              {product.beverage_flavors_enabled && (product.beverage_flavors || []).length > 0 && (
                <p className="text-sm text-gray-600 mb-2">
                  🍓 Sabores: {(product.beverage_flavors || []).join(', ')}
                </p>
              )}
              {product.caja_id && (
                <p className="text-sm text-gray-600 mb-4">
                  🏪 {cajas.find(c => c.id === product.caja_id)?.nombre || 'Caja desconocida'}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(product)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay productos registrados</p>
          <button
            onClick={openNewModal}
            className="mt-4 text-blue-900 hover:text-blue-700 font-medium"
          >
            Crear el primero
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del producto
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  placeholder="Ej: Coca Cola 600ml"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caja
                </label>
                <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {selectedCaja?.nombre || 'Sin caja seleccionada'}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value,
                      beverage_type: '',
                      beverage_flavors_enabled: false,
                      beverage_flavors: [],
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                >
                  <option value="alimentos">🍔 Alimentos</option>
                  <option value="bebidas">🍹 Bebidas</option>
                  <option value="postres">🍰 Postres</option>
                </select>
              </div>

              {formData.category === 'bebidas' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Bebida
                  </label>
                  <select
                    value={formData.beverage_type}
                    onChange={(e) => setFormData({ ...formData, beverage_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="fria">❄️ Fría</option>
                    <option value="caliente">☕ Caliente</option>
                    <option value="ambas">🔄 Ambas</option>
                  </select>
                </div>
              )}

              {formData.category === 'bebidas' && (
                <div className="mb-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.beverage_flavors_enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          beverage_flavors_enabled: e.target.checked,
                          beverage_flavors: e.target.checked ? formData.beverage_flavors : [],
                        })
                      }
                      className="w-4 h-4"
                    />
                    Permitir saborización
                  </label>
                </div>
              )}

              {formData.category === 'bebidas' && formData.beverage_flavors_enabled && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sabores disponibles
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newFlavorInput}
                      onChange={(e) => setNewFlavorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFlavor();
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                      placeholder="Ej: fresa"
                    />
                    <button
                      type="button"
                      onClick={addFlavor}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-medium"
                    >
                      + Agregar
                    </button>
                  </div>

                  {formData.beverage_flavors.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {formData.beverage_flavors.map((flavor) => (
                        <div
                          key={flavor}
                          className="flex items-center gap-2 px-2 py-2 rounded-lg border border-blue-200 bg-blue-50"
                        >
                          <img
                            src={flavorImagePath(flavor)}
                            alt={flavor}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="text-sm font-semibold text-blue-900 flex-1 truncate">{flavor}</span>
                          <button
                            type="button"
                            onClick={() => removeFlavor(flavor)}
                            className="text-red-600 hover:text-red-800 font-bold"
                            aria-label={`Eliminar sabor ${flavor}`}
                          >
                            ✖
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Aún no hay sabores agregados.</p>
                  )}
                </div>
              )}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      price: '',
                      caja_id: '',
                      category: 'alimentos',
                      beverage_type: '',
                      beverage_flavors_enabled: false,
                      beverage_flavors: [],
                    });
                    setNewFlavorInput('');
                    setImageFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
