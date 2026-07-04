const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function resolveProductImageUrl(productId: number, imageUrl?: string | null): string {
  if (!imageUrl) return '';
  return `${API_URL}/api/products/${productId}/image`;
}

export function resolveImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return '';

  // URLs absolutas (S3, CDN, etc.)
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  // Rutas locales del backend (/static/... o static/...)
  if (/^\/?static\//i.test(imageUrl)) {
    const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${API_URL}${normalized}`;
  }

  // Fallback para otras rutas relativas
  const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${API_URL}${normalized}`;
}

// Cajas
export const cajasApi = {
  getAll: async (activaOnly: boolean = false) => {
    const params = activaOnly ? '?activa_only=true' : '';
    const res = await fetch(`${API_URL}/api/cajas/${params}`);
    if (!res.ok) throw new Error('Error al obtener cajas');
    return res.json();
  },

  getById: async (id: number) => {
    const res = await fetch(`${API_URL}/api/cajas/${id}/`);
    if (!res.ok) throw new Error('Error al obtener caja');
    return res.json();
  },

  create: async (caja: { 
    nombre: string; 
    descripcion?: string; 
    activa?: boolean;
    saldo_inicial?: number;
  }) => {
    const res = await fetch(`${API_URL}/api/cajas/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caja),
    });
    if (!res.ok) throw new Error('Error al crear caja');
    return res.json();
  },

  update: async (id: number, caja: Partial<{ 
    nombre: string; 
    descripcion: string; 
    activa: boolean;
    saldo_inicial: number;
  }>) => {
    const res = await fetch(`${API_URL}/api/cajas/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caja),
    });
    if (!res.ok) throw new Error('Error al actualizar caja');
    return res.json();
  },

  delete: async (id: number) => {
    const res = await fetch(`${API_URL}/api/cajas/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar caja');
  },

  getSaldo: async (id: number) => {
    const res = await fetch(`${API_URL}/api/cajas/${id}/saldo/`);
    if (!res.ok) throw new Error('Error al obtener saldo');
    return res.json();
  },

  getProductos: async (id: number) => {
    const res = await fetch(`${API_URL}/api/cajas/${id}/productos/`);
    if (!res.ok) throw new Error('Error al obtener productos');
    return res.json();
  },
};

// Productos
export const productsApi = {
  getAll: async (cajaId?: number) => {
    const params = cajaId ? `?caja_id=${cajaId}` : '';
    const res = await fetch(`${API_URL}/api/products${params}`);
    if (!res.ok) throw new Error('Error al obtener productos');
    return res.json();
  },
  
  getById: async (id: number) => {
    const res = await fetch(`${API_URL}/api/products/${id}`);
    if (!res.ok) throw new Error('Error al obtener producto');
    return res.json();
  },
  
  create: async (product: { name: string; price: number; image_url?: string; caja_id?: number }) => {
    const res = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Error al crear producto');
    return res.json();
  },
  
  update: async (id: number, product: Partial<{ name: string; price: number; image_url: string; caja_id: number }>) => {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Error al actualizar producto');
    return res.json();
  },
  
  delete: async (id: number) => {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar producto');
  },
  
  uploadImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/api/products/upload-image/${id}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir imagen');
    return res.json();
  },
};

// Transacciones
export const transactionsApi = {
  getAll: async (filters?: {
    skip?: number;
    limit?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    cliente?: string;
    grupo?: string;
    caja_id?: number;
    pagado?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const res = await fetch(`${API_URL}/api/transactions?${params}`);
    if (!res.ok) throw new Error('Error al obtener transacciones');
    return res.json();
  },
  
  getById: async (id: number) => {
    const res = await fetch(`${API_URL}/api/transactions/${id}`);
    if (!res.ok) throw new Error('Error al obtener transacción');
    return res.json();
  },
  
  create: async (transaction: {
    cliente: string;
    grupo: string;
    productos: Array<{
      nombre: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
    }>;
    total: number;
    pago: number;
    cambio: number;
    pagado: 'SI' | 'NO';
    caja_id?: number;
  }) => {
    const res = await fetch(`${API_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    if (!res.ok) throw new Error('Error al crear transacción');
    return res.json();
  },
  
  getDailyStats: async (fecha?: string) => {
    const params = fecha ? `?fecha=${fecha}` : '';
    const res = await fetch(`${API_URL}/api/transactions/stats/daily${params}`);
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },
  
  getMonthlyStats: async (year: number, month: number) => {
    const res = await fetch(`${API_URL}/api/transactions/stats/monthly?year=${year}&month=${month}`);
    if (!res.ok) throw new Error('Error al obtener estadísticas mensuales');
    return res.json();
  },

  getByTeacher: async (teacherName: string, filters?: {
    skip?: number;
    limit?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    only_unpaid?: boolean;
    caja_id?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const res = await fetch(`${API_URL}/api/transactions/by-teacher/${encodeURIComponent(teacherName)}?${params}`);
    if (!res.ok) throw new Error('Error al obtener transacciones del maestro');
    return res.json();
  },

  getTeacherSummary: async (teacherName: string, cajaId?: number) => {
    const params = cajaId ? `?caja_id=${cajaId}` : '';
    const res = await fetch(`${API_URL}/api/transactions/by-teacher/${encodeURIComponent(teacherName)}/summary${params}`);
    if (!res.ok) throw new Error('Error al obtener resumen del maestro');
    return res.json();
  },
};

// Deudores
export const debtorsApi = {
  getAll: async (cajaId?: number, filters?: { skip?: number; limit?: number; grupo?: string; nombre?: string }) => {
    const params = new URLSearchParams();
    if (cajaId) params.append('caja_id', cajaId.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const res = await fetch(`${API_URL}/api/debtors?${params}`);
    if (!res.ok) throw new Error('Error al obtener deudores');
    return res.json();
  },
  
  getById: async (id: number) => {
    const res = await fetch(`${API_URL}/api/debtors/${id}`);
    if (!res.ok) throw new Error('Error al obtener deudor');
    return res.json();
  },
  
  getByName: async (nombre: string, grupo: string) => {
    const res = await fetch(`${API_URL}/api/debtors/by-name/${encodeURIComponent(nombre)}/${encodeURIComponent(grupo)}`);
    if (!res.ok) throw new Error('Error al obtener deudor');
    return res.json();
  },
  
  create: async (debtor: { nombre: string; grupo: string; deuda: number }) => {
    const res = await fetch(`${API_URL}/api/debtors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debtor),
    });
    if (!res.ok) throw new Error('Error al crear deudor');
    return res.json();
  },
  
  pay: async (id: number, monto: number, cajaId?: number) => {
    const params = new URLSearchParams({ monto: monto.toString() });
    if (cajaId) params.append('caja_id', cajaId.toString());
    
    const res = await fetch(`${API_URL}/api/debtors/${id}/pay?${params}`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Error al registrar pago');
    return res.json();
  },
  
  update: async (id: number, data: { deuda?: number }) => {
    const res = await fetch(`${API_URL}/api/debtors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar deudor');
    return res.json();
  },
  
  delete: async (id: number) => {
    const res = await fetch(`${API_URL}/api/debtors/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar deudor');
  },
  
  getSummary: async (cajaId?: number) => {
    const params = cajaId ? `?caja_id=${cajaId}` : '';
    const res = await fetch(`${API_URL}/api/debtors/stats/summary${params}`);
    if (!res.ok) throw new Error('Error al obtener resumen');
    return res.json();
  },
};

// Caja
export const cashApi = {
  getAll: async (filters?: {
    skip?: number;
    limit?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo_operacion?: string;
    caja_id?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const res = await fetch(`${API_URL}/api/cash?${params}`);
    if (!res.ok) throw new Error('Error al obtener operaciones');
    return res.json();
  },
  
  getBalance: async (cajaId?: number) => {
    const params = cajaId ? `?caja_id=${cajaId}` : '';
    const res = await fetch(`${API_URL}/api/cash/balance${params}`);
    if (!res.ok) throw new Error('Error al obtener saldo');
    return res.json();
  },
  
  getById: async (id: number) => {
    const res = await fetch(`${API_URL}/api/cash/${id}`);
    if (!res.ok) throw new Error('Error al obtener operación');
    return res.json();
  },
  
  create: async (operation: {
    tipo_operacion: 'VENTA' | 'INGRESO' | 'EGRESO' | 'AJUSTE';
    monto: number;
    descripcion?: string;
    caja_id?: number;
  }) => {
    const res = await fetch(`${API_URL}/api/cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation),
    });
    if (!res.ok) throw new Error('Error al crear operación');
    return res.json();
  },
  
  addIncome: async (monto: number, descripcion: string, cajaId?: number) => {
    const params = new URLSearchParams({ monto: monto.toString(), descripcion });
    if (cajaId) params.append('caja_id', cajaId.toString());
    const res = await fetch(`${API_URL}/api/cash/income?${params}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Error al registrar ingreso');
    return res.json();
  },
  
  addExpense: async (monto: number, descripcion: string, cajaId?: number) => {
    const params = new URLSearchParams({ monto: monto.toString(), descripcion });
    if (cajaId) params.append('caja_id', cajaId.toString());
    const res = await fetch(`${API_URL}/api/cash/expense?${params}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Error al registrar egreso');
    return res.json();
  },
  
  adjust: async (monto: number, descripcion: string, cajaId?: number) => {
    const params = new URLSearchParams({ monto: monto.toString(), descripcion });
    if (cajaId) params.append('caja_id', cajaId.toString());
    const res = await fetch(`${API_URL}/api/cash/adjust?${params}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Error al ajustar saldo');
    return res.json();
  },
  
  getDailyStats: async (cajaId?: number, fecha?: string) => {
    const params = new URLSearchParams();
    if (cajaId) params.append('caja_id', cajaId.toString());
    if (fecha) params.append('fecha', fecha);
    const queryString = params.toString();
    const res = await fetch(`${API_URL}/api/cash/stats/daily${queryString ? `?${queryString}` : ''}`);
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    return res.json();
  },
};
