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
  const { selectedCaja } = useCaja();
  const [products, setProducts] = useState<Product[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', caja_id: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!selectedCaja) {
      router.push('/');
      return;
    }
    loadCajas();
    loadProducts();
  }, [selectedCaja]);

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
      setFormData({ name: '', price: '', caja_id: '' });
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
      caja_id: product.caja_id?.toString() || ''
    });
    setShowModal(true);
  }

  function openNewModal() {
    setEditingProduct(null);
    setFormData({ name: '', price: '', caja_id: '' });
    setImageFile(null);
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
              Caja: <span className="font-semibold text-blue-600">{selectedCaja.nombre}</span>
            </p>
          )}
        </div>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
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
              <p className="text-2xl font-bold text-blue-600 mb-2">{formatCurrency(product.price)}</p>
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
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    setFormData({ name: '', price: '', caja_id: '' });
                    setImageFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
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
