'use client';

import { useEffect, useState } from 'react';
import { cajasApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Caja {
  id: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
  saldo_inicial: number;
  created_at: string;
}

export default function CajasPage() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCaja, setEditingCaja] = useState<Caja | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activa: true,
    saldo_inicial: 0,
  });

  useEffect(() => {
    loadCajas();
  }, []);

  async function loadCajas() {
    try {
      setLoading(true);
      const data = await cajasApi.getAll();
      setCajas(data);
    } catch (error) {
      console.error('Error loading cajas:', error);
      alert('Error al cargar las cajas');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCaja(null);
    setFormData({
      nombre: '',
      descripcion: '',
      activa: true,
      saldo_inicial: 0,
    });
    setShowModal(true);
  }

  function openEditModal(caja: Caja) {
    setEditingCaja(caja);
    setFormData({
      nombre: caja.nombre,
      descripcion: caja.descripcion || '',
      activa: caja.activa,
      saldo_inicial: caja.saldo_inicial,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (editingCaja) {
        await cajasApi.update(editingCaja.id, formData);
        alert('Caja actualizada exitosamente');
      } else {
        await cajasApi.create(formData);
        alert('Caja creada exitosamente');
      }
      setShowModal(false);
      loadCajas();
    } catch (error) {
      console.error('Error saving caja:', error);
      alert('Error al guardar la caja');
    }
  }

  async function handleToggleActiva(caja: Caja) {
    try {
      await cajasApi.update(caja.id, { activa: !caja.activa });
      loadCajas();
    } catch (error) {
      console.error('Error toggling caja:', error);
      alert('Error al cambiar el estado de la caja');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cajas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💼 Gestión de Cajas</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Nueva Caja
        </button>
      </div>

      {/* Grid de Cajas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cajas.map((caja) => (
          <CajaCard
            key={caja.id}
            caja={caja}
            onEdit={openEditModal}
            onToggleActiva={handleToggleActiva}
          />
        ))}
      </div>

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingCaja ? 'Editar Caja' : 'Nueva Caja'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saldo Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activa"
                  checked={formData.activa}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="activa" className="ml-2 text-sm font-medium text-gray-700">
                  Caja Activa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold"
                >
                  {editingCaja ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CajaCard({ caja, onEdit, onToggleActiva }: {
  caja: Caja;
  onEdit: (caja: Caja) => void;
  onToggleActiva: (caja: Caja) => void;
}) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [productos, setProductos] = useState<number>(0);

  useEffect(() => {
    loadCajaData();
  }, [caja.id]);

  async function loadCajaData() {
    try {
      const [saldoData, productosData] = await Promise.all([
        cajasApi.getSaldo(caja.id),
        cajasApi.getProductos(caja.id),
      ]);
      setSaldo(saldoData.saldo);
      setProductos(productosData.length);
    } catch (error) {
      console.error('Error loading caja data:', error);
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden border-2 ${
      caja.activa ? 'border-green-300' : 'border-gray-300'
    }`}>
      {/* Header */}
      <div className={`p-4 ${
        caja.activa ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-400'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">{caja.nombre}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            caja.activa ? 'bg-white text-green-600' : 'bg-gray-600 text-white'
          }`}>
            {caja.activa ? '✓ Activa' : '✗ Inactiva'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {caja.descripcion && (
          <p className="text-sm text-gray-600 mb-4">{caja.descripcion}</p>
        )}

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Saldo Actual:</span>
            <span className="text-xl font-bold text-green-600">
              {saldo !== null ? formatCurrency(saldo) : '...'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Productos:</span>
            <span className="text-lg font-semibold text-blue-600">{productos}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Saldo Inicial:</span>
            <span className="text-sm font-medium text-gray-700">
              {formatCurrency(caja.saldo_inicial)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => onEdit(caja)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => onToggleActiva(caja)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold ${
              caja.activa
                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                : 'bg-green-100 hover:bg-green-200 text-green-700'
            }`}
          >
            {caja.activa ? '🔒 Desactivar' : '🔓 Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}
